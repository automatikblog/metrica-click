import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversion {
  id: number;
  clickId: string | null;
  conversionType: string;
  value: string;
  currency: string;
  createdAt: string;
}

interface ConversionWithClick extends Conversion {
  campaignId?: string;
  campaignName?: string;
  source?: string;
}

export default function ConversionLogs() {
  const { data: conversions, isLoading, refetch } = useQuery({
    queryKey: ['/api/conversions'],
    refetchInterval: 5000, // Auto refresh every 5 seconds
  });

  const { data: clicks } = useQuery({
    queryKey: ['/api/clicks'],
  });

  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Enrich conversions with campaign data
  const enrichedConversions: ConversionWithClick[] = conversions ? conversions.map((conversion: Conversion) => {
    if (conversion.clickId) {
      const click = clicks ? clicks.find((c: any) => c.clickId === conversion.clickId) : null;
      if (click) {
        const campaign = campaigns ? campaigns.find((camp: any) => camp.campaignId === click.campaignId) : null;
        return {
          ...conversion,
          campaignId: click.campaignId,
          campaignName: campaign?.name || click.campaignId,
          source: click.source
        };
      }
    }
    return conversion;
  }) : [];

  const formatCurrency = (value: string, currency: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(num);
  };

  const getConversionStatus = (conversion: ConversionWithClick) => {
    if (conversion.clickId) {
      return { status: 'tracked', label: 'Com Tracking', icon: CheckCircle, color: 'bg-green-500' };
    } else {
      return { status: 'direct', label: 'Conversão Direta', icon: ExternalLink, color: 'bg-blue-500' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 animate-spin" />
          <span>Carregando logs de conversão...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Conversão</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe todas as conversões recebidas via webhook em tempo real
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conversões</p>
                <p className="text-2xl font-bold">{enrichedConversions.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Tracking</p>
                <p className="text-2xl font-bold">
                  {enrichedConversions.filter(c => c.clickId).length}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversões Diretas</p>
                <p className="text-2xl font-bold">
                  {enrichedConversions.filter(c => !c.clickId).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    enrichedConversions.reduce((sum, c) => sum + parseFloat(c.value || '0'), 0).toString(),
                    'BRL'
                  )}
                </p>
              </div>
              <div className="text-green-600 font-bold text-lg">R$</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Conversões
          </CardTitle>
          <CardDescription>
            Lista de todas as conversões recebidas, ordenadas da mais recente para a mais antiga
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrichedConversions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conversão registrada ainda</p>
              <p className="text-sm">Configure o webhook na Hotmart para começar a receber dados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrichedConversions.map((conversion) => {
                const status = getConversionStatus(conversion);
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    key={conversion.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${status.color}/10`}>
                        <StatusIcon className={`h-4 w-4 ${status.color.replace('bg-', 'text-')}`} />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">ID #{conversion.id}</span>
                          <Badge variant={conversion.clickId ? "default" : "secondary"}>
                            {status.label}
                          </Badge>
                          {conversion.campaignName && (
                            <Badge variant="outline">
                              {conversion.campaignName}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Tipo: {conversion.conversionType}</p>
                          {conversion.clickId && (
                            <p>Click ID: {conversion.clickId}</p>
                          )}
                          {conversion.source && (
                            <p>Fonte: {conversion.source}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(conversion.value, conversion.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(conversion.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}