import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (authData && (authData as any).user && (authData as any).tenant) {
      setUser((authData as any).user);
      setTenant((authData as any).tenant);
    } else {
      setUser(null);
      setTenant(null);
    }
  }, [authData]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      if (data.user && data.tenant) {
        setUser(data.user);
        setTenant(data.tenant);
        
        // Invalidar cache e refetch dados após um pequeno delay para permitir que o cookie seja definido
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setTimeout(async () => {
          await refetch();
        }, 100);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const responseData = await response.json();

      if (responseData.user && responseData.tenant) {
        setUser(responseData.user);
        setTenant(responseData.tenant);
        
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
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTenant(null);
      queryClient.clear();
      // The router will automatically redirect to login when isAuthenticated becomes false
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