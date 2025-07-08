import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table - empresas/organizações
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain").unique(),
  subscriptionPlan: text("subscription_plan").notNull().default("basic"),
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  maxCampaigns: integer("max_campaigns").default(5),
  maxMonthlyClicks: integer("max_monthly_clicks").default(10000),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table - sistema multiusuário
export const usersNew = pgTable("users_new", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("active"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueTenantEmail: unique().on(table.tenantId, table.email)
}));

// User invitations
export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  invitedBy: integer("invited_by").notNull().references(() => usersNew.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User sessions
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersNew.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  campaignId: text("campaign_id").notNull().unique(),
  status: text("status").notNull().default("active"),
  totalSpend: decimal("total_spend", { precision: 10, scale: 2 }).default("0"),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0"),
  conversionCount: integer("conversion_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantCampaignIdx: unique().on(table.tenantId, table.campaignId)
}));

export const clicks = pgTable("clicks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clickId: text("click_id").notNull().unique(),
  campaignId: text("campaign_id").notNull(),
  source: text("source"),
  referrer: text("referrer"),
  fbp: text("fbp"),
  fbc: text("fbc"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  convertedAt: timestamp("converted_at"),
  
  // Geographic data
  country: text("country"),
  countryCode: text("country_code"),
  region: text("region"),
  city: text("city"),
  postalCode: text("postal_code"),
  timezone: text("timezone"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Device and browser data
  deviceType: text("device_type"),
  operatingSystem: text("operating_system"),
  browser: text("browser"),
  browserVersion: text("browser_version"),
  
  // ISP and connection data
  isp: text("isp"),
  connectionType: text("connection_type"),
  isProxy: boolean("is_proxy"),
  isCrawler: boolean("is_crawler"),
  
  // Meta Ads tracking parameters
  sub1: text("sub1"), // ad.id
  sub2: text("sub2"), // adset.id
  sub3: text("sub3"), // campaign.id
  sub4: text("sub4"), // ad.name
  sub5: text("sub5"), // adset.name
  sub6: text("sub6"), // campaign.name
  sub7: text("sub7"), // placement
  sub8: text("sub8"), // site_source_name
  
  // UTM parameters
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  utmId: text("utm_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clickId: text("click_id").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  
  // Geographic data
  country: text("country"),
  countryCode: text("country_code"),
  region: text("region"),
  city: text("city"),
  postalCode: text("postal_code"),
  timezone: text("timezone"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Device and browser data
  deviceType: text("device_type"),
  operatingSystem: text("operating_system"),
  browser: text("browser"),
  browserVersion: text("browser_version"),
  
  // ISP and connection data
  isp: text("isp"),
  connectionType: text("connection_type"),
  isProxy: boolean("is_proxy"),
  isCrawler: boolean("is_crawler"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Ad spend data from Facebook
export const adSpend = pgTable("ad_spend", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id").notNull(),
  date: date("date").notNull(),
  spend: decimal("spend", { precision: 10, scale: 2 }).notNull(),
  impressions: integer("impressions"),
  reach: integer("reach"),
  frequency: decimal("frequency", { precision: 5, scale: 2 }),
  clicks: integer("clicks"), // Campo clicks adicionado
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Constraint único necessário para operações de upsert
  uniqueCampaignDate: unique().on(table.campaignId, table.date)
}));

// Conversion tracking
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clickId: text("click_id"), // Allow null for direct conversions (Hotmart without tracking)
  conversionType: text("conversion_type").notNull(), // 'purchase', 'lead', 'signup', etc.
  value: decimal("value", { precision: 10, scale: 2 }),
  currency: text("currency").default("BRL"), // Changed default to BRL for Brazilian market
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Campaign settings for cost tracking
export const campaignSettings = pgTable("campaign_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id").notNull().unique(),
  dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }),
  lifetimeBudget: decimal("lifetime_budget", { precision: 10, scale: 2 }),
  targetCpa: decimal("target_cpa", { precision: 10, scale: 2 }),
  targetRoas: decimal("target_roas", { precision: 5, scale: 2 }),
  fbAccountId: text("fb_account_id"),
  fbCampaignId: text("fb_campaign_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  totalSpend: true,
  totalRevenue: true,
  conversionCount: true,
});

export const insertClickSchema = createInsertSchema(clicks).omit({
  id: true,
  createdAt: true,
  conversionValue: true,
  convertedAt: true,
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAdSpendSchema = createInsertSchema(adSpend).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversionSchema = createInsertSchema(conversions).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSettingsSchema = createInsertSchema(campaignSettings).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertClick = z.infer<typeof insertClickSchema>;
export type Click = typeof clicks.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAdSpend = z.infer<typeof insertAdSpendSchema>;
export type AdSpend = typeof adSpend.$inferSelect;
export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;
export type InsertCampaignSettings = z.infer<typeof insertCampaignSettingsSchema>;
export type CampaignSettings = typeof campaignSettings.$inferSelect;

// New types for multiuser system
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserNewSchema = createInsertSchema(usersNew).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  createdAt: true,
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertUserNew = z.infer<typeof insertUserNewSchema>;
export type UserNew = typeof usersNew.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
