import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CountryStats, DeviceStats, TimezoneStats } from "../../server/storage";

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

interface CountryMapProps {
  data: CountryStats[];
}

export function CountryPerformanceChart({ data }: CountryMapProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por País</CardTitle>
          <CardDescription>Top países por número de clicks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Nenhum dado geográfico disponível ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Convert string clickCount to number for chart rendering
  const chartData = data.map(country => ({
    ...country,
    clickCount: parseInt(country.clickCount as string) || 0
  }));

  const top5Countries = chartData.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por País</CardTitle>
        <CardDescription>Top países por número de clicks</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={top5Countries}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ country, percent }) => `${country} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="clickCount"
            >
              {top5Countries.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [value, name === 'clickCount' ? 'Clicks' : name]}
              labelFormatter={(label) => `País: ${label}`}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Country Stats Table */}
        <div className="mt-4 space-y-2">
          {top5Countries.map((country, index) => (
            <div key={country.countryCode} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium">{country.country}</span>
                <Badge variant="outline">{country.countryCode}</Badge>
              </div>
              <div className="text-sm text-gray-600">
                {country.clickCount} clicks • {country.conversionRate.toFixed(1)}% conv.
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DevicePerformanceChart({ data }: { data: DeviceStats[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Dispositivo</CardTitle>
          <CardDescription>Clicks e conversões por tipo de dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Nenhum dado de dispositivo disponível ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Convert string values to numbers for chart rendering
  const chartData = data.map(device => ({
    ...device,
    clickCount: parseInt(device.clickCount as string) || 0,
    conversionCount: parseInt(device.conversionCount as string) || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Dispositivo</CardTitle>
        <CardDescription>Clicks e conversões por tipo de dispositivo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="deviceType" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [
                value, 
                name === 'clickCount' ? 'Clicks' : 
                name === 'conversionCount' ? 'Conversões' : name
              ]}
              labelFormatter={(label) => `Dispositivo: ${label.charAt(0).toUpperCase() + label.slice(1)}`}
            />
            <Bar dataKey="clickCount" fill="#3b82f6" name="Clicks" />
            <Bar dataKey="conversionCount" fill="#10b981" name="Conversões" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Device Stats Summary */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {chartData.map((device) => (
            <div key={device.deviceType} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-medium capitalize">{device.deviceType}</div>
              <div className="text-sm text-gray-600">
                {device.clickCount} clicks
              </div>
              <div className="text-sm text-gray-600">
                {device.conversionRate.toFixed(1)}% conversão
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TimezoneAnalyticsChart({ data }: { data: TimezoneStats[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics por Timezone</CardTitle>
          <CardDescription>Performance por fuso horário</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Nenhum dado de timezone disponível ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const top8Timezones = data.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics por Timezone</CardTitle>
        <CardDescription>Performance por fuso horário</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top8Timezones} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="timezone" 
              tick={{ fontSize: 10 }}
              width={120}
              tickFormatter={(value) => value.split('/').pop() || value}
            />
            <Tooltip 
              formatter={(value, name) => [value, name === 'clickCount' ? 'Clicks' : name]}
              labelFormatter={(label) => `Timezone: ${label}`}
            />
            <Bar dataKey="clickCount" fill="#8b5cf6" name="Clicks" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function GeographicSummary({ countryData, deviceData }: { 
  countryData: CountryStats[], 
  deviceData: DeviceStats[] 
}) {
  const totalCountries = countryData.length;
  const topCountry = countryData[0];
  const mobileClicks = deviceData.find(d => d.deviceType === 'mobile')?.clickCount || 0;
  const desktopClicks = deviceData.find(d => d.deviceType === 'desktop')?.clickCount || 0;
  const totalClicks = mobileClicks + desktopClicks;
  const mobilePercentage = totalClicks > 0 ? (mobileClicks / totalClicks) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{totalCountries}</div>
          <div className="text-sm text-gray-600">Países com tráfego</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{topCountry?.country || 'N/A'}</div>
          <div className="text-sm text-gray-600">Top país</div>
          <div className="text-xs text-gray-500">
            {topCountry?.clickCount || 0} clicks
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{mobilePercentage.toFixed(0)}%</div>
          <div className="text-sm text-gray-600">Tráfego Mobile</div>
          <div className="text-xs text-gray-500">
            {mobileClicks} de {totalClicks} clicks
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">
            {deviceData.find(d => d.deviceType === 'mobile')?.conversionRate.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-gray-600">Conversão Mobile</div>
          <div className="text-xs text-gray-500">
            vs {deviceData.find(d => d.deviceType === 'desktop')?.conversionRate.toFixed(1) || 0}% desktop
          </div>
        </CardContent>
      </Card>
    </div>
  );
}