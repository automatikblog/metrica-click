# MétricaClick - Facebook Ads Cost Tracking & Performance Metrics Expansion Plan

## Executive Summary

MétricaClick currently tracks clicks and page views but lacks crucial financial metrics needed for paid advertising optimization. This plan outlines how to integrate Facebook Ads cost data, track conversions, and calculate key performance indicators (KPIs) like ROAS, CPA, and ROI.

## Current System Analysis

### What We Have ✅
- Click tracking with attribution models
- Page view tracking
- Campaign management
- Facebook pixel data capture (_fbp, _fbc)
- Real-time dashboard updates
- External website integration via JavaScript

### What We're Missing ❌
- **Cost Data**: No ad spend tracking
- **Conversion Tracking**: No conversion events or revenue tracking
- **Performance Metrics**: No ROAS, CPA, or ROI calculations
- **Facebook Ads Integration**: No API connection to pull cost data
- **Financial Dashboard**: No visualization of financial performance

## Architectural Changes Required

### 1. Database Schema Expansion

#### New Tables Needed:

```sql
-- Ad spend data from Facebook
ad_spend (
  id: serial PRIMARY KEY,
  campaign_id: text NOT NULL,
  date: date NOT NULL,
  spend: decimal(10,2) NOT NULL,
  impressions: integer,
  reach: integer,
  frequency: decimal(5,2),
  created_at: timestamp DEFAULT NOW(),
  updated_at: timestamp DEFAULT NOW()
)

-- Conversion tracking
conversions (
  id: serial PRIMARY KEY,
  click_id: text NOT NULL,
  conversion_type: text NOT NULL, -- 'purchase', 'lead', 'signup', etc.
  value: decimal(10,2),
  currency: text DEFAULT 'USD',
  created_at: timestamp DEFAULT NOW()
)

-- Campaign settings for cost tracking
campaign_settings (
  id: serial PRIMARY KEY,
  campaign_id: text NOT NULL UNIQUE,
  daily_budget: decimal(10,2),
  lifetime_budget: decimal(10,2),
  target_cpa: decimal(10,2),
  target_roas: decimal(5,2),
  fb_account_id: text,
  fb_campaign_id: text,
  created_at: timestamp DEFAULT NOW()
)
```

#### Schema Updates Needed:
- Add to `campaigns` table: `total_spend`, `total_revenue`, `conversion_count`
- Add to `clicks` table: `conversion_value`, `converted_at`

### 2. Storage Interface Updates

#### IStorage Interface Extensions:
```typescript
// Ad Spend Operations
getAdSpend(campaignId: string, startDate: Date, endDate: Date): Promise<AdSpend[]>
createAdSpend(adSpend: InsertAdSpend): Promise<AdSpend>
updateAdSpend(id: number, updates: Partial<AdSpend>): Promise<AdSpend>

// Conversion Operations
getConversion(id: number): Promise<Conversion | undefined>
getConversionsByClickId(clickId: string): Promise<Conversion[]>
createConversion(conversion: InsertConversion): Promise<Conversion>
getConversionsByCampaignId(campaignId: string): Promise<Conversion[]>

// Campaign Settings
getCampaignSettings(campaignId: string): Promise<CampaignSettings | undefined>
createCampaignSettings(settings: InsertCampaignSettings): Promise<CampaignSettings>
updateCampaignSettings(campaignId: string, updates: Partial<CampaignSettings>): Promise<CampaignSettings>

// Performance Metrics
getCampaignMetrics(campaignId: string, startDate: Date, endDate: Date): Promise<CampaignMetrics>
```

### 3. API Endpoints

#### New Endpoints Required:

```javascript
// Facebook Ads Integration
POST /api/campaigns/:campaignId/connect-fb    // Connect FB account
POST /api/campaigns/:campaignId/sync-costs    // Manual sync costs
GET  /api/campaigns/:campaignId/ad-spend      // Get spend data

// Conversion Tracking
POST /api/conversions                          // Track conversion
GET  /api/conversions/click/:clickId          // Get conversions for click
GET  /api/campaigns/:campaignId/conversions   // Campaign conversions

// Performance Metrics
GET  /api/campaigns/:campaignId/metrics        // ROAS, CPA, ROI
GET  /api/analytics/performance                // Overall performance
GET  /api/analytics/trends                     // Performance trends
```

