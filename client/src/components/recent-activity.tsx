import { useQuery } from "@tanstack/react-query";
import type { Click } from "@shared/schema";

export function RecentActivity() {
  const { data: clicks, isLoading } = useQuery<Click[]>({
    queryKey: ["/api/clicks"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recentClicks = clicks?.slice(-10).reverse() || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button className="text-primary hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
      </div>
      <div className="p-6">
        {recentClicks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-mouse-pointer text-4xl mb-4"></i>
            <p>No click activity yet</p>
            <p className="text-sm">Clicks will appear here as they come in</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-3 font-medium">Campaign</th>
                  <th className="pb-3 font-medium">Click ID</th>
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentClicks.map((click) => (
                  <tr key={click.id} className="border-t border-gray-100">
                    <td className="py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <i className="fas fa-bullhorn text-primary text-xs"></i>
                        </div>
                        <span className="font-medium text-gray-900">{click.campaignId}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 font-mono text-xs">{click.clickId}</td>
                    <td className="py-3 text-gray-600">{click.source || 'Direct'}</td>
                    <td className="py-3 text-gray-600">
                      {new Date(click.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-success text-white text-xs rounded-full">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
