import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, DollarSign, TrendingUp, Target } from "lucide-react";
import type { PerformanceSummary } from "@/hooks/use-performance";

interface PerformanceSummaryCardsProps {
  data?: PerformanceSummary;
  isLoading: boolean;
}

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

function calculateChange(current: number, previous: number): { value: number; isPositive: boolean; percentage: string } {
  if (previous === 0) {
    return { value: current, isPositive: current >= 0, percentage: current > 0 ? "Novo" : "0%" };
  }
  
  const change = ((current - previous) / previous) * 100;
  return {
    value: current - previous,
    isPositive: change >= 0,
    percentage: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
  };
}

export function PerformanceSummaryCards({ data, isLoading }: PerformanceSummaryCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const spendChange = calculateChange(data.spend.today, data.spend.yesterday);
  const revenueChange = calculateChange(data.revenue.today, data.revenue.yesterday);
  const roasChange = calculateChange(data.roas.today, data.roas.yesterday);

  const cards = [
    // Ad Spend Cards
    {
      title: "Gasto Hoje",
      value: formatCurrency(data.spend.today),
      change: spendChange,
      icon: DollarSign,
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
    },
    {
      title: "Gasto Ontem",
      value: formatCurrency(data.spend.yesterday),
      subtitle: "Comparação diária",
      icon: DollarSign,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
    },
    {
      title: "Gasto Este Mês",
      value: formatCurrency(data.spend.thisMonth),
      subtitle: "Acumulado mensal",
      icon: DollarSign,
      iconColor: "text-red-700",
      iconBg: "bg-red-200",
    },
    
    // Revenue Cards
    {
      title: "Receita Hoje",
      value: formatCurrency(data.revenue.today),
      change: revenueChange,
      icon: TrendingUp,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      title: "Receita Ontem",
      value: formatCurrency(data.revenue.yesterday),
      subtitle: "Comparação diária",
      icon: TrendingUp,
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
    },
    {
      title: "Receita Este Mês",
      value: formatCurrency(data.revenue.thisMonth),
      subtitle: "Acumulado mensal",
      icon: TrendingUp,
      iconColor: "text-green-700",
      iconBg: "bg-green-200",
    },

    // ROAS Cards
    {
      title: "ROAS Hoje",
      value: formatROAS(data.roas.today),
      change: roasChange,
      icon: Target,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      title: "ROAS Ontem",
      value: formatROAS(data.roas.yesterday),
      subtitle: "Comparação diária",
      icon: Target,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      title: "ROAS Este Mês",
      value: formatROAS(data.roas.thisMonth),
      subtitle: "Média mensal",
      icon: Target,
      iconColor: "text-blue-700",
      iconBg: "bg-blue-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <IconComponent className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {card.value}
              </div>
              
              {card.change && (
                <div className="flex items-center space-x-2">
                  {card.change.isPositive ? (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-600" />
                  )}
                  <Badge 
                    variant={card.change.isPositive ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {card.change.percentage}
                  </Badge>
                </div>
              )}
              
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">
                  {card.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}