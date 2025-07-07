import { useQuery } from "@tanstack/react-query";
import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeSelector, type DateRange } from "@/components/date-range-selector";
import { 
  Download, 
  Search, 
  RefreshCw, 
  MousePointerClick,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Bot,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { subDays } from "date-fns";
import type { Click, Campaign } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ExpandedRow {
  [key: number]: boolean;
}

export default function ClickLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<ExpandedRow>({});
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 6),
    to: new Date(),
    preset: "7d"
  });

  // Fetch campaigns for filter
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Fetch clicks with auto-refresh
  const { data: clicks, isLoading, refetch } = useQuery<Click[]>({
    queryKey: ["/api/clicks"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Filter clicks based on criteria
  const filteredClicks = clicks?.filter(click => {
    // Date filter
    const clickDate = new Date(click.createdAt);
    if (dateRange.from && clickDate < dateRange.from) return false;
    if (dateRange.to && clickDate > dateRange.to) return false;

    // Campaign filter
    if (selectedCampaign !== "all" && click.campaignId !== selectedCampaign) return false;

    // Source filter
    if (selectedSource !== "all") {
      if (selectedSource === "direct" && click.source) return false;
      if (selectedSource !== "direct" && click.source !== selectedSource) return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        click.clickId.toLowerCase().includes(search) ||
        click.campaignId.toLowerCase().includes(search) ||
        (click.source?.toLowerCase() || "").includes(search) ||
        (click.referrer?.toLowerCase() || "").includes(search) ||
        (click.userAgent?.toLowerCase() || "").includes(search)
      );
    }

    return true;
  }) || [];

  // Get unique sources
  const uniqueSources = Array.from(new Set(clicks?.map(c => c.source || "direct"))) || [];

  // Detect device type from user agent
  const getDeviceType = (userAgent: string | null) => {
    if (!userAgent) return { type: "unknown", icon: Monitor };
    const ua = userAgent.toLowerCase();
    if (ua.includes("googlebot") || ua.includes("bot") || ua.includes("crawler")) return { type: "bot", icon: Bot };
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return { type: "mobile", icon: Smartphone };
    return { type: "desktop", icon: Monitor };
  };

  // Export to CSV with Meta Ads and UTM parameters
  const exportToCSV = () => {
    if (!filteredClicks?.length) return;
    
    const headers = [
      "Click ID",
      "Campaign ID", 
      "Source",
      "Referrer",
      "IP Address",
      "Country",
      "City",
      "Device Type",
      "Browser",
      "Sub1 (Ad ID)",
      "Sub2 (AdSet ID)",
      "Sub3 (Campaign ID)",
      "Sub4 (Ad Name)",
      "Sub5 (AdSet Name)",
      "Sub6 (Campaign Name)",
      "Sub7 (Placement)",
      "Sub8 (Site Source)",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "UTM Content",
      "UTM Term",
      "UTM ID",
      "Converted",
      "Conversion Value",
      "Created At"
    ];
    
    const rows = filteredClicks.map(click => [
      click.clickId,
      click.campaignId,
      click.source || "",
      click.referrer || "",
      click.ipAddress || "",
      click.country || "",
      click.city || "",
      click.deviceType || "",
      click.browser || "",
      click.sub1 || "",
      click.sub2 || "",
      click.sub3 || "",
      click.sub4 || "",
      click.sub5 || "",
      click.sub6 || "",
      click.sub7 || "",
      click.sub8 || "",
      click.utmSource || "",
      click.utmMedium || "",
      click.utmCampaign || "",
      click.utmContent || "",
      click.utmTerm || "",
      click.utmId || "",
      click.convertedAt ? "Yes" : "No",
      click.conversionValue || "",
      new Date(click.createdAt).toISOString()
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clicks-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Carregando logs de clicks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Logs de Clicks</h2>
        <p className="text-gray-600">Visualização completa de todos os clicks rastreados</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Clicks</p>
                <p className="text-2xl font-bold">{clicks?.length || 0}</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clicks Filtrados</p>
                <p className="text-2xl font-bold">{filteredClicks.length}</p>
              </div>
              <Search className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Campanhas Ativas</p>
                <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
              </div>
              <Globe className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Conversão</p>
                <p className="text-2xl font-bold">
                  {clicks?.length ? 
                    ((clicks.filter(c => c.convertedAt).length / clicks.length) * 100).toFixed(1) : 0
                  }%
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine os resultados para análise detalhada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar por ID, source, referrer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as campanhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns?.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.campaignId}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as fontes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                {uniqueSources.filter(s => s !== "direct").map(source => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeSelector
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Mostrando {filteredClicks.length} de {clicks?.length || 0} clicks
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4 mr-1")} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clicks Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700">Click ID</th>
                  <th className="text-left p-4 font-medium text-gray-700">Campanha</th>
                  <th className="text-left p-4 font-medium text-gray-700">Source</th>
                  <th className="text-left p-4 font-medium text-gray-700">Meta Ads</th>
                  <th className="text-left p-4 font-medium text-gray-700">UTM</th>
                  <th className="text-left p-4 font-medium text-gray-700">Device</th>
                  <th className="text-left p-4 font-medium text-gray-700">Data/Hora</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClicks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-8 text-gray-500">
                      Nenhum click encontrado com os filtros aplicados
                    </td>
                  </tr>
                ) : (
                  filteredClicks.map(click => {
                    const device = getDeviceType(click.userAgent);
                    const DeviceIcon = device.icon;
                    const isExpanded = expandedRows[click.id];

                    return (
                      <Fragment key={click.id}>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {click.clickId.substring(0, 30)}...
                            </code>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{click.campaignId}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant={click.source ? "default" : "secondary"}>
                              {click.source || "direct"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {click.sub4 || click.sub1 ? (
                              <div className="text-xs">
                                {click.sub4 && <div className="font-medium truncate">{click.sub4}</div>}
                                {click.sub1 && <div className="text-gray-500">ID: {click.sub1}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {click.utmSource || click.utmMedium ? (
                              <div className="text-xs">
                                {click.utmSource && <div className="font-medium">{click.utmSource}</div>}
                                {click.utmMedium && <div className="text-gray-500">{click.utmMedium}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{device.type}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(click.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-4">
                            {click.convertedAt ? (
                              <Badge className="bg-green-100 text-green-800">
                                Convertido
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Ativo
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(click.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`expanded-${click.id}`} className="bg-gray-50">
                            <td colSpan={9} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <div>
                                    <strong>Click ID Completo:</strong>
                                    <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs block mt-1">
                                      {click.clickId}
                                    </code>
                                  </div>
                                  {click.referrer && (
                                    <div>
                                      <strong>Referrer:</strong>
                                      <a href={click.referrer} target="_blank" rel="noopener noreferrer" 
                                         className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1">
                                        {click.referrer}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  )}
                                  {click.userAgent && (
                                    <div>
                                      <strong>User Agent:</strong>
                                      <span className="ml-2 text-gray-600 block">{click.userAgent}</span>
                                    </div>
                                  )}
                                  {click.ipAddress && (
                                    <div>
                                      <strong>IP Address:</strong>
                                      <span className="ml-2 text-gray-600">{click.ipAddress}</span>
                                    </div>
                                  )}
                                  {(click.fbp || click.fbc) && (
                                    <div>
                                      <strong>Facebook Pixels:</strong>
                                      <div className="ml-2 space-y-1">
                                        {click.fbp && <div className="text-gray-600">_fbp: {click.fbp}</div>}
                                        {click.fbc && <div className="text-gray-600">_fbc: {click.fbc}</div>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {(click.sub1 || click.sub2 || click.sub3 || click.sub4 || click.sub5 || click.sub6 || click.sub7 || click.sub8) && (
                                    <div>
                                      <strong>Meta Ads Parâmetros:</strong>
                                      <div className="ml-2 space-y-1 mt-1">
                                        {click.sub1 && <div className="text-gray-600">Ad ID: {click.sub1}</div>}
                                        {click.sub2 && <div className="text-gray-600">AdSet ID: {click.sub2}</div>}
                                        {click.sub3 && <div className="text-gray-600">Campaign ID: {click.sub3}</div>}
                                        {click.sub4 && <div className="text-gray-600">Ad Name: {click.sub4}</div>}
                                        {click.sub5 && <div className="text-gray-600">AdSet Name: {click.sub5}</div>}
                                        {click.sub6 && <div className="text-gray-600">Campaign Name: {click.sub6}</div>}
                                        {click.sub7 && <div className="text-gray-600">Placement: {click.sub7}</div>}
                                        {click.sub8 && <div className="text-gray-600">Site Source: {click.sub8}</div>}
                                      </div>
                                    </div>
                                  )}
                                  {(click.utmSource || click.utmMedium || click.utmCampaign || click.utmContent || click.utmTerm || click.utmId) && (
                                    <div>
                                      <strong>UTM Parâmetros:</strong>
                                      <div className="ml-2 space-y-1 mt-1">
                                        {click.utmSource && <div className="text-gray-600">Source: {click.utmSource}</div>}
                                        {click.utmMedium && <div className="text-gray-600">Medium: {click.utmMedium}</div>}
                                        {click.utmCampaign && <div className="text-gray-600">Campaign: {click.utmCampaign}</div>}
                                        {click.utmContent && <div className="text-gray-600">Content: {click.utmContent}</div>}
                                        {click.utmTerm && <div className="text-gray-600">Term: {click.utmTerm}</div>}
                                        {click.utmId && <div className="text-gray-600">ID: {click.utmId}</div>}
                                      </div>
                                    </div>
                                  )}
                                  {click.convertedAt && (
                                    <div>
                                      <strong>Conversão:</strong>
                                      <span className="ml-2 text-green-600">
                                        {new Date(click.convertedAt).toLocaleString("pt-BR")}
                                        {click.conversionValue && ` - R$ ${click.conversionValue}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}