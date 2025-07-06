import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Click, PageView } from "@shared/schema";

export default function Analytics() {
  const { data: clicks, isLoading: clicksLoading } = useQuery<Click[]>({
    queryKey: ["/api/clicks"],
  });

  const { data: pageViews, isLoading: pageViewsLoading } = useQuery<PageView[]>({
    queryKey: ["/api/page-views"],
  });

  const isLoading = clicksLoading || pageViewsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Detailed tracking analytics and insights</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-600">Detailed tracking analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Click Distribution by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {clicks && clicks.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(
                  clicks.reduce((acc, click) => {
                    const source = click.source || 'Direct';
                    acc[source] = (acc[source] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{source}</span>
                    <span className="text-sm text-gray-600">{count} clicks</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-chart-pie text-4xl mb-2"></i>
                <p>No click data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {clicks && clicks.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(
                  clicks.reduce((acc, click) => {
                    const campaign = click.campaignId;
                    acc[campaign] = (acc[campaign] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([campaign, count]) => (
                  <div key={campaign} className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{campaign}</span>
                    <span className="text-sm text-gray-600">{count} clicks</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-chart-bar text-4xl mb-2"></i>
                <p>No campaign data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Page Views Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Page Views</CardTitle>
          </CardHeader>
          <CardContent>
            {pageViews && pageViews.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pageViews.slice(-10).reverse().map((view) => (
                  <div key={view.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate">{view.clickId}</span>
                    <span className="text-gray-600">
                      {new Date(view.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-eye text-4xl mb-2"></i>
                <p>No page view data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Click Details */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            {clicks && clicks.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {clicks.slice(-10).reverse().map((click) => (
                  <div key={click.id} className="p-2 border rounded text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs">{click.clickId}</span>
                      <span className="text-gray-600 text-xs">
                        {new Date(click.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {click.source && <span>Source: {click.source}</span>}
                      {click.referrer && <span className="ml-2">Referrer: {click.referrer}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-mouse-pointer text-4xl mb-2"></i>
                <p>No click data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
