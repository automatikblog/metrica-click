import { 
  campaigns, 
  clicks, 
  pageViews, 
  users,
  adSpend,
  conversions,
  campaignSettings,
  tenants,
  usersNew,
  userInvitations,
  userSessions,
  type Campaign, 
  type Click, 
  type PageView, 
  type User,
  type AdSpend,
  type Conversion,
  type CampaignSettings,
  type Tenant,
  type UserNew,
  type UserInvitation,
  type UserSession,
  type InsertCampaign, 
  type InsertClick, 
  type InsertPageView, 
  type InsertUser,
  type InsertAdSpend,
  type InsertConversion,
  type InsertCampaignSettings,
  type InsertTenant,
  type InsertUserNew,
  type InsertUserInvitation,
  type InsertUserSession
} from "@shared/schema";
import { eq, sql, gte, lte, and, desc, isNotNull, or } from "drizzle-orm";
import { db } from "./db";

// Geographic Analytics Types
export interface CountryStats {
  country: string;
  countryCode: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
}

export interface RegionStats {
  region: string;
  country: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
}

export interface CityStats {
  city: string;
  region: string;
  country: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
}

export interface DeviceStats {
  deviceType: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
}

export interface TimezoneStats {
  timezone: string;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
}

export interface PerformanceSummary {
  spend: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  revenue: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
  roas: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  conversions: number;
  revenue: number;
  spend: number;
  roas: number;
}

export interface AdPerformance {
  adName: string;
  adId: string | null;
  conversions: number;
  revenue: number;
  clicks: number;
  conversionRate: number;
}

export interface ChannelPerformance {
  channel: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface MetricsChartData {
  date: string;
  clicks: number;
  conversions: number;
}

export interface IStorage {
  // Tenants
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | undefined>;
  
  // Users (new multiuser system)
  getUserNew(id: number): Promise<UserNew | undefined>;
  getUserNewByEmail(email: string): Promise<UserNew | undefined>;
  getUserNewsByTenant(tenantId: number): Promise<UserNew[]>;
  createUserNew(user: InsertUserNew): Promise<UserNew>;
  updateUserNew(id: number, updates: Partial<UserNew>): Promise<UserNew | undefined>;
  deleteUserNew(id: number): Promise<boolean>;
  
