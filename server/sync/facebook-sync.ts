import cron from 'node-cron';
import { FacebookAdsClient, createFacebookClient, getDateRange, formatDateForFacebook } from '../facebook-ads';
import { storage } from '../storage';
import { getFacebookCredentials } from '../auth/facebook-oauth';

export interface SyncResult {
  campaignId: string;
  success: boolean;
  dataPoints: number;
  totalSpend: number;
  error?: string;
}

export interface SyncStats {
  totalCampaigns: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalSpend: number;
  totalDataPoints: number;
  duration: number;
}

export class FacebookSyncService {
  private isRunning: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncHistory: SyncResult[] = [];
  private defaultTenantId: number = 1; // Default tenant for Facebook sync operations

  constructor() {
    this.scheduleDailySync();
  }

  /**
   * Schedule automatic sync with multiple frequencies
   */
  scheduleDailySync(): void {
    // Main sync at 2:00 AM - comprehensive 90 days
    cron.schedule('0 2 * * *', () => {
      console.log('[FB-SYNC] Starting scheduled daily full sync...');
      this.syncAllCampaigns();
    }, {
      timezone: 'America/New_York'
    });

    // Incremental sync every 4 hours - last 2 days only
    cron.schedule('0 */4 * * *', () => {
      console.log('[FB-SYNC] Starting incremental sync...');
      this.syncRecentData();
    }, {
      timezone: 'America/New_York'
    });

    // Yesterday's data sync at 10:00 AM (more stable data)
    cron.schedule('0 10 * * *', () => {
      console.log('[FB-SYNC] Starting yesterday data sync...');
      this.syncYesterdayData();
    }, {
      timezone: 'America/New_York'
    });

    // Today's data sync every 30 minutes during business hours (8 AM - 10 PM)
    cron.schedule('*/30 8-22 * * *', () => {
      console.log('[FB-SYNC] Starting 30-min today data sync...');
      this.syncTodayData();
    }, {
      timezone: 'America/New_York'
    });

    console.log('[FB-SYNC] Multi-frequency sync scheduled:');
    console.log('[FB-SYNC] - Full sync: 2:00 AM EST daily');
    console.log('[FB-SYNC] - Incremental: Every 4 hours');
    console.log('[FB-SYNC] - Yesterday data: 10:00 AM EST daily');
    console.log('[FB-SYNC] - Today data: Every 30 minutes 8 AM - 10 PM EST');
  }

