import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';

const secret = new TextEncoder().encode(env.API_SECRET);
const ALG = 'HS256';

export interface TokenClaims {
  deviceId: string;
  familyId: string;
  role: 'member' | 'host';
}

/** Issue a long-lived, account-less device (or host) token. */
export async function signToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.deviceId === 'string' &&
      typeof payload.familyId === 'string' &&
      (payload.role === 'member' || payload.role === 'host')
    ) {
      return { deviceId: payload.deviceId, familyId: payload.familyId, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}
