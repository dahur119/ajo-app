import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import crypto from 'crypto';

@Injectable()
export class GatewaySigService {
  private readonly secret = process.env.GATEWAY_SIG_SECRET || 'local-gateway-secret';
  private readonly sigHeader = process.env.GW_SIG_HEADER || 'x-gw-sig';
  private readonly tsHeader = process.env.GW_TS_HEADER || 'x-gw-ts';
  private readonly nonceHeader = process.env.GW_NONCE_HEADER || 'x-gw-nonce';
  private readonly userIdHeader = process.env.GW_USER_ID_HEADER || 'x-user-id';
  private readonly maxSkewSec = Number(process.env.GW_MAX_SKEW_SEC || 300);

  // basic in-memory replay protection within process lifetime
  private readonly usedNonces = new Map<string, number>();

  verify(req: Request): { valid: boolean; userId?: string } {
    const uid = (req.headers[this.userIdHeader] as string) || '';
    const sig = (req.headers[this.sigHeader] as string) || '';
    const tsRaw = (req.headers[this.tsHeader] as string) || '';
    const nonce = (req.headers[this.nonceHeader] as string) || '';
    if (!uid || !sig || !tsRaw || !nonce) return { valid: false };

    // timestamp parsing: epoch seconds preferred, ISO-8601 fallback
    let ts: number | null = null;
    if (/^\d+$/.test(tsRaw)) {
      ts = parseInt(tsRaw, 10);
    } else {
      const d = Date.parse(tsRaw);
      if (!Number.isNaN(d)) ts = Math.floor(d / 1000);
    }
    if (ts === null) return { valid: false };

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > this.maxSkewSec) return { valid: false };

    const replayKey = `${uid}:${nonce}`;
    const existing = this.usedNonces.get(replayKey);
    if (existing && now - existing < this.maxSkewSec) return { valid: false };

    // Canonical: METHOD|PATH|userId|timestamp|nonce
    const method = (req.method || 'GET').toUpperCase();
    const pathOnly = (req.originalUrl || req.url || '/').split('?')[0];
    const canonical = `${method}|${pathOnly}|${uid}|${ts}|${nonce}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(canonical, 'utf8');
    const hex = hmac.digest('hex');
    const b64 = Buffer.from(hex, 'hex').toString('base64');

    const match = this.constantTimeEquals(hex, sig) || this.constantTimeEquals(b64, sig);
    if (!match) return { valid: false };

    this.usedNonces.set(replayKey, now);
    return { valid: true, userId: uid };
  }

  private constantTimeEquals(a: string, b: string): boolean {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  }
}