# MétricaClick - Sistema de Conversões via Webhook: Análise e Plano Técnico

## 1. Análise Profunda da Base de Código Existente

### 1.1 Arquivos e Funções Relacionados ao Tracking

#### **Endpoints de Tracking (server/routes.ts)**
- **`/track/:campaignID`** (linha ~470): Gera clickIDs únicos e salva na tabela `clicks`
- **`/view`** (linha ~518): Registra page views vinculados a clickIDs
- **`/api/conversions`** (linha ~669): Endpoint POST existente para conversões via script
- **`/api/conversions/click/:clickId`** (linha ~702): Lista conversões por clickID
- **`/api/campaigns/:campaignId/conversions`** (linha ~710): Lista conversões por campanha

#### **Armazenamento de Dados (server/storage.ts)**
- **`createClick()`** (linha ~294): Salva clicks no PostgreSQL via tabela `clicks`
- **`getClickByClickId()`** (linha ~287): Busca click pelo clickID único
- **`createConversion()`** (linha ~417): Salva conversões vinculadas a clickIDs
- **`getConversionsByClickId()`** (linha ~412): Lista conversões por clickID

#### **Script de Tracking (public/mc.js)**
- **`requestClickId()`** (linha ~180): Solicita clickID do backend
- **`trackConversion()`** (linha ~293): Função existente para tracking de conversões
- **Armazenamento**: Usa cookies `mcclickid-store` + sessionStorage `mcclickid`

### 1.2 Como o ClickID (Session ID) é Salvo

#### **Geração do ClickID**
```javascript
// Formato: mc_{campaignID}_{timestamp}
const clickId = `mc_${campaignID}_${timestamp}`;
```

#### **Armazenamento no Browser**
1. **Cookie**: `mcclickid-store` (duração: 90 dias por padrão)
2. **SessionStorage**: `mcclickid` (sessão do browser)
3. **Cookie Adicional**: `mccid-paid` (para tráfego pago)

#### **Estrutura da Tabela `clicks`**
```sql
clicks {
  id: serial PRIMARY KEY,
  clickId: text UNIQUE NOT NULL,  -- mc_{campaignID}_{timestamp}
  campaignId: text NOT NULL,
  source: text,                   -- facebook, google, etc.
  referrer: text,
  fbp: text,                      -- Facebook Browser Pixel
  fbc: text,                      -- Facebook Click ID
  userAgent: text,
  ipAddress: text,
  conversionValue: text,
  convertedAt: timestamp,
  createdAt: timestamp
}
```

### 1.3 Sistema de Conversões Existente

#### **Endpoint Atual: `/api/conversions`**
```javascript
// Recebe dados do script mc.js
POST /api/conversions
{
  clickId: "mc_automatikblog-main_1751843549158",
  conversionType: "purchase",
  value: "299.99",
  currency: "BRL"
}
```

#### **Funcionamento**
1. Script mc.js obtém clickID do cookie/sessionStorage
2. Faz POST para `/api/conversions` com dados da conversão
3. Backend valida se clickID existe na tabela `clicks`
4. Salva conversão na tabela `conversions`
5. Atualiza campaign totals

## 2. Por Que o Recurso de Webhook Pode Não Estar Funcionando

### 2.1 Problemas Identificados

#### **❌ Endpoint `/conversion` Não Existe**
- O sistema atual só tem `/api/conversions` para script interno
- Não há endpoint público para webhooks externos

#### **❌ Falta Extração de SRC/SCK**
- Sistema atual espera `clickId` direto
- Não há lógica para extrair de campos `SRC` ou `SCK`

#### **❌ Falta Validação de Webhooks**
- Não há autenticação para webhooks
- Não há validação de origem (Hotmart, checkout próprio)

#### **❌ Falta Mapeamento de Dados**
- Sistemas externos enviam dados em formatos diferentes
- Falta normalização de valores monetários

### 2.2 Gaps Técnicos

1. **Identificação**: Como mapear `SRC`/`SCK` para clickID interno
2. **Autenticação**: Como validar que webhook é legítimo
3. **Formato**: Como lidar com diferentes estruturas de dados
4. **Concorrência**: Como evitar conversões duplicadas

## 3. Plano Técnico Detalhado para `/conversion`

