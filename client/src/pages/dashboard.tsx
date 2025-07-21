import { PerformanceDashboard } from "@/components/performance-dashboard";
import { CountryPerformanceChart, DevicePerformanceChart } from "@/components/geography-charts";
import { useGeography } from "@/hooks/use-geography";

export default function Dashboard() {
  // Load geographic data without date filtering for dashboard overview
  const { data: geoData, isLoading: geoLoading } = useGeography({});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Monitor your traffic tracking performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
              <span className="text-gray-700 font-medium">John Doe</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Performance Dashboard - Main Feature */}
        <PerformanceDashboard />

        {/* Geographic Analytics Section - Keep for complementary insights */}
        {geoData && !geoLoading && (geoData.countries.length > 0 || geoData.devices.length > 0) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Geográficos</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CountryPerformanceChart data={geoData.countries} />
              <DevicePerformanceChart data={geoData.devices} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
