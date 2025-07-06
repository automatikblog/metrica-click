import { pgTable, text, serial, integer, boolean, timestamp, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  campaignId: text("campaign_id").notNull().unique(),
  status: text("status").notNull().default("active"),
  totalSpend: decimal("total_spend", { precision: 10, scale: 2 }).default("0"),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0"),
  conversionCount: integer("conversion_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clicks = pgTable("clicks", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  clickId: text("click_id").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
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
  campaignId: text("campaign_id").notNull(),
  date: date("date").notNull(),
  spend: decimal("spend", { precision: 10, scale: 2 }).notNull(),
  impressions: integer("impressions"),
  reach: integer("reach"),
  frequency: decimal("frequency", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversion tracking
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  clickId: text("click_id").notNull(),
  conversionType: text("conversion_type").notNull(), // 'purchase', 'lead', 'signup', etc.
  value: decimal("value", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Campaign settings for cost tracking
export const campaignSettings = pgTable("campaign_settings", {
  id: serial("id").primaryKey(),
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
