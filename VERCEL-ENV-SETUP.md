# 🔧 CONFIGURAÇÃO VERCEL - Variáveis de Ambiente

## ⚠️ **PROBLEMA ATUAL:**
O login na produção Vercel está falhando porque as **variáveis de ambiente** não estão configuradas.

## 🎯 **SOLUÇÃO - Configurar Environment Variables:**

### **1. Acesse o Dashboard da Vercel:**
1. Vá para https://vercel.com/dashboard
2. Clique no projeto **metrica-click**
3. Vá na aba **Settings**
4. Clique em **Environment Variables**

### **2. Adicione estas Variáveis:**

```bash
# Database
DATABASE_URL = postgresql://...seu_database_url...

# Facebook Ads API
FACEBOOK_ACCESS_TOKEN = seu_token_facebook
FACEBOOK_AD_ACCOUNT_ID = act_7831626963515597

# Application
NODE_ENV = production
```

### **3. Como obter os valores:**

#### **DATABASE_URL:**
- Copie o valor do seu banco de dados PostgreSQL
- Formato: `postgresql://user:password@host:port/database`

#### **FACEBOOK_ACCESS_TOKEN:**
- Token de acesso do Facebook Business
- Geralmente começa com `EAAxxxxxxx`

#### **FACEBOOK_AD_ACCOUNT_ID:**
- ID da conta de anúncios do Facebook
- Formato: `act_xxxxxxxxx`

### **4. Após Configurar:**

1. **Deploy Automático**: Vercel vai fazer redeploy automaticamente
2. **Teste o Login**: Acesse https://metrica-click.vercel.app
3. **Use as Credenciais**: 
   - Email: `automatikblog13@gmail.com`
   - Senha: `123456`

## 🚀 **RESULTADO ESPERADO:**
- ✅ Login funcionando
- ✅ Dashboard carregando
- ✅ Dados reais do Facebook Ads
- ✅ Tracking script `/mc.js` ativo

## 📞 **Precisa de Ajuda?**
Se não souber onde encontrar essas variáveis, me avise que te ajudo a localizar cada uma.