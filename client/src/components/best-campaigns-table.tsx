import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Target, DollarSign } from "lucide-react";
import { useBestCampaigns, type CampaignPerformance } from "@/hooks/use-performance";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatROAS(value: number): string {
  return `${value.toFixed(2)}x`;
}

function CampaignRow({ campaign, rank }: { campaign: CampaignPerformance; rank: number }) {
  const rankColors = {
    1: "bg-yellow-100 text-yellow-800",
    2: "bg-gray-100 text-gray-800", 
    3: "bg-orange-100 text-orange-800"
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4">
        <Badge className={rankColors[rank as keyof typeof rankColors] || "bg-blue-100 text-blue-800"}>
          #{rank}
        </Badge>
        
        <div>
          <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
          <p className="text-sm text-gray-500">{campaign.campaignId}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-6 text-center">
        <div>
          <p className="text-sm text-gray-500">Conversões</p>
          <p className="font-semibold text-blue-600">{campaign.conversions}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Receita</p>
          <p className="font-semibold text-green-600">{formatCurrency(campaign.revenue)}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Gasto</p>
          <p className="font-semibold text-red-600">{formatCurrency(campaign.spend)}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">ROAS</p>
          <Badge variant={campaign.roas >= 2 ? "default" : campaign.roas >= 1 ? "secondary" : "destructive"}>
            {formatROAS(campaign.roas)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function CampaignList({ period }: { period: 'today' | 'yesterday' }) {
  const { data: campaigns, isLoading } = useBestCampaigns(period, 3);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-8 rounded" />
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="text-center">
                  <Skeleton className="h-3 w-12 mb-1 mx-auto" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma campanha encontrada</h3>
        <p className="text-gray-500">
          Não há dados de campanhas para {period === 'today' ? 'hoje' : 'ontem'}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign, index) => (
        <CampaignRow 
          key={campaign.campaignId} 
          campaign={campaign} 
          rank={index + 1}
        />
      ))}
    </div>
  );
}

export function BestCampaignsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <span>Melhores Campanhas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="yesterday">Ontem</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="mt-6">
            <CampaignList period="today" />
          </TabsContent>
          
          <TabsContent value="yesterday" className="mt-6">
            <CampaignList period="yesterday" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}