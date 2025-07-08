import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, MousePointer, Target } from "lucide-react";
import { useBestAds, type AdPerformance } from "@/hooks/use-performance";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function BestAdsTable() {
  const { data: ads, isLoading } = useBestAds(10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Melhores Anúncios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded animate-pulse">
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="grid grid-cols-4 gap-4 w-80">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-12" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ads || ads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Melhores Anúncios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum anúncio encontrado</h3>
            <p className="text-gray-500">
              Não há dados de anúncios com parâmetros Meta Ads capturados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span>Melhores Anúncios</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <MousePointer className="h-4 w-4" />
                    <span>Clicks</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Target className="h-4 w-4" />
                    <span>Conversões</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Receita</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">Taxa Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad, index) => (
                <TableRow key={ad.adId || index} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-48">
                        {ad.adName}
                      </p>
                      {ad.adId && (
                        <p className="text-xs text-gray-500">ID: {ad.adId}</p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      {ad.clicks.toLocaleString()}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                      {ad.conversions}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {formatCurrency(ad.revenue)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge 
                      variant={ad.conversionRate >= 5 ? "default" : ad.conversionRate >= 2 ? "secondary" : "outline"}
                      className={
                        ad.conversionRate >= 5 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : ad.conversionRate >= 2 
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : "text-gray-600 border-gray-200"
                      }
                    >
                      {formatPercentage(ad.conversionRate)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {ads.length >= 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Mostrando os 10 melhores anúncios por receita
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}