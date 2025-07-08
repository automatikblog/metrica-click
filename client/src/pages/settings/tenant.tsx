import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, CreditCard, Globe, Settings } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function TenantSettingsPage() {
  const { tenant, user, refreshAuth } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    slug: tenant?.slug || '',
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Aqui você implementaria a API call para atualizar o tenant
      // await apiRequest(`/api/tenants/${tenant?.id}`, {
      //   method: 'PATCH',
      //   body: JSON.stringify(formData)
      // });
      
      toast({
        title: "Configurações salvas",
        description: "As configurações da empresa foram atualizadas com sucesso.",
      });
      
      refreshAuth();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'trial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'business': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações e informações da sua empresa
          </p>
        </div>

        <div className="grid gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Informações gerais sobre sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da sua empresa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">URL da Empresa</Label>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground mr-2">metricaclick.com/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="url-da-empresa"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status da Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Assinatura
              </CardTitle>
              <CardDescription>
                Status e informações do seu plano atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Plano Atual</Label>
                  <div className="mt-1">
                    <Badge className={getPlanColor(tenant?.subscriptionPlan || 'free')}>
                      {tenant?.subscriptionPlan?.toUpperCase() || 'FREE'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(tenant?.subscriptionStatus || 'active')}>
                      {tenant?.subscriptionStatus === 'active' ? 'Ativo' : 
                       tenant?.subscriptionStatus === 'trial' ? 'Período de Teste' :
                       tenant?.subscriptionStatus === 'suspended' ? 'Suspenso' : 'Desconhecido'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">ID do Tenant</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    #{tenant?.id}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Recursos Inclusos no Plano {tenant?.subscriptionPlan?.toUpperCase() || 'FREE'}
                </h4>
                <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Tracking ilimitado de cliques</li>
                  <li>• Analytics em tempo real</li>
                  <li>• Integração com Facebook Ads</li>
                  <li>• Dashboard personalizado</li>
                  {tenant?.subscriptionPlan !== 'free' && (
                    <>
                      <li>• Usuários múltiplos</li>
                      <li>• Relatórios avançados</li>
                      <li>• Suporte prioritário</li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Configurações Avançadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Configurações técnicas e de integração
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Script de Tracking</h4>
                      <p className="text-sm text-muted-foreground">
                        Código para instalação em seus websites
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Globe className="w-4 h-4 mr-2" />
                      Ver Código
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Webhook de Conversões</h4>
                      <p className="text-sm text-muted-foreground">
                        Endpoint para receber conversões externas
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}