### 3.1 Estrutura do Novo Endpoint

#### **Localização**: `server/routes.ts` (após linha ~720)

```javascript
// Webhook endpoint for external conversions (Hotmart, custom checkout)
app.post("/conversion", async (req, res) => {
  console.log('Webhook conversion received:', req.body);
  
  try {
    // 1. Extract SRC/SCK from request
    const sessionId = extractSessionId(req.body);
    
    // 2. Validate and find click record
    const click = await findClickBySessionId(sessionId);
    
    // 3. Normalize conversion data
    const conversionData = normalizeConversionData(req.body, click);
    
    // 4. Save conversion
    const conversion = await storage.createConversion(conversionData);
    
    // 5. Update campaign metrics
    await updateCampaignMetrics(click.campaignId, conversionData);
    
    // 6. Return success response
    res.json({ 
      success: true, 
      conversionId: conversion.id,
      clickId: click.clickId 
    });
    
  } catch (error) {
    console.error("Webhook conversion error:", error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### 3.2 Função de Extração SRC/SCK

```javascript
function extractSessionId(webhookData) {
  // Priority order: SCK, SRC, sck, src, session_id, click_id
  const sessionId = webhookData.SCK || 
                   webhookData.SRC || 
                   webhookData.sck || 
                   webhookData.src || 
                   webhookData.session_id || 
                   webhookData.click_id;
  
  if (!sessionId) {
    throw new Error('Session ID not found in webhook data (SCK/SRC fields missing)');
  }
  
  return sessionId.trim();
}
```

### 3.3 Função de Lookup do ClickID

```javascript
async function findClickBySessionId(sessionId) {
  // First try direct match (if sessionId is already our clickId format)
  let click = await storage.getClickByClickId(sessionId);
  
  if (!click) {
    // Try to find by original session ID stored in referrer or custom fields
    const allClicks = await storage.getAllClicks();
    click = allClicks.find(c => 
      c.referrer && c.referrer.includes(sessionId) ||
      c.source && c.source.includes(sessionId)
    );
  }
  
  if (!click) {
    throw new Error(`Click not found for session ID: ${sessionId}`);
  }
  
  return click;
}
```

### 3.4 Normalização de Dados

```javascript
function normalizeConversionData(webhookData, click) {
  // Default conversion type based on webhook source
  let conversionType = 'purchase';
  let value = null;
  let currency = 'BRL';
  
  // Hotmart webhook format
  if (webhookData.product) {
    conversionType = 'purchase';
    value = webhookData.purchase_value || webhookData.value;
    currency = webhookData.currency || 'BRL';
  }
  
  // Custom checkout format
  if (webhookData.order_total) {
    conversionType = 'purchase';
    value = webhookData.order_total;
    currency = webhookData.order_currency || 'BRL';
  }
  
  // Lead/signup format
  if (webhookData.event_type === 'lead' || webhookData.action === 'signup') {
    conversionType = webhookData.event_type || 'lead';
    value = null;
  }
  
  return {
    clickId: click.clickId,
    conversionType,
    value: value ? String(value) : null,
    currency
  };
}
```

### 3.5 Atualização de Métricas da Campanha

```javascript
async function updateCampaignMetrics(campaignId, conversionData) {
  const campaign = await storage.getCampaignByCampaignId(campaignId);
  
  if (campaign) {
    const currentRevenue = parseFloat(campaign.totalRevenue || "0");
    const newRevenue = parseFloat(conversionData.value || "0");
    
    await storage.updateCampaign(campaignId, {
      totalRevenue: String(currentRevenue + newRevenue),
      conversionCount: (campaign.conversionCount || 0) + 1
    });
    
    // Update click record
    await storage.updateClick(conversionData.clickId, {
      conversionValue: conversionData.value,
      convertedAt: new Date()
    });
  }
}
```

### 3.6 Tratamento de Erros

```javascript
// Error handling strategy
const WEBHOOK_ERRORS = {
  MISSING_SESSION_ID: 'Session ID (SRC/SCK) not found in webhook data',
  CLICK_NOT_FOUND: 'Click record not found for provided session ID',
  INVALID_VALUE: 'Conversion value is not a valid number',
  DUPLICATE_CONVERSION: 'Conversion already exists for this click',
  CAMPAIGN_NOT_FOUND: 'Campaign not found for click record'
};

