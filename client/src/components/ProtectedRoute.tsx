import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'viewer';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado para acessar esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }

    if (requiredRole && user && !hasRequiredRole(user.role, requiredRole)) {
      toast({
        title: "Permissão Insuficiente",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, requiredRole, toast]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não autenticado, não renderizar nada (redirect será feito no useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // Se há role requerida e usuário não tem permissão, não renderizar
  if (requiredRole && user && !hasRequiredRole(user.role, requiredRole)) {
    return null;
  }

  return <>{children}</>;
}

// Função para verificar hierarquia de roles
function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'admin': 3,
    'editor': 2,
    'viewer': 1
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}