import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  beforeAll(() => {
    process.env.JWT_ALG = 'HS256';
    process.env.JWT_SECRET = 'test_secret';
  });

  it('validates payload and maps claims', async () => {
    const strat = new JwtStrategy();
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      email_verified_at: '2025-01-01T00:00:00Z',
      iss: 'user-service',
      aud: 'api-gateway',
    };
    const result = await (strat as any).validate(payload);
    expect(result.userId).toBe('user-123');
    expect(result.email).toBe('test@example.com');
    expect(result.emailVerified).toBe(true);
    expect(result.issuer).toBe('user-service');
    expect(result.audience).toBe('api-gateway');
  });
});