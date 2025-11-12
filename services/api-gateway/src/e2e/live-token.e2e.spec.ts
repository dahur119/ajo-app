import request from 'supertest';
import jwt from 'jsonwebtoken';

// Set LIVE_E2E=true to enable this test. It will hit running services.
const LIVE = process.env.LIVE_E2E === 'true';

const USER_BASE = process.env.USER_BASE_URL || 'http://localhost:8000';
const GATEWAY_BASE = process.env.GATEWAY_BASE_URL || 'http://localhost:3000';

(LIVE ? describe : describe.skip)('Live token e2e via API gateway', () => {
  jest.setTimeout(30000);

  it('registers, logs in, and exercises verified-email enforcement through gateway', async () => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = 'Secret123!';

    // Register user in user-service
    const reg = await request(USER_BASE)
      .post('/api/register')
      .send({ name: 'E2E User', email, password, password_confirmation: password });
    expect(reg.status).toBe(201);

    // Login to get JWT
    const login = await request(USER_BASE)
      .post('/api/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    const token = login.body.token || login.body.access_token || login.body?.data?.token;
    expect(token).toBeTruthy();

    const payload: any = jwt.decode(token);
    const userId = payload?.sub;
    expect(userId).toBeTruthy();

    // Attempt hitting a sensitive route without verified header/claim -> expect 403
    const unverified = await request(GATEWAY_BASE)
      .get('/transactions/cycles/nonexistent/status')
      .set('Authorization', `Bearer ${token}`);
    expect([401, 403]).toContain(unverified.status);

    // Create a group via gateway (verified header true)
    const createGroup = await request(GATEWAY_BASE)
      .post('/transactions/groups')
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true')
      .send({ name: 'E2E Group', ownerUserId: userId });
    expect([200, 201]).toContain(createGroup.status);
    const groupId = createGroup.body.id || createGroup.body.group?.id || createGroup.body?.data?.id;
    expect(groupId).toBeTruthy();

    // Create a cycle with one slot
    const createCycle = await request(GATEWAY_BASE)
      .post('/transactions/cycles')
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true')
      .send({
        groupId,
        amount: '100.00',
        frequency: 'weekly',
        slots: [{ userId, order: 1 }],
      });
    expect([200, 201]).toContain(createCycle.status);
    const cycleId = createCycle.body.cycle?.id || createCycle.body.id || createCycle.body?.data?.cycle?.id;
    expect(cycleId).toBeTruthy();

    // Get cycle status via gateway with verified header -> expect 200
    const status = await request(GATEWAY_BASE)
      .get(`/transactions/cycles/${cycleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true');
    expect(status.status).toBe(200);
  });
});