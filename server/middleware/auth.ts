import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    tenantId: number;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    firstName: string;
    lastName: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.authToken;
    
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Get user from database to ensure it still exists and is active
    const user = await storage.getUserNew(payload.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    // Get tenant to ensure it's still active
    const tenant = await storage.getTenant(payload.tenantId);
    if (!tenant || tenant.subscriptionStatus === 'cancelled') {
      return res.status(401).json({ error: 'Tenant not found or inactive' });
    }
    
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role as 'admin' | 'editor' | 'viewer',
      firstName: user.firstName,
      lastName: user.lastName
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

export async function validateTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // This middleware ensures all operations are scoped to the user's tenant
    // It's mainly for additional validation - tenant scoping should happen in storage layer
    
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    // You could add additional tenant-specific validations here
    // For example, check subscription limits, feature access, etc.
    
    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Rate limiting per tenant
const rateLimitMap = new Map<number, { count: number; resetTime: number }>();

export function rateLimitByTenant(maxRequests: number = 1000, windowMinutes: number = 60) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return next(); // Let requireAuth handle this
    }
    
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const entry = rateLimitMap.get(tenantId);
    
    if (!entry || now > entry.resetTime) {
      // Reset window
      rateLimitMap.set(tenantId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (entry.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }
    
    entry.count++;
    next();
  };
}