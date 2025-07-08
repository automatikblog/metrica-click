import { 
  campaigns, 
  clicks, 
  pageViews, 
  users,
  adSpend,
  conversions,
  campaignSettings,
  type Campaign, 
  type Click, 
  type PageView, 
  type User,
  type AdSpend,
  type Conversion,
  type CampaignSettings,
  type InsertCampaign, 
  type InsertClick, 
  type InsertPageView, 
  type InsertUser,
  type InsertAdSpend,
  type InsertConversion,
  type InsertCampaignSettings
} from "@shared/schema";
import { eq, sql, gte, lte, and, desc } from "drizzle-orm";
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
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaigns
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignByCampaignId(campaignId: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getAllCampaigns(): Promise<Campaign[]>;
  updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  
  // Clicks
  getClick(id: number): Promise<Click | undefined>;
  getClickByClickId(clickId: string): Promise<Click | undefined>;
  createClick(click: InsertClick): Promise<Click>;
  getClicksByCampaignId(campaignId: string): Promise<Click[]>;
  getAllClicks(): Promise<Click[]>;
  updateClick(clickId: string, updates: Partial<Click>): Promise<Click | undefined>;
  
  // Page Views
  getPageView(id: number): Promise<PageView | undefined>;
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getPageViewsByClickId(clickId: string): Promise<PageView[]>;
  getAllPageViews(): Promise<PageView[]>;
  
  // Ad Spend Operations
  getAdSpend(campaignId: string, startDate?: Date, endDate?: Date): Promise<AdSpend[]>;
  createAdSpend(adSpend: InsertAdSpend): Promise<AdSpend>;
  upsertAdSpend(adSpend: InsertAdSpend): Promise<AdSpend>;
  updateAdSpend(id: number, updates: Partial<AdSpend>): Promise<AdSpend | undefined>;
  
  // Conversion Operations
  getConversion(id: number): Promise<Conversion | undefined>;
  getConversionsByClickId(clickId: string): Promise<Conversion[]>;
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversionsByCampaignId(campaignId: string): Promise<Conversion[]>;
  
  // Campaign Settings
  getCampaignSettings(campaignId: string): Promise<CampaignSettings | undefined>;
  createCampaignSettings(settings: InsertCampaignSettings): Promise<CampaignSettings>;
  updateCampaignSettings(campaignId: string, updates: Partial<CampaignSettings>): Promise<CampaignSettings | undefined>;
  
  // Geographic Analytics
  getClicksGroupedByCountry(startDate?: Date, endDate?: Date): Promise<CountryStats[]>;
  getClicksGroupedByRegion(startDate?: Date, endDate?: Date): Promise<RegionStats[]>;
  getClicksGroupedByCity(startDate?: Date, endDate?: Date): Promise<CityStats[]>;
  getClicksGroupedByDevice(startDate?: Date, endDate?: Date): Promise<DeviceStats[]>;
  getClicksGroupedByTimezone(startDate?: Date, endDate?: Date): Promise<TimezoneStats[]>;
  getTopCountries(limit?: number, startDate?: Date, endDate?: Date): Promise<CountryStats[]>;
  
  // Performance Analytics
  getPerformanceSummary(startDate?: Date, endDate?: Date): Promise<PerformanceSummary>;
  getBestPerformingCampaigns(period: 'today' | 'yesterday', limit?: number): Promise<CampaignPerformance[]>;
  getBestPerformingAds(limit?: number): Promise<AdPerformance[]>;
  getBestTrafficChannels(limit?: number): Promise<ChannelPerformance[]>;
  getMetricsChart(days?: number): Promise<MetricsChartData[]>;
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

  async getCampaignByCampaignId(campaignId: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.campaignId, campaignId));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values(insertCampaign)
      .returning();
    return campaign;
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns);
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.campaignId, campaignId))
      .returning();
    return campaign || undefined;
  }

  async getClick(id: number): Promise<Click | undefined> {
    const [click] = await db.select().from(clicks).where(eq(clicks.id, id));
    return click || undefined;
  }

  async getClickByClickId(clickId: string): Promise<Click | undefined> {
    const [click] = await db.select().from(clicks).where(eq(clicks.clickId, clickId));
    return click || undefined;
  }

  async createClick(insertClick: InsertClick): Promise<Click> {
    const [click] = await db
      .insert(clicks)
      .values(insertClick)
      .returning();
    return click;
  }

  async getClicksByCampaignId(campaignId: string): Promise<Click[]> {
    return await db.select().from(clicks).where(eq(clicks.campaignId, campaignId));
  }

  async getAllClicks(): Promise<Click[]> {
    return await db.select().from(clicks).orderBy(desc(clicks.createdAt));
  }

  async updateClick(clickId: string, updates: Partial<Click>): Promise<Click | undefined> {
    const [click] = await db
      .update(clicks)
      .set(updates)
      .where(eq(clicks.clickId, clickId))
      .returning();
    return click || undefined;
  }

  async getPageView(id: number): Promise<PageView | undefined> {
    const [pageView] = await db.select().from(pageViews).where(eq(pageViews.id, id));
    return pageView || undefined;
  }

  async createPageView(insertPageView: InsertPageView): Promise<PageView> {
    const [pageView] = await db
      .insert(pageViews)
      .values(insertPageView)
      .returning();
    return pageView;
  }

  async getPageViewsByClickId(clickId: string): Promise<PageView[]> {
    return await db.select().from(pageViews).where(eq(pageViews.clickId, clickId));
  }

  async getAllPageViews(): Promise<PageView[]> {
    return await db.select().from(pageViews);
  }

  // Ad Spend Operations
  async getAdSpend(campaignId: string, startDate?: Date, endDate?: Date): Promise<AdSpend[]> {
    const conditions = [eq(adSpend.campaignId, campaignId)];
    
    if (startDate) {
      conditions.push(gte(adSpend.date, startDate.toISOString().split('T')[0]));
    }
    if (endDate) {
      conditions.push(lte(adSpend.date, endDate.toISOString().split('T')[0]));
    }
    
    return await db.select().from(adSpend).where(and(...conditions));
  }

  async createAdSpend(insertAdSpend: InsertAdSpend): Promise<AdSpend> {
    const [spend] = await db
      .insert(adSpend)
      .values(insertAdSpend)
      .returning();
    return spend;
  }

  async upsertAdSpend(insertAdSpend: InsertAdSpend): Promise<AdSpend> {
    const [spend] = await db
      .insert(adSpend)
      .values(insertAdSpend)
      .onConflictDoUpdate({
        target: [adSpend.campaignId, adSpend.date],
        set: {
          spend: sql`excluded.spend`,
          impressions: sql`excluded.impressions`,
          reach: sql`excluded.reach`, 
          frequency: sql`excluded.frequency`,
          updatedAt: new Date()
        }
      })
      .returning();
    return spend;
  }

  async updateAdSpend(id: number, updates: Partial<AdSpend>): Promise<AdSpend | undefined> {
    const [spend] = await db
      .update(adSpend)
      .set(updates)
      .where(eq(adSpend.id, id))
      .returning();
    return spend || undefined;
  }

  // Conversion Operations
  async getConversion(id: number): Promise<Conversion | undefined> {
    const [conversion] = await db.select().from(conversions).where(eq(conversions.id, id));
    return conversion || undefined;
  }

  async getConversionsByClickId(clickId: string): Promise<Conversion[]> {
    return await db.select().from(conversions).where(eq(conversions.clickId, clickId));
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const [conversion] = await db
      .insert(conversions)
      .values(insertConversion)
      .returning();
    return conversion;
  }

  async getConversionsByCampaignId(campaignId: string): Promise<Conversion[]> {
    const clicksForCampaign = await db.select().from(clicks).where(eq(clicks.campaignId, campaignId));
    const clickIds = clicksForCampaign.map(c => c.clickId);
    
    if (clickIds.length === 0) return [];
    
    // Get all conversions for these clicks
    const campaignConversions = await db
      .select()
      .from(conversions);
    
    return campaignConversions.filter(conv => clickIds.includes(conv.clickId));
  }

  // Campaign Settings
  async getCampaignSettings(campaignId: string): Promise<CampaignSettings | undefined> {
    const [settings] = await db
      .select()
      .from(campaignSettings)
      .where(eq(campaignSettings.campaignId, campaignId));
    return settings || undefined;
  }

  async createCampaignSettings(insertSettings: InsertCampaignSettings): Promise<CampaignSettings> {
    const [settings] = await db
      .insert(campaignSettings)
      .values(insertSettings)
      .returning();
    return settings;
  }

  async updateCampaignSettings(campaignId: string, updates: Partial<CampaignSettings>): Promise<CampaignSettings | undefined> {
    const [settings] = await db
      .update(campaignSettings)
      .set(updates)
      .where(eq(campaignSettings.campaignId, campaignId))
      .returning();
    return settings || undefined;
  }

  // Geographic Analytics Implementation
  async getClicksGroupedByCountry(startDate?: Date, endDate?: Date): Promise<CountryStats[]> {
    const conditions = [];
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
      .filter(r => r.country && r.countryCode)
      .map(r => ({
        country: r.country!,
        countryCode: r.countryCode!,
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getClicksGroupedByRegion(startDate?: Date, endDate?: Date): Promise<RegionStats[]> {
    const conditions = [];
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

  async getClicksGroupedByCity(startDate?: Date, endDate?: Date): Promise<CityStats[]> {
    const conditions = [];
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

  async getClicksGroupedByDevice(startDate?: Date, endDate?: Date): Promise<DeviceStats[]> {
    const conditions = [];
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
      .filter(r => r.deviceType)
      .map(r => ({
        deviceType: r.deviceType!,
        clickCount: r.clickCount,
        conversionCount: r.conversionCount,
        conversionRate: r.clickCount > 0 ? (r.conversionCount / r.clickCount) * 100 : 0
      }));
  }

  async getClicksGroupedByTimezone(startDate?: Date, endDate?: Date): Promise<TimezoneStats[]> {
    const conditions = [];
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

  async getTopCountries(limit: number = 10, startDate?: Date, endDate?: Date): Promise<CountryStats[]> {
    const countryStats = await this.getClicksGroupedByCountry(startDate, endDate);
    return countryStats.slice(0, limit);
  }

  async getPerformanceSummary(startDate?: Date, endDate?: Date): Promise<PerformanceSummary> {
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
      .where(eq(sql`DATE(${adSpend.date})`, todayStr));

    const yesterdaySpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(eq(sql`DATE(${adSpend.date})`, yesterdayStr));

    const thisMonthSpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(gte(sql`DATE(${adSpend.date})`, thisMonthStr));

    const lastMonthSpend = await db.select({ spend: adSpend.spend })
      .from(adSpend)
      .where(
        and(
          gte(sql`DATE(${adSpend.date})`, lastMonthStartStr),
          lte(sql`DATE(${adSpend.date})`, lastMonthEndStr)
        )
      );

    // Get revenue data for different periods
    const todayRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(eq(sql`DATE(${conversions.createdAt})`, todayStr));

    const yesterdayRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(eq(sql`DATE(${conversions.createdAt})`, yesterdayStr));

    const thisMonthRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(gte(sql`DATE(${conversions.createdAt})`, thisMonthStr));

    const lastMonthRevenue = await db.select({ value: conversions.value })
      .from(conversions)
      .where(
        and(
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

  async getBestPerformingCampaigns(period: 'today' | 'yesterday', limit: number = 3): Promise<CampaignPerformance[]> {
    const targetDate = new Date();
    if (period === 'yesterday') {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    // Get all campaigns first
    const allCampaigns = await db.select().from(campaigns);
    
    const results: CampaignPerformance[] = [];
    
    for (const campaign of allCampaigns) {
      // Get clicks for this campaign on target date
      const campaignClicks = await db.select()
        .from(clicks)
        .where(
          and(
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

  async getBestPerformingAds(limit: number = 10): Promise<AdPerformance[]> {
    // Get clicks with Meta Ads parameters
    const adClicks = await db.select()
      .from(clicks)
      .where(or(isNotNull(clicks.sub4), isNotNull(clicks.sub1)));

    // Group by ad (sub4 = ad name, sub1 = ad id)
    const adGroups = new Map<string, {
      adName: string;
      adId: string | null;
      clicks: number;
      conversions: any[];
    }>();

    for (const click of adClicks) {
      const adKey = click.sub4 || click.sub1 || 'Unknown';
      const adName = click.sub4 || (click.sub1 ? `Ad ID: ${click.sub1}` : 'Unknown Ad');
      
      if (!adGroups.has(adKey)) {
        adGroups.set(adKey, {
          adName,
          adId: click.sub1,
          clicks: 0,
          conversions: []
        });
      }
      
      const adGroup = adGroups.get(adKey)!;
      adGroup.clicks++;
      
      // Get conversions for this click
      const clickConversions = await db.select()
        .from(conversions)
        .where(eq(conversions.clickId, click.clickId));
      
      adGroup.conversions.push(...clickConversions);
    }

    // Convert to result format and calculate metrics
    const results: AdPerformance[] = Array.from(adGroups.values()).map(group => {
      const revenue = group.conversions.reduce((sum, conv) => sum + parseFloat(conv.value), 0);
      return {
        adName: group.adName,
        adId: group.adId,
        clicks: group.clicks,
        conversions: group.conversions.length,
        revenue,
        conversionRate: group.clicks > 0 ? (group.conversions.length / group.clicks) * 100 : 0
      };
    });

    return results
      .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions)
      .slice(0, limit);
  }

  async getBestTrafficChannels(limit: number = 10): Promise<ChannelPerformance[]> {
    // Get all clicks
    const allClicks = await db.select().from(clicks);

    // Group by channel (source or utm_source)
    const channelGroups = new Map<string, {
      channel: string;
      clicks: number;
      conversions: any[];
    }>();

    for (const click of allClicks) {
      const channel = click.source || click.utmSource || 'direct';
      
      if (!channelGroups.has(channel)) {
        channelGroups.set(channel, {
          channel,
          clicks: 0,
          conversions: []
        });
      }
      
      const channelGroup = channelGroups.get(channel)!;
      channelGroup.clicks++;
      
      // Get conversions for this click
      const clickConversions = await db.select()
        .from(conversions)
        .where(eq(conversions.clickId, click.clickId));
      
      channelGroup.conversions.push(...clickConversions);
    }

    // Convert to result format and calculate metrics
    const results: ChannelPerformance[] = Array.from(channelGroups.values()).map(group => {
      const revenue = group.conversions.reduce((sum, conv) => sum + parseFloat(conv.value), 0);
      return {
        channel: group.channel,
        clicks: group.clicks,
        conversions: group.conversions.length,
        revenue,
        conversionRate: group.clicks > 0 ? (group.conversions.length / group.clicks) * 100 : 0
      };
    });

    return results
      .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions)
      .slice(0, limit);
  }

  async getMetricsChart(days: number = 30): Promise<MetricsChartData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get clicks since start date
    const clicksData = await db.select()
      .from(clicks)
      .where(gte(clicks.createdAt, startDate));

    // Group by date
    const dateGroups = new Map<string, {
      date: string;
      clicks: number;
      conversions: number;
    }>();

    for (const click of clicksData) {
      const dateStr = click.createdAt.toISOString().split('T')[0];
      
      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, {
          date: dateStr,
          clicks: 0,
          conversions: 0
        });
      }
      
      const dateGroup = dateGroups.get(dateStr)!;
      dateGroup.clicks++;
      
      // Check if this click has conversions
      const clickConversions = await db.select()
        .from(conversions)
        .where(eq(conversions.clickId, click.clickId));
      
      dateGroup.conversions += clickConversions.length;
    }

    // Convert to array and sort by date
    return Array.from(dateGroups.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const storage = new DatabaseStorage();
