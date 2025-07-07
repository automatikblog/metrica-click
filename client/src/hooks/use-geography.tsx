import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/components/date-range-selector";
import type { CountryStats, RegionStats, DeviceStats, TimezoneStats } from "../../../server/storage";

interface GeographyData {
  countries: CountryStats[];
  regions: RegionStats[];
  devices: DeviceStats[];
  timezones: TimezoneStats[];
}

export function useGeography({ dateRange }: { dateRange?: DateRange }) {
  return useQuery<GeographyData>({
    queryKey: ["/api/analytics/geography", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
      
      const response = await fetch(`/api/analytics/geography?${params}`);
      if (!response.ok) throw new Error('Failed to fetch geography data');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });
}

export function useTopCountries({ dateRange, limit = 10 }: { 
  dateRange?: DateRange, 
  limit?: number 
}) {
  return useQuery<CountryStats[]>({
    queryKey: ["/api/analytics/top-countries", dateRange, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/analytics/top-countries?${params}`);
      if (!response.ok) throw new Error('Failed to fetch top countries');
      return response.json();
    },
    refetchInterval: 30000
  });
}

export function useDevicePerformance({ dateRange }: { dateRange?: DateRange }) {
  return useQuery<DeviceStats[]>({
    queryKey: ["/api/analytics/device-performance", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
      
      const response = await fetch(`/api/analytics/device-performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch device performance');
      return response.json();
    },
    refetchInterval: 30000
  });
}