import { useQuery } from "@tanstack/react-query";
import { useStats } from "@/hooks/use-stats";
import type { DateRange } from "@/components/date-range-selector";

interface Stats {
  totalClicks: number;
  activeCampaigns: number;
  pageViews: number;
  totalConversions: number;
  totalSpend: string;
  conversionRate: string;
}

interface StatsCardsProps {
  dateRange?: DateRange;
}

export function StatsCards({ dateRange }: StatsCardsProps) {
  const { data: stats, isLoading } = useStats({ 
    dateRange,
    refetchInterval: 10000 
  });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Clicks",
      value: stats.totalClicks.toLocaleString(),
      change: "+12.5%",
      changeType: "positive",
      icon: "fas fa-mouse-pointer",
      iconBg: "bg-blue-100",
      iconColor: "text-primary"
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns.toString(),
      change: "+3",
      changeType: "positive",
      icon: "fas fa-bullhorn",
      iconBg: "bg-orange-100",
      iconColor: "text-accent"
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      change: "-0.3%",
      changeType: "negative",
      icon: "fas fa-chart-line",
      iconBg: "bg-green-100",
      iconColor: "text-success"
    },
    {
      title: "Page Views",
      value: stats.pageViews.toLocaleString(),
      change: "+8.1%",
      changeType: "positive",
      icon: "fas fa-eye",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Total Spend",
      value: `R$ ${parseFloat(stats.totalSpend).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: "+5.2%",
      changeType: "positive",
      icon: "fas fa-dollar-sign",
      iconBg: "bg-red-100",
      iconColor: "text-red-600"
    },
    {
      title: "Total Conversions",
      value: stats.totalConversions.toLocaleString(),
      change: `${stats.conversionRate}% rate`,
      changeType: "neutral",
      icon: "fas fa-shopping-cart",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.title} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className={`text-sm flex items-center mt-2 ${
                card.changeType === 'positive' ? 'text-success' : 'text-error'
              }`}>
                <i className={`fas ${card.changeType === 'positive' ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                <span>{card.change}</span>
              </p>
            </div>
            <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
              <i className={`${card.icon} ${card.iconColor} text-lg`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
