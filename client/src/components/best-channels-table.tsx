import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Globe, TrendingUp, MousePointer, Target } from "lucide-react";
import { useBestChannels, type ChannelPerformance } from "@/hooks/use-performance";

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

function getChannelIcon(channel: string) {
  const lowerChannel = channel.toLowerCase();
  
  if (lowerChannel.includes('facebook') || lowerChannel.includes('fb')) {
    return '📘';
  }
  if (lowerChannel.includes('instagram') || lowerChannel.includes('ig')) {
    return '📷';
  }
  if (lowerChannel.includes('google') || lowerChannel.includes('adwords')) {
    return '🔍';
  }
  if (lowerChannel.includes('youtube')) {
    return '📺';
  }
  if (lowerChannel.includes('referral')) {
    return '🔗';
  }
  if (lowerChannel.includes('direct')) {
    return '🌐';
  }
  if (lowerChannel.includes('organic')) {
    return '🌱';
  }
  
  return '📊';
}

function getChannelColor(channel: string) {
  const lowerChannel = channel.toLowerCase();
  
  if (lowerChannel.includes('facebook') || lowerChannel.includes('fb')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (lowerChannel.includes('instagram') || lowerChannel.includes('ig')) {
    return 'bg-pink-100 text-pink-800 border-pink-200';
  }
  if (lowerChannel.includes('google')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (lowerChannel.includes('referral')) {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  if (lowerChannel.includes('direct')) {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
  if (lowerChannel.includes('organic')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  
  return 'bg-orange-100 text-orange-800 border-orange-200';
}

export function BestChannelsTable() {
  const { data: channels, isLoading } = useBestChannels(10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <span>Melhores Canais de Tráfego</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <span>Melhores Canais de Tráfego</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum canal encontrado</h3>
            <p className="text-gray-500">
              Não há dados de canais de tráfego disponíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...channels.map(c => c.revenue));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-green-600" />
          <span>Melhores Canais de Tráfego</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {channels.map((channel, index) => {
            const progressValue = maxRevenue > 0 ? (channel.revenue / maxRevenue) * 100 : 0;
            
            return (
              <div key={channel.channel} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getChannelIcon(channel.channel)}</span>
                    <div>
                      <Badge variant="outline" className={getChannelColor(channel.channel)}>
                        {channel.channel}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">#{index + 1} em receita</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(channel.revenue)}</p>
                    <p className="text-xs text-gray-500">receita total</p>
                  </div>
                </div>
                
                <Progress value={progressValue} className="h-2" />
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center space-x-1">
                      <MousePointer className="h-3 w-3 text-blue-500" />
                      <p className="text-sm font-medium text-blue-600">{channel.clicks.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-gray-500">clicks</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center space-x-1">
                      <Target className="h-3 w-3 text-purple-500" />
                      <p className="text-sm font-medium text-purple-600">{channel.conversions}</p>
                    </div>
                    <p className="text-xs text-gray-500">conversões</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                      <p className="text-sm font-medium text-orange-600">{formatPercentage(channel.conversionRate)}</p>
                    </div>
                    <p className="text-xs text-gray-500">taxa conv.</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {channels.length >= 10 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Mostrando os 10 melhores canais por receita
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}