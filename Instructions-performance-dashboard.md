# Instructions: Performance Dashboard Implementation

## Análise da Base de Código Atual

### Estrutura do Banco de Dados
O projeto já possui todas as tabelas necessárias para implementar o painel de performance:

1. **`ad_spend`** - Gastos em anúncios do Facebook
   - Campos: `campaign_id`, `date`, `spend`, `impressions`, `reach`, `frequency`
   - Usado para: Ad Spend tracking

2. **`conversions`** - Conversões registradas
   - Campos: `click_id`, `conversion_type`, `value`, `currency`, `created_at`
   - Usado para: Revenue e conversions tracking

3. **`clicks`** - Todos os clicks rastreados
   - Campos: `campaign_id`, `source`, `sub1-sub8` (Meta Ads params), `utm_*` (UTM params), `conversion_value`, `converted_at`
   - Usado para: Best performing ads, traffic channels, clicks metrics

4. **`campaigns`** - Campanhas ativas
   - Campos: `campaign_id`, `name`, `total_spend`, `total_revenue`, `conversion_count`
   - Usado para: Best performing campaigns

### APIs Existentes
O projeto já possui APIs que podem ser expandidas:
- `/api/stats` - Estatísticas gerais
- `/api/clicks` - Lista de clicks  
- `/api/campaigns` - Lista de campanhas
- `/api/analytics/geography` - Analytics geográficos

### Arquivos de Frontend
- `client/src/pages/dashboard.tsx` - Dashboard principal (para modificar)
- `client/src/components/stats-cards.tsx` - Cards de estatísticas (para expandir)
- `client/src/hooks/use-stats.tsx` - Hook de estatísticas (para expandir)

## Implementação Detalhada

### 1. Backend - Novas APIs necessárias

#### Arquivo: `server/routes.ts` (expandir)

**A) API de Performance Summary**
```typescript
app.get('/api/performance/summary', async (req, res) => {
  // Retorna: Ad Spend, Revenue, ROAS para Today, Yesterday, This Month, Last Month
});
```

**B) API de Best Performing Campaigns**
```typescript
app.get('/api/performance/best-campaigns', async (req, res) => {
  // Retorna: Top 3 campanhas por revenue/conversões para Today e Yesterday
});
```

**C) API de Best Performing Ads**
```typescript
app.get('/api/performance/best-ads', async (req, res) => {
  // Agrupa por sub4 (ad name) ou sub1 (ad id), ranqueia por revenue
});
```

**D) API de Best Traffic Channels**
```typescript
app.get('/api/performance/best-channels', async (req, res) => {
  // Agrupa por source/utm_source, ranqueia por conversões
});
```

**E) API de Metrics Chart**
```typescript
app.get('/api/performance/metrics-chart', async (req, res) => {
  // Retorna dados diários de clicks e conversions dos últimos 30 dias
});
```

### 2. Backend - Queries SQL necessárias

#### Arquivo: `server/storage.ts` (expandir interface IStorage)

**A) Performance Summary Query**
```sql
-- Ad Spend por período
SELECT 
  SUM(CASE WHEN DATE(date) = CURRENT_DATE THEN CAST(spend AS DECIMAL) ELSE 0 END) as today_spend,
  SUM(CASE WHEN DATE(date) = CURRENT_DATE - INTERVAL '1 day' THEN CAST(spend AS DECIMAL) ELSE 0 END) as yesterday_spend,
  SUM(CASE WHEN DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN CAST(spend AS DECIMAL) ELSE 0 END) as this_month_spend,
  SUM(CASE WHEN DATE(date) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
       AND DATE(date) < DATE_TRUNC('month', CURRENT_DATE) THEN CAST(spend AS DECIMAL) ELSE 0 END) as last_month_spend
FROM ad_spend;

-- Revenue por período  
SELECT 
  SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN CAST(value AS DECIMAL) ELSE 0 END) as today_revenue,
  SUM(CASE WHEN DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' THEN CAST(value AS DECIMAL) ELSE 0 END) as yesterday_revenue,
  SUM(CASE WHEN DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN CAST(value AS DECIMAL) ELSE 0 END) as this_month_revenue,
  SUM(CASE WHEN DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
       AND DATE(created_at) < DATE_TRUNC('month', CURRENT_DATE) THEN CAST(value AS DECIMAL) ELSE 0 END) as last_month_revenue
FROM conversions;
```

**B) Best Performing Campaigns Query**
```sql
-- Top campanhas por revenue hoje
SELECT 
  c.campaign_id,
  c.name,
  COUNT(conv.id) as conversions,
  COALESCE(SUM(CAST(conv.value AS DECIMAL)), 0) as revenue,
  COALESCE(SUM(CAST(spend.spend AS DECIMAL)), 0) as spend
FROM campaigns c
LEFT JOIN conversions conv ON conv.click_id IN (
  SELECT click_id FROM clicks WHERE campaign_id = c.campaign_id 
  AND DATE(created_at) = CURRENT_DATE
)
LEFT JOIN ad_spend spend ON spend.campaign_id = c.campaign_id 
  AND DATE(spend.date) = CURRENT_DATE
GROUP BY c.campaign_id, c.name
ORDER BY revenue DESC
LIMIT 3;
```

**C) Best Performing Ads Query**
```sql
-- Top anúncios por revenue
SELECT 
  COALESCE(clicks.sub4, clicks.sub1, 'Unknown Ad') as ad_name,
  clicks.sub1 as ad_id,
  COUNT(conversions.id) as conversions,
  COALESCE(SUM(CAST(conversions.value AS DECIMAL)), 0) as revenue
FROM clicks
LEFT JOIN conversions ON conversions.click_id = clicks.click_id
WHERE clicks.sub4 IS NOT NULL OR clicks.sub1 IS NOT NULL
GROUP BY clicks.sub4, clicks.sub1
ORDER BY revenue DESC
LIMIT 10;
```

