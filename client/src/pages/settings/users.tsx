import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Mail, Crown, Edit, Trash2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
}

export default function UsersManagementPage() {
  const { user: currentUser, tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);

  // Query para buscar usuários do tenant
  const { data: users = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/users`],
    enabled: !!tenant?.id,
  });

  // Mutation para convidar usuário
  const inviteUser = async () => {
    setIsInviting(true);
    try {
      await apiRequest('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      toast({
        title: "Convite enviado!",
        description: `Um convite foi enviado para ${inviteEmail}`,
      });

      setInviteEmail('');
      setInviteRole('editor');
      setInviteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/users`] });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Não foi possível enviar o convite.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Mutation para atualizar role do usuário
  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      await apiRequest(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      toast({
        title: "Role atualizada",
        description: "A permissão do usuário foi atualizada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/users`] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar role",
        description: error.message || "Não foi possível atualizar a permissão.",
        variant: "destructive",
      });
    }
  };

  // Mutation para remover usuário
  const removeUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;

    try {
      await apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenant?.id}/users`] });
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message || "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Admin</Badge>;
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Editor</Badge>;
      case 'viewer':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Viewer</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const getRoleDescription = (role: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e permissões da sua empresa
            </p>
          </div>
          
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Envie um convite para um novo usuário se juntar à sua empresa
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Permissão</Label>
                  <Select value={inviteRole} onValueChange={(value: 'editor' | 'viewer') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">
                        <div>
                          <div className="font-medium">Editor</div>
                          <div className="text-sm text-muted-foreground">
                            Pode criar e editar campanhas
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div>
                          <div className="font-medium">Viewer</div>
                          <div className="text-sm text-muted-foreground">
                            Apenas visualização
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setInviteDialogOpen(false)}
                    disabled={isInviting}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={inviteUser} disabled={isInviting || !inviteEmail}>
                    <Mail className="w-4 h-4 mr-2" />
                    {isInviting ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários da Empresa
            </CardTitle>
            <CardDescription>
              {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Membro desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                            {user.id === currentUser?.id && (
                              <Crown className="w-4 h-4 inline ml-2 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getRoleBadge(user.role)}
                        <div className="text-xs text-muted-foreground">
                          {getRoleDescription(user.role)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {user.id !== currentUser?.id && (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {user.id === currentUser?.id && (
                          <span className="text-sm text-muted-foreground">Você</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre Permissões */}
        <Card>
          <CardHeader>
            <CardTitle>Níveis de Permissão</CardTitle>
            <CardDescription>
              Entenda os diferentes níveis de acesso no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Admin</Badge>
                <div>
                  <div className="font-medium">Administrador</div>
                  <div className="text-sm text-muted-foreground">
                    Acesso total ao sistema, pode gerenciar usuários, configurações da empresa e todas as funcionalidades
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Editor</Badge>
                <div>
                  <div className="font-medium">Editor</div>
                  <div className="text-sm text-muted-foreground">
                    Pode criar, editar e gerenciar campanhas, acessar todos os relatórios e analytics
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Viewer</Badge>
                <div>
                  <div className="font-medium">Visualizador</div>
                  <div className="text-sm text-muted-foreground">
                    Apenas visualização de campanhas, relatórios e dashboards. Não pode fazer alterações
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}