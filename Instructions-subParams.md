# Análise: Parâmetros de Campanhas Meta Ads no MétricaClick

## Resumo Executivo

⚠️ **PROBLEMA CRÍTICO IDENTIFICADO**: O sistema MétricaClick **NÃO está capturando os parâmetros específicos do Meta Ads** necessários para análise de performance detalhada por anúncio, conjunto e campanha.

**Status Atual:** 
- ✅ Sistema captura parâmetros básicos (`cmpid`, `tsource`, `_fbp`, `_fbc`)
- ❌ **Parâmetros Meta Ads perdidos:** `sub1` a `sub8` (ad.id, adset.id, campaign.id, etc.)
- ❌ **Parâmetros UTM perdidos:** `utm_source`, `utm_medium`, `utm_campaign`, etc.

---

## 1. Análise Detalhada da Captura Atual

### 1.1 O Que Está Funcionando ✅

**Script de Tracking (`mc.js`):**
```javascript
// A função getUrlParams() CAPTURA todos os parâmetros da URL
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  
  for (const [key, value] of urlParams) {
    params[key] = value;  // ← TODOS os parâmetros são extraídos
  }
  
  return params;
}
```

**Backend (`server/routes.ts`):**
```javascript
// Endpoint /track/:campaignID recebe e salva:
- campaignId (do req.params.campaignID)
- source (req.query.tsource)
- referrer
- fbp (_fbp)
- fbc (_fbc)
- Dados geográficos e de dispositivo
```

**Banco de Dados (`clicks` table):**
```sql
-- Campos existentes e funcionando:
click_id, campaign_id, source, referrer, fbp, fbc, user_agent, 
ip_address, country, device_type, browser, created_at
```

### 1.2 O Que Está Perdido ❌

**Parâmetros Meta Ads NÃO salvos:**
- `sub1` = {{ad.id}} - ID do anúncio
- `sub2` = {{adset.id}} - ID do conjunto
- `sub3` = {{campaign.id}} - ID da campanha do Facebook
- `sub4` = {{ad.name}} - Nome do anúncio  
- `sub5` = {{adset.name}} - Nome do conjunto
- `sub6` = {{campaign.name}} - Nome da campanha
- `sub7` = {{placement}} - Posicionamento (feed, stories, etc.)
- `sub8` = {{site_source_name}} - Fonte do site

**Parâmetros UTM NÃO salvos:**
- `utm_source` = facebook
- `utm_medium` = paid
- `utm_campaign` = ID da campanha
- `utm_content` = Conteúdo do anúncio
- `utm_term` = Termo/palavra-chave
- `utm_id` = ID único da campanha

---

## 2. Causa Raiz do Problema

### 2.1 Limitação na Transmissão de Dados

**Script `mc.js` - Função `requestClickId()`:**
```javascript
// PROBLEMA: Só envia parâmetros limitados para o backend
const params = new URLSearchParams({
  format: 'json',
  referrer: document.referrer || ''
});

if (metaCookies._fbp) params.append('_fbp', metaCookies._fbp);
if (metaCookies._fbc) params.append('_fbc', metaCookies._fbc);
if (trafficSource) params.append('tsource', trafficSource);

// ← FALTAM: sub1-sub8, utm_source, utm_medium, etc.
```

### 2.2 Schema do Banco Incompleto

**Campos ausentes na tabela `clicks`:**
```sql
-- PRECISAMOS ADICIONAR:
sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8,
utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id
```

---

## 3. Impacto no Negócio

### 3.1 Análises Impossíveis Atualmente

**Performance por Anúncio:**
- ❌ Não conseguimos identificar qual anúncio específico converteu
- ❌ Não sabemos qual creative teve melhor performance
- ❌ Impossível otimizar anúncios individuais

**Performance por Conjunto:**
- ❌ Não identificamos qual adset está gerando melhores resultados
- ❌ Não conseguimos comparar performance entre conjuntos
- ❌ Budget allocation ineficiente

**Performance por Posicionamento:**
- ❌ Não sabemos se Feed, Stories ou Audience Network convertem melhor
- ❌ Impossível otimizar por placement

### 3.2 ROI de Análise Perdido

**Dados que deveríamos ter:**
```
Anúncio ID: 120221436830730485
Nome: "Brownie Recheado - Frutas Vermelhas"
Conjunto: "conjunto01"
Campanha: "automatikblog_16abr25_1artigo"
Placement: "Facebook_Mobile_Feed"
Clicks: 15
Conversões: 2
CPA: R$ 25,50
```

