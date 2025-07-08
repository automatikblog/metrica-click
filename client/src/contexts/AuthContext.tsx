import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
}

interface RegisterData {
  companyName: string;
  companySlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const queryClient = useQueryClient();

  // Query para buscar dados do usuário autenticado
  const { data: authData, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    enabled: true,
  });

  useEffect(() => {
    if (authData) {
      setUser(authData.user);
      setTenant(authData.tenant);
    } else {
      setUser(null);
      setTenant(null);
    }
  }, [authData]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.user && response.tenant) {
        setUser(response.user);
        setTenant(response.tenant);
        
        // Invalidar cache e refetch dados
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await refetch();
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.user && response.tenant) {
        setUser(response.user);
        setTenant(response.tenant);
        
        // Invalidar cache e refetch dados
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await refetch();
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTenant(null);
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  const refreshAuth = () => {
    refetch();
  };

  const value: AuthContextType = {
    user,
    tenant,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}