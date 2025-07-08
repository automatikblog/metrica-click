import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Crown, Building } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, tenant, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: "fas fa-tachometer-alt", roles: ['admin', 'editor', 'viewer'] },
    { name: "Campaigns", href: "/campaigns", icon: "fas fa-bullhorn", roles: ['admin', 'editor'] },
    { name: "Analytics", href: "/analytics", icon: "fas fa-chart-bar", roles: ['admin', 'editor', 'viewer'] },
    { name: "Geografia", href: "/geography", icon: "fas fa-globe-americas", roles: ['admin', 'editor', 'viewer'] },
    { name: "Integration", href: "/integration", icon: "fas fa-code", roles: ['admin', 'editor'] },
    { name: "Webhook", href: "/webhook", icon: "fas fa-link", roles: ['admin'] },
    { name: "Logs Conversão", href: "/conversion-logs", icon: "fas fa-list-alt", roles: ['admin', 'editor', 'viewer'] },
    { name: "Logs de Clicks", href: "/click-logs", icon: "fas fa-mouse-pointer", roles: ['admin', 'editor', 'viewer'] },
    { name: "Facebook Ads", href: "/facebook", icon: "fab fa-facebook", roles: ['admin'] },
  ];

  const settingsNavigation = [
    { name: "Configurações da Empresa", href: "/settings/tenant", icon: Building, roles: ['admin'] },
    { name: "Gestão de Usuários", href: "/settings/users", icon: User, roles: ['admin'] },
  ];

  // Filtrar navegação baseada na role do usuário
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'viewer')
  );

  const filteredSettingsNavigation = settingsNavigation.filter(item => 
    item.roles.includes(user?.role || 'viewer')
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs">Admin</Badge>;
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs">Editor</Badge>;
      case 'viewer':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 text-xs">Viewer</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-white text-lg"></i>
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900">MétricaClick</h1>
            <p className="text-sm text-gray-500">{tenant?.name || 'Traffic Tracker'}</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 rounded-lg transition-colors",
                location === item.href
                  ? "text-primary bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <i className={`${item.icon} w-5`}></i>
              <span className="ml-3 font-medium">{item.name}</span>
            </Link>
          ))}
          
          {/* Seção de Configurações */}
          {filteredSettingsNavigation.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Configurações</span>
                </div>
              </div>
              {filteredSettingsNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-colors",
                    location === item.href
                      ? "text-primary bg-blue-50"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </nav>
      
      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-3 h-auto">
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(user?.role || 'viewer')}
                  </div>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tenant?.name}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {user?.role === 'admin' && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings/tenant" className="flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Configurações da Empresa
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/users" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Gestão de Usuários
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem 
              onClick={logout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
