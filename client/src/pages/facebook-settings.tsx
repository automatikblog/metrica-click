import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Facebook, CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";

interface FacebookStatus {
  connected: boolean;
}

interface FacebookAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  accountStatus: string;
}

interface Campaign {
  id: number;
  name: string;
  campaignId: string;
  status: string;
}

interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: string | null;
  syncHistory: Array<{
    campaignId: string;
    success: boolean;
    dataPoints: number;
    totalSpend: number;
    error?: string;
  }>;
}

export default function FacebookSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [facebookCampaignId, setFacebookCampaignId] = useState<string>("");

  // Queries
  const { data: facebookStatus, isLoading: statusLoading } = useQuery<FacebookStatus>({
    queryKey: ['/api/facebook/status'],
  });

  const { data: adAccounts, isLoading: accountsLoading } = useQuery<FacebookAdAccount[]>({
    queryKey: ['/api/facebook/ad-accounts'],
    enabled: facebookStatus?.connected === true,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const { data: syncStatus, isLoading: syncStatusLoading } = useQuery<SyncStatus>({
    queryKey: ['/api/facebook/sync-status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Mutations
  const connectCampaignMutation = useMutation({
    mutationFn: async (data: { campaignId: string; facebookCampaignId: string }) => {
      const response = await fetch(`/api/campaigns/${data.campaignId}/connect-facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebookCampaignId: data.facebookCampaignId,
          facebookCampaignName: `Facebook Campaign ${data.facebookCampaignId}`
        })
      });
      if (!response.ok) throw new Error('Failed to connect campaign');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Campanha conectada ao Facebook com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setSelectedCampaign("");
      setFacebookCampaignId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao conectar campanha",
        variant: "destructive",
      });
    },
  });

  const syncCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await fetch(`/api/campaigns/${campaignId}/sync-facebook`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to sync campaign');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Concluído",
        description: `${data.dataPoints} pontos de dados sincronizados. Gasto total: $${data.totalSpend.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/facebook/sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Sync",
        description: error.message || "Falha na sincronização",
        variant: "destructive",
      });
    },
  });

  const syncAllCampaignsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/facebook/sync-all', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to sync all campaigns');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Geral Concluído",
        description: `${data.successfulSyncs}/${data.totalCampaigns} campanhas sincronizadas. Total: $${data.totalSpend.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/facebook/sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Sync Geral",
        description: error.message || "Falha na sincronização geral",
        variant: "destructive",
      });
    },
  });

  const handleConnectFacebook = () => {
    window.location.href = "/auth/facebook";
  };

  const handleConnectCampaign = () => {
    if (!selectedCampaign || !facebookCampaignId) {
      toast({
        title: "Dados Incompletos",
        description: "Selecione uma campanha e informe o ID do Facebook",
        variant: "destructive",
      });
      return;
    }

    connectCampaignMutation.mutate({
      campaignId: selectedCampaign,
      facebookCampaignId: facebookCampaignId,
    });
  };

  const getStatusBadge = (connected: boolean) => {
    return connected ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-4 h-4 mr-1" />
        Conectado
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-4 h-4 mr-1" />
        Desconectado
      </Badge>
    );
  };

  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return "Nunca";
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Facebook className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Configuração Facebook Ads</h1>
      </div>

      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Status da Conexão Facebook
            {statusLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              getStatusBadge(facebookStatus?.connected || false)
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!facebookStatus?.connected ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Conecte sua conta Facebook Ads para sincronizar dados de custo automaticamente.
              </p>
              <Button onClick={handleConnectFacebook} className="bg-blue-600 hover:bg-blue-700">
                <Facebook className="w-4 h-4 mr-2" />
                Conectar com Facebook Ads
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">
                ✅ Conta Facebook conectada com sucesso!
              </p>
              
              {/* Contas de Anúncio */}
              {adAccounts && adAccounts.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Contas de Anúncio Disponíveis:</h4>
                  {adAccounts.map((account) => (
                    <div key={account.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-gray-600">
                        ID: {account.id} | Moeda: {account.currency} | Status: {account.accountStatus}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conectar Campanhas */}
      {facebookStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Conectar Campanhas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaign-select">Selecione uma Campanha Interna</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma campanha..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                      {campaign.name} ({campaign.campaignId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="facebook-campaign-id">ID da Campanha Facebook</Label>
              <Input
                id="facebook-campaign-id"
                placeholder="Ex: 120210000000000000"
                value={facebookCampaignId}
                onChange={(e) => setFacebookCampaignId(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Encontre o ID da campanha no Facebook Ads Manager
              </p>
            </div>

            <Button 
              onClick={handleConnectCampaign}
              disabled={connectCampaignMutation.isPending || !selectedCampaign || !facebookCampaignId}
            >
              {connectCampaignMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Conectar Campanha
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status de Sincronização */}
      {facebookStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Status de Sincronização
              {syncStatus?.isRunning && <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Status</div>
                <div className="font-medium">
                  {syncStatus?.isRunning ? "Sincronizando..." : "Parado"}
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Última Sincronização</div>
                <div className="font-medium">
                  {formatSyncTime(syncStatus?.lastSyncTime || null)}
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">Próxima Sync Automática</div>
                <div className="font-medium">Diariamente às 02:00</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => syncAllCampaignsMutation.mutate()}
                disabled={syncAllCampaignsMutation.isPending || syncStatus?.isRunning}
                variant="outline"
              >
                {syncAllCampaignsMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Sincronizar Todas as Campanhas
              </Button>
            </div>

            {/* Histórico de Sync */}
            {syncStatus?.syncHistory && syncStatus.syncHistory.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Últimas Sincronizações</h4>
                <div className="space-y-2">
                  {syncStatus.syncHistory.slice(0, 5).map((sync, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {sync.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-mono text-sm">{sync.campaignId}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {sync.success ? (
                          `${sync.dataPoints} pontos | $${sync.totalSpend.toFixed(2)}`
                        ) : (
                          sync.error || "Erro desconhecido"
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Campanhas Conectadas */}
      {facebookStatus?.connected && campaigns && (
        <Card>
          <CardHeader>
            <CardTitle>Campanhas Conectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns
                .filter(campaign => campaign.campaignId) // Only show campaigns that exist
                .map((campaign) => (
                <div key={campaign.campaignId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-gray-600">ID: {campaign.campaignId}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Ativa</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => syncCampaignMutation.mutate(campaign.campaignId)}
                      disabled={syncCampaignMutation.isPending}
                    >
                      {syncCampaignMutation.isPending && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                      Sync
                    </Button>
                  </div>
                </div>
              ))}
              
              {campaigns.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma campanha encontrada. Crie uma campanha primeiro.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}