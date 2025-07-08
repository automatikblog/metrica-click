import { hashPassword, verifyPassword } from "../utils/password";
import { generateToken, generateSessionId } from "../utils/jwt";
import { storage } from "../storage";
import { InsertUserNew, InsertTenant, UserNew, Tenant } from "@shared/schema";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  companySlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    tenantId: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tenant: {
    id: number;
    name: string;
    slug: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
  };
  token: string;
}

export class AuthService {
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;
    
    // Find user by email across all tenants
    const user = await storage.getUserNewByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      throw new Error('Account is inactive');
    }
    
    // Get tenant
    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    // Check tenant status
    if (tenant.subscriptionStatus === 'cancelled') {
      throw new Error('Account subscription is cancelled');
    }
    
    // Update last login
    await storage.updateUserNew(user.id, { lastLogin: new Date() });
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    });
    
    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus
      },
      token
    };
  }
  
  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { companyName, companySlug, firstName, lastName, email, password } = registerData;
    
    // Check if user already exists
    const existingUser = await storage.getUserNewByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }
    
    // Check if slug is available
    const existingTenant = await storage.getTenantBySlug(companySlug);
    if (existingTenant) {
      throw new Error('Company slug is already taken');
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create tenant
    const tenant = await storage.createTenant({
      name: companyName,
      slug: companySlug,
      subscriptionPlan: 'trial',
      subscriptionStatus: 'trial',
      maxCampaigns: 5,
      maxMonthlyClicks: 10000
    });
    
    // Create admin user
    const user = await storage.createUserNew({
      tenantId: tenant.id,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin',
      status: 'active'
    });
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    });
    
    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus
      },
      token
    };
  }
  
  async refreshToken(userId: number): Promise<string> {
    const user = await storage.getUserNew(userId);
    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }
    
    return generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    });
  }
}

export const authService = new AuthService();