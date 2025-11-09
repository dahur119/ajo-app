import { VerifiedEmailGuard } from './verified-email.guard';
import { ForbiddenException } from '@nestjs/common';

describe('VerifiedEmailGuard', () => {
  const guard = new VerifiedEmailGuard();

  const makeCtx = (req: any) => ({
    switchToHttp: () => ({ getRequest: () => req }),
  }) as any;

  it('allows when header x-email-verified=true', () => {
    const ctx = makeCtx({ headers: { 'x-email-verified': 'true' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows when JWT claim emailVerified=true', () => {
    const ctx = makeCtx({ headers: {}, user: { emailVerified: true } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('blocks when neither header nor claim is verified', () => {
    const ctx = makeCtx({ headers: {}, user: { emailVerified: false } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});