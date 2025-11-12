import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GatewaySigService } from './gateway-sig.service';
import { JwtGuard } from './jwt.guard';

@Injectable()
export class GatewaySigGuard implements CanActivate {
  constructor(private readonly sig: GatewaySigService, private readonly jwt: JwtGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const enabled = (process.env.GATEWAY_SIG_ENABLED || 'true') === 'true';
    if (!enabled) {
      const ok = await Promise.resolve(this.jwt.canActivate(context));
      if (ok) {
        req.authScheme = 'JWT';
      }
      return !!ok;
    }
    const res = this.sig.verify(req);
    if (res.valid) {
      // attach user and mark scheme
      req.user = { ...(req.user || {}), userId: res.userId };
      req.authScheme = 'GatewaySig';
      return true;
    }
    // fallback to JWT
    const ok = await Promise.resolve(this.jwt.canActivate(context));
    if (ok) {
      req.authScheme = 'JWT';
    }
    return !!ok;
  }
}