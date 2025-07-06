import { FacebookAdsApi, AdAccount, Campaign, AdSet, Insights } from 'facebook-nodejs-business-sdk';
import { storage } from './storage';
import type { InsertAdSpend } from '@shared/schema';

export interface FacebookAdData {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  date: string;
}

export interface FacebookAuthData {
  accessToken: string;
  adAccountId: string;
  userId: string;
  expiresAt: Date;
}

export class FacebookAdsClient {
  private api: FacebookAdsApi;
  private accessToken: string;
  private adAccountId: string;

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.api = FacebookAdsApi.init(accessToken);
  }

  /**
   * Test connection to Facebook API
   */
  async testConnection(): Promise<boolean> {
    try {
      const account = new AdAccount(this.adAccountId);
      await account.get(['name', 'account_status']);
      return true;
    } catch (error) {
      console.error('Facebook API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get ad account information
   */
  async getAdAccountInfo(): Promise<any> {
    try {
      const account = new AdAccount(this.adAccountId);
      const accountData = await account.get([
        'name',
        'account_status',
        'currency',
        'timezone_name',
        'spend_cap',
        'daily_spend_limit'
      ]);
      return accountData;
    } catch (error) {
      console.error('Error fetching ad account info:', error);
      throw error;
    }
  }

  /**
   * Get all campaigns from Facebook ad account
   */
  async getCampaigns(): Promise<any[]> {
    try {
      const account = new AdAccount(this.adAccountId);
      const campaigns = await account.getCampaigns([
        'id',
        'name',
        'status',
        'objective',
        'daily_budget',
        'lifetime_budget',
        'created_time',
        'updated_time'
      ]);
      return campaigns;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Get campaign insights (spend data) for a specific date range
   */
  async getCampaignInsights(
    campaignId: string,
    dateRange: { since: string; until: string }
  ): Promise<FacebookAdData[]> {
    try {
      const campaign = new Campaign(campaignId);
      const insights = await campaign.getInsights([
        'campaign_id',
        'campaign_name',
        'spend',
        'impressions',
        'reach',
        'frequency',
        'clicks',
        'date_start',
        'date_stop'
      ], {
        time_range: {
          since: dateRange.since,
          until: dateRange.until
        },
        time_increment: 1, // Daily breakdown
        level: 'campaign'
      });

      return insights.map((insight: any) => ({
        campaignId: insight.campaign_id,
        campaignName: insight.campaign_name,
        spend: parseFloat(insight.spend || '0'),
        impressions: parseInt(insight.impressions || '0'),
        reach: parseInt(insight.reach || '0'),
        frequency: parseFloat(insight.frequency || '0'),
        clicks: parseInt(insight.clicks || '0'),
        date: insight.date_start
      }));
    } catch (error) {
      console.error(`Error fetching insights for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get all ad spend data for the account in a date range
   */
  async getAdAccountSpend(dateRange: { since: string; until: string }): Promise<FacebookAdData[]> {
    try {
      const account = new AdAccount(this.adAccountId);
      const insights = await account.getInsights([
        'campaign_id',
        'campaign_name',
        'spend',
        'impressions',
        'reach',
        'frequency',
        'clicks',
        'date_start',
        'date_stop'
      ], {
        time_range: {
          since: dateRange.since,
          until: dateRange.until
        },
        time_increment: 1, // Daily breakdown
        level: 'campaign'
      });

      return insights.map((insight: any) => ({
        campaignId: insight.campaign_id,
        campaignName: insight.campaign_name,
        spend: parseFloat(insight.spend || '0'),
        impressions: parseInt(insight.impressions || '0'),
        reach: parseInt(insight.reach || '0'),
        frequency: parseFloat(insight.frequency || '0'),
        clicks: parseInt(insight.clicks || '0'),
        date: insight.date_start
      }));
    } catch (error) {
      console.error('Error fetching ad account spend:', error);
      throw error;
    }
  }

  /**
   * Sync Facebook campaign data to local database
   */
  async syncCampaignData(
    internalCampaignId: string,
    facebookCampaignId: string,
    dateRange: { since: string; until: string }
  ): Promise<void> {
    try {
      console.log(`[FB-SYNC] Starting sync for campaign ${internalCampaignId} -> FB:${facebookCampaignId}`);
      
      const insights = await this.getCampaignInsights(facebookCampaignId, dateRange);
      
      let totalSpend = 0;
      let dataPointsCreated = 0;

      for (const insight of insights) {
        // Save ad spend data
        const adSpendData: InsertAdSpend = {
          campaignId: internalCampaignId,
          date: insight.date,
          spend: insight.spend.toString(),
          impressions: insight.impressions,
          reach: insight.reach,
          frequency: insight.frequency.toString()
        };

        await storage.createAdSpend(adSpendData);
        totalSpend += insight.spend;
        dataPointsCreated++;
      }

      // Update campaign totals
      const existingCampaign = await storage.getCampaignByCampaignId(internalCampaignId);
      if (existingCampaign) {
        await storage.updateCampaign(internalCampaignId, {
          totalSpend: totalSpend.toString()
        });
      }

      console.log(`[FB-SYNC] Success: ${internalCampaignId} - ${dataPointsCreated} data points, $${totalSpend.toFixed(2)} total spend`);
    } catch (error) {
      console.error(`[FB-SYNC] Error syncing campaign ${internalCampaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(
    facebookCampaignId: string,
    dateRange: { since: string; until: string }
  ): Promise<any> {
    try {
      const campaign = new Campaign(facebookCampaignId);
      const insights = await campaign.getInsights([
        'spend',
        'impressions',
        'reach',
        'clicks',
        'cpc',
        'cpm',
        'ctr',
        'frequency',
        'cost_per_action_type'
      ], {
        time_range: {
          since: dateRange.since,
          until: dateRange.until
        },
        level: 'campaign'
      });

      if (insights.length === 0) {
        return null;
      }

      const data = insights[0];
      return {
        spend: parseFloat(data.spend || '0'),
        impressions: parseInt(data.impressions || '0'),
        reach: parseInt(data.reach || '0'),
        clicks: parseInt(data.clicks || '0'),
        cpc: parseFloat(data.cpc || '0'),
        cpm: parseFloat(data.cpm || '0'),
        ctr: parseFloat(data.ctr || '0'),
        frequency: parseFloat(data.frequency || '0'),
        costPerActionType: data.cost_per_action_type || []
      };
    } catch (error) {
      console.error(`Error fetching metrics for campaign ${facebookCampaignId}:`, error);
      throw error;
    }
  }
}

/**
 * Factory function to create Facebook client with stored credentials
 */
export async function createFacebookClient(userId: string): Promise<FacebookAdsClient | null> {
  try {
    // TODO: Implement secure token storage and retrieval
    // For now, we'll use environment variables or get from database
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      console.error('Facebook credentials not configured');
      return null;
    }

    // Ensure ad account ID has proper format (act_ prefix)
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    
    console.log(`Creating Facebook client for user ${userId} with account ${formattedAdAccountId}`);
    return new FacebookAdsClient(accessToken, formattedAdAccountId);
  } catch (error) {
    console.error('Error creating Facebook client:', error);
    return null;
  }
}

/**
 * Utility function to format date for Facebook API
 */
export function formatDateForFacebook(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range for last N days
 */
export function getDateRange(days: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);

  return {
    since: formatDateForFacebook(since),
    until: formatDateForFacebook(until)
  };
}