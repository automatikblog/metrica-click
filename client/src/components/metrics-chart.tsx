import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp, Target } from "lucide-react";
import { useMetricsChart, type MetricsChartData } from "@/hooks/use-performance";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetricsChartProps {
  defaultDays?: number;
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM', { locale: ptBR });
  } catch {
    return dateString;
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    try {
      const date = parseISO(label);
      const formattedDate = format(date, 'dd/MM/yyyy', { locale: ptBR });
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formattedDate}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">{entry.name}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    } catch {
      return null;
    }
  }
  return null;
}

export function MetricsChart({ defaultDays = 30 }: MetricsChartProps) {
  const [selectedDays, setSelectedDays] = useState(defaultDays);
  const { data: metricsData, isLoading } = useMetricsChart(selectedDays);

  const formatDataForChart = (data: MetricsChartData[]) => {
    return data.map(item => ({
      ...item,
      date: formatDate(item.date),
      fullDate: item.date // Keep original for tooltip
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Métricas Diárias</span>
            </div>
            <Skeleton className="h-8 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Carregando gráfico...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metricsData || metricsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Métricas Diárias</span>
            </div>
            <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
              <p>Não há dados de métricas para o período selecionado.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = formatDataForChart(metricsData);

  // Calculate summary stats
  const totalClicks = metricsData.reduce((sum, day) => sum + day.clicks, 0);
  const totalConversions = metricsData.reduce((sum, day) => sum + day.conversions, 0);
  const avgClicksPerDay = totalClicks / metricsData.length;
  const avgConversionsPerDay = totalConversions / metricsData.length;
  const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Métricas Diárias</span>
          </div>
          <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-600">Total Clicks</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-blue-600">≈{avgClicksPerDay.toFixed(0)}/dia</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Target className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-600">Total Conversões</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{totalConversions.toLocaleString()}</p>
            <p className="text-xs text-green-600">≈{avgConversionsPerDay.toFixed(1)}/dia</p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-600 mb-1">Taxa Conversão</p>
            <p className="text-2xl font-bold text-purple-900">{overallConversionRate.toFixed(1)}%</p>
            <p className="text-xs text-purple-600">média período</p>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm font-medium text-orange-600 mb-1">Período</p>
            <p className="text-2xl font-bold text-orange-900">{selectedDays}</p>
            <p className="text-xs text-orange-600">dias analisados</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval={selectedDays > 30 ? Math.floor(selectedDays / 10) : selectedDays > 14 ? 2 : 0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                name="Clicks"
              />
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                name="Conversões"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}