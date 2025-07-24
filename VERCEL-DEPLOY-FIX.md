# 🚨 CORREÇÃO URGENTE - Deploy Vercel MétricaClick

## ❌ **PROBLEMA IDENTIFICADO:**

O Vercel está carregando o código **BACKEND COMPILADO** na página principal em vez do frontend React. Isso acontece porque:

1. **Configuração incorreta**: Vercel não sabe como separar frontend/backend
2. **Script mc.js não encontrado**: 404 no endpoint `/mc.js`
3. **Roteamento incorreto**: Sistema não está diferenciando entre API e frontend

## ✅ **SOLUÇÃO IMPLEMENTADA:**

### **1. Arquivo `vercel.json` Corrigido:**
- ✅ Separação clara entre frontend e backend
- ✅ Roteamento correto para `/mc.js` → `/api/mc.js`
- ✅ Fallback para SPA React
- ✅ Variáveis de ambiente configuradas

### **2. Endpoint API Específico:**
- ✅ Criado `/api/mc.js` para servir o script de rastreamento
- ✅ Headers CORS corretos
- ✅ Content-Type application/javascript

## 🚀 **PASSOS PARA CORRIGIR O DEPLOY:**

### **1. Commit dos Arquivos Novos:**
```bash
git add vercel.json api/mc.js VERCEL-DEPLOY-FIX.md
git commit -m "Fix Vercel deployment - separate frontend/backend routing"
git push
```

### **2. Redeploy na Vercel:**
- Vercel detectará o `vercel.json` automaticamente
- Build será executado corretamente
- Roteamento será aplicado

### **3. Configurar Variáveis de Ambiente na Vercel:**
```
VITE_API_URL=https://metrica-click.vercel.app
NODE_ENV=production
DATABASE_URL=[sua_url_do_neon]
```

## 🎯 **COMO FUNCIONARÁ APÓS CORREÇÃO:**

### **Frontend (Dashboard):**
```
https://metrica-click.vercel.app/ → React App
https://metrica-click.vercel.app/campaigns → React App
https://metrica-click.vercel.app/analytics → React App
```

### **API Backend:**
```
https://metrica-click.vercel.app/api/campaigns → API Route
https://metrica-click.vercel.app/track/campaign-id → API Route
https://metrica-click.vercel.app/leads → API Route
```

### **Script de Rastreamento:**
```
https://metrica-click.vercel.app/mc.js → JavaScript File
```

## 🔧 **TESTE PÓS-DEPLOY:**

### **1. Verificar Frontend:**
```bash
curl -I https://metrica-click.vercel.app/
# Deve retornar: Content-Type: text/html
```

### **2. Verificar Script:**
```bash
curl -I https://metrica-click.vercel.app/mc.js
# Deve retornar: Content-Type: application/javascript
```

### **3. Verificar API:**
```bash
curl -I https://metrica-click.vercel.app/api/campaigns
# Deve retornar dados JSON
```

## 🎉 **RESULTADO ESPERADO:**

Após o redeploy:
- ✅ **Frontend**: Dashboard React carregando normalmente
- ✅ **Script**: `/mc.js` servindo o arquivo JavaScript correto
- ✅ **API**: Endpoints funcionando para rastreamento
- ✅ **CORS**: Headers corretos para tracking cross-domain

## 📋 **CHECKLIST FINAL:**

- [ ] Fazer commit dos arquivos `vercel.json` e `api/mc.js`
- [ ] Redeploy na Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Testar URL principal (deve mostrar dashboard)
- [ ] Testar `/mc.js` (deve baixar JavaScript)
- [ ] Testar postback `/leads` 
- [ ] Atualizar DNS para domínio final

**O sistema estará 100% funcional após estes ajustes!** 🚀