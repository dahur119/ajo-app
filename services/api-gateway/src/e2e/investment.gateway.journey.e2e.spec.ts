import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Enable by setting LIVE_E2E=true; hits running gateway which proxies to investment-service
const LIVE = process.env.LIVE_E2E === 'true';
const GATEWAY_BASE = process.env.GATEWAY_BASE_URL || 'http://localhost:3000';

// Helper: check if a string is a GUID (v4 style)
function isGuid(v: any): boolean {
  return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}

(LIVE ? describe : describe.skip)('Investment-service via API gateway (live)', () => {
  jest.setTimeout(30000);

  let loginToken = '';
  let invToken = '';
  let productId: string = '';

  it('registers and logs in via gateway to get JWT', async () => {
    const email = `gw_inv_${Date.now()}@example.com`;
    const password = 'Secret123!';

    const reg = await request(GATEWAY_BASE)
      .post('/users/register')
      .send({ name: 'Gateway Inv User', email, password, password_confirmation: password });
    expect([200, 201]).toContain(reg.status);

    const login = await request(GATEWAY_BASE)
      .post('/users/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    loginToken = login.body.token || login.body.access_token || login.body?.data?.token;
    expect(loginToken).toBeTruthy();

    // Create a synthetic JWT that investment-service will accept
    // Align with investment-service appsettings.json: Issuer=https://auth.local, Audience=investment-service, Secret=local-dev-secret
    const decodedLogin: any = jwt.decode(loginToken);
    const guidSub = decodedLogin?.sub || crypto.randomUUID(); // Use login sub, fallback to new GUID
    const issuer = 'https://auth.local';
    const audience = 'investment-service';
    const secret = 'local-dev-secret';
    const payload: any = {
      sub: guidSub,
      email,
      email_verified_at: new Date().toISOString(),
      iss: issuer,
      aud: audience,
    };
    invToken = jwt.sign(payload, secret, { algorithm: 'HS256', issuer, audience });
    expect(invToken).toBeTruthy();
  });

  it('creates a product via gateway → investment-service', async () => {
    const name = `GW Product ${Date.now()}`;
    const create = await request(GATEWAY_BASE)
      .post('/investments/products')
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true')
      .send({
        name,
        rateApr: 0.12,
        compounding: 'monthly',
        minContribution: 100,
        currency: 'NGN',
      });
    expect([200, 201]).toContain(create.status);
    productId = create.body.id || create.body?.data?.id;
    expect(productId).toBeTruthy();
  });

  it('lists products via gateway and finds the created one', async () => {
    const list = await request(GATEWAY_BASE)
      .get('/investments/products')
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true');
    expect(list.status).toBe(200);
    const ids = (Array.isArray(list.body) ? list.body : []).map((p: any) => p.id);
    expect(ids).toContain(productId);
  });

  it('updates the product via gateway', async () => {
    const update = await request(GATEWAY_BASE)
      .put(`/investments/products/${productId}`)
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true')
      .send({
        name: 'GW Product Updated',
        rateApr: 0.15,
        compounding: 'monthly',
        minContribution: 150,
        currency: 'NGN',
        active: true,
      });
    expect(update.status).toBe(200);
    expect(update.body?.name).toBe('GW Product Updated');
  });

  it('soft-deletes the product via gateway', async () => {
    const del = await request(GATEWAY_BASE)
      .delete(`/investments/products/${productId}`)
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true');
    expect([200, 204]).toContain(del.status);

    const list = await request(GATEWAY_BASE)
      .get('/investments/products')
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true');
    expect(list.status).toBe(200);
    const ids = (Array.isArray(list.body) ? list.body : []).map((p: any) => p.id);
    expect(ids).not.toContain(productId);
  });

  it('optionally exercises subscriptions and transactions if JWT sub is GUID', async () => {
    const payload: any = jwt.decode(invToken);
    const sub = payload?.sub || payload?.userId || payload?.uid;
    if (!isGuid(sub)) {
      console.warn('JWT sub is not a GUID; skipping subscription/transaction flow.');
      expect(true).toBe(true);
      return;
    }

    // Recreate a product to subscribe to
    const createProduct = await request(GATEWAY_BASE)
      .post('/investments/products')
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true')
      .send({
        name: `GW Sub Product ${Date.now()}`,
        rateApr: 0.1,
        compounding: 'monthly',
        minContribution: 50,
        currency: 'NGN',
      });
    expect([200, 201]).toContain(createProduct.status);
    const prodId = createProduct.body.id || createProduct.body?.data?.id;
    expect(prodId).toBeTruthy();

    // Create subscription
    const createSub = await request(GATEWAY_BASE)
      .post('/investments/subscriptions')
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true')
      .send({ productId: prodId, currency: 'NGN' });
    expect([200, 201]).toContain(createSub.status);
    const subId = createSub.body.id || createSub.body?.data?.id;
    expect(subId).toBeTruthy();

    // List transactions (should be empty initially)
    const listTx = await request(GATEWAY_BASE)
      .get(`/investments/subscriptions/${subId}/transactions`)
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true');
    expect(listTx.status).toBe(200);

    // Contribute
    const contrib = await request(GATEWAY_BASE)
      .post(`/investments/subscriptions/${subId}/contributions`)
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true')
      .send({ amount: 200, currency: 'NGN' });
    expect([202, 200, 201]).toContain(contrib.status);

    // Withdraw
    const withdraw = await request(GATEWAY_BASE)
      .post(`/investments/subscriptions/${subId}/withdrawals`)
      .set('Authorization', `Bearer ${invToken}`)
      .set('x-email-verified', 'true')
      .send({ amount: 50, currency: 'NGN' });
    expect([202, 200, 201]).toContain(withdraw.status);
  });
});