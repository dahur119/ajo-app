import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || [];

    const req = context.switchToHttp().getRequest();
    const user = (req as any).user || {};
    const tokenRoles: string[] = this.normalizeRoles(user?.roles, user?.scope, user?.scopes);

    if (requiredRoles.length === 0) {
      // Optional env-based enforcement
      const envRole = (process.env.REQUIRED_ROLE || '').trim();
      if (!envRole) return true;
      return tokenRoles.includes(envRole);
    }

    return requiredRoles.every(r => tokenRoles.includes(r));
  }

  private normalizeRoles(roles?: any, scope?: any, scopes?: any): string[] {
    const out = new Set<string>();
    const add = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(v => typeof v === 'string' && out.add(v));
      } else if (typeof val === 'string') {
        val.split(/[\s,]+/).forEach(v => v && out.add(v));
      }
    };
    add(roles);
    add(scope);
    add(scopes);
    return Array.from(out);
  }
}