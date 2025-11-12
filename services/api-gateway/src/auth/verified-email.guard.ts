import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const headerVal = (req.headers?.['x-email-verified'] || req.headers?.['X-Email-Verified']) as string | undefined;
    const viaHeader = headerVal === 'true';
    const viaClaim = !!req.user?.emailVerified;

    if (viaHeader || viaClaim) {
      return true;
    }

    throw new ForbiddenException('Email not verified');
  }
}