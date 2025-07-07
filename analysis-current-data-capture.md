# MétricaClick - Análise dos Dados Capturados por Sessão

## DADOS ATUALMENTE CAPTURADOS

### 1. Dados de Click (tabela `clicks`)
```sql
- clickId: text (ID único do click)
- campaignId: text (ID da campanha)
- source: text (fonte do tráfego - ex: "direct", "referral")
- referrer: text (URL de origem)
- fbp: text (Facebook Browser ID)
- fbc: text (Facebook Click ID)
- userAgent: text (navegador/dispositivo)
- ipAddress: text (endereço IP)
- conversionValue: decimal (valor da conversão)
- convertedAt: timestamp (data da conversão)
- createdAt: timestamp (data de criação)
```

### 2. Dados de Page View (tabela `page_views`)
```sql
- clickId: text (referência ao click)
- referrer: text (URL de origem)
- userAgent: text (navegador/dispositivo)
- ipAddress: text (endereço IP)
- createdAt: timestamp (data de criação)
```

## DADOS GEOGRÁFICOS QUE NÃO ESTAMOS CAPTURANDO

### ❌ Dados Ausentes:
- **País** (ex: "Brasil", "United States")
- **Código do País** (ex: "BR", "US")
- **Estado/Região** (ex: "São Paulo", "California")
- **Cidade** (ex: "São Paulo", "Los Angeles")
- **Código Postal** (ex: "01310-100", "90210")
- **Timezone** (ex: "America/Sao_Paulo")
- **Latitude/Longitude**
- **ISP/Provedor** (ex: "Vivo", "Comcast")
- **Tipo de Conexão** (ex: "mobile", "desktop")

## COMO CAPTURAR DADOS GEOGRÁFICOS

### Opção 1: IP Geolocation API (Recomendado)
```javascript
// Serviços gratuitos com limites:
- ipapi.co: 1000 requests/dia grátis
- ip-api.com: 1000 requests/minuto grátis
- geoip-api.com: 1000 requests/mês grátis

// Serviços pagos precisos:
- MaxMind GeoIP2: $20/mês
- IPStack: $10/mês
- IPGeolocation: $15/mês
```

### Opção 2: Browser Geolocation API
```javascript
// Requer permissão do usuário
navigator.geolocation.getCurrentPosition(
  (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
  }
);
```

### Opção 3: Cloudflare Headers (Se disponível)
```javascript
// Headers automáticos do Cloudflare:
CF-IPCountry: BR
CF-IPCity: Sao Paulo
CF-Region: SP
```

## IMPLEMENTAÇÃO RECOMENDADA

### 1. Atualizar Schema do Banco
```sql
ALTER TABLE clicks ADD COLUMN country text;
ALTER TABLE clicks ADD COLUMN country_code text;
ALTER TABLE clicks ADD COLUMN region text;
ALTER TABLE clicks ADD COLUMN city text;
ALTER TABLE clicks ADD COLUMN postal_code text;
ALTER TABLE clicks ADD COLUMN timezone text;
ALTER TABLE clicks ADD COLUMN isp text;
ALTER TABLE clicks ADD COLUMN connection_type text;
ALTER TABLE clicks ADD COLUMN latitude decimal(10,8);
ALTER TABLE clicks ADD COLUMN longitude decimal(11,8);
```

### 2. Integrar IP Geolocation
```javascript
// No backend (server/routes.ts)
async function getGeoLocation(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,region,city,zip,timezone,isp,mobile,lat,lon`);
    const data = await response.json();
    
    return {
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      city: data.city,
      postalCode: data.zip,
      timezone: data.timezone,
      isp: data.isp,
      connectionType: data.mobile ? 'mobile' : 'desktop',
      latitude: data.lat,
      longitude: data.lon
    };
  } catch (error) {
    console.error('Geo lookup failed:', error);
    return null;
  }
}
```

### 3. Detectar Dispositivo/OS
```javascript
// Parser do User-Agent
function parseUserAgent(userAgent) {
  // Detectar:
  // - Sistema Operacional (Windows, macOS, Android, iOS)
  // - Navegador (Chrome, Firefox, Safari, Edge)
  // - Dispositivo (Desktop, Mobile, Tablet)
  // - Marca/Modelo (iPhone 12, Samsung Galaxy, etc)
}
```

## IMPACTO NOS RELATÓRIOS

### Novos Relatórios Possíveis:
1. **Relatório por País/Região**
   - Top países por clicks/conversões
   - Performance por região geográfica
   
2. **Análise de Funil Geográfico**
   - Onde perdem mais usuários
   - Conversão por localização
   
3. **Segmentação Avançada**
   - Mobile vs Desktop por país
   - Performance por ISP/conexão
   
4. **Timezone Intelligence**
   - Melhores horários por região
   - Personalização por fuso horário

## CUSTOS E LIMITAÇÕES

### APIs Gratuitas:
- **ip-api.com**: 1000 requests/minuto (45k/mês)
- **ipapi.co**: 1000 requests/dia (30k/mês)
- Precisão: ~85-95% para país, ~70-85% para cidade

### APIs Pagas:
- **MaxMind**: $20/mês, 99% precisão
- **IPStack**: $10/mês, 95% precisão
- Sem limite de requests

## RECOMENDAÇÃO

Para o MétricaClick, sugiro:

1. **Implementar ip-api.com** (gratuito, 45k requests/mês)
2. **Capturar dados básicos:** país, estado, cidade, timezone
3. **Parser de User-Agent** para dispositivo/OS
4. **Monitorar uso** e migrar para API paga se necessário

Isso nos daria insights muito mais ricos sobre o tráfego e comportamento dos usuários.