// Usage in endpoint
catch (error) {
  const errorResponse = {
    success: false,
    error: error.message,
    timestamp: new Date().toISOString(),
    webhook_data: req.body // For debugging (remove in production)
  };
  
  console.error("Webhook conversion error:", errorResponse);
  res.status(400).json(errorResponse);
}
```

## 4. Implementação Completa

### 4.1 Estrutura de Arquivos

```
server/
├── routes.ts                 # Adicionar endpoint /conversion
├── webhook-handlers/         # Nova pasta
│   ├── hotmart.js           # Handler específico Hotmart
│   ├── custom-checkout.js   # Handler checkout próprio
│   └── webhook-utils.js     # Utilitários compartilhados
└── storage.ts               # Usar métodos existentes
```

### 4.2 Testes de Webhook

#### **Teste Hotmart**
```bash
curl -X POST http://localhost:5000/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "SCK": "mc_automatikblog-main_1751843549158",
    "product": "Curso Digital",
    "purchase_value": 297.00,
    "currency": "BRL",
    "event": "PURCHASE_COMPLETED"
  }'
```

#### **Teste Checkout Próprio**
```bash
curl -X POST http://localhost:5000/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "SRC": "mc_automatikblog-main_1751843549158",
    "order_total": 497.00,
    "order_currency": "BRL",
    "event_type": "purchase"
  }'
```

### 4.3 Validação e Monitoramento

```javascript
// Add webhook logging
app.post("/conversion", async (req, res) => {
  const startTime = Date.now();
  const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[WEBHOOK-${webhookId}] Received conversion webhook:`, {
    body: req.body,
    headers: req.headers,
    ip: req.ip
  });
  
  try {
    // ... processing logic ...
    
    console.log(`[WEBHOOK-${webhookId}] Successfully processed in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`[WEBHOOK-${webhookId}] Failed after ${Date.now() - startTime}ms:`, error);
  }
});
```

## 5. Cronograma de Implementação

### **Fase 1 - Backend Core (2-3 horas)**
1. ✅ Criar endpoint `/conversion` básico
2. ✅ Implementar extração SRC/SCK
3. ✅ Implementar lookup de clickID
4. ✅ Adicionar normalização de dados

### **Fase 2 - Tratamento de Erros (1-2 horas)**
1. ✅ Implementar validações robustas
2. ✅ Adicionar logging detalhado
3. ✅ Criar respostas de erro padronizadas

### **Fase 3 - Testes (1-2 horas)**
1. ✅ Testes com dados Hotmart
2. ✅ Testes com checkout próprio
3. ✅ Testes de edge cases (clickID inválido, etc.)

### **Fase 4 - Documentação (30 min)**
1. ✅ Documentar formato de webhook
2. ✅ Criar exemplos de integração
3. ✅ Atualizar replit.md

## 6. Considerações de Segurança

### 6.1 Autenticação (Opcional)
```javascript
// Webhook signature validation
function validateWebhookSignature(req) {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

### 6.2 Rate Limiting
```javascript
// Prevent webhook spam
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests'
});

app.post("/conversion", webhookLimiter, async (req, res) => {
  // ... webhook logic
});
```

## 7. Monitoramento e Métricas

### 7.1 Dashboard de Webhooks
- Total de webhooks recebidos
- Taxa de sucesso/erro
- Tempo médio de processamento
- Principais erros

### 7.2 Alertas
- Webhook failures > 5% em 1 hora
- ClickID not found > 10% em 1 hora
- Processamento > 5 segundos

## Conclusão

O sistema MétricaClick já possui uma infraestrutura sólida para tracking de conversões. A implementação do endpoint `/conversion` para webhooks externos é uma extensão natural que reutiliza:

- ✅ Tabelas existentes (`clicks`, `conversions`)
- ✅ Métodos de storage já implementados
- ✅ Sistema de métricas funcionando
- ✅ Logging e error handling estabelecidos

A principal adição é a **camada de tradução** entre formatos de webhook externos (SRC/SCK) e o sistema interno de clickIDs, mantendo a compatibilidade total com o sistema atual.