### 4. Frontend Components

#### New Pages/Features:

1. **Campaign Cost Settings Page**
   - Facebook Ads account connection
   - Budget configuration
   - Target metrics setup

2. **Performance Dashboard**
   - ROAS visualization
   - CPA tracking
   - ROI calculations
   - Cost vs Revenue charts

3. **Conversion Tracking Setup**
   - Conversion pixel generator
   - Event configuration
   - Value tracking setup

4. **Enhanced Analytics Page**
   - Cost breakdown by campaign
   - Performance comparison
   - Trend analysis
   - Attribution reports

### 5. Tracking Script Updates

#### mc.js Enhancements:

```javascript
// Add conversion tracking
function trackConversion(conversionType, value, currency = 'USD') {
  const clickId = getCookie('mcclickid-store') || sessionStorage.getItem('mcclickid');
  if (!clickId) return;
  
  fetch(`${getBaseUrl()}/api/conversions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clickId,
      conversionType,
      value,
      currency
    })
  });
}

// Expose global function
window.MetricaClick = {
  trackConversion: trackConversion
};
```

## Implementation Plan

### Phase 1: Database & Backend Foundation (Week 1)
1. Create new database tables
2. Update Drizzle schema
3. Implement storage interface methods
4. Create API endpoints for conversions
5. Add conversion tracking to mc.js

### Phase 2: Facebook Ads Integration (Week 2)
1. Implement Facebook Ads API client
2. Create cost sync functionality
3. Build campaign settings management
4. Add automated daily cost sync

### Phase 3: Frontend Development (Week 3)
1. Build performance dashboard
2. Create cost settings interface
3. Update campaigns page with financial data
4. Enhance analytics with cost metrics

### Phase 4: Testing & Optimization (Week 4)
1. End-to-end testing
2. Performance optimization
3. Documentation
4. Deployment preparation

## Key Files to Modify

### Backend Files:
1. `shared/schema.ts` - Add new tables
2. `server/storage.ts` - Implement new methods
3. `server/routes.ts` - Add new endpoints
4. `server/facebook-ads.ts` - NEW: FB API integration
5. `server/metrics.ts` - NEW: Metric calculations

### Frontend Files:
1. `client/src/pages/performance.tsx` - NEW: Performance dashboard
2. `client/src/pages/campaigns.tsx` - Add cost data
3. `client/src/pages/analytics.tsx` - Enhanced analytics
4. `client/src/components/cost-settings.tsx` - NEW: Cost configuration
5. `client/src/components/performance-charts.tsx` - NEW: Charts

### Tracking Script:
1. `public/mc.js` - Add conversion tracking

## Technical Considerations

### Facebook Ads API Integration
- Use Facebook Business SDK
- Implement OAuth flow for account connection
- Store encrypted access tokens
- Handle rate limiting and retries

### Performance Calculations
```javascript
// ROAS (Return on Ad Spend)
ROAS = Total Revenue / Total Spend

// CPA (Cost Per Acquisition)
CPA = Total Spend / Total Conversions

// ROI (Return on Investment)
ROI = ((Revenue - Spend) / Spend) * 100
```

### Data Sync Strategy
- Daily automated sync at 2 AM
- Manual sync option in UI
- Webhook for real-time updates (future)
- Handle Facebook API downtime gracefully

## Security Considerations
1. Encrypt Facebook access tokens
2. Validate conversion values to prevent fraud
3. Rate limit conversion API
4. Audit trail for financial data changes

## Success Metrics
- [ ] Facebook Ads cost data syncing daily
- [ ] Conversion tracking working on client websites
- [ ] ROAS, CPA, ROI displaying correctly
- [ ] Performance trends visible over time
- [ ] Cost vs Revenue charts updating in real-time

## Conclusion

This expansion will transform MétricaClick from a basic click tracker into a comprehensive paid advertising optimization platform. The integration of cost data and conversion tracking will provide users with the insights needed to optimize their ad spend and maximize ROI.

The modular approach allows for incremental development while maintaining system stability. Each phase builds upon the previous, ensuring a solid foundation for future enhancements.