---

## 4. Plano de Implementação

### 4.1 FASE 1: Expansão do Schema do Banco

**Adicionar campos na tabela `clicks`:**
```sql
-- Parâmetros Meta Ads
ALTER TABLE clicks ADD COLUMN sub1 TEXT; -- ad.id
ALTER TABLE clicks ADD COLUMN sub2 TEXT; -- adset.id  
ALTER TABLE clicks ADD COLUMN sub3 TEXT; -- campaign.id
ALTER TABLE clicks ADD COLUMN sub4 TEXT; -- ad.name
ALTER TABLE clicks ADD COLUMN sub5 TEXT; -- adset.name
ALTER TABLE clicks ADD COLUMN sub6 TEXT; -- campaign.name
ALTER TABLE clicks ADD COLUMN sub7 TEXT; -- placement
ALTER TABLE clicks ADD COLUMN sub8 TEXT; -- site_source_name

-- Parâmetros UTM
ALTER TABLE clicks ADD COLUMN utm_source TEXT;
ALTER TABLE clicks ADD COLUMN utm_medium TEXT;
ALTER TABLE clicks ADD COLUMN utm_campaign TEXT;
ALTER TABLE clicks ADD COLUMN utm_content TEXT;
ALTER TABLE clicks ADD COLUMN utm_term TEXT;
ALTER TABLE clicks ADD COLUMN utm_id TEXT;
```

### 4.2 FASE 2: Atualização do Schema Drizzle

**Arquivo `shared/schema.ts`:**
```javascript
export const clicks = pgTable("clicks", {
  // ... campos existentes ...
  
  // Meta Ads tracking parameters
  sub1: text("sub1"), // ad.id
  sub2: text("sub2"), // adset.id
  sub3: text("sub3"), // campaign.id  
  sub4: text("sub4"), // ad.name
  sub5: text("sub5"), // adset.name
  sub6: text("sub6"), // campaign.name
  sub7: text("sub7"), // placement
  sub8: text("sub8"), // site_source_name
  
  // UTM parameters
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  utmId: text("utm_id"),
});
```

### 4.3 FASE 3: Modificação do Script `mc.js`

**Função `requestClickId()` atualizada:**
```javascript
function requestClickId(campaignId, metaCookies, trafficSource, urlParams, retryCount) {
  const params = new URLSearchParams({
    format: 'json',
    referrer: document.referrer || ''
  });
  
  // Parâmetros existentes
  if (metaCookies._fbp) params.append('_fbp', metaCookies._fbp);
  if (metaCookies._fbc) params.append('_fbc', metaCookies._fbc);
  if (trafficSource) params.append('tsource', trafficSource);
  
  // NOVO: Parâmetros Meta Ads
  if (urlParams.sub1) params.append('sub1', urlParams.sub1);
  if (urlParams.sub2) params.append('sub2', urlParams.sub2);
  if (urlParams.sub3) params.append('sub3', urlParams.sub3);
  if (urlParams.sub4) params.append('sub4', urlParams.sub4);
  if (urlParams.sub5) params.append('sub5', urlParams.sub5);
  if (urlParams.sub6) params.append('sub6', urlParams.sub6);
  if (urlParams.sub7) params.append('sub7', urlParams.sub7);
  if (urlParams.sub8) params.append('sub8', urlParams.sub8);
  
  // NOVO: Parâmetros UTM
  if (urlParams.utm_source) params.append('utm_source', urlParams.utm_source);
  if (urlParams.utm_medium) params.append('utm_medium', urlParams.utm_medium);
  if (urlParams.utm_campaign) params.append('utm_campaign', urlParams.utm_campaign);
  if (urlParams.utm_content) params.append('utm_content', urlParams.utm_content);
  if (urlParams.utm_term) params.append('utm_term', urlParams.utm_term);
  if (urlParams.utm_id) params.append('utm_id', urlParams.utm_id);
}
```

**Modificação na função `track()`:**
```javascript
function track() {
  const urlParams = getUrlParams();
  // ...
  
  // Passar urlParams para requestClickId
  requestClickId(effectiveCampaignId, metaCookies, trackingSource, urlParams)
}
```

### 4.4 FASE 4: Atualização do Backend

