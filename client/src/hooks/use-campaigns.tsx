import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "@/components/date-range-selector";
import type { Campaign } from "@shared/schema";

interface CampaignWithSpend extends Campaign {
  totalSpend: string;
  adSpendData?: Array<{
    date: string;
    spend: string;
  }>;
}

interface UseCampaignsOptions {
  dateRange?: DateRange;
  refetchInterval?: number;
}

/**
 * Hook to fetch campaigns with optional date filtering for spend data
 */
export function useCampaigns({ dateRange, refetchInterval = 30000 }: UseCampaignsOptions = {}) {
  const queryKey = dateRange 
    ? ["/api/campaigns", format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")]
    : ["/api/campaigns"];

  const searchParams = new URLSearchParams();
  if (dateRange) {
    searchParams.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
    searchParams.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/campaigns?${queryString}` : "/api/campaigns";

  return useQuery<CampaignWithSpend[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}