  /**
   * Sync all campaigns that have Facebook integration enabled
   */
  async syncAllCampaigns(): Promise<SyncStats> {
    if (this.isRunning) {
      console.log('[FB-SYNC] Sync already running, skipping...');
      throw new Error('Sync already in progress');
    }

    const startTime = Date.now();
    this.isRunning = true;
    this.syncHistory = [];

    try {
      console.log('[FB-SYNC] Starting sync for all campaigns...');
      
      // Get all campaigns that have Facebook settings
      const allCampaigns = await storage.getAllCampaigns();
      const campaignsToSync = [];

      for (const campaign of allCampaigns) {
        const settings = await storage.getCampaignSettings(this.defaultTenantId, campaign.campaignId);
        if (settings?.fbCampaignId) {
          campaignsToSync.push({
            internal: campaign,
            facebook: settings.fbCampaignId
          });
        }
      }

      console.log(`[FB-SYNC] Found ${campaignsToSync.length} campaigns to sync`);

      // Create Facebook client (assuming single user for now)
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        throw new Error('Failed to create Facebook client - no credentials');
      }

      // Test connection first
      const connectionOk = await facebookClient.testConnection();
      if (!connectionOk) {
        throw new Error('Facebook API connection failed');
      }

      // Sync each campaign
      let totalSpend = 0;
      let totalDataPoints = 0;
      let successfulSyncs = 0;
      let failedSyncs = 0;

      for (const campaignPair of campaignsToSync) {
        try {
          const result = await this.syncSingleCampaign(
            facebookClient,
            campaignPair.internal.campaignId,
            campaignPair.facebook
          );

          this.syncHistory.push(result);
          
          if (result.success) {
            successfulSyncs++;
            totalSpend += result.totalSpend;
            totalDataPoints += result.dataPoints;
          } else {
            failedSyncs++;
          }
        } catch (error) {
          console.error(`[FB-SYNC] Error syncing campaign ${campaignPair.internal.campaignId}:`, error);
          failedSyncs++;
          this.syncHistory.push({
            campaignId: campaignPair.internal.campaignId,
            success: false,
            dataPoints: 0,
            totalSpend: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      const stats: SyncStats = {
        totalCampaigns: campaignsToSync.length,
        successfulSyncs,
        failedSyncs,
        totalSpend,
        totalDataPoints,
        duration
      };

      console.log(`[FB-SYNC] Sync completed: ${successfulSyncs}/${campaignsToSync.length} campaigns, $${totalSpend.toFixed(2)} total spend, ${duration}ms`);
      
      return stats;
    } catch (error) {
      console.error('[FB-SYNC] Sync failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync a single campaign
   */
  async syncSingleCampaign(
    facebookClient: FacebookAdsClient,
    internalCampaignId: string,
    facebookCampaignId: string,
    days: number = 7
  ): Promise<SyncResult> {
    try {
      console.log(`[FB-SYNC] Syncing campaign ${internalCampaignId} -> FB:${facebookCampaignId}`);
      
      // Get comprehensive date range (90 days or since campaign start)
      const dateRange = getDateRange(90);
      
      // Sync the campaign data
      await facebookClient.syncCampaignData(
        internalCampaignId,
        facebookCampaignId,
        dateRange
      );

      // Get updated spend data to calculate totals
      const spendData = await storage.getAdSpend(this.defaultTenantId, internalCampaignId);
      const totalSpend = spendData.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);

      return {
        campaignId: internalCampaignId,
        success: true,
        dataPoints: spendData.length,
        totalSpend,
      };
    } catch (error) {
      console.error(`[FB-SYNC] Error syncing campaign ${internalCampaignId}:`, error);
      return {
        campaignId: internalCampaignId,
        success: false,
        dataPoints: 0,
        totalSpend: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Manual sync for a specific campaign
   */
  async syncCampaign(campaignId: string): Promise<SyncResult> {
    try {
      console.log(`[FB-SYNC] Manual sync requested for campaign: ${campaignId}`);
      
      // Get campaign settings
      const settings = await storage.getCampaignSettings(this.defaultTenantId, campaignId);
      if (!settings?.fbCampaignId) {
        throw new Error('Campaign not connected to Facebook');
      }

      // Create Facebook client
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        throw new Error('Failed to create Facebook client');
      }

      // Sync the campaign
      return await this.syncSingleCampaign(
        facebookClient,
        campaignId,
        settings.fbCampaignId
      );
    } catch (error) {
      console.error(`[FB-SYNC] Manual sync failed for campaign ${campaignId}:`, error);
      return {
        campaignId,
        success: false,
        dataPoints: 0,
        totalSpend: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus(): {
    isRunning: boolean;
    lastSyncTime: Date | null;
    syncHistory: SyncResult[];
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncHistory: this.syncHistory.slice(-10) // Last 10 sync results
    };
  }

  /**
   * Force stop any running sync
   */
  stopSync(): void {
    if (this.isRunning) {
      console.log('[FB-SYNC] Stopping sync...');
      this.isRunning = false;
    }
  }

  /**
   * Sync recent data (last 2 days) for all campaigns
   */
  async syncRecentData(): Promise<void> {
    if (this.isRunning) {
      console.log('[FB-SYNC] Sync already running, skipping incremental sync');
      return;
    }
    
    try {
      this.isRunning = true;
      const campaigns = await storage.getAllCampaigns();
      
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        throw new Error('Failed to create Facebook client');
      }
      
      for (const campaign of campaigns) {
        // Get campaign settings to check for Facebook integration
        const settings = await storage.getCampaignSettings(this.defaultTenantId, campaign.campaignId);
        if (settings?.fbCampaignId) {
          // Sync last 2 days only for incremental updates
          const dateRange = getDateRange(2);
          await facebookClient.syncCampaignData(
            campaign.campaignId,
            settings.fbCampaignId,
            dateRange
          );
        }
      }
    } catch (error) {
      console.error('[FB-SYNC] Error during incremental sync:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync today's data specifically (for real-time updates)
   */
  /**
   * Retry mechanism for upsert operations
   */
  async upsertAdSpendWithRetry(adSpendData: any, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await storage.upsertAdSpend(this.defaultTenantId, adSpendData);
        console.log(`[FB-SYNC] ✅ Upserted spend: $${adSpendData.spend} for ${adSpendData.date}`);
        return;
      } catch (error: any) {
        console.error(`[FB-SYNC] ❌ Upsert attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async syncTodayData(): Promise<void> {
    if (this.isRunning) {
      console.log('[FB-SYNC] Sync already running, skipping today sync');
      return;
    }

    try {
      this.isRunning = true;
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const dateRange = {
        since: todayString,
        until: todayString
      };

      console.log(`[FB-SYNC] Syncing today's data: ${dateRange.since}`);

      // Create Facebook client
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        throw new Error('Failed to create Facebook client');
      }

      // Test connection
      const connectionOk = await facebookClient.testConnection();
      if (!connectionOk) {
        throw new Error('Facebook API connection failed');
      }

      // Get today's account-level spend data
      const todayData = await facebookClient.getAdAccountSpend(dateRange);
      console.log(`[FB-SYNC] Today's data returned ${todayData.length} data points`);

      // Store/update today's data for automatikblog-main campaign with retry mechanism
      for (const data of todayData) {
        const adSpendData = {
          campaignId: 'automatikblog-main',
          date: data.date,
          spend: data.spend.toString(),
          impressions: data.impressions,
          reach: data.reach,
          clicks: data.clicks
        };

        await this.upsertAdSpendWithRetry(adSpendData);
        console.log(`[FB-SYNC] ✅ Upserted today's spend: $${data.spend} for ${data.date}`);
      }

      const totalSpend = todayData.reduce((sum, data) => sum + data.spend, 0);
      console.log(`[TODAY-SYNC] Completed for automatikblog-main. Today's spend: $${totalSpend}`);

    } catch (error) {
      console.error('[FB-SYNC] Error during today sync:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync yesterday's data specifically (more stable data)
   */
  async syncYesterdayData(): Promise<void> {
    if (this.isRunning) {
      console.log('[FB-SYNC] Sync already running, skipping yesterday sync');
      return;
    }

    try {
      this.isRunning = true;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      const dateRange = {
        since: yesterdayString,
        until: yesterdayString
      };

      console.log(`[FB-SYNC] Syncing yesterday's data: ${dateRange.since}`);

      // Create Facebook client and sync yesterday's data
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        throw new Error('Failed to create Facebook client');
      }

      const yesterdayData = await facebookClient.getAdAccountSpend(dateRange);
      console.log(`[FB-SYNC] Yesterday's data returned ${yesterdayData.length} data points`);

      for (const data of yesterdayData) {
        const adSpendData = {
          campaignId: 'automatikblog-main',
          date: data.date,
          spend: data.spend.toString(),
          impressions: data.impressions,
          reach: data.reach,
          clicks: data.clicks
        };

        await storage.upsertAdSpend(this.defaultTenantId, adSpendData);
        console.log(`[FB-SYNC] Upserted yesterday's spend: $${data.spend} for ${data.date}`);
      }

      const totalSpend = yesterdayData.reduce((sum, data) => sum + data.spend, 0);
      console.log(`[YESTERDAY-SYNC] Completed for automatikblog-main. Yesterday's spend: $${totalSpend}`);

    } catch (error) {
      console.error('[FB-SYNC] Error during yesterday sync:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get next scheduled sync time
   */
  getNextSyncTime(): Date {
    const now = new Date();
    const nextSync = new Date(now);
    nextSync.setHours(2, 0, 0, 0);
    
    // If it's already past 2 AM today, schedule for tomorrow
    if (now.getHours() >= 2) {
      nextSync.setDate(nextSync.getDate() + 1);
    }
    
    return nextSync;
  }

  /**
   * Get sync statistics for the last N days
   */
  async getSyncStatistics(days: number = 30): Promise<{
    totalSyncs: number;
    successRate: number;
    avgDataPoints: number;
    avgSpend: number;
  }> {
    // This would be implemented with proper database queries
    // For now, return mock statistics
    return {
      totalSyncs: this.syncHistory.length,
      successRate: this.syncHistory.filter(s => s.success).length / Math.max(1, this.syncHistory.length),
      avgDataPoints: this.syncHistory.reduce((sum, s) => sum + s.dataPoints, 0) / Math.max(1, this.syncHistory.length),
      avgSpend: this.syncHistory.reduce((sum, s) => sum + s.totalSpend, 0) / Math.max(1, this.syncHistory.length)
    };
  }
}

// Create a singleton instance
export const facebookSyncService = new FacebookSyncService();

// Export functions for manual use
export async function syncAllCampaigns(): Promise<SyncStats> {
  return await facebookSyncService.syncAllCampaigns();
}

export async function syncSingleCampaign(campaignId: string): Promise<SyncResult> {
  return await facebookSyncService.syncCampaign(campaignId);
}

export function getSyncStatus() {
  return facebookSyncService.getSyncStatus();
}

export async function syncTodayData(): Promise<void> {
  return await facebookSyncService.syncTodayData();
}