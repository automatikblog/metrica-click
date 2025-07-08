import crypto from "crypto";

export interface JWTPayload {
  userId: number;
  tenantId: number;
  email: string;
  role: string;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "metricaclick-jwt-secret-change-in-production";

// Simple JWT implementation (for production, consider using jsonwebtoken library)
export function generateToken(payload: Omit<JWTPayload, 'exp'>, expiresInDays: number = 7): string {
  const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
  const fullPayload: JWTPayload = { ...payload, exp };
  
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const [header, body, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Parse payload
    const payload: JWTPayload = JSON.parse(Buffer.from(body, 'base64url').toString());
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}