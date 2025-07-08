export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'admin': 3,
    'editor': 2,
    'viewer': 1
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

export function getRoleDescription(role: string): string {
  switch (role) {
    case 'admin':
      return 'Acesso total ao sistema, pode gerenciar usuários e configurações';
    case 'editor':
      return 'Pode criar e editar campanhas, ver todos os relatórios';
    case 'viewer':
      return 'Apenas visualização de campanhas e relatórios';
    default:
      return '';
  }
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'editor':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'viewer':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}