**Arquivo `server/routes.ts` - Endpoint `/track`:**
```javascript
// Create enriched click record
const clickData = {
  clickId,
  campaignId: campaignID,
  source: req.query.tsource as string || undefined,
  referrer: referrer as string || undefined,
  fbp: _fbp as string || undefined,
  fbc: _fbc as string || undefined,
  
  // NOVO: Meta Ads parameters
  sub1: req.query.sub1 as string || undefined,
  sub2: req.query.sub2 as string || undefined,
  sub3: req.query.sub3 as string || undefined,
  sub4: req.query.sub4 as string || undefined,
  sub5: req.query.sub5 as string || undefined,
  sub6: req.query.sub6 as string || undefined,
  sub7: req.query.sub7 as string || undefined,
  sub8: req.query.sub8 as string || undefined,
  
  // NOVO: UTM parameters
  utmSource: req.query.utm_source as string || undefined,
  utmMedium: req.query.utm_medium as string || undefined,
  utmCampaign: req.query.utm_campaign as string || undefined,
  utmContent: req.query.utm_content as string || undefined,
  utmTerm: req.query.utm_term as string || undefined,
  utmId: req.query.utm_id as string || undefined,
  
  // ... resto dos campos existentes
};
```

### 4.5 FASE 5: Interface de Analytics

**Nova página: "Meta Ads Analytics"**

**Funcionalidades necessárias:**
1. **Performance por Anúncio:**
   - Tabela com `sub4` (ad.name), clicks, conversões, CPA
   - Gráfico de performance por anúncio
   - Filtro por período

2. **Performance por Conjunto:**
   - Análise por `sub5` (adset.name)
   - Comparação de conjuntos
   - ROI por adset

3. **Performance por Posicionamento:**
   - Breakdown por `sub7` (placement)
   - Feed vs Stories vs Audience Network
   - Conversões por placement

4. **Detalhes da Campanha:**
   - Mapeamento `sub6` (campaign.name) com dados de custo
   - Performance completa por campanha

---

## 5. Ordem de Implementação Recomendada

### 5.1 Prioridade ALTA ⚡
1. **Banco de dados** - Adicionar campos faltantes
2. **Schema Drizzle** - Atualizar definições
3. **Script mc.js** - Transmitir parâmetros para backend
4. **Backend routes** - Salvar parâmetros no banco

### 5.2 Prioridade MÉDIA 📊
5. **Interface Analytics** - Novas páginas de análise
6. **Logs de Clicks** - Exibir parâmetros Meta Ads
7. **Filtros** - Por anúncio, conjunto, placement

### 5.3 Prioridade BAIXA 🔧
8. **Exportação** - CSV com dados Meta Ads
9. **Alertas** - Performance por anúncio
10. **API** - Endpoints específicos para Meta Ads

---

## 6. Validação Pós-Implementação

### 6.1 Testes Necessários

**URL de teste:**
```
https://automatikblog.com/blog/brownie?
cmpid=683f45def138583dcedb262e&
sub1=120221436830730485&
sub2=120221307912330485&
sub3=120221307912350485&
sub4=ad_vd_1artigo_05&
sub5=conjunto01&
sub6=automatikblog_16abr25_1artigo&
sub7=Facebook_Mobile_Feed&
sub8=fb&
utm_source=facebook&
utm_medium=paid&
utm_campaign=120221307912350485&
utm_content=120221436830730485&
utm_term=120221307912330485&
utm_id=120221307912350485
```

**Verificações:**
1. ✅ Todos os parâmetros salvos no banco
2. ✅ Logs de clicks exibem informações Meta Ads
3. ✅ Analytics mostram performance por anúncio
4. ✅ Filtros funcionando por sub-parâmetros

### 6.2 Métricas de Sucesso

**Antes da implementação:**
- 📊 Análise básica por campanha
- ❌ Sem visibilidade de anúncios individuais

**Após implementação:**
- 📊 Análise granular por anúncio, conjunto, posicionamento
- ✅ Otimização baseada em dados específicos do Meta Ads
- ✅ ROI calculado por creative e placement

---

## 7. Conclusões

### 7.1 Situação Atual
O MétricaClick possui uma base sólida de tracking, mas **está perdendo dados críticos** para análise de performance detalhada do Meta Ads. 

### 7.2 Necessidade Urgente
A implementação dos parâmetros `sub1-sub8` e `utm_*` é **fundamental** para transformar o sistema de um tracker básico em uma ferramenta de análise profissional.

### 7.3 ROI Esperado
Com esses dados, poderemos:
- 🎯 Identificar anúncios de alta performance
- 💰 Otimizar budget allocation
- 📈 Aumentar ROI das campanhas
- 🔍 Análise granular por placement

**Tempo estimado de implementação:** 2-3 dias
**Impacto no negócio:** Alto
**Complexidade técnica:** Média