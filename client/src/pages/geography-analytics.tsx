import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DateRangeSelector, type DateRange } from "@/components/date-range-selector";
import { CountryPerformanceChart, DevicePerformanceChart, TimezoneAnalyticsChart, GeographicSummary } from "@/components/geography-charts";
import { useGeography } from "@/hooks/use-geography";
import { subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Globe, Smartphone, Clock, MapPin } from "lucide-react";

export default function GeographyAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
    preset: "30d"
  });
  
  const { data: geoData, isLoading, error } = useGeography({ dateRange });
  
  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics Geográficos</h2>
          <p className="text-gray-600">Performance detalhada por localização e dispositivo</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
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

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Analytics Geográficos</h2>
          <p className="text-gray-600">Performance detalhada por localização e dispositivo</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">⚠️ Erro ao carregar dados</div>
              <p className="text-gray-600">
                Os dados geográficos ainda estão sendo configurados. Aguarde alguns minutos e atualize a página.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Sistema em transição: migrando para captura de dados geográficos completos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Geográficos</h2>
          <p className="text-gray-600">Performance detalhada por localização e dispositivo</p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>
      
      {/* Geographic Summary Cards */}
      {geoData && (
        <div className="mb-8">
          <GeographicSummary 
            countryData={geoData.countries} 
            deviceData={geoData.devices} 
          />
        </div>
      )}
      
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {geoData && (
          <>
            <CountryPerformanceChart data={geoData.countries} />
            <DevicePerformanceChart data={geoData.devices} />
          </>
        )}
      </div>
      
      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {geoData && (
          <>
            <TimezoneAnalyticsChart data={geoData.timezones} />
            
            {/* Regional Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Performance Regional
                </CardTitle>
                <CardDescription>Top regiões por número de clicks</CardDescription>
              </CardHeader>
              <CardContent>
                {geoData.regions.length > 0 ? (
                  <div className="space-y-3">
                    {geoData.regions.slice(0, 8).map((region, index) => (
                      <div key={`${region.region}-${region.country}`} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{region.region}</div>
                            <div className="text-sm text-gray-500">{region.country}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{region.clickCount}</div>
                          <div className="text-sm text-gray-500">{region.conversionRate.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Dados regionais serão exibidos conforme o tráfego for capturado
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Países Detalhados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">País</th>
                    <th className="p-2 text-right">Clicks</th>
                    <th className="p-2 text-right">Conv.</th>
                    <th className="p-2 text-right">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  {geoData?.countries.slice(0, 10).map((country) => (
                    <tr key={country.countryCode} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {country.countryCode}
                          </Badge>
                          <span className="font-medium">{country.country}</span>
                        </div>
                      </td>
                      <td className="text-right p-2 font-medium">{country.clickCount}</td>
                      <td className="text-right p-2">{country.conversionCount}</td>
                      <td className="text-right p-2">
                        <Badge variant={country.conversionRate > 5 ? "default" : "secondary"}>
                          {country.conversionRate.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-gray-500">
                        Dados de países serão exibidos conforme capturados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Devices & Browser Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Dispositivos & Navegadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Device Summary */}
              <div>
                <h4 className="font-medium mb-2">Por Dispositivo</h4>
                <div className="space-y-2">
                  {geoData?.devices.map((device) => (
                    <div key={device.deviceType} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="capitalize">{device.deviceType}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{device.clickCount} clicks</div>
                        <div className="text-sm text-gray-500">{device.conversionRate.toFixed(1)}% conv.</div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">Dados sendo capturados...</p>
                  )}
                </div>
              </div>
              
              {/* Timezone Summary */}
              <div>
                <h4 className="font-medium mb-2">Top Timezones</h4>
                <div className="space-y-2">
                  {geoData?.timezones.slice(0, 5).map((tz) => (
                    <div key={tz.timezone} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{tz.timezone.split('/').pop()}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{tz.clickCount}</div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">Dados sendo capturados...</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}