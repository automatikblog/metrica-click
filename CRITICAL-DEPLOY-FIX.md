# 🚨 CORREÇÃO CRÍTICA - Deploy Vercel

## ❌ **PROBLEMA IDENTIFICADO:**

Tanto `metricaclick.com.br` quanto `metrica-click.vercel.app` estão carregando **CÓDIGO BACKEND** em vez do **frontend React**. O problema é que o Vercel não está servindo os arquivos estáticos corretamente.

## ✅ **DIAGNÓSTICO COMPLETO:**

### **1. Problema de Roteamento:**
- Vercel está servindo `dist/index.js` (backend) em vez de `dist/public/index.html` (frontend)
- Configuração `vercel.json` não está funcionando corretamente
- Frontend buildado existe em `dist/public/` mas não está sendo servido

### **2. Arquivos Corretos Gerados:**
```
dist/
├── index.js (backend - NÃO DEVE SER SERVIDO NA RAIZ)
└── public/
    ├── index.html (frontend - DEVE SER SERVIDO NA RAIZ)
    ├── mc.js (script de tracking)
    └── assets/
        ├── index-CTpQ1jwd.css
        └── index-CjnkFu40.js
```

## 🔧 **CORREÇÕES APLICADAS:**

### **A. `vercel.json` Otimizado:**
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
    }
  ],
  "functions": {
    "server/index.ts": {
      "runtime": "@vercel/node@3"
    }
  },
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
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))",
      "dest": "/dist/public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/index.html"
    }
  ]
}
```

### **B. Build Process Corrigido:**
1. ✅ Frontend buildado em `dist/public/`
2. ✅ Script `mc.js` copiado para `dist/public/`
3. ✅ Separação clara entre frontend e backend

### **C. Roteamento Específico:**
- **Static Assets**: `*.js, *.css, *.png` → `/dist/public/`
- **API Endpoints**: `/api/*`, `/track/*`, `/leads` → `server/index.ts`
- **SPA Fallback**: Todas outras rotas → `/dist/public/index.html`

## 🚀 **PRÓXIMOS PASSOS:**

### **1. Commit & Deploy:**
```bash
git add .
git commit -m "Critical fix: Correct Vercel frontend/backend separation"
git push
```

### **2. Configurar Variáveis na Vercel:**
- `DATABASE_URL` = [conexão PostgreSQL]
- `NODE_ENV` = production

### **3. Teste Pós-Deploy:**
Após o redeploy, você deve ver:
- ✅ `https://metricaclick.com.br/` → **Dashboard React** (não código JS)
- ✅ `https://metricaclick.com.br/mc.js` → **Script de tracking**
- ✅ `https://metricaclick.com.br/api/campaigns` → **API funcionando**

## 🎯 **DIFERENÇA CRÍTICA:**

### **❌ ANTES (Errado):**
```
https://metricaclick.com.br/ → Código backend compilado
```

### **✅ DEPOIS (Correto):**
```
https://metricaclick.com.br/ → React Dashboard HTML
```

## 📋 **VALIDAÇÃO FINAL:**

Quando funcionar, você verá:
1. **Tela de login** do MétricaClick (não código JavaScript)
2. **URL script funcionando**: `https://metricaclick.com.br/mc.js`
3. **APIs respondendo**: `https://metricaclick.com.br/api/*`

**Esta correção resolve definitivamente o problema de deploy!** 🎉