  // Legacy users (kept for compatibility)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaigns - TENANT SCOPED
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignByCampaignId(tenantId: number, campaignId: string): Promise<Campaign | undefined>;
  getCampaignByCampaignIdGlobal(campaignId: string): Promise<Campaign | undefined>; // For tracking script
  createCampaign(tenantId: number, campaign: InsertCampaign): Promise<Campaign>;
  getCampaignsByTenant(tenantId: number): Promise<Campaign[]>;
  getAllCampaigns(): Promise<Campaign[]>; // Legacy - remove eventually
  updateCampaign(tenantId: number, campaignId: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  
  // Clicks - TENANT SCOPED
  getClick(id: number): Promise<Click | undefined>;
  getClickByClickId(tenantId: number, clickId: string): Promise<Click | undefined>;
  getClickByClickIdGlobal(clickId: string): Promise<Click | undefined>; // For tracking script
  createClick(tenantId: number, click: InsertClick): Promise<Click>;
  getClicksByCampaignId(tenantId: number, campaignId: string): Promise<Click[]>;
  getClicksByTenant(tenantId: number): Promise<Click[]>;
  getAllClicks(): Promise<Click[]>; // Legacy - remove eventually
  updateClick(tenantId: number, clickId: string, updates: Partial<Click>): Promise<Click | undefined>;
  
  // Page Views - TENANT SCOPED
  getPageView(id: number): Promise<PageView | undefined>;
  createPageView(tenantId: number, pageView: InsertPageView): Promise<PageView>;
  getPageViewsByClickId(tenantId: number, clickId: string): Promise<PageView[]>;
  getPageViewsByTenant(tenantId: number): Promise<PageView[]>;
  getAllPageViews(): Promise<PageView[]>; // Legacy - remove eventually
  
  // Ad Spend Operations - TENANT SCOPED
  getAdSpend(tenantId: number, campaignId: string, startDate?: Date, endDate?: Date): Promise<AdSpend[]>;
  createAdSpend(tenantId: number, adSpend: InsertAdSpend): Promise<AdSpend>;
  upsertAdSpend(tenantId: number, adSpend: InsertAdSpend): Promise<AdSpend>;
  updateAdSpend(tenantId: number, id: number, updates: Partial<AdSpend>): Promise<AdSpend | undefined>;
  
  // Conversion Operations - TENANT SCOPED
  getConversion(id: number): Promise<Conversion | undefined>;
  getConversionsByClickId(tenantId: number, clickId: string): Promise<Conversion[]>;
  createConversion(tenantId: number, conversion: InsertConversion): Promise<Conversion>;
  getConversionsByCampaignId(tenantId: number, campaignId: string): Promise<Conversion[]>;
  getConversionsByTenant(tenantId: number): Promise<Conversion[]>;
  
  // Campaign Settings - TENANT SCOPED
  getCampaignSettings(tenantId: number, campaignId: string): Promise<CampaignSettings | undefined>;
  createCampaignSettings(tenantId: number, settings: InsertCampaignSettings): Promise<CampaignSettings>;
  updateCampaignSettings(tenantId: number, campaignId: string, updates: Partial<CampaignSettings>): Promise<CampaignSettings | undefined>;
  getCampaignSettingsByTenant(tenantId: number): Promise<CampaignSettings[]>;
  
  // Geographic Analytics - TENANT SCOPED
  getClicksGroupedByCountry(tenantId: number, startDate?: Date, endDate?: Date): Promise<CountryStats[]>;
  getClicksGroupedByRegion(tenantId: number, startDate?: Date, endDate?: Date): Promise<RegionStats[]>;
  getClicksGroupedByCity(tenantId: number, startDate?: Date, endDate?: Date): Promise<CityStats[]>;
  getClicksGroupedByDevice(tenantId: number, startDate?: Date, endDate?: Date): Promise<DeviceStats[]>;
  getClicksGroupedByTimezone(tenantId: number, startDate?: Date, endDate?: Date): Promise<TimezoneStats[]>;
  getTopCountries(tenantId: number, limit?: number, startDate?: Date, endDate?: Date): Promise<CountryStats[]>;
  
  // Performance Analytics - TENANT SCOPED
  getPerformanceSummary(tenantId: number, startDate?: Date, endDate?: Date): Promise<PerformanceSummary>;
  getBestPerformingCampaigns(tenantId: number, period: 'today' | 'yesterday', limit?: number): Promise<CampaignPerformance[]>;
  getBestPerformingAds(tenantId: number, limit?: number): Promise<AdPerformance[]>;
  getBestTrafficChannels(tenantId: number, limit?: number): Promise<ChannelPerformance[]>;
  getMetricsChart(tenantId: number, days?: number): Promise<MetricsChartData[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private campaigns: Map<number, Campaign>;
  private clicks: Map<number, Click>;
  private pageViews: Map<number, PageView>;
  private currentUserId: number;
  private currentCampaignId: number;
  private currentClickId: number;
  private currentPageViewId: number;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.clicks = new Map();
    this.pageViews = new Map();
    this.currentUserId = 1;
    this.currentCampaignId = 1;
    this.currentClickId = 1;
    this.currentPageViewId = 1;
    
    // Add some default campaigns for the demo
    this.createCampaign({
      name: "Facebook Summer Sale",
      campaignId: "683f45642498fc6fe758357f",
      status: "active"
    });
    
    this.createCampaign({
      name: "Google Search Campaign",
      campaignId: "abc123456789",
      status: "active"
    });
    
    this.createCampaign({
      name: "LinkedIn B2B Campaign",
      campaignId: "def789012345",
      status: "active"
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Campaigns
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getCampaignByCampaignId(campaignId: string): Promise<Campaign | undefined> {
    return Array.from(this.campaigns.values()).find(
      (campaign) => campaign.campaignId === campaignId,
    );
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = this.currentCampaignId++;
    const campaign: Campaign = { 
      id, 
      name: insertCampaign.name,
      campaignId: insertCampaign.campaignId,
      status: insertCampaign.status || "active",
      totalSpend: "0",
      totalRevenue: "0",
      conversionCount: 0,
      createdAt: new Date()
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  // Clicks
  async getClick(id: number): Promise<Click | undefined> {
    return this.clicks.get(id);
  }

  async getClickByClickId(clickId: string): Promise<Click | undefined> {
    return Array.from(this.clicks.values()).find(
      (click) => click.clickId === clickId,
    );
  }

  async createClick(insertClick: InsertClick): Promise<Click> {
    const id = this.currentClickId++;
    const click: Click = { 
      id, 
      createdAt: new Date(),
      clickId: insertClick.clickId,
      campaignId: insertClick.campaignId,
      source: insertClick.source || null,
      referrer: insertClick.referrer || null,
      fbp: insertClick.fbp || null,
      fbc: insertClick.fbc || null,
      userAgent: insertClick.userAgent || null,
      ipAddress: insertClick.ipAddress || null,
      conversionValue: null,
      convertedAt: null
    };
    this.clicks.set(id, click);
    return click;
  }

  async getClicksByCampaignId(campaignId: string): Promise<Click[]> {
    return Array.from(this.clicks.values()).filter(
      (click) => click.campaignId === campaignId,
    );
  }

  async getAllClicks(): Promise<Click[]> {
    return Array.from(this.clicks.values());
  }

  // Page Views
  async getPageView(id: number): Promise<PageView | undefined> {
    return this.pageViews.get(id);
  }

  async createPageView(insertPageView: InsertPageView): Promise<PageView> {
    const id = this.currentPageViewId++;
    const pageView: PageView = { 
      id, 
      createdAt: new Date(),
      clickId: insertPageView.clickId,
      referrer: insertPageView.referrer !== undefined ? insertPageView.referrer : null,
      userAgent: insertPageView.userAgent !== undefined ? insertPageView.userAgent : null,
      ipAddress: insertPageView.ipAddress !== undefined ? insertPageView.ipAddress : null
    };
    this.pageViews.set(id, pageView);
    return pageView;
  }

  async getPageViewsByClickId(clickId: string): Promise<PageView[]> {
    return Array.from(this.pageViews.values()).filter(
      (pageView) => pageView.clickId === clickId,
    );
  }

  async getAllPageViews(): Promise<PageView[]> {
    return Array.from(this.pageViews.values());
  }
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant || undefined;
  }

  // Users (new multiuser system)
  async getUserNew(id: number): Promise<UserNew | undefined> {
    const [user] = await db.select().from(usersNew).where(eq(usersNew.id, id));
    return user || undefined;
  }

  async getUserNewByEmail(email: string): Promise<UserNew | undefined> {
    const [user] = await db.select().from(usersNew).where(eq(usersNew.email, email));
    return user || undefined;
  }

  async getUserNewsByTenant(tenantId: number): Promise<UserNew[]> {
    return await db.select().from(usersNew).where(eq(usersNew.tenantId, tenantId));
  }

  async createUserNew(insertUser: InsertUserNew): Promise<UserNew> {
    const [user] = await db.insert(usersNew).values(insertUser).returning();
    return user;
  }

  async updateUserNew(id: number, updates: Partial<UserNew>): Promise<UserNew | undefined> {
    const [user] = await db
      .update(usersNew)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(usersNew.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUserNew(id: number): Promise<boolean> {
    const result = await db.delete(usersNew).where(eq(usersNew.id, id));
    return result.rowCount > 0;
  }

  // Legacy users (kept for compatibility)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignByCampaignId(tenantId: number, campaignId: string): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)));
    return campaign || undefined;
  }

  async getCampaignByCampaignIdGlobal(campaignId: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.campaignId, campaignId));
    return campaign || undefined;
  }

  async createCampaign(tenantId: number, insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values({ ...insertCampaign, tenantId })
      .returning();
    return campaign;
  }

  async getCampaignsByTenant(tenantId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId));
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns);
  }

  async updateCampaign(tenantId: number, campaignId: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(updates)
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)))
      .returning();
    return campaign || undefined;
  }

  async getClick(id: number): Promise<Click | undefined> {
    const [click] = await db.select().from(clicks).where(eq(clicks.id, id));
    return click || undefined;
  }

  async getClickByClickId(tenantId: number, clickId: string): Promise<Click | undefined> {
    const [click] = await db
      .select()
      .from(clicks)
      .where(and(eq(clicks.tenantId, tenantId), eq(clicks.clickId, clickId)));
    return click || undefined;
  }

  async getClickByClickIdGlobal(clickId: string): Promise<Click | undefined> {
    const [click] = await db.select().from(clicks).where(eq(clicks.clickId, clickId));
    return click || undefined;
  }

  async createClick(tenantId: number, insertClick: InsertClick): Promise<Click> {
    const [click] = await db
      .insert(clicks)
      .values({ ...insertClick, tenantId })
      .returning();
    return click;
  }

  async getClicksByCampaignId(tenantId: number, campaignId: string): Promise<Click[]> {
    return await db
      .select()
      .from(clicks)
      .where(and(eq(clicks.tenantId, tenantId), eq(clicks.campaignId, campaignId)));
  }

  async getClicksByTenant(tenantId: number): Promise<Click[]> {
    return await db.select().from(clicks).where(eq(clicks.tenantId, tenantId));
  }

  async getAllClicks(): Promise<Click[]> {
    return await db.select().from(clicks).orderBy(desc(clicks.createdAt));
  }

  async updateClick(tenantId: number, clickId: string, updates: Partial<Click>): Promise<Click | undefined> {
    const [click] = await db
      .update(clicks)
      .set(updates)
      .where(and(eq(clicks.tenantId, tenantId), eq(clicks.clickId, clickId)))
      .returning();
    return click || undefined;
  }

  async getPageView(id: number): Promise<PageView | undefined> {
    const [pageView] = await db.select().from(pageViews).where(eq(pageViews.id, id));
    return pageView || undefined;
  }

  async createPageView(tenantId: number, insertPageView: InsertPageView): Promise<PageView> {
    const [pageView] = await db
      .insert(pageViews)
      .values({ ...insertPageView, tenantId })
      .returning();
    return pageView;
  }

  async getPageViewsByClickId(tenantId: number, clickId: string): Promise<PageView[]> {
    return await db
      .select()
      .from(pageViews)
      .where(and(eq(pageViews.tenantId, tenantId), eq(pageViews.clickId, clickId)));
  }

  async getPageViewsByTenant(tenantId: number): Promise<PageView[]> {
    return await db.select().from(pageViews).where(eq(pageViews.tenantId, tenantId));
  }

  async getAllPageViews(): Promise<PageView[]> {
    return await db.select().from(pageViews);
  }

  // Ad Spend Operations
  async getAdSpend(tenantId: number, campaignId: string, startDate?: Date, endDate?: Date): Promise<AdSpend[]> {
    const conditions = [eq(adSpend.tenantId, tenantId), eq(adSpend.campaignId, campaignId)];
    
    if (startDate) {
      conditions.push(gte(adSpend.date, startDate.toISOString().split('T')[0]));
    }
    if (endDate) {
      conditions.push(lte(adSpend.date, endDate.toISOString().split('T')[0]));
    }
    
    return await db.select().from(adSpend).where(and(...conditions));
  }

  async createAdSpend(tenantId: number, insertAdSpend: InsertAdSpend): Promise<AdSpend> {
    const [spend] = await db
      .insert(adSpend)
      .values({ ...insertAdSpend, tenantId })
      .returning();
    return spend;
  }

  async upsertAdSpend(tenantId: number, insertAdSpend: InsertAdSpend): Promise<AdSpend> {
    try {
      // Tentar upsert primeiro
      const [spend] = await db
        .insert(adSpend)
        .values({ ...insertAdSpend, tenantId })
        .onConflictDoUpdate({
          target: [adSpend.campaignId, adSpend.date],
          set: {
            spend: sql`excluded.spend`,
            impressions: sql`excluded.impressions`,
            reach: sql`excluded.reach`, 
            frequency: sql`excluded.frequency`,
            clicks: sql`excluded.clicks`,
            updatedAt: new Date()
          }
        })
        .returning();
      return spend;
    } catch (error: any) {
      console.log(`[DB-UPSERT] Conflict error, trying manual upsert: ${error.code}`);
      
      // Fallback: tentar atualizar primeiro, depois inserir se não existir
      if (error.code === '42P10') { // Constraint error
        const existingSpend = await db
          .select()
          .from(adSpend)
          .where(and(
            eq(adSpend.campaignId, insertAdSpend.campaignId),
            eq(adSpend.date, insertAdSpend.date)
          ));

        if (existingSpend.length > 0) {
          // Atualizar registro existente
          const [updatedSpend] = await db
            .update(adSpend)
            .set({
              spend: insertAdSpend.spend,
              impressions: insertAdSpend.impressions,
              reach: insertAdSpend.reach,
              frequency: insertAdSpend.frequency,
              clicks: insertAdSpend.clicks,
              updatedAt: new Date()
            })
            .where(and(
              eq(adSpend.campaignId, insertAdSpend.campaignId),
              eq(adSpend.date, insertAdSpend.date)
            ))
            .returning();
          console.log(`[DB-UPSERT] ✅ Updated existing record for ${insertAdSpend.campaignId} ${insertAdSpend.date}`);
          return updatedSpend;
        } else {
          // Inserir novo registro
          const [newSpend] = await db
            .insert(adSpend)
            .values(insertAdSpend)
            .returning();
          console.log(`[DB-UPSERT] ✅ Inserted new record for ${insertAdSpend.campaignId} ${insertAdSpend.date}`);
          return newSpend;
        }
      }
      
      throw error;
    }
  }

  async updateAdSpend(tenantId: number, id: number, updates: Partial<AdSpend>): Promise<AdSpend | undefined> {
    const [spend] = await db
      .update(adSpend)
      .set(updates)
      .where(and(eq(adSpend.tenantId, tenantId), eq(adSpend.id, id)))
      .returning();
    return spend || undefined;
  }

  // Conversion Operations
  async getConversion(id: number): Promise<Conversion | undefined> {
    const [conversion] = await db.select().from(conversions).where(eq(conversions.id, id));
    return conversion || undefined;
  }

  async getConversionsByClickId(tenantId: number, clickId: string): Promise<Conversion[]> {
    return await db
      .select()
      .from(conversions)
      .where(and(eq(conversions.tenantId, tenantId), eq(conversions.clickId, clickId)));
  }

  async createConversion(tenantId: number, insertConversion: InsertConversion): Promise<Conversion> {
    const [conversion] = await db
      .insert(conversions)
      .values({
        tenantId,
        clickId: insertConversion.clickId,
        conversionType: insertConversion.conversionType,
        value: insertConversion.value,
        currency: insertConversion.currency || 'BRL'
      })
      .returning();
    return conversion;
  }

  async getConversionsByCampaignId(tenantId: number, campaignId: string): Promise<Conversion[]> {
    const clicksForCampaign = await db
      .select()
      .from(clicks)
      .where(and(eq(clicks.tenantId, tenantId), eq(clicks.campaignId, campaignId)));
    const clickIds = clicksForCampaign.map(c => c.clickId);
    
    if (clickIds.length === 0) return [];
    
    // Get all conversions for these clicks
    const campaignConversions = await db
      .select()
      .from(conversions)
      .where(eq(conversions.tenantId, tenantId));
    
    return campaignConversions.filter(conv => clickIds.includes(conv.clickId));
  }

  async getConversionsByTenant(tenantId: number): Promise<Conversion[]> {
    return await db.select().from(conversions).where(eq(conversions.tenantId, tenantId));
  }

  // Campaign Settings
  async getCampaignSettings(tenantId: number, campaignId: string): Promise<CampaignSettings | undefined> {
    const [settings] = await db
      .select()
      .from(campaignSettings)
      .where(and(eq(campaignSettings.tenantId, tenantId), eq(campaignSettings.campaignId, campaignId)));
    return settings || undefined;
  }

  async createCampaignSettings(tenantId: number, insertSettings: InsertCampaignSettings): Promise<CampaignSettings> {
    const [settings] = await db
      .insert(campaignSettings)
      .values({ ...insertSettings, tenantId })
      .returning();
    return settings;
  }

  async getCampaignSettingsByTenant(tenantId: number): Promise<CampaignSettings[]> {
    return await db.select().from(campaignSettings).where(eq(campaignSettings.tenantId, tenantId));
  }

  async updateCampaignSettings(tenantId: number, campaignId: string, updates: Partial<CampaignSettings>): Promise<CampaignSettings | undefined> {
    const [settings] = await db
      .update(campaignSettings)
      .set(updates)
      .where(and(eq(campaignSettings.tenantId, tenantId), eq(campaignSettings.campaignId, campaignId)))
      .returning();
    return settings || undefined;
  }

  // Geographic Analytics Implementation
  async getClicksGroupedByCountry(tenantId: number, startDate?: Date, endDate?: Date): Promise<CountryStats[]> {
    const conditions = [eq(clicks.tenantId, tenantId)];
    if (startDate) conditions.push(gte(clicks.createdAt, startDate));
    if (endDate) conditions.push(lte(clicks.createdAt, endDate));

    const results = await db
      .select({
        country: clicks.country,
        countryCode: clicks.countryCode,
        clickCount: sql<number>`count(*)`.as('clickCount'),
        conversionCount: sql<number>`count(${clicks.conversionValue})`.as('conversionCount')
      })
      .from(clicks)
      .where(and(...conditions))
      .groupBy(clicks.country, clicks.countryCode)
      .orderBy(desc(sql`count(*)`));

    return results
      .map(r => ({
        country: r.country || 'Não identificado',
        countryCode: r.countryCode || 'XX',
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getClicksGroupedByRegion(tenantId: number, startDate?: Date, endDate?: Date): Promise<RegionStats[]> {
    const conditions = [eq(clicks.tenantId, tenantId)];
    if (startDate) conditions.push(gte(clicks.createdAt, startDate));
    if (endDate) conditions.push(lte(clicks.createdAt, endDate));

    const results = await db
      .select({
        region: clicks.region,
        country: clicks.country,
        clickCount: sql<number>`count(*)`.as('clickCount'),
        conversionCount: sql<number>`count(${clicks.conversionValue})`.as('conversionCount')
      })
      .from(clicks)
      .where(and(...conditions))
      .groupBy(clicks.region, clicks.country)
      .orderBy(desc(sql`count(*)`));

    return results
      .filter(r => r.region && r.country)
      .map(r => ({
        region: r.region!,
        country: r.country!,
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getClicksGroupedByCity(tenantId: number, startDate?: Date, endDate?: Date): Promise<CityStats[]> {
    const conditions = [eq(clicks.tenantId, tenantId)];
    if (startDate) conditions.push(gte(clicks.createdAt, startDate));
    if (endDate) conditions.push(lte(clicks.createdAt, endDate));

    const results = await db
      .select({
        city: clicks.city,
        region: clicks.region,
        country: clicks.country,
        clickCount: sql<number>`count(*)`.as('clickCount'),
        conversionCount: sql<number>`count(${clicks.conversionValue})`.as('conversionCount')
      })
      .from(clicks)
      .where(and(...conditions))
      .groupBy(clicks.city, clicks.region, clicks.country)
      .orderBy(desc(sql`count(*)`));

    return results
      .filter(r => r.city && r.region && r.country)
      .map(r => ({
        city: r.city!,
        region: r.region!,
        country: r.country!,
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getClicksGroupedByDevice(tenantId: number, startDate?: Date, endDate?: Date): Promise<DeviceStats[]> {
    const conditions = [eq(clicks.tenantId, tenantId)];
    if (startDate) conditions.push(gte(clicks.createdAt, startDate));
    if (endDate) conditions.push(lte(clicks.createdAt, endDate));

    const results = await db
      .select({
        deviceType: clicks.deviceType,
        clickCount: sql<number>`count(*)`.as('clickCount'),
        conversionCount: sql<number>`count(${clicks.conversionValue})`.as('conversionCount')
      })
      .from(clicks)
      .where(and(...conditions))
      .groupBy(clicks.deviceType)
      .orderBy(desc(sql`count(*)`));

    return results
      .map(r => ({
        deviceType: r.deviceType || 'unknown',
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getClicksGroupedByTimezone(tenantId: number, startDate?: Date, endDate?: Date): Promise<TimezoneStats[]> {
    const conditions = [eq(clicks.tenantId, tenantId)];
    if (startDate) conditions.push(gte(clicks.createdAt, startDate));
    if (endDate) conditions.push(lte(clicks.createdAt, endDate));

    const results = await db
      .select({
        timezone: clicks.timezone,
        clickCount: sql<number>`count(*)`.as('clickCount'),
        conversionCount: sql<number>`count(${clicks.conversionValue})`.as('conversionCount')
      })
      .from(clicks)
      .where(and(...conditions))
      .groupBy(clicks.timezone)
      .orderBy(desc(sql`count(*)`));

    return results
      .filter(r => r.timezone)
      .map(r => ({
        timezone: r.timezone!,
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getTopCountries(tenantId: number, limit: number = 10, startDate?: Date, endDate?: Date): Promise<CountryStats[]> {
    const countryStats = await this.getClicksGroupedByCountry(tenantId, startDate, endDate);
    return countryStats.slice(0, limit);
  }

  async getPerformanceSummary(tenantId: number, startDate?: Date, endDate?: Date): Promise<PerformanceSummary> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const thisMonthStr = thisMonthStart.toISOString().split('T')[0];
    const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

    // Get spend data for different periods
    const todaySpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(and(eq(adSpend.tenantId, tenantId), eq(sql`DATE(${adSpend.date})`, todayStr)));

    const yesterdaySpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(and(eq(adSpend.tenantId, tenantId), eq(sql`DATE(${adSpend.date})`, yesterdayStr)));

    const thisMonthSpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(and(eq(adSpend.tenantId, tenantId), gte(sql`DATE(${adSpend.date})`, thisMonthStr)));

    const lastMonthSpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(
        and(
          eq(adSpend.tenantId, tenantId),
          gte(sql`DATE(${adSpend.date})`, lastMonthStartStr),
          lte(sql`DATE(${adSpend.date})`, lastMonthEndStr)
        )
      );

    // Get revenue data for different periods
    const todayRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(and(eq(conversions.tenantId, tenantId), eq(sql`DATE(${conversions.createdAt})`, todayStr)));

    const yesterdayRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(and(eq(conversions.tenantId, tenantId), eq(sql`DATE(${conversions.createdAt})`, yesterdayStr)));

    const thisMonthRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(and(eq(conversions.tenantId, tenantId), gte(sql`DATE(${conversions.createdAt})`, thisMonthStr)));

    const lastMonthRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(
        and(
          eq(conversions.tenantId, tenantId),
          gte(sql`DATE(${conversions.createdAt})`, lastMonthStartStr),
          lte(sql`DATE(${conversions.createdAt})`, lastMonthEndStr)
        )
      );

    const spend = {
      today: todaySpend.reduce((sum, s) => sum + parseFloat(s.spend), 0),
      yesterday: yesterdaySpend.reduce((sum, s) => sum + parseFloat(s.spend), 0),
      thisMonth: thisMonthSpend.reduce((sum, s) => sum + parseFloat(s.spend), 0),
      lastMonth: lastMonthSpend.reduce((sum, s) => sum + parseFloat(s.spend), 0),
    };

    const revenue = {
      today: todayRevenue.reduce((sum, r) => sum + parseFloat(r.value), 0),
      yesterday: yesterdayRevenue.reduce((sum, r) => sum + parseFloat(r.value), 0),
      thisMonth: thisMonthRevenue.reduce((sum, r) => sum + parseFloat(r.value), 0),
      lastMonth: lastMonthRevenue.reduce((sum, r) => sum + parseFloat(r.value), 0),
    };

    const roas = {
      today: spend.today > 0 ? revenue.today / spend.today : 0,
      yesterday: spend.yesterday > 0 ? revenue.yesterday / spend.yesterday : 0,
      thisMonth: spend.thisMonth > 0 ? revenue.thisMonth / spend.thisMonth : 0,
      lastMonth: spend.lastMonth > 0 ? revenue.lastMonth / spend.lastMonth : 0,
    };

    return { spend, revenue, roas };
  }

  async getBestPerformingCampaigns(tenantId: number, period: 'today' | 'yesterday', limit: number = 3): Promise<CampaignPerformance[]> {
    const targetDate = new Date();
    if (period === 'yesterday') {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    // Get all campaigns first
    const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId));
    
    const results: CampaignPerformance[] = [];
    
    for (const campaign of allCampaigns) {
      // Get clicks for this campaign on target date
      const campaignClicks = await db.select()
        .from(clicks)
        .where(
          and(
            eq(clicks.tenantId, tenantId),
            eq(clicks.campaignId, campaign.campaignId),
            eq(sql`DATE(${clicks.createdAt})`, dateStr)
          )
        );

      // Get conversions for these clicks
      const clickIds = campaignClicks.map(c => c.clickId);
      let campaignConversions: any[] = [];
      let totalRevenue = 0;
      
      if (clickIds.length > 0) {
        campaignConversions = await db.select()
          .from(conversions)
          .where(sql`${conversions.clickId} IN (${clickIds.map(id => `'${id}'`).join(',')})`);
        
        totalRevenue = campaignConversions.reduce((sum, conv) => sum + parseFloat(conv.value), 0);
      }

      // Get spend for this campaign on target date
      const campaignSpend = await db.select()
        .from(adSpend)
        .where(
          and(
            eq(adSpend.tenantId, tenantId),
            eq(adSpend.campaignId, campaign.campaignId),
            eq(sql`DATE(${adSpend.date})`, dateStr)
          )
        );

      const totalSpend = campaignSpend.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);

      results.push({
        campaignId: campaign.campaignId,
        name: campaign.name,
        conversions: campaignConversions.length,
        revenue: totalRevenue,
        spend: totalSpend,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0
      });
    }

    return results
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getBestPerformingAds(tenantId: number, limit: number = 10): Promise<AdPerformance[]> {
    try {
      // Otimized query using single JOIN instead of N+1 queries
      const results = await db
        .select({
          adName: sql`COALESCE(${clicks.sub4}, CONCAT('Ad ID: ', ${clicks.sub1}), 'Unknown Ad')`.as('ad_name'),
          adId: clicks.sub1,
          clicks: sql`COUNT(DISTINCT ${clicks.id})`.as('clicks'),
          conversions: sql`COUNT(${conversions.id})`.as('conversions'),
          revenue: sql`COALESCE(SUM(CAST(${conversions.value} AS DECIMAL)), 0)`.as('revenue'),
        })
        .from(clicks)
        .leftJoin(conversions, and(eq(conversions.clickId, clicks.clickId), eq(conversions.tenantId, tenantId)))
        .where(and(eq(clicks.tenantId, tenantId), or(isNotNull(clicks.sub4), isNotNull(clicks.sub1))))
        .groupBy(clicks.sub4, clicks.sub1)
        .orderBy(desc(sql`revenue`), desc(sql`conversions`))
        .limit(limit);

      return results.map(r => ({
        adName: r.adName,
        adId: r.adId,
        clicks: Number(r.clicks),
        conversions: Number(r.conversions),
        revenue: Number(r.revenue),
        conversionRate: Number(r.clicks) > 0 ? (Number(r.conversions) / Number(r.clicks)) * 100 : 0
      }));
    } catch (error) {
      console.error('[DB-QUERY] Error in getBestPerformingAds:', error);
      return [];
    }
  }

  async getBestTrafficChannels(tenantId: number, limit: number = 10): Promise<ChannelPerformance[]> {
    try {
      // Optimized query using single JOIN instead of N+1 queries
      const results = await db
        .select({
          channel: sql`COALESCE(${clicks.source}, ${clicks.utmSource}, 'direct')`.as('channel'),
          clicks: sql`COUNT(DISTINCT ${clicks.id})`.as('clicks'),
          conversions: sql`COUNT(${conversions.id})`.as('conversions'),
          revenue: sql`COALESCE(SUM(CAST(${conversions.value} AS DECIMAL)), 0)`.as('revenue'),
        })
        .from(clicks)
        .leftJoin(conversions, and(eq(conversions.clickId, clicks.clickId), eq(conversions.tenantId, tenantId)))
        .where(eq(clicks.tenantId, tenantId))
        .groupBy(sql`COALESCE(${clicks.source}, ${clicks.utmSource}, 'direct')`)
        .orderBy(desc(sql`revenue`), desc(sql`conversions`))
        .limit(limit);

      return results.map(r => ({
        channel: r.channel,
        clicks: Number(r.clicks),
        conversions: Number(r.conversions),
        revenue: Number(r.revenue),
        conversionRate: Number(r.clicks) > 0 ? (Number(r.conversions) / Number(r.clicks)) * 100 : 0
      }));
    } catch (error) {
      console.error('[DB-QUERY] Error in getBestTrafficChannels:', error);
      return [];
    }
  }

  async getMetricsChart(tenantId: number, days: number = 30): Promise<MetricsChartData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Optimized query using single JOIN instead of N+1 queries
      const results = await db
        .select({
          date: sql`DATE(${clicks.createdAt})`.as('date'),
          clicks: sql`COUNT(DISTINCT ${clicks.id})`.as('clicks'),
          conversions: sql`COUNT(${conversions.id})`.as('conversions'),
        })
        .from(clicks)
        .leftJoin(conversions, and(eq(conversions.clickId, clicks.clickId), eq(conversions.tenantId, tenantId)))
        .where(and(eq(clicks.tenantId, tenantId), gte(clicks.createdAt, startDate)))
        .groupBy(sql`DATE(${clicks.createdAt})`)
        .orderBy(sql`DATE(${clicks.createdAt})`);

      return results.map(r => ({
        date: r.date,
        clicks: Number(r.clicks),
        conversions: Number(r.conversions)
      }));
    } catch (error) {
      console.error('[DB-QUERY] Error in getMetricsChart:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
