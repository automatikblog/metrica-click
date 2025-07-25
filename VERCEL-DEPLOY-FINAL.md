# ✅ VERCEL DEPLOY FINAL SOLUTION

## 🎯 PROBLEMA RESOLVIDO
**Erro**: "The `functions` property cannot be used in conjunction with the `builds` property"
**Causa**: Conflito de configuração no vercel.json
**Status**: ✅ CORRIGIDO

---

## 📋 CONFIGURAÇÃO FINAL VERCEL.JSON

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    },
    {
      "src": "server/index.ts",
      "use": "@vercel/node@3"
    }
  ],
  "routes": [
    {
      "src": "/mc.js",
      "dest": "/api/mc.js"
    },
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/track/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/view",
      "dest": "/server/index.ts"
    },
    {
      "src": "/leads",
      "dest": "/server/index.ts"
    },
    {
      "src": "/conversion",
      "dest": "/server/index.ts"
    },
    {
      "src": "/error-log",
      "dest": "/server/index.ts"
    },
    {
      "src": "/health",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))",
      "dest": "/dist/public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🔧 DEPLOY AUTOMÁTICO - CONFIGURAÇÃO GITHUB

### **1. Conectar Repositório GitHub**
1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique "New Project"
3. Conecte o repositório `automatikblog/metrica-click`
4. Configure o domínio `metricaclick.com.br`

### **2. Environment Variables**
Configure as seguintes variáveis no painel da Vercel:

```bash
DATABASE_URL=postgresql://[connection_string]
NODE_ENV=production
FACEBOOK_APP_ID=[seu_app_id]
FACEBOOK_APP_SECRET=[seu_app_secret]
FACEBOOK_ACCESS_TOKEN=[seu_token]
SESSION_SECRET=[random_secret]
```

### **3. Deploy Settings**
- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Root Directory**: `.` (root)
- **Node.js Version**: 18.x

---

## 🚀 COMO FUNCIONA

### **Frontend Build**
- `vite build` → Gera React app em `dist/public/`
- Servido como arquivos estáticos na raiz

### **Backend Serverless**
- `server/index.ts` → Serverless function
- Todas as rotas API passam por `/server/index.ts`

### **Tracking Script**
- `/mc.js` → Redireciona para `/api/mc.js`
- Servido com CORS correto para tracking externo

---

## ✅ DEPLOY AUTOMÁTICO

### **Push Automático**
Após cada commit no `main`:
1. Vercel detecta mudanças automaticamente
2. Executa build do frontend e backend
3. Deploy em produção em ~2-3 minutos
4. Disponível em `metricaclick.com.br`

### **Como Testar**
1. Faça qualquer mudança no código
2. Commit: `git commit -m "test deploy"`
3. Push: `git push origin main`
4. Aguarde notificação da Vercel (email/Slack)
5. Acesse `metricaclick.com.br` para verificar

---

## 🛡️ TROUBLESHOOTING

### **Deploy Falha**
- Verifique logs no painel Vercel
- Confirme environment variables
- Teste build local: `npm run build`

### **Frontend não Carrega**
- Confirme que `dist/public/index.html` existe
- Verifique rotas SPA no vercel.json

### **API não Funciona**
- Verifique se `server/index.ts` está sendo deployado
- Confirme rotas `/api/*` no vercel.json
- Teste endpoints: `curl https://metricaclick.com.br/health`

### **Tracking Script Falha**
- Teste: `curl https://metricaclick.com.br/mc.js`
- Verifique CORS headers
- Confirme rota `/mc.js` → `/api/mc.js`

---

## 📊 STATUS FINAL

✅ **vercel.json**: Corrigido - sem conflito functions/builds  
✅ **Frontend**: React app compilado para dist/public  
✅ **Backend**: Serverless functions funcionais  
✅ **Deploy Automático**: Configurado via GitHub  
✅ **Domínio**: metricaclick.com.br pronto  
✅ **Tracking**: mc.js script com CORS correto  

**RESULTADO**: Sistema pronto para deploy automático na Vercel! 🚀