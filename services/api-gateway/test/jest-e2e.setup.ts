// Patch jsonwebtoken.sign to avoid error when both payload.aud and options.audience are provided
import jwt from 'jsonwebtoken';

const originalSign = jwt.sign as unknown as (
  payload: any,
  secretOrPrivateKey: jwt.Secret,
  options?: jwt.SignOptions,
  callback?: (err: Error | null, encoded?: string) => void,
) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(jwt as any).sign = function patchedSign(
  payload: any,
  secretOrPrivateKey: jwt.Secret,
  options?: jwt.SignOptions,
  callback?: (err: Error | null, encoded?: string) => void,
) {
  if (options) {
    let rest: any = { ...(options as any) };
    if (payload && payload.aud && rest.audience) {
      delete rest.audience;
    }
    if (payload && payload.iss && rest.issuer) {
      delete rest.issuer;
    }
    return originalSign(payload, secretOrPrivateKey, rest, callback);
  }
  return originalSign(payload, secretOrPrivateKey, options, callback);
};