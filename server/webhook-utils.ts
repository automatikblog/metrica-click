import { storage } from "./storage";

// Webhook helper functions for conversion endpoint
export function extractSessionId(webhookData: any): string {
  // Priority order: SCK, SRC, sck, src, session_id, click_id
  const sessionId = webhookData.SCK || 
                   webhookData.SRC || 
                   webhookData.sck || 
                   webhookData.src || 
                   webhookData.session_id || 
                   webhookData.click_id;
  
  if (!sessionId) {
    throw new Error('Session ID not found in webhook data (SCK/SRC fields missing)');
  }
  
  return String(sessionId).trim();
}

export async function findClickBySessionId(sessionId: string) {
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
  
  // Hotmart webhook format
  if (webhookData.product || webhookData.event === 'PURCHASE_COMPLETED') {
    conversionType = 'purchase';
    value = webhookData.purchase_value || webhookData.value || webhookData.price;
    currency = webhookData.currency || 'BRL';
  }
  
  // Custom checkout format
  if (webhookData.order_total || webhookData.total) {
    conversionType = 'purchase';
    value = webhookData.order_total || webhookData.total;
    currency = webhookData.order_currency || webhookData.currency || 'BRL';
  }
  
  // Lead/signup format
  if (webhookData.event_type === 'lead' || webhookData.action === 'signup' || webhookData.type === 'lead') {
    conversionType = webhookData.event_type || webhookData.type || 'lead';
    value = null;
  }
  
  // Generic value extraction
  if (!value && (webhookData.amount || webhookData.valor)) {
    value = webhookData.amount || webhookData.valor;
  }
  
  return {
    clickId: click.clickId,
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
    
    // Update click record
    await storage.updateClick(conversionData.clickId, {
      conversionValue: conversionData.value,
      convertedAt: new Date()
    });
  }
}