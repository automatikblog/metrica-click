# TRANSFORMAÇÃO SAAS MULTIUSUÁRIO - MÉTRICACLICK

## 📋 ANÁLISE DA ESTRUTURA ATUAL

### **Estado Atual do Sistema**
O MétricaClick funciona atualmente como um sistema single-tenant onde:
- Todos os dados são compartilhados globalmente
- Não existe autenticação multiusuário
- Campanhas, clicks, conversões são acessíveis por qualquer usuário
- Scripts de tracking são globais sem isolamento
- Sincronizações Facebook operam em nível global
- Frontend não possui sistema de login/autorização

### **Componentes Atuais Identificados**

#### **Database Schema (shared/schema.ts)**
```typescript
// TABELAS EXISTENTES SEM TENANT_ID:
- campaigns (id, name, campaignId, status, totalSpend, totalRevenue, conversionCount)
- clicks (id, clickId, campaignId, source, geolocation data, Meta Ads params, UTM params)
- pageViews (id, clickId, referrer, geolocation data)
- users (id, username, password) // Sistema simples atual
- adSpend (id, campaignId, date, spend, impressions, reach, frequency, clicks)
- conversions (id, clickId, conversionType, value, currency)
- campaignSettings (id, campaignId, dailyBudget, fbAccountId, fbCampaignId)
```

#### **Backend Architecture**
- **server/routes.ts**: 50+ endpoints sem autenticação adequada
- **server/storage.ts**: Interface IStorage com métodos globais
- **server/sync/facebook-sync.ts**: Sincronização Facebook global
- **server/auth/facebook-oauth.ts**: Auth Facebook sem tenant scoping
- **server/webhook-utils.ts**: Webhooks conversão sem tenant isolation

#### **Frontend Architecture** 
- **client/src/App.tsx**: Rotas simples sem autenticação
- **Páginas**: Dashboard, Campaigns, Analytics, Integration, etc.
- **Componentes**: Sidebar, performance dashboard sem tenant context

#### **Tracking System**
- **public/mc.js**: Script global sem tenant verification
- **APIs**: `/track/:campaignID`, `/view` sem tenant scoping
- **Geolocation**: Serviços integrados sem tenant isolation

---

## 🏗️ ARQUITETURA SAAS PROPOSTA

### **1. ESTRUTURA DE BANCO DE DADOS MULTIUSUÁRIO**

#### **Novas Tabelas**
```sql
-- Empresas (Tenants)
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- para URLs amigáveis
  domain TEXT UNIQUE, -- domínio customizado opcional
  subscription_plan TEXT DEFAULT 'basic', -- basic, pro, enterprise
  subscription_status TEXT DEFAULT 'trial', -- trial, active, suspended, cancelled
  max_campaigns INTEGER DEFAULT 5,
  max_monthly_clicks INTEGER DEFAULT 10000,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Usuários Multiusuário
CREATE TABLE users_new (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- admin, editor, viewer
  status TEXT DEFAULT 'active', -- active, inactive, invited
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Convites de Usuário
CREATE TABLE user_invitations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by INTEGER NOT NULL REFERENCES users_new(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sessões de Usuário
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### **Tabelas Modificadas (Adicionar tenant_id)**
```sql
-- TODAS essas tabelas precisam adicionar tenant_id:

ALTER TABLE campaigns ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE clicks ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE pageViews ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE adSpend ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE conversions ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE campaignSettings ADD COLUMN tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- Indexes para performance
CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_clicks_tenant_id ON clicks(tenant_id);
CREATE INDEX idx_pageviews_tenant_id ON pageViews(tenant_id);
CREATE INDEX idx_adspend_tenant_id ON adSpend(tenant_id);
CREATE INDEX idx_conversions_tenant_id ON conversions(tenant_id);
CREATE INDEX idx_campaign_settings_tenant_id ON campaignSettings(tenant_id);
```

### **2. SISTEMA DE AUTENTICAÇÃO E AUTORIZAÇÃO**

#### **Middleware de Autenticação (server/middleware/auth.ts)**
```typescript
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    tenantId: number;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
  };
}

