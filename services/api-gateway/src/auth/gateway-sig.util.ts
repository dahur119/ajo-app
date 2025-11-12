import crypto from 'crypto';
import type * as Express from 'express';

export function makeSignedHeaders(req: Express.Request, forwardedPath: string) {
  const secret = process.env.GATEWAY_SIG_SECRET || 'local-gateway-secret';
  const ts = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const method = (req.method || 'GET').toUpperCase();
  const pathOnly = forwardedPath.split('?')[0];
  const userId = (req as any).user?.userId || '';
  const canonical = `${method}|${pathOnly}|${userId}|${ts}|${nonce}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(canonical, 'utf8');
  const hex = hmac.digest('hex');
  return {
    'x-gw-sig': hex,
    'x-gw-ts': String(ts),
    'x-gw-nonce': nonce,
    'x-user-id': userId,
  };
}