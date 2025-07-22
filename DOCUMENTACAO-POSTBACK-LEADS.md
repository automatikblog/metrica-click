# 📋 Documentação do Sistema de Postback de Leads - MétricaClick

## 🎯 Endpoint Principal

```
POST https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/leads
```

**Importante:** Este é o endpoint público que recebe leads de sistemas externos (Hotmart, checkout personalizado, etc.)

## 📊 Campos Obrigatórios

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `name` | String | Nome completo do lead | "João Silva" |
| `email` | String | Email do lead | "joao@example.com" |

## 📊 Campos Opcionais (Recomendados)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `phone` | String | Telefone do lead | "+55 11 99999-9999" |
| `click_id` | String | ID do click para associação | "mc_automatikblog-main_1753194299970" |
| `campaign_id` | String | ID da campanha | "automatikblog-main" |
| `source` | String | Fonte do tráfego | "facebook", "google", "instagram" |
| `medium` | String | Meio de captura | "cpc", "social", "email", "organic" |
| `campaign` | String | Nome da campanha | "campanha_black_friday" |
| `content` | String | Conteúdo específico | "banner_superior" |
| `term` | String | Termo de pesquisa | "marketing digital" |

## 🔧 Exemplo de Uso - cURL

```bash
curl -X POST https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao.silva@example.com",
    "phone": "+55 11 98765-4321",
    "click_id": "mc_automatikblog-main_1753194299970",
    "campaign_id": "automatikblog-main",
    "source": "facebook",
    "medium": "cpc",
    "campaign": "artigo_principal"
  }'
```

## 🔧 Exemplo de Uso - JavaScript

```javascript
async function enviarLead(leadData) {
    try {
        const response = await fetch('https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('Lead criado:', result.lead);
            return result;
        } else {
            console.error('Erro:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        return null;
    }
}

// Exemplo de uso
const lead = {
    name: "Maria Oliveira",
    email: "maria@gmail.com",
    phone: "+55 21 99876-5432",
    source: "instagram",
    medium: "social",
    campaign: "promocao_especial"
};

enviarLead(lead);
```

## 🔧 Exemplo de Uso - PHP

```php
<?php
function enviarLead($leadData) {
    $url = 'https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/leads';
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($leadData)
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode === 201) {
        return json_decode($response, true);
    } else {
        error_log("Erro ao enviar lead: " . $response);
        return false;
    }
}

// Exemplo de uso
$lead = [
    'name' => 'Carlos Santos',
    'email' => 'carlos@hotmail.com',
    'phone' => '+55 11 94567-8901',
    'source' => 'google',
    'medium' => 'cpc',
    'campaign' => 'google_ads_brasil'
];

$resultado = enviarLead($lead);
?>
```

## 📋 Respostas da API

### ✅ Sucesso (201 Created)
```json
{
    "success": true,
    "lead": {
        "id": 1,
        "tenantId": 1,
        "name": "João Silva",
        "email": "joao.silva@example.com",
        "phone": "+55 11 98765-4321",
        "source": "facebook",
        "medium": "cpc",
        "campaign": "artigo_principal",
        "status": "new",
        "clickId": "mc_automatikblog-main_1753194299970",
        "campaignId": "automatikblog-main",
        "ipAddress": "177.34.29.81",
        "country": "Brazil",
        "region": "RS",
        "city": "Lajeado",
        "createdAt": "2025-07-22T14:29:59.970Z",
        "updatedAt": "2025-07-22T14:29:59.970Z"
    },
    "message": "Lead created successfully"
}
```

### ❌ Erro - Campos obrigatórios (400 Bad Request)
```json
{
    "error": "Name and email are required",
    "details": "Both 'name' and 'email' fields must be provided"
}
```

### ❌ Erro - Lead duplicado (409 Conflict)
```json
{
    "error": "Lead already exists",
    "lead": {
        "id": 1,
        "email": "joao.silva@example.com",
        "createdAt": "2025-07-22T14:29:59.970Z"
    }
}
```

## 🎯 Integração com Hotmart

Para integrar com Hotmart, configure o postback no painel do Hotmart:

1. **URL do Postback:** `https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/leads`
2. **Método:** POST
3. **Formato:** JSON
4. **Campos recomendados:**
   - name: `{{buyer_name}}`
   - email: `{{buyer_email}}`
   - phone: `{{buyer_phone}}`
   - source: "hotmart"
   - medium: "checkout"
   - campaign: `{{product_name}}`

## 🔗 Como Obter o Click ID

O `click_id` é gerado automaticamente quando um usuário clica em um link rastreado. Para obter:

1. **Acesse:** https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/click-logs
2. **Encontre o click mais recente** do usuário que converteu
3. **Copie o Click ID** (formato: `mc_campaign_timestamp`)
4. **Use no postback** para associar o lead ao click original

## 📊 Onde Visualizar os Leads

1. **Dashboard de Leads:** https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/leads
2. **Logs de Clicks:** https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/click-logs
3. **Analytics Geral:** https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/analytics

## 🧪 Página de Teste

**Acesse:** https://4a2ffbc1-3812-4901-ae4a-61bbc49a266c-00-364foszswqbwy.janeway.replit.dev/test-leads-postback.html

Esta página permite:
- Testar o envio de leads manualmente
- Preencher dados automaticamente
- Ver exemplos de uso
- Visualizar respostas da API em tempo real

## 🔧 Funcionalidades Automáticas

O sistema automaticamente:

1. **Captura geolocalização** do IP do usuário
2. **Previne duplicatas** por email
3. **Associa com clicks** quando `click_id` é fornecido
4. **Herda dados geográficos** do click original
5. **Define status inicial** como "new"
6. **Gera timestamps** de criação e atualização

## 🎯 Status dos Leads

Os leads podem ter os seguintes status:

- `new` - Novo lead capturado
- `contacted` - Lead já foi contatado
- `qualified` - Lead qualificado como prospect
- `converted` - Lead converteu em cliente
- `lost` - Lead perdido/não interessado

Você pode alterar o status diretamente no dashboard de leads.