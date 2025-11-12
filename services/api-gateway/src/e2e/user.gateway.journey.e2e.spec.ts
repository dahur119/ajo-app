import request from 'supertest';
import jwt from 'jsonwebtoken';

// Enable by setting LIVE_E2E=true; hits running gateway which proxies to user-service
const LIVE = process.env.LIVE_E2E === 'true';
const GATEWAY_BASE = process.env.GATEWAY_BASE_URL || 'http://localhost:3000';

(LIVE ? describe : describe.skip)('User-service via API gateway (live)', () => {
  jest.setTimeout(30000);

  it('registers and logs in through gateway, then exercises transactions', async () => {
    const email = `gw_${Date.now()}@example.com`;
    const password = 'Secret123!';

    // Register via gateway -> proxies to user-service /users/register
    const reg = await request(GATEWAY_BASE)
      .post('/users/register')
      .send({ name: 'Gateway User', email, password, password_confirmation: password });
    expect([200, 201]).toContain(reg.status);

    // Login via gateway -> proxies to user-service /users/login
    const login = await request(GATEWAY_BASE)
      .post('/users/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    const token = login.body.token || login.body.access_token || login.body?.data?.token;
    expect(token).toBeTruthy();
    const payload: any = jwt.decode(token);
    const userId = payload?.sub || login.body.user?.id || login.body.userId;
    expect(userId).toBeTruthy();

    // Unverified call to a sensitive transactions route -> 401/403
    const unverified = await request(GATEWAY_BASE)
      .get('/transactions/cycles/nonexistent/status')
      .set('Authorization', `Bearer ${token}`);
    expect([401, 403]).toContain(unverified.status);

    // Verified call: create a group via gateway (requires verified header)
    const createGroup = await request(GATEWAY_BASE)
      .post('/transactions/groups')
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true')
      .send({ name: 'GW Group', ownerUserId: userId });
    expect([200, 201]).toContain(createGroup.status);
    const groupId = createGroup.body.id || createGroup.body.group?.id || createGroup.body?.data?.id;
    expect(groupId).toBeTruthy();

    // Verified call: list group members via gateway -> 200
    const listMembers = await request(GATEWAY_BASE)
      .get(`/transactions/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true');
    expect(listMembers.status).toBe(200);

    // Create a cycle and start it via gateway
    const createCycle = await request(GATEWAY_BASE)
      .post('/transactions/cycles')
      .set('Authorization', `Bearer ${token}`)
      .set('x-email-verified', 'true')
      .send({ groupId, amount: '100.00', frequency: 'weekly', slots: [{ userId, order: 1 }] });
    expect([200, 201]).toContain(createCycle.status);
    const cycleId = createCycle.body.cycle?.id || createCycle.body.id || createCycle.body?.data?.cycle?.id;
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
});