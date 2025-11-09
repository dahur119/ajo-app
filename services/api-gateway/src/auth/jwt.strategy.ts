import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const alg = (process.env.JWT_ALG || 'HS256').toUpperCase();

    const base = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
    } as any;

    if (alg === 'RS256') {
      Object.assign(base, {
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        secretOrKeyProvider: jwksRsa.passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
          jwksUri: process.env.JWT_JWKS_URI as string,
        }),
      });
    } else {
      Object.assign(base, {
        algorithms: ['HS256'],
        secretOrKey: process.env.JWT_SECRET,
      });
    }

    super(base);
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      emailVerified: !!payload.email_verified_at,
      issuer: payload.iss,
      audience: payload.aud,
    };
  }
}