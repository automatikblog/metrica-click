import { storage } from "./storage";

// Webhook helper functions for conversion endpoint
export function extractSessionId(webhookData: any): string {
  // Priority order for session ID extraction:
  // 1. Direct fields: SCK, SRC, sck, src, session_id, click_id
  // 2. Hotmart origin object: origin.sck, origin.src
  // 3. Nested data structures
  
  let sessionId = webhookData.SCK || 
                 webhookData.SRC || 
                 webhookData.sck || 
                 webhookData.src || 
                 webhookData.session_id || 
                 webhookData.click_id;
  
  // Check Hotmart origin object (prioritize SRC for click tracking)
  if (!sessionId && webhookData.origin) {
    sessionId = webhookData.origin.src || 
               webhookData.origin.SRC ||
               webhookData.origin.sck || 
               webhookData.origin.SCK;
  }
  
  // For Hotmart webhooks, also check origin even if other fields exist
  if (webhookData.event && webhookData.data && webhookData.origin) {
    // Prioritize SRC over SCK for click tracking
    sessionId = webhookData.origin.src || 
               webhookData.origin.SRC ||
               sessionId; // Keep existing if no SRC found
  }
  
  // Check if it's a Hotmart webhook and return a special indicator
  if (!sessionId && webhookData.event && webhookData.data) {
    // This is a Hotmart webhook without tracking data
    // We'll create a conversion without click association
    return 'HOTMART_DIRECT_CONVERSION';
  }
  
  if (!sessionId) {
    throw new Error('Session ID not found in webhook data (SCK/SRC fields missing)');
  }
  
  return String(sessionId).trim();
}

export async function findClickBySessionId(sessionId: string) {
  // Handle direct Hotmart conversions without click tracking
  if (sessionId === 'HOTMART_DIRECT_CONVERSION') {
    return null; // No click associated
  }
  
  // First try direct match (if sessionId is already our clickId format)
  let click = await storage.getClickByClickId(sessionId);
  
  if (!click) {
    // Try to find by searching all clicks (fallback for edge cases)
    const allClicks = await storage.getAllClicks();
    click = allClicks.find(c => 
      (c.referrer && c.referrer.includes(sessionId)) ||
      (c.source && c.source.includes(sessionId)) ||
      c.clickId === sessionId
    );
  }
  
  if (!click) {
    throw new Error(`Click not found for session ID: ${sessionId}`);
  }
  
  return click;
}

export function normalizeConversionData(webhookData: any, click: any) {
  // Default conversion type based on webhook source
  let conversionType = 'purchase';
  let value = null;
  let currency = 'BRL';
  
  // Hotmart webhook format (v2.0.0)
  if (webhookData.event && webhookData.data) {
    if (webhookData.event === 'PURCHASE_APPROVED' || webhookData.event === 'PURCHASE_COMPLETED') {
      conversionType = 'purchase';
      
      // Extract price from Hotmart data structure
      if (webhookData.data.purchase?.price?.value) {
        value = webhookData.data.purchase.price.value;
        currency = webhookData.data.purchase.price.currency_value || 'BRL';
      } else if (webhookData.data.purchase?.full_price?.value) {
        value = webhookData.data.purchase.full_price.value;
        currency = webhookData.data.purchase.full_price.currency_value || 'BRL';
      }
    }
  }
  
  // Hotmart legacy format
  else if (webhookData.product || webhookData.event === 'PURCHASE_COMPLETED') {
    conversionType = 'purchase';
    value = webhookData.purchase_value || webhookData.value || webhookData.price;
    currency = webhookData.currency || 'BRL';
  }
  
  // Custom checkout format
  else if (webhookData.order_total || webhookData.total) {
    conversionType = 'purchase';
    value = webhookData.order_total || webhookData.total;
    currency = webhookData.order_currency || webhookData.currency || 'BRL';
  }
  
  // Lead/signup format
  else if (webhookData.event_type === 'lead' || webhookData.action === 'signup' || webhookData.type === 'lead') {
    conversionType = webhookData.event_type || webhookData.type || 'lead';
    value = null;
  }
  
  // Generic value extraction
  else if (webhookData.amount || webhookData.valor) {
    value = webhookData.amount || webhookData.valor;
  }
  
  return {
    clickId: click ? click.clickId : null,
    conversionType,
    value: value ? String(value) : null,
    currency
  };
}

export async function updateCampaignMetrics(campaignId: string, conversionData: any) {
  const campaign = await storage.getCampaignByCampaignId(campaignId);
  
  if (campaign) {
    const currentRevenue = parseFloat(campaign.totalRevenue || "0");
    const newRevenue = parseFloat(conversionData.value || "0");
    
    await storage.updateCampaign(campaignId, {
      totalRevenue: String(currentRevenue + newRevenue),
      conversionCount: (campaign.conversionCount || 0) + 1
    });
    
    // Update click record only if click exists
    if (conversionData.clickId) {
      await storage.updateClick(conversionData.clickId, {
        conversionValue: conversionData.value,
        convertedAt: new Date()
      });
    }
  }
}