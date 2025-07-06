import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "@/components/date-range-selector";

interface StatsData {
  totalClicks: number;
  activeCampaigns: number;
  pageViews: number;
  totalConversions: number;
  totalSpend: string;
  conversionRate: string;
}

interface UseStatsOptions {
  dateRange?: DateRange;
  refetchInterval?: number;
}

/**
 * Hook to fetch dashboard statistics with optional date filtering
 */
export function useStats({ dateRange, refetchInterval = 30000 }: UseStatsOptions = {}) {
  const queryKey = dateRange 
    ? ["/api/stats", format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")]
    : ["/api/stats"];

  const searchParams = new URLSearchParams();
  if (dateRange) {
    searchParams.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
    searchParams.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/stats?${queryString}` : "/api/stats";

  return useQuery<StatsData>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}