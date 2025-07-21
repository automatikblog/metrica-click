import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeSelector, type DateRange } from "@/components/date-range-selector";
import { PerformanceSummaryCards } from "@/components/performance-summary-cards";
import { BestCampaignsTable } from "@/components/best-campaigns-table";
import { BestAdsTable } from "@/components/best-ads-table";
import { BestChannelsTable } from "@/components/best-channels-table";
import { MetricsChart } from "@/components/metrics-chart";
import { usePerformanceSummary } from "@/hooks/use-performance";
import { TrendingUp, Filter } from "lucide-react";
import { useState } from "react";
import { subDays } from "date-fns";

interface PerformanceDashboardProps {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange) => void;
}

export function PerformanceDashboard({ 
  dateRange, 
  onDateRangeChange 
}: PerformanceDashboardProps = {}) {
  const [localDateRange, setLocalDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
    preset: "30d"
  });

  const { data: performanceSummary, isLoading: summaryLoading } = usePerformanceSummary({
    dateRange: dateRange || localDateRange,
    refetchInterval: 30000
  });

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setLocalDateRange(newDateRange);
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <span>Painel de Performance</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Acompanhe métricas de gastos, receita, ROAS e performance de campanhas
          </p>
        </div>
        
        {onDateRangeChange && (
          <div className="flex items-center space-x-4">
            <DateRangeSelector
              value={dateRange || localDateRange}
              onChange={handleDateRangeChange}
              className="mr-4"
            />
            
            {/* Future: Add more filters here */}
            <div className="flex items-center space-x-2 text-gray-500">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Mais filtros em breve</span>
            </div>
          </div>
        )}
      </div>

      {/* Performance Summary Cards */}
      <PerformanceSummaryCards 
        data={performanceSummary} 
        isLoading={summaryLoading} 
      />

      {/* Metrics Chart */}
      <MetricsChart defaultDays={30} />

      {/* Performance Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Best Campaigns */}
        <BestCampaignsTable />
        
        {/* Best Channels */}
        <BestChannelsTable />
      </div>

      {/* Best Ads Table - Full Width */}
      <BestAdsTable />

      {/* Performance Insights Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Insights de Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceSummary && (
              <>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-blue-900">ROAS Hoje vs Ontem</h4>
                    <p className="text-sm text-blue-700">
                      {performanceSummary.roas.today > performanceSummary.roas.yesterday 
                        ? "✅ Melhoria de performance detectada" 
                        : "⚠️ Performance inferior ao dia anterior"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {performanceSummary.roas.today.toFixed(2)}x
                    </p>
                    <p className="text-sm text-blue-600">ROAS atual</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-green-900">Receita Este Mês</h4>
                    <p className="text-sm text-green-700">
                      Performance acumulada do mês atual
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(performanceSummary.revenue.thisMonth)}
                    </p>
                    <p className="text-sm text-green-600">receita mensal</p>
                  </div>
                </div>

                {performanceSummary.spend.today > 0 && (
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-orange-900">Gasto vs Meta</h4>
                      <p className="text-sm text-orange-700">
                        Acompanhe se está dentro do orçamento planejado
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                        }).format(performanceSummary.spend.today)}
                      </p>
                      <p className="text-sm text-orange-600">gasto hoje</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {summaryLoading && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}