import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/components/date-range-selector";

export interface PerformanceSummary {
  spend: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  revenue: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  roas: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  conversions: number;
  revenue: number;
  spend: number;
  roas: number;
}

export interface AdPerformance {
  adName: string;
  adId: string | null;
  conversions: number;
  revenue: number;
  clicks: number;
  conversionRate: number;
}

export interface ChannelPerformance {
  channel: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface MetricsChartData {
  date: string;
  clicks: number;
  conversions: number;
}

interface UsePerformanceOptions {
  dateRange?: DateRange;
  refetchInterval?: number;
}

export function usePerformanceSummary({ dateRange, refetchInterval = 30000 }: UsePerformanceOptions = {}) {
  const queryKey = dateRange 
    ? ["/api/performance/summary", dateRange.from.toISOString().split('T')[0], dateRange.to.toISOString().split('T')[0]]
    : ["/api/performance/summary"];

  const searchParams = new URLSearchParams();
  if (dateRange) {
    searchParams.set("startDate", dateRange.from.toISOString().split('T')[0]);
    searchParams.set("endDate", dateRange.to.toISOString().split('T')[0]);
  }

  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/performance/summary?${queryString}` : "/api/performance/summary";

  return useQuery<PerformanceSummary>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch performance summary: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval,
    staleTime: 10000,
  });
}

export function useBestCampaigns(period: 'today' | 'yesterday' = 'today', limit: number = 3) {
  return useQuery<CampaignPerformance[]>({
    queryKey: ["/api/performance/best-campaigns", period, limit],
    queryFn: async () => {
      const response = await fetch(`/api/performance/best-campaigns?period=${period}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch best campaigns: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useBestAds(limit: number = 10) {
  return useQuery<AdPerformance[]>({
    queryKey: ["/api/performance/best-ads", limit],
    queryFn: async () => {
      const response = await fetch(`/api/performance/best-ads?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch best ads: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useBestChannels(limit: number = 10) {
  return useQuery<ChannelPerformance[]>({
    queryKey: ["/api/performance/best-channels", limit],
    queryFn: async () => {
      const response = await fetch(`/api/performance/best-channels?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch best channels: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useMetricsChart(days: number = 30) {
  return useQuery<MetricsChartData[]>({
    queryKey: ["/api/performance/metrics-chart", days],
    queryFn: async () => {
      const response = await fetch(`/api/performance/metrics-chart?days=${days}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics chart: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}