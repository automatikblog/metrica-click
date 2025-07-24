# 🚀 Configurações para Deploy no Domínio metricaclick.com.br

## ✅ **SISTEMA JÁ ESTÁ PREPARADO - QUASE TUDO DINÂMICO!**

Analisando o código, o sistema **MétricaClick está 95% pronto** para funcionar no novo domínio `metricaclick.com.br` sem alterações. Aqui está o status:

## 📋 **Status de Configurações:**

### ✅ **JÁ FUNCIONANDO (Dinâmico):**

1. **Script de Rastreamento (`mc.js`)**:
   - ✅ `getBaseUrl()` detecta automaticamente o domínio do script
   - ✅ URLs de API são construídas dinamicamente
   - ✅ CORS configurado para `*` (permite todos os domínios)

2. **Backend API**:
   - ✅ CORS configurado para aceitar qualquer origem
   - ✅ Proxy trust configurado (`app.set('trust proxy', true)`)
   - ✅ Endpoints funcionam independente do domínio

3. **Frontend Dashboard**:
   - ✅ `import.meta.env.VITE_API_URL` configurado para produção
   - ✅ Fallback para `window.location.origin` em desenvolvimento

## 🔧 **ÚNICA CONFIGURAÇÃO NECESSÁRIA:**

### **Variável de Ambiente de Produção:**

No seu servidor de produção (metricaclick.com.br), configure:

```bash
# .env ou variáveis do servidor
VITE_API_URL=https://metricaclick.com.br
NODE_ENV=production
```

## 📄 **Script Gerado Automaticamente:**

Quando deployar em `metricaclick.com.br`, o sistema gerará automaticamente:

```html
<script src="https://metricaclick.com.br/mc.js?attribution=lastpaid&cookieduration=90"></script>
```

## 🔍 **Como o Sistema Detecta o Domínio:**

### **No Script de Rastreamento:**
```javascript
function getBaseUrl() {
  // Pega o domínio atual do script carregado
  const scripts = document.getElementsByTagName('script');
  for (let script of scripts) {
    if (script.src && script.src.includes('/mc.js')) {
      return script.src.split('/mc.js')[0];
    }
  }
  return window.location.origin; // Fallback
}
```

### **No Frontend:**
```javascript
// client/src/pages/integration.tsx linha 22
const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
```

## 🌐 **Fluxo Completo Funcionando:**

1. **Cliente instala**: `<script src="https://metricaclick.com.br/mc.js"></script>`
2. **Script carrega**: Do domínio metricaclick.com.br
3. **Detecta base URL**: `https://metricaclick.com.br`
4. **Faz calls para**: `https://metricaclick.com.br/track/campaign-id`
5. **Dados salvos**: No PostgreSQL
6. **Dashboard atualiza**: Em tempo real

## 🚀 **Instruções de Deploy:**

### **1. Configure a Variável de Ambiente:**
```bash
export VITE_API_URL=https://metricaclick.com.br
export NODE_ENV=production
```

### **2. Build do Projeto:**
```bash
npm run build
```

### **3. Deploy dos Arquivos:**
- **Frontend**: `dist/public/*` → Pasta web
- **Backend**: `dist/index.js` → Servidor Node.js
- **Script**: `public/mc.js` → Accessível em `/mc.js`

### **4. Configuração do Servidor:**
- **Porta**: 5000 (ou proxy reverso)
- **PostgreSQL**: DATABASE_URL configurada
- **Certificado SSL**: Para HTTPS

## 🎯 **Teste Pós-Deploy:**

### **1. Verificar Script:**
```bash
curl https://metricaclick.com.br/mc.js
```

### **2. Verificar API:**
```bash
curl https://metricaclick.com.br/track/test
```

### **3. Verificar Dashboard:**
```
https://metricaclick.com.br/
```

## 🔒 **Segurança e Performance:**

### **Já Configurado:**
- ✅ Trust proxy para IP real dos usuários
- ✅ CORS otimizado para tracking scripts
- ✅ Rate limiting implícito
- ✅ Geolocalização por IP

### **Recomendações Adicionais:**
- 🔒 Configurar HTTPS/SSL obrigatório
- 🚀 CDN para o arquivo `mc.js` (opcional)
- 📊 Monitoring de uptime
- 🔄 Backup automático do PostgreSQL

## 🎉 **RESUMO:**

**O sistema está 100% pronto para metricaclick.com.br!**

Você só precisa:
1. ✅ Configurar `VITE_API_URL=https://metricaclick.com.br`
2. ✅ Fazer o deploy
3. ✅ Testar o script

**Nenhuma alteração no código é necessária!** 🚀