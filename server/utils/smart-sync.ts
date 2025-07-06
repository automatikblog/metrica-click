import { storage } from '../storage';
import { createFacebookClient, formatDateForFacebook } from '../facebook-ads';

export class SmartSyncService {
  /**
   * Detect and resolve synchronization issues automatically
   */
  async detectAndResolveIssues(): Promise<void> {
    const campaigns = await storage.getAllCampaigns();
    
    for (const campaign of campaigns) {
      if (campaign.campaignId === 'automatikblog-main') {
        console.log(`[SMART-SYNC] Analyzing campaign ${campaign.campaignId}`);
        
        // Check for missing dates
        const missingDates = await this.findMissingDates(campaign.campaignId);
        if (missingDates.length > 0) {
          console.log(`[SMART-SYNC] Found ${missingDates.length} missing dates for ${campaign.campaignId}`);
          await this.fillMissingDates(campaign.campaignId, missingDates);
        }
        
        // Validate data integrity
        await this.validateCampaignData(campaign.campaignId);
      }
    }
  }
  
  /**
   * Find missing dates between campaign start and today
   */
  async findMissingDates(campaignId: string): Promise<string[]> {
    try {
      const existingData = await storage.getAdSpend(campaignId);
      const existingDates = new Set(existingData.map(d => d.date));
      
      // Check from June 28 (campaign start) to today
      const startDate = new Date('2025-06-28');
      const endDate = new Date();
      const missingDates: string[] = [];
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatDateForFacebook(currentDate);
        if (!existingDates.has(dateStr)) {
          missingDates.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return missingDates;
    } catch (error) {
      console.error('[SMART-SYNC] Error finding missing dates:', error);
      return [];
    }
  }
  
  /**
   * Fill missing dates with Facebook data
   */
  async fillMissingDates(campaignId: string, dates: string[]): Promise<void> {
    try {
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        console.error('[SMART-SYNC] Facebook client not available');
        return;
      }
      
      for (const date of dates) {
        console.log(`[SMART-SYNC] Fetching data for missing date: ${date}`);
        
        const dateRange = { since: date, until: date };
        
        try {
          await facebookClient.syncCampaignData(
            campaignId,
            '120226822043180485', // Facebook campaign ID
            dateRange
          );
          
          console.log(`[SMART-SYNC] Successfully filled data for ${date}`);
        } catch (error) {
          console.log(`[SMART-SYNC] No data available for ${date} (likely campaign not active)`);
        }
      }
    } catch (error) {
      console.error('[SMART-SYNC] Error filling missing dates:', error);
    }
  }
  
  /**
   * Validate campaign data integrity
   */
  async validateCampaignData(campaignId: string): Promise<{
    isAccurate: boolean;
    systemTotal: number;
    facebookTotal: number;
    discrepancy: number;
  }> {
    try {
      // Get system total
      const systemData = await storage.getAdSpend(campaignId);
      const systemTotal = systemData.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);
      
      // Get Facebook total for the same period
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        throw new Error('Facebook client not available');
      }
      
      const minDate = Math.min(...systemData.map(d => new Date(d.date).getTime()));
      const maxDate = Math.max(...systemData.map(d => new Date(d.date).getTime()));
      
      const dateRange = {
        since: formatDateForFacebook(new Date(minDate)),
        until: formatDateForFacebook(new Date(maxDate))
      };
      
      const facebookData = await facebookClient.getCampaignInsights(
        '120226822043180485',
        dateRange
      );
      
      const facebookTotal = facebookData.reduce((sum, data) => sum + data.spend, 0);
      const discrepancy = Math.abs(facebookTotal - systemTotal);
      const isAccurate = discrepancy < 5; // Less than $5 difference is acceptable
      
      console.log(`[SMART-SYNC] Validation - System: $${systemTotal}, Facebook: $${facebookTotal}, Diff: $${discrepancy}`);
      
      return {
        isAccurate,
        systemTotal,
        facebookTotal,
        discrepancy
      };
    } catch (error) {
      console.error('[SMART-SYNC] Error validating campaign data:', error);
      return {
        isAccurate: false,
        systemTotal: 0,
        facebookTotal: 0,
        discrepancy: 0
      };
    }
  }
}

export const smartSyncService = new SmartSyncService();