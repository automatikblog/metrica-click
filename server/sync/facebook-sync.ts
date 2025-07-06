import cron from 'node-cron';
import { FacebookAdsClient, createFacebookClient, getDateRange } from '../facebook-ads';
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

  constructor() {
    this.scheduleDailySync();
  }

  /**
   * Schedule automatic daily sync at 2:00 AM
   */
  scheduleDailySync(): void {
    cron.schedule('0 2 * * *', () => {
      console.log('[FB-SYNC] Starting scheduled daily sync...');
      this.syncAllCampaigns();
    }, {
      timezone: 'America/New_York'
    });

    console.log('[FB-SYNC] Daily sync scheduled for 2:00 AM EST');
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
        const settings = await storage.getCampaignSettings(campaign.campaignId);
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
      
      // Get last 30 days of data to ensure comprehensive sync
      const dateRange = getDateRange(30);
      
      // Sync the campaign data
      await facebookClient.syncCampaignData(
        internalCampaignId,
        facebookCampaignId,
        dateRange
      );

      // Get updated spend data to calculate totals
      const spendData = await storage.getAdSpend(internalCampaignId);
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
      const settings = await storage.getCampaignSettings(campaignId);
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