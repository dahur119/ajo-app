import request from 'supertest';
import jwt from 'jsonwebtoken';

// Enable by setting LIVE_E2E=true; hits running gateway which proxies to services
const LIVE = process.env.LIVE_E2E === 'true';
const GATEWAY_BASE = process.env.GATEWAY_BASE_URL || 'http://localhost:3000';
const USER_BASE = process.env.USER_BASE_URL || 'http://localhost:8000';

(LIVE ? describe : describe.skip)(
  'API Gateway full journey: user-service → transaction-service → investment-service',
  () => {
    jest.setTimeout(40000);

    let email = '';
    let password = 'Secret123!';
    let token = '';
    let userId: string = '';
    let groupId: string = '';
    let cycleId: string = '';
    let productId: string = '';

    it('registers and logs in via gateway (proxied to user-service)', async () => {
      email = `full_${Date.now()}@example.com`;

      const reg = await request(GATEWAY_BASE)
        .post('/users/register')
        .send({ name: 'Full Journey User', email, password, password_confirmation: password });
      expect([200, 201]).toContain(reg.status);

      const login = await request(GATEWAY_BASE)
        .post('/users/login')
        .send({ email, password });
      expect(login.status).toBe(200);
      token = login.body.token || login.body.access_token || login.body?.data?.token;
      expect(token).toBeTruthy();
      const payload: any = jwt.decode(token);
      userId = payload?.sub || login.body.user?.id || login.body.userId;
      expect(userId).toBeTruthy();
    });

    it('transaction-service auth/verification: 401 without token, 401 invalid token, 403 without verified header', async () => {
      const noToken = await request(GATEWAY_BASE)
        .get('/transactions/cycles/nonexistent/status');
      expect(noToken.status).toBe(401);

      const invalid = await request(GATEWAY_BASE)
        .get('/transactions/cycles/nonexistent/status')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(invalid.status).toBe(401);

      const unverified = await request(GATEWAY_BASE)
        .get('/transactions/cycles/nonexistent/status')
        .set('Authorization', `Bearer ${token}`);
      expect([401, 403]).toContain(unverified.status);
    });

    it('transaction-service: verified header allows group/cycle lifecycle', async () => {
      const createGroup = await request(GATEWAY_BASE)
        .post('/transactions/groups')
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ name: 'Full Group', ownerUserId: userId });
      expect([200, 201]).toContain(createGroup.status);
      groupId = createGroup.body.id || createGroup.body.group?.id || createGroup.body?.data?.id;
      expect(groupId).toBeTruthy();

      const listMembers = await request(GATEWAY_BASE)
        .get(`/transactions/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect(listMembers.status).toBe(200);

      const createCycle = await request(GATEWAY_BASE)
        .post('/transactions/cycles')
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ groupId, amount: '250.00', frequency: 'weekly', slots: [{ userId, order: 1 }] });
      expect([200, 201]).toContain(createCycle.status);
      cycleId = createCycle.body.cycle?.id || createCycle.body.id || createCycle.body?.data?.cycle?.id;
      expect(cycleId).toBeTruthy();

      const startCycle = await request(GATEWAY_BASE)
        .post(`/transactions/cycles/${cycleId}/start`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect([200, 201]).toContain(startCycle.status);

      const status = await request(GATEWAY_BASE)
        .get(`/transactions/cycles/${cycleId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect(status.status).toBe(200);
    });

    it('investment-service verification: 403 without verified header', async () => {
      const res = await request(GATEWAY_BASE)
        .get('/investments/products')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('investment-service: verified header allows products CRUD and subscription flow', async () => {
      const create = await request(GATEWAY_BASE)
        .post('/investments/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ name: `Full Prod ${Date.now()}`, rateApr: 0.08, compounding: 'monthly', minContribution: 100, currency: 'NGN' });
      expect([200, 201]).toContain(create.status);
      productId = create.body.id || create.body?.data?.id;
      expect(productId).toBeTruthy();

      const list = await request(GATEWAY_BASE)
        .get('/investments/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect(list.status).toBe(200);

      const update = await request(GATEWAY_BASE)
        .put(`/investments/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ name: 'Full Prod Updated', rateApr: 0.1, minContribution: 150, currency: 'NGN', active: true });
      expect(update.status).toBe(200);
      expect(update.body?.name).toBe('Full Prod Updated');

      const del = await request(GATEWAY_BASE)
        .delete(`/investments/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect([200, 204]).toContain(del.status);

      const listAfter = await request(GATEWAY_BASE)
        .get('/investments/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect(listAfter.status).toBe(200);

      const updateMissing = await request(GATEWAY_BASE)
        .put(`/investments/products/non-existent-id`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ name: 'Does Not Exist' });
      expect(updateMissing.status).toBe(404);

      const createSub = await request(GATEWAY_BASE)
        .post('/investments/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ productId: productId || `stub-${Date.now()}`, currency: 'NGN' });
      expect([200, 201]).toContain(createSub.status);
      const subId = createSub.body.id || createSub.body?.data?.id;
      expect(subId).toBeTruthy();

      const listTx = await request(GATEWAY_BASE)
        .get(`/investments/subscriptions/${subId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true');
      expect(listTx.status).toBe(200);

      const contrib = await request(GATEWAY_BASE)
        .post(`/investments/subscriptions/${subId}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ amount: 200, currency: 'NGN' });
      expect([202, 200, 201]).toContain(contrib.status);

      const withdraw = await request(GATEWAY_BASE)
        .post(`/investments/subscriptions/${subId}/withdrawals`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-email-verified', 'true')
        .send({ amount: 50, currency: 'NGN' });
      expect([202, 200, 201]).toContain(withdraw.status);
    });
  },
);