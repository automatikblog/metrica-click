import { 
  campaigns, 
  clicks, 
  pageViews, 
  users, 
  type Campaign, 
  type Click, 
  type PageView, 
  type User, 
  type InsertCampaign, 
  type InsertClick, 
  type InsertPageView, 
  type InsertUser 
} from "@shared/schema";

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
  
  // Clicks
  getClick(id: number): Promise<Click | undefined>;
  getClickByClickId(clickId: string): Promise<Click | undefined>;
  createClick(click: InsertClick): Promise<Click>;
  getClicksByCampaignId(campaignId: string): Promise<Click[]>;
  getAllClicks(): Promise<Click[]>;
  
  // Page Views
  getPageView(id: number): Promise<PageView | undefined>;
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getPageViewsByClickId(clickId: string): Promise<PageView[]>;
  getAllPageViews(): Promise<PageView[]>;
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
      ...insertCampaign, 
      id, 
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
      ...insertClick, 
      id, 
      createdAt: new Date() 
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
      ...insertPageView, 
      id, 
      createdAt: new Date() 
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

export const storage = new MemStorage();
