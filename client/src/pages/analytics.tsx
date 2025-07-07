import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DateRangeSelector, type DateRange } from "@/components/date-range-selector";
import { useCampaigns } from "@/hooks/use-campaigns";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MousePointerClick, 
  ShoppingCart,
  Activity,
  BarChart3,
  PieChart
} from "lucide-react";
import { subDays } from "date-fns";
import type { Campaign, Click, PageView, Conversion, AdSpend } from "@shared/schema";

interface CampaignAnalytics {
  campaign: Campaign;
  clicks: Click[];
  conversions: Conversion[];
  adSpend: AdSpend[];
  revenue: number;
  cost: number;
  roas: number;
  cpa: number;
  roi: number;
  conversionRate: number;
}

export default function Analytics() {
  // Date range state - defaults to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
    preset: "30d"
  });

  // Helper function to format currency in BRL
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns({ dateRange });

  const { data: clicks, isLoading: clicksLoading } = useQuery<Click[]>({
    queryKey: ["/api/clicks"],
  });

  const { data: pageViews, isLoading: pageViewsLoading } = useQuery<PageView[]>({
    queryKey: ["/api/page-views"],
  });

  const { data: conversions, isLoading: conversionsLoading } = useQuery<Conversion[]>({
    queryKey: ["/api/conversions"],
  });

  const isLoading = campaignsLoading || clicksLoading || pageViewsLoading || conversionsLoading;

  // Calculate campaign analytics
  const campaignAnalytics: CampaignAnalytics[] = campaigns?.map(campaign => {
    const campaignClicks = clicks?.filter(c => c.campaignId === campaign.campaignId) || [];
    
    // NOVA LÓGICA: Buscar conversões de múltiplas fontes
    const clickIds = campaignClicks.map(c => c.clickId);
    
    // 1. Conversões rastreadas (com clickId que corresponde aos clicks desta campanha)
    const trackedConversions = conversions?.filter(conv => 
      conv.clickId && clickIds.includes(conv.clickId)
    ) || [];
    
    // 2. Para conversões diretas (sem clickId), vamos atribuir à campanha principal por enquanto
    // Esta é uma implementação temporária - conversões diretas serão atribuídas à primeira campanha ativa
    const isMainCampaign = campaign.campaignId === 'automatikblog-main';
    const directConversions = isMainCampaign ? (conversions?.filter(conv => !conv.clickId) || []) : [];
    
    // Combinar todas as conversões desta campanha
    const allCampaignConversions = [...trackedConversions, ...directConversions];
    
    // CÁLCULO CORRETO DO REVENUE
    const revenue = allCampaignConversions.reduce((sum, conv) => 
      sum + parseFloat(conv.value || "0"), 0
    );
    
    const cost = parseFloat(campaign.totalSpend || "0");
    const roas = cost > 0 ? revenue / cost : 0;
    const cpa = allCampaignConversions.length > 0 ? cost / allCampaignConversions.length : 0;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    const conversionRate = campaignClicks.length > 0 ? (trackedConversions.length / campaignClicks.length) * 100 : 0;

    return {
      campaign,
      clicks: campaignClicks,
      conversions: allCampaignConversions,
      adSpend: [],
      revenue,
      cost,
      roas,
      cpa,
      roi,
      conversionRate
    };
  }) || [];

  // Calculate totals
  const totals = {
    revenue: campaignAnalytics.reduce((sum, ca) => sum + ca.revenue, 0),
    cost: campaignAnalytics.reduce((sum, ca) => sum + ca.cost, 0),
    clicks: clicks?.length || 0,
    conversions: campaignAnalytics.reduce((sum, ca) => sum + ca.conversions.length, 0),
    avgRoas: campaignAnalytics.length > 0 
      ? campaignAnalytics.reduce((sum, ca) => sum + ca.roas, 0) / campaignAnalytics.length 
      : 0,
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Detailed tracking analytics and insights</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Detailed tracking analytics and insights</p>
        </div>
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground">
              From all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Ad Spend
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.cost)}</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average ROAS
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgRoas.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">
              Return on ad spend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clicks
            </CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.clicks}</div>
            <p className="text-xs text-muted-foreground">
              {pageViews?.length || 0} page views
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            Key metrics for each active campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Campaign</th>
                  <th className="text-right p-2">Spend</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">ROAS</th>
                  <th className="text-right p-2">CPA</th>
                  <th className="text-right p-2">ROI</th>
                  <th className="text-right p-2">Conv. Rate</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaignAnalytics.map((ca) => (
                  <tr key={ca.campaign.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{ca.campaign.name}</div>
                        <div className="text-sm text-gray-500">{ca.clicks.length} clicks</div>
                      </div>
                    </td>
                    <td className="text-right p-2">{formatCurrency(ca.cost)}</td>
                    <td className="text-right p-2">{formatCurrency(ca.revenue)}</td>
                    <td className="text-right p-2">
                      <span className={ca.roas >= 1 ? "text-green-600" : "text-red-600"}>
                        {ca.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="text-right p-2">{formatCurrency(ca.cpa)}</td>
                    <td className="text-right p-2">
                      <div className="flex items-center justify-end gap-1">
                        {ca.roi > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={ca.roi >= 0 ? "text-green-600" : "text-red-600"}>
                          {ca.roi.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right p-2">{ca.conversionRate.toFixed(1)}%</td>
                    <td className="text-center p-2">
                      <Badge variant={ca.campaign.status === 'active' ? 'default' : 'secondary'}>
                        {ca.campaign.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Click Distribution by Source</CardTitle>
            <CardDescription>
              Traffic sources breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clicks && clicks.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(
                  clicks.reduce((acc, click) => {
                    const source = click.source || 'Direct';
                    acc[source] = (acc[source] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([source, count]) => (
                  <div key={source} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{source}</span>
                      <span className="text-muted-foreground">{count} clicks</span>
                    </div>
                    <Progress 
                      value={(count / clicks.length) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No click data available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
            <CardDescription>
              Campaigns ranked by ROAS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaignAnalytics.length > 0 ? (
              <div className="space-y-4">
                {campaignAnalytics
                  .sort((a, b) => b.roas - a.roas)
                  .slice(0, 5)
                  .map((ca) => (
                    <div key={ca.campaign.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{ca.campaign.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ROAS: {ca.roas.toFixed(2)}x • ROI: {ca.roi.toFixed(1)}%
                        </div>
                      </div>
                      <Badge variant={ca.roas >= 1 ? "default" : "destructive"}>
                        {ca.roas >= 1 ? "Profitable" : "Unprofitable"}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No campaign data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