**D) Best Traffic Channels Query**
```sql
-- Top canais de tráfego
SELECT 
  COALESCE(clicks.source, clicks.utm_source, 'direct') as channel,
  COUNT(DISTINCT clicks.id) as clicks_count,
  COUNT(conversions.id) as conversions,
  COALESCE(SUM(CAST(conversions.value AS DECIMAL)), 0) as revenue
FROM clicks
LEFT JOIN conversions ON conversions.click_id = clicks.click_id
GROUP BY COALESCE(clicks.source, clicks.utm_source, 'direct')
ORDER BY revenue DESC
LIMIT 10;
```

**E) Metrics Chart Query**
```sql
-- Dados diários para gráfico (últimos 30 dias)
SELECT 
  DATE(clicks.created_at) as date,
  COUNT(DISTINCT clicks.id) as clicks,
  COUNT(conversions.id) as conversions
FROM clicks
LEFT JOIN conversions ON conversions.click_id = clicks.click_id
WHERE clicks.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(clicks.created_at)
ORDER BY date;
```

### 3. Frontend - Novos Componentes

#### Arquivo: `client/src/components/performance-dashboard.tsx` (criar)
```typescript
// Componente principal do painel de performance
interface PerformanceDashboardProps {
  dateRange?: DateRange;
}

// Sub-componentes:
- PerformanceSummaryCards (Ad Spend, Revenue, ROAS)
- BestCampaignsTable
- BestAdsTable  
- BestChannelsTable
- MetricsChart (recharts line chart)
- PerformanceFilters
```

#### Arquivo: `client/src/hooks/use-performance.tsx` (criar)
```typescript
// Hook para dados de performance
export function usePerformance(options: {
  dateRange?: DateRange;
  filters?: PerformanceFilters;
}) {
  // Queries para todas as APIs de performance
}
```

### 4. Frontend - Modificações Necessárias

#### Arquivo: `client/src/pages/dashboard.tsx` (modificar)
**Remover:**
- Click Analytics section (linhas 92-116)
- Quick Actions section (linhas 118-154)  
- RecentActivity component (linha 157)
- Tracking Configuration panel (linhas 159-225)

**Adicionar:**
- Import do PerformanceDashboard component
- Renderizar PerformanceDashboard no lugar dos componentes removidos

#### Arquivo: `client/src/components/stats-cards.tsx` (expandir se necessário)
- Pode manter os cards atuais ou integrar ao novo painel

### 5. Cálculos de ROAS

**ROAS = Revenue / Ad Spend**

```typescript
const calculateROAS = (revenue: number, spend: number): string => {
  if (spend === 0) return "0.00";
  return (revenue / spend).toFixed(2);
};
```

### 6. Estrutura de Filtros

```typescript
interface PerformanceFilters {
  dateRange: DateRange;
  website?: string;
  campaign?: string;
  trafficChannel?: string;
  metricA?: string; // Flexível para implementações futuras
  metricB?: string;
  metricC?: string;
  metricD?: string;
}
```

### 7. Arquivos Afetados

**Backend:**
- `server/routes.ts` - Adicionar 5 novas rotas de performance
- `server/storage.ts` - Expandir interface IStorage com métodos de performance

**Frontend:**
- `client/src/pages/dashboard.tsx` - Remover seções e adicionar painel de performance
- `client/src/components/performance-dashboard.tsx` - Criar (novo)
- `client/src/hooks/use-performance.tsx` - Criar (novo)
- `client/src/components/performance-summary-cards.tsx` - Criar (novo)
- `client/src/components/best-campaigns-table.tsx` - Criar (novo)
- `client/src/components/best-ads-table.tsx` - Criar (novo)
- `client/src/components/best-channels-table.tsx` - Criar (novo)
- `client/src/components/metrics-chart.tsx` - Criar (novo)

### 8. Estilização

Usar componentes existentes do projeto:
- `Card`, `CardContent`, `CardHeader` para panels
- `Badge` para tags de performance
- `Button` para ações
- `Select`, `Input` para filtros
- `recharts` para gráficos (já instalado)

### 9. Validação de Dados

Antes de renderizar, validar:
- Valores numéricos não sejam null/undefined
- ROAS não seja dividido por zero
- Datas sejam válidas
- Arrays não estejam vazios

### 10. Performance e Escalabilidade

- Implementar caching nas queries pesadas
- Usar índices no banco para campos de filtro
- Considerar paginação para listas grandes
- Debounce nos filtros para evitar muitas requests

## Cronologia de Implementação

1. **Expandir backend** - Adicionar métodos no storage.ts e rotas em routes.ts
2. **Criar hooks** - Implementar use-performance.tsx
3. **Criar componentes** - Implementar todos os novos componentes
4. **Modificar dashboard** - Remover seções antigas e integrar painel novo
5. **Testar e ajustar** - Validar dados e cálculos
6. **Documentar** - Atualizar replit.md com as mudanças

## Observações Importantes

- **Dados Reais**: Usar apenas dados do banco, nunca mock/placeholder
- **Responsividade**: Garantir que funcione em mobile e desktop  
- **Performance**: Otimizar queries para não impactar a UX
- **Comentários**: Documentar todas as mudanças nos arquivos
- **Tema**: Manter consistência visual com o projeto atual
- **Filtros**: Implementar filtros funcionais, não apenas UI