// Middleware principal
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction)
export function requireRole(roles: string[]) // Factory para verificar roles
export function validateTenant(req: AuthenticatedRequest, res: Response, next: NextFunction)
```

#### **Endpoints de Autenticação (server/routes/auth.ts)**
```typescript
POST /api/auth/login          // Login com email/senha
POST /api/auth/logout         // Logout e invalidação de sessão
POST /api/auth/register       // Registro nova empresa
GET  /api/auth/user           // Dados do usuário logado
POST /api/auth/forgot-password // Reset de senha
POST /api/auth/reset-password  // Confirmar reset
```

#### **Gestão de Usuários e Convites (server/routes/users.ts)**
```typescript
GET  /api/users               // Listar usuários do tenant
POST /api/users/invite        // Convidar novo usuário
POST /api/users/accept-invite // Aceitar convite
PUT  /api/users/:id/role      // Alterar role (admin only)
DELETE /api/users/:id         // Remover usuário (admin only)
```

### **3. MODIFICAÇÕES NO STORAGE LAYER**

#### **Nova Interface IStorage (server/storage.ts)**
```typescript
export interface IStorage {
  // Users & Tenants
  getTenant(id: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(tenantId: number, email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaigns - TODOS com tenantId obrigatório
  getCampaignsByTenant(tenantId: number): Promise<Campaign[]>;
  getCampaignByCampaignId(tenantId: number, campaignId: string): Promise<Campaign | undefined>;
  createCampaign(tenantId: number, campaign: InsertCampaign): Promise<Campaign>;
  
  // Clicks - TODOS com tenantId obrigatório
  getClicksByTenant(tenantId: number): Promise<Click[]>;
  getClickByClickId(tenantId: number, clickId: string): Promise<Click | undefined>;
  createClick(tenantId: number, click: InsertClick): Promise<Click>;
  
  // Page Views - TODOS com tenantId obrigatório
  getPageViewsByTenant(tenantId: number): Promise<PageView[]>;
  createPageView(tenantId: number, pageView: InsertPageView): Promise<PageView>;
  
  // Ad Spend - TODOS com tenantId obrigatório
  getAdSpendByTenant(tenantId: number, campaignId: string, startDate?: Date, endDate?: Date): Promise<AdSpend[]>;
  createAdSpend(tenantId: number, adSpend: InsertAdSpend): Promise<AdSpend>;
  
  // Conversions - TODOS com tenantId obrigatório
  getConversionsByTenant(tenantId: number): Promise<Conversion[]>;
  createConversion(tenantId: number, conversion: InsertConversion): Promise<Conversion>;
  
  // Analytics - TODOS com tenantId obrigatório
  getPerformanceSummary(tenantId: number, startDate?: Date, endDate?: Date): Promise<PerformanceSummary>;
  getBestPerformingCampaigns(tenantId: number, period: 'today' | 'yesterday'): Promise<CampaignPerformance[]>;
  // ... todos os métodos de analytics com tenantId
}
```

### **4. MODIFICAÇÕES NAS ROTAS API**

#### **Estrutura de Rotas Protegidas**
```typescript
// Todas as rotas precisam ser protegidas:
app.use('/api', requireAuth); // Middleware global

// Exemplos de rotas modificadas:
app.get('/api/campaigns', requireAuth, async (req: AuthenticatedRequest, res) => {
  const campaigns = await storage.getCampaignsByTenant(req.user.tenantId);
  res.json(campaigns);
});

app.get('/api/clicks', requireAuth, async (req: AuthenticatedRequest, res) => {
  const clicks = await storage.getClicksByTenant(req.user.tenantId);
  res.json(clicks);
});

// Tracking endpoints precisam verificar se campaign pertence ao tenant correto
app.get('/track/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  
  // Buscar tenant_id da campanha e validar
  const campaign = await storage.getCampaignByCampaignIdGlobal(campaignId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  
  // Continuar com tenant_id verificado
  const click = await storage.createClick(campaign.tenant_id, clickData);
  // ...
});
```

### **5. TRACKING SCRIPT MULTIUSUÁRIO**

#### **Modificações no mc.js (public/mc.js)**
```javascript
// Adicionar tenant verification em todas as requisições
function track() {
  const scriptParams = getScriptParams();
  const campaignId = scriptParams.cmpid;
  
  // Verificar se campanha existe e obter tenant_id
  requestClickId(campaignId, metaCookies, trafficSource, urlParams, 0);
}

function requestClickId(campaignId, metaCookies, trafficSource, urlParams, retryCount) {
  // API automaticamente validará tenant através do campaignId
  const trackingUrl = `${getBaseUrl()}/track/${campaignId}`;
  // ... resto do código existente
}
```

### **6. SISTEMA DE FACEBOOK SYNC MULTIUSUÁRIO**

#### **Modificações no Facebook Sync (server/sync/facebook-sync.ts)**
```typescript
export class FacebookSyncService {
  // Sincronizar apenas campanhas do tenant específico
  async syncCampaignsByTenant(tenantId: number): Promise<SyncStats>;
  
  // Cada tenant terá suas próprias credenciais Facebook
  async syncSingleCampaign(tenantId: number, campaignId: string): Promise<SyncResult>;
  
  // Configurações Facebook por tenant
  private async getFacebookCredentialsForTenant(tenantId: number): Promise<FacebookCredentials>;
}
```

### **7. FRONTEND MULTIUSUÁRIO**

#### **Sistema de Autenticação React**
```typescript
// client/src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// client/src/hooks/useAuth.ts
export function useAuth(): AuthContextType;

// client/src/components/ProtectedRoute.tsx
export function ProtectedRoute({ children, requiredRole }: Props);
```

#### **Modificações no App.tsx**
```typescript
function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/accept-invite/:token" component={AcceptInvite} />
            
            <ProtectedRoute>
              <Route path="/" component={Dashboard} />
              <Route path="/campaigns" component={Campaigns} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/settings/users" component={UserManagement} requiredRole="admin" />
              <Route path="/settings/billing" component={Billing} requiredRole="admin" />
            </ProtectedRoute>
          </Routes>
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

#### **Novas Páginas**
```typescript
// client/src/pages/auth/Login.tsx
// client/src/pages/auth/Register.tsx
// client/src/pages/auth/AcceptInvite.tsx
// client/src/pages/settings/UserManagement.tsx
// client/src/pages/settings/Billing.tsx
// client/src/pages/settings/TenantSettings.tsx
```

---

## 📝 IMPLEMENTAÇÃO DETALHADA

### **FASE 1: ESTRUTURA DE BANCO E AUTENTICAÇÃO**

#### **Arquivos a Criar:**
```
server/
├── middleware/
│   ├── auth.ts              // Middleware de autenticação
│   └── tenant.ts            // Middleware de tenant validation
├── routes/
│   ├── auth.ts              // Rotas de autenticação
│   ├── users.ts             // Gestão de usuários
│   └── tenants.ts           // Gestão de tenants
├── services/
│   ├── auth.service.ts      // Lógica de autenticação
│   ├── user.service.ts      // Lógica de usuários
│   ├── tenant.service.ts    // Lógica de tenants
│   └── email.service.ts     // Envio de emails (convites, reset)
└── utils/
    ├── password.ts          // Hash/verificação senhas
    ├── jwt.ts               // Gestão de tokens
    └── validation.ts        // Validações comuns

client/src/
├── contexts/
│   └── AuthContext.tsx      // Context de autenticação
├── hooks/
│   ├── useAuth.ts           // Hook de autenticação
│   └── useTenant.ts         // Hook de tenant
├── components/
│   ├── ProtectedRoute.tsx   // Componente de rota protegida
│   └── auth/               // Componentes de auth
└── pages/
    ├── auth/               // Páginas de autenticação
    └── settings/           // Páginas de configuração
```

#### **Arquivos a Modificar:**
```
shared/schema.ts            // Adicionar novas tabelas + tenant_id
server/storage.ts           // Modificar interface com tenant_id
server/routes.ts            // Adicionar middleware auth
server/sync/facebook-sync.ts // Tenant-aware sync
public/mc.js               // Tenant verification
client/src/App.tsx         // Sistema de rotas com auth
client/src/pages/*.tsx     // Todas as páginas com tenant context
```

### **FASE 2: MIGRAÇÃO DE DADOS**

#### **Script de Migração (server/migrations/add-multitenancy.ts)**
```typescript
export async function migrateToMultitenancy() {
  // 1. Criar tenant padrão para dados existentes
  const defaultTenant = await storage.createTenant({
    name: 'Default Company',
    slug: 'default',
    subscription_plan: 'enterprise'
  });
  
  // 2. Criar usuário admin padrão
  const adminUser = await storage.createUser({
    tenant_id: defaultTenant.id,
    email: 'admin@metricaclick.com',
    password: await hashPassword('defaultpassword123'),
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin'
  });
  
  // 3. Associar todos os dados existentes ao tenant padrão
  await db.execute(sql`UPDATE campaigns SET tenant_id = ${defaultTenant.id}`);
  await db.execute(sql`UPDATE clicks SET tenant_id = ${defaultTenant.id}`);
  await db.execute(sql`UPDATE pageViews SET tenant_id = ${defaultTenant.id}`);
  await db.execute(sql`UPDATE adSpend SET tenant_id = ${defaultTenant.id}`);
  await db.execute(sql`UPDATE conversions SET tenant_id = ${defaultTenant.id}`);
  await db.execute(sql`UPDATE campaignSettings SET tenant_id = ${defaultTenant.id}`);
  
  console.log('Migration completed. Default credentials:');
  console.log(`Email: admin@metricaclick.com`);
  console.log(`Password: defaultpassword123`);
}
```

### **FASE 3: SISTEMA DE PERMISSÕES**

#### **Definição de Roles**
```typescript
export enum UserRole {
  ADMIN = 'admin',    // Acesso total: usuários, billing, configurações
  EDITOR = 'editor',  // Criar/editar campanhas, visualizar relatórios
  VIEWER = 'viewer'   // Apenas visualização de relatórios
}

export const PERMISSIONS = {
  // Campaigns
  'campaigns:read': [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
  'campaigns:write': [UserRole.ADMIN, UserRole.EDITOR],
  'campaigns:delete': [UserRole.ADMIN],
  
  // Analytics
  'analytics:read': [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER],
  
  // Users
  'users:read': [UserRole.ADMIN],
  'users:write': [UserRole.ADMIN],
  'users:invite': [UserRole.ADMIN],
  
  // Settings
  'settings:read': [UserRole.ADMIN],
  'settings:write': [UserRole.ADMIN],
  
  // Integrations
  'integrations:read': [UserRole.ADMIN, UserRole.EDITOR],
  'integrations:write': [UserRole.ADMIN, UserRole.EDITOR]
};
```

### **FASE 4: BILLING E PLANOS**

#### **Sistema de Assinaturas**
```typescript
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  limits: {
    campaigns: number;
    monthlyClicks: number;
    users: number;
    facebookIntegration: boolean;
    customDomain: boolean;
    apiAccess: boolean;
  };
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    currency: 'USD',
    limits: {
      campaigns: 5,
      monthlyClicks: 10000,
      users: 2,
      facebookIntegration: false,
      customDomain: false,
      apiAccess: false
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    currency: 'USD',
    limits: {
      campaigns: 25,
      monthlyClicks: 100000,
      users: 10,
      facebookIntegration: true,
      customDomain: true,
      apiAccess: true
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    currency: 'USD',
    limits: {
      campaigns: -1, // unlimited
      monthlyClicks: -1, // unlimited
      users: -1, // unlimited
      facebookIntegration: true,
      customDomain: true,
      apiAccess: true
    }
  }
];
```

---

## 🔧 LISTA DE ARQUIVOS A MODIFICAR

### **CRIAR NOVOS:**
```
server/middleware/auth.ts
server/middleware/tenant.ts
server/routes/auth.ts
server/routes/users.ts
server/routes/tenants.ts
server/services/auth.service.ts
server/services/user.service.ts
server/services/tenant.service.ts
server/services/email.service.ts
server/utils/password.ts
server/utils/jwt.ts
server/utils/validation.ts
server/migrations/add-multitenancy.ts

client/src/contexts/AuthContext.tsx
client/src/hooks/useAuth.ts
client/src/hooks/useTenant.ts
client/src/components/ProtectedRoute.tsx
client/src/components/auth/LoginForm.tsx
client/src/components/auth/RegisterForm.tsx
client/src/pages/auth/Login.tsx
client/src/pages/auth/Register.tsx
client/src/pages/auth/AcceptInvite.tsx
client/src/pages/settings/UserManagement.tsx
client/src/pages/settings/Billing.tsx
client/src/pages/settings/TenantSettings.tsx
```

### **MODIFICAR EXISTENTES:**
```
shared/schema.ts            // Adicionar tabelas de tenant + tenant_id em todas
server/storage.ts           // Interface com tenant_id obrigatório
server/routes.ts            // Middleware auth + tenant filtering
server/sync/facebook-sync.ts // Sync por tenant
server/webhook-utils.ts     // Tenant validation
public/mc.js               // Tenant-aware tracking
client/src/App.tsx         // Router com autenticação
client/src/pages/dashboard.tsx // Dados filtrados por tenant
client/src/pages/campaigns.tsx // Dados filtrados por tenant
client/src/pages/analytics.tsx // Dados filtrados por tenant
client/src/pages/integration.tsx // Tenant-specific integration
client/src/pages/facebook-settings.tsx // Tenant Facebook config
client/src/pages/click-logs.tsx // Dados filtrados por tenant
client/src/pages/conversion-logs.tsx // Dados filtrados por tenant
client/src/pages/geography-analytics.tsx // Dados filtrados por tenant
client/src/components/sidebar.tsx // Navigation com tenant context
replit.md                  // Atualizar arquitetura SaaS
```

---

## 🚀 CRONOGRAMA DE IMPLEMENTAÇÃO

### **Sprint 1 (Semana 1): Base de Autenticação**
- [ ] Criar tabelas de tenant e usuários
- [ ] Implementar middleware de autenticação
- [ ] Criar rotas de auth (login/register/logout)
- [ ] Implementar frontend de login/register
- [ ] Migração de dados existentes para tenant padrão

### **Sprint 2 (Semana 2): Isolamento de Dados**
- [ ] Modificar todas as queries para incluir tenant_id
- [ ] Implementar middleware de tenant validation
- [ ] Modificar APIs para filtrar por tenant
- [ ] Atualizar frontend com context de tenant
- [ ] Implementar sistema de permissões

### **Sprint 3 (Semana 3): Gestão de Usuários**
- [ ] Sistema de convites de usuário
- [ ] Página de gestão de usuários
- [ ] Sistema de roles e permissões
- [ ] Reset de senha e recuperação
- [ ] Validações de limites por plano

### **Sprint 4 (Semana 4): Tracking e Integrações**
- [ ] Adaptar tracking script para multitenancy
- [ ] Facebook sync por tenant
- [ ] Webhooks com tenant isolation
- [ ] APIs de analytics filtradas
- [ ] Páginas de configuração de tenant

### **Sprint 5 (Semana 5): Billing e Produção**
- [ ] Sistema de billing e assinaturas
- [ ] Limites por plano
- [ ] Monitoramento de uso
- [ ] Dashboard de administração
- [ ] Testes e deployment

---

## ⚠️ NOTAS DE SEGURANÇA

### **Crítico - Isolamento de Dados:**
1. **NUNCA** fazer query sem tenant_id
2. **SEMPRE** validar que o usuário pertence ao tenant antes de qualquer operação
3. **VERIFICAR** em nível de middleware que tenant_id está presente
4. **CRIAR** indexes em tenant_id para performance
5. **IMPLEMENTAR** soft delete em vez de hard delete

### **Tracking Script Security:**
1. **VALIDAR** que campaign_id pertence ao tenant correto
2. **RATE LIMITING** por tenant para evitar abuso
3. **LOGS** de acesso para auditoria
4. **CORS** adequado para domains do tenant

### **Credenciais Facebook:**
1. **CRIPTOGRAFAR** tokens do Facebook no banco
2. **SCOPE** limitado por tenant
3. **REFRESH** automático de tokens
4. **REVOGAR** acesso ao desativar tenant

---

## 📊 MIGRAÇÃO DOS DADOS EXISTENTES

### **Estratégia:**
1. **Criar tenant padrão** com nome "AutomatikBlog"
2. **Associar todos os dados existentes** ao tenant padrão
3. **Criar usuário admin** com credenciais conhecidas
4. **Manter compatibilidade** durante período de transição
5. **Validar integridade** dos dados após migração

### **Rollback Plan:**
1. **Backup completo** do banco antes da migração
2. **Scripts de rollback** para reverter mudanças
3. **Ambiente de staging** para testes
4. **Monitoramento** de erros pós-deploy

---

Este plano detalha completamente a transformação do MétricaClick em um sistema SaaS multiusuário com isolamento seguro entre empresas. A implementação seguirá uma abordagem gradual para minimizar riscos e garantir que o sistema atual continue funcionando durante a transição.