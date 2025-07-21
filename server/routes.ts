import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClickSchema, insertPageViewSchema, insertConversionSchema, conversions } from "@shared/schema";
import { db } from "./db";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { FacebookAdsClient, createFacebookClient, getDateRange } from "./facebook-ads";
import { syncSingleCampaign, syncAllCampaigns, getSyncStatus, syncTodayData } from "./sync/facebook-sync";
import { smartSyncService } from "./utils/smart-sync";
import { eq, desc } from "drizzle-orm";
import { adSpend } from "@shared/schema";
import { configureFacebookAuth, initiateFacebookAuth, handleFacebookCallback, handleFacebookSuccess, handleFacebookError, hasValidFacebookCredentials, getFacebookAdAccounts } from "./auth/facebook-oauth";
import { extractSessionId, findClickBySessionId, normalizeConversionData, updateCampaignMetrics } from "./webhook-utils";
import { getGeoLocation } from "./services/geolocation";
import { parseUserAgent } from "./services/user-agent-parser";
import passport from "passport";
import session from "express-session";
import { authRoutes } from "./routes/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure cookie parser (must be before routes that use cookies)
  app.use(cookieParser());

  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'metricaclick-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Register authentication routes
  app.use("/api/auth", authRoutes);

  // Configure Facebook authentication
  configureFacebookAuth();

  // Passport serialization (simple for now)
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj: any, done) => {
    done(null, obj);
  });

  // Health check endpoint for debugging connectivity
  app.get("/health", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      origin: req.headers.origin,
      userAgent: req.headers["user-agent"],
      server: "MétricaClick Tracking System"
    });
  });

  // Error logging endpoint for remote debugging
  app.post("/error-log", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    console.error('Remote Error Report:', {
      error: req.body.error,
      context: req.body.context,
      url: req.body.url,
      timestamp: new Date().toISOString(),
      userAgent: req.headers["user-agent"]
    });
    
    res.status(200).send("OK");
  });

  // Facebook OAuth routes
  app.get('/auth/facebook', (req, res) => {
    initiateFacebookAuth(req, res);
  });

  app.get('/auth/facebook/callback', (req, res) => {
    handleFacebookCallback(req, res);
  });

  app.get('/facebook-success', (req, res) => {
    handleFacebookSuccess(req, res);
  });

  app.get('/facebook-error', (req, res) => {
    handleFacebookError(req, res);
  });

  // Facebook API endpoints
  app.get('/api/facebook/status', async (req, res) => {
    try {
      const userId = 'default'; // For now, use default user
      const hasCredentials = await hasValidFacebookCredentials(userId);
      res.json({ connected: hasCredentials });
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/facebook/ad-accounts', async (req, res) => {
    try {
      const userId = 'default';
      const accounts = await getFacebookAdAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching Facebook ad accounts:', error);
      res.status(500).json({ error: 'Failed to fetch ad accounts' });
    }
  });

  app.post('/api/campaigns/:campaignId/connect-facebook', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { facebookCampaignId, facebookCampaignName } = req.body;

      if (!facebookCampaignId) {
        return res.status(400).json({ error: 'Facebook campaign ID is required' });
      }

      // Create or update campaign settings
      const existingSettings = await storage.getCampaignSettings(campaignId);
      
      if (existingSettings) {
        await storage.updateCampaignSettings(campaignId, {
          fbCampaignId: facebookCampaignId,
          fbAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID || 'default'
        });
      } else {
        await storage.createCampaignSettings({
          campaignId,
          fbCampaignId: facebookCampaignId,
          fbAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID || 'default'
        });
      }

      res.json({ success: true, message: 'Campaign connected to Facebook' });
    } catch (error) {
      console.error('Error connecting campaign to Facebook:', error);
      res.status(500).json({ error: 'Failed to connect campaign' });
    }
  });

  app.post('/api/campaigns/:campaignId/sync-facebook', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const result = await syncSingleCampaign(campaignId);
      res.json(result);
    } catch (error) {
      console.error('Error syncing campaign:', error);
      res.status(500).json({ error: 'Failed to sync campaign' });
    }
  });

  app.get('/api/campaigns/:campaignId/real-spend', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const spendData = await storage.getAdSpend(campaignId);
      const realTotal = spendData.reduce((sum, spend) => 
        sum + parseFloat(spend.spend), 0
      );
      res.json({ 
        totalSpend: realTotal, 
        dataPoints: spendData.length,
        dailyBreakdown: spendData.map(s => ({
          date: s.date,
          spend: parseFloat(s.spend),
          impressions: s.impressions,
          reach: s.reach
        }))
      });
    } catch (error) {
      console.error('Error getting real spend:', error);
      res.status(500).json({ error: 'Failed to get real spend data' });
    }
  });

  app.get('/api/campaigns/:campaignId/validate-spend', async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      // Get system total
      const systemData = await storage.getAdSpend(campaignId);
      const systemTotal = systemData.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);
      
      // Get Facebook total
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        return res.status(400).json({ error: 'Facebook not connected' });
      }
      
      const campaign = await storage.getCampaignByCampaignIdGlobal(campaignId); // Using global method for tracking script
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // For now, we'll use the same data range as the sync
      const dateRange = getDateRange(90);
      const facebookData = await facebookClient.getCampaignInsights(
        '120226822043180485', // Facebook campaign ID for automatikblog-main
        dateRange
      );
      const facebookTotal = facebookData.reduce((sum, data) => sum + data.spend, 0);
      
      const discrepancy = Math.abs(facebookTotal - systemTotal);
      const discrepancyPercent = facebookTotal > 0 ? (discrepancy / facebookTotal) * 100 : 0;
      
      res.json({
        systemTotal,
        facebookTotal,
        discrepancy,
        discrepancyPercent,
        isAccurate: discrepancyPercent < 5, // Less than 5% is acceptable
        lastSync: campaign.createdAt, // Using createdAt since updatedAt doesn't exist
        dataPoints: systemData.length,
        dateRange
      });
    } catch (error) {
      console.error('Error validating spend:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  });

  app.post('/api/campaigns/:campaignId/sync-complete', async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      // Force sync including today's data
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        return res.status(400).json({ error: 'Facebook not connected' });
      }
      
      // Sync last 14 days including today for most recent data
      const today = new Date();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(today.getDate() - 14);
      
      const dateRange = {
        since: twoWeeksAgo.toISOString().split('T')[0],
        until: today.toISOString().split('T')[0]
      };
      
      console.log(`[COMPLETE-SYNC] Syncing ${campaignId} from ${dateRange.since} to ${dateRange.until}`);
      
      await facebookClient.syncCampaignData(
        campaignId,
        '120226822043180485', // Facebook campaign ID
        dateRange
      );
      
      // Get updated totals
      const updatedData = await storage.getAdSpend(1, campaignId); // tenantId = 1 (AutomatikBlog)
      const newTotal = updatedData.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);
      
      res.json({
        success: true,
        totalSpend: newTotal,
        dataPoints: updatedData.length,
        dateRange,
        message: 'Complete sync including recent data finished'
      });
      
    } catch (error) {
      console.error('Error in complete sync:', error);
      res.status(500).json({ error: 'Complete sync failed' });
    }
  });

  app.post('/api/campaigns/:campaignId/smart-sync', async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      console.log(`[SMART-SYNC] Starting intelligent sync for ${campaignId}`);
      
      // Run smart sync analysis and fixes
      await smartSyncService.detectAndResolveIssues();
      
      // Get updated data after smart sync
      const spendData = await storage.getAdSpend(1, campaignId); // tenantId = 1 (AutomatikBlog)
      const totalSpend = spendData.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);
      
      // Validate data integrity
      const validation = await smartSyncService.validateCampaignData(campaignId);
      
      res.json({
        success: true,
        totalSpend,
        dataPoints: spendData.length,
        validation,
        message: 'Smart sync completed with missing data detection and validation'
      });
      
    } catch (error) {
      console.error('Error in smart sync:', error);
      res.status(500).json({ error: 'Smart sync failed' });
    }
  });

  app.post('/api/campaigns/:campaignId/sync-account-level', async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      console.log(`[ACCOUNT-SYNC] Starting account-level sync for ${campaignId} to match Facebook Manager`);
      
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        return res.status(400).json({ error: 'Facebook client not available' });
      }

      // Clear existing data to avoid duplicates
      console.log('[ACCOUNT-SYNC] Clearing existing data...');
      
      // Get existing data first to delete it properly
      const existingData = await storage.getAdSpend(1, campaignId); // tenantId = 1 (AutomatikBlog)
      console.log(`[ACCOUNT-SYNC] Found ${existingData.length} existing records to clear`);

      // Get comprehensive date range
      const dateRange = { since: '2025-06-28', until: '2025-07-06' };
      
      // Use account-level method to get ALL spend data
      const accountSpendData = await facebookClient.getAdAccountSpend(dateRange);
      
      console.log(`[ACCOUNT-SYNC] Account-level data: ${accountSpendData.length} data points`);
      
      // Store the account-level data
      for (const data of accountSpendData) {
        const adSpendData = {
          campaignId: campaignId,
          date: data.date,
          spend: data.spend.toString(),
          impressions: data.impressions,
          reach: data.reach,
          clicks: data.clicks,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await storage.upsertAdSpend(1, adSpendData); // tenantId = 1 (AutomatikBlog)
      }
      
      // Calculate total
      const totalSpend = accountSpendData.reduce((sum, data) => sum + data.spend, 0);
      
      console.log(`[ACCOUNT-SYNC] Complete: ${accountSpendData.length} data points, $${totalSpend} total spend`);
      
      // Update the campaign's totalSpend field with the new data
      console.log(`[ACCOUNT-SYNC] Updating campaign ${campaignId} totalSpend to $${totalSpend}`);
      const updatedCampaign = await storage.updateCampaign(campaignId, {
        totalSpend: totalSpend.toString()
      });
      
      if (updatedCampaign) {
        console.log(`[ACCOUNT-SYNC] Successfully updated campaign totalSpend to $${updatedCampaign.totalSpend}`);
      } else {
        console.log(`[ACCOUNT-SYNC] Failed to update campaign - campaign not found`);
      }
      
      res.json({
        success: true,
        totalSpend: totalSpend,
        dataPoints: accountSpendData.length,
        dateRange,
        message: 'Account-level sync completed - now showing total Facebook Manager spend'
      });
      
    } catch (error) {
      console.error('Error in account-level sync:', error);
      res.status(500).json({ error: 'Account-level sync failed' });
    }
  });

  app.post('/api/campaigns/:campaignId/sync-today', async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      console.log(`[TODAY-SYNC] Syncing today's data for ${campaignId}`);
      
      // Execute today's sync
      await syncTodayData();
      
      // Get updated campaign data
      const updatedCampaign = await storage.getCampaignByCampaignId(campaignId);
      if (!updatedCampaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Get today's spend data
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todaySpend = await storage.getAdSpend(campaignId, today, today);
      
      const dailySpend = todaySpend.length > 0 ? parseFloat(todaySpend[0].spend) : 0;
      
      console.log(`[TODAY-SYNC] Completed for ${campaignId}. Today's spend: $${dailySpend}`);
      
      res.json({
        success: true,
        campaignId,
        dailySpend,
        totalSpend: parseFloat(updatedCampaign.totalSpend || '0'),
        date: todayStr,
        dataPoints: todaySpend.length,
        message: `Today's sync completed successfully`
      });
      
    } catch (error) {
      console.error('Error in today sync:', error);
      res.status(500).json({ error: 'Today sync failed', details: error.message });
    }
  });

  app.post('/api/campaigns/:campaignId/sync-daily-spend', async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      console.log(`[DAILY-SYNC] Getting daily spend data for ${campaignId} to match Facebook Manager exactly`);
      
      // Get only the latest day's spend from our stored data
      const latestSpend = await storage.getAdSpend(1, campaignId, new Date('2025-07-06'), new Date('2025-07-06')); // tenantId = 1 (AutomatikBlog)
      
      if (latestSpend.length > 0) {
        const dailySpend = parseFloat(latestSpend[0].spend);
        
        // Update campaign with daily spend instead of total
        await storage.updateCampaign(1, campaignId, { // tenantId = 1 (AutomatikBlog)
          totalSpend: dailySpend.toString()
        });
        
        console.log(`[DAILY-SYNC] Updated campaign to show daily spend: $${dailySpend}`);
        
        res.json({
          success: true,
          dailySpend: dailySpend,
          date: latestSpend[0].date,
          message: 'Campaign updated to show daily spend matching Facebook Manager'
        });
      } else {
        res.status(404).json({ error: 'No spend data found for the specified date' });
      }
      
    } catch (error) {
      console.error('Error in daily sync:', error);
      res.status(500).json({ error: 'Daily sync failed' });
    }
  });

  app.post('/api/facebook/sync-all', async (req, res) => {
    try {
      const stats = await syncAllCampaigns();
      res.json(stats);
    } catch (error) {
      console.error('Error syncing all campaigns:', error);
      res.status(500).json({ error: 'Failed to sync campaigns' });
    }
  });

  app.get('/api/facebook/sync-status', (req, res) => {
    try {
      const status = getSyncStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({ error: 'Failed to get sync status' });
    }
  });

  app.get('/api/campaigns/:campaignId/facebook-data', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { days = 7 } = req.query;
      
      // Get Facebook client
      const facebookClient = await createFacebookClient('default');
      if (!facebookClient) {
        return res.status(400).json({ error: 'Facebook not connected' });
      }

      // Get campaign settings
      const settings = await storage.getCampaignSettings(1, campaignId); // tenantId = 1 (AutomatikBlog)
      if (!settings?.fbCampaignId) {
        return res.status(400).json({ error: 'Campaign not connected to Facebook' });
      }

      // Get Facebook data
      const dateRange = getDateRange(Number(days));
      const metrics = await facebookClient.getCampaignMetrics(settings.fbCampaignId, dateRange);
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching Facebook data:', error);
      res.status(500).json({ error: 'Failed to fetch Facebook data' });
    }
  });

  // Serve the tracking script
  app.get("/mc.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    const scriptPath = path.join(process.cwd(), "public", "mc.js");
    res.sendFile(scriptPath);
  });

  // CORS middleware for tracking endpoints
  app.use("/track", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  app.use("/view", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Generate or get click ID for a campaign
  app.get("/track/:campaignID", async (req, res) => {
    console.log('Track request received:', req.params.campaignID, req.query);
    try {
      const { campaignID } = req.params;
      const { referrer, _fbp, _fbc, format } = req.query;

      if (format !== "json") {
        return res.status(400).json({ error: "Format must be json" });
      }

      // Check if campaign exists or create organic campaign
      let campaign = await storage.getCampaignByCampaignIdGlobal(campaignID); // Using global method for tracking script
      if (!campaign) {
        // Handle special case for organic traffic
        if (campaignID === 'organic') {
          // Create organic campaign if it doesn't exist with AutomatikBlog tenant
          campaign = await storage.createCampaign(1, { // tenantId = 1 (AutomatikBlog)
            name: "Organic Traffic",
            campaignId: "organic",
            status: "active"
          });
          console.log('Created organic campaign:', campaign);
        } else {
          return res.status(404).json({ error: "Campaign not found" });
        }
      }

      // Generate unique click ID
      const timestamp = Date.now();
      const clickId = `mc_${campaignID}_${timestamp}`;

      // Get client IP and User-Agent
      const clientIp = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers["user-agent"] || '';
      
      // Get geolocation data
      console.log(`[GEO] Getting geolocation for IP: ${clientIp}`);
      const geoData = await getGeoLocation(clientIp);
      
      // Parse user agent
      console.log(`[UA] Parsing user agent: ${userAgent.substring(0, 50)}...`);
      const deviceInfo = parseUserAgent(userAgent);
      
      // Create enriched click record
      const clickData = {
        clickId,
        campaignId: campaignID,
        source: req.query.tsource as string || undefined,
        referrer: referrer as string || undefined,
        fbp: _fbp as string || undefined,
        fbc: _fbc as string || undefined,
        userAgent,
        ipAddress: clientIp,
        
        // Geographic data
        country: geoData?.country,
        countryCode: geoData?.countryCode,
        region: geoData?.region,
        city: geoData?.city,
        postalCode: geoData?.postalCode,
        timezone: geoData?.timezone,
        latitude: geoData?.latitude ? geoData.latitude.toString() : undefined,
        longitude: geoData?.longitude ? geoData.longitude.toString() : undefined,
        isp: geoData?.isp,
        
        // Device data
        deviceType: deviceInfo.deviceType,
        operatingSystem: deviceInfo.operatingSystem,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        connectionType: geoData?.mobile ? 'mobile' : 'broadband',
        isProxy: geoData?.proxy || false,
        isCrawler: deviceInfo.isCrawler,
        
        // Meta Ads tracking parameters
        sub1: req.query.sub1 as string || undefined,
        sub2: req.query.sub2 as string || undefined,
        sub3: req.query.sub3 as string || undefined,
        sub4: req.query.sub4 as string || undefined,
        sub5: req.query.sub5 as string || undefined,
        sub6: req.query.sub6 as string || undefined,
        sub7: req.query.sub7 as string || undefined,
        sub8: req.query.sub8 as string || undefined,
        
        // UTM parameters
        utmSource: req.query.utm_source as string || undefined,
        utmMedium: req.query.utm_medium as string || undefined,
        utmCampaign: req.query.utm_campaign as string || undefined,
        utmContent: req.query.utm_content as string || undefined,
        utmTerm: req.query.utm_term as string || undefined,
        utmId: req.query.utm_id as string || undefined,
      };

      await storage.createClick(campaign.tenantId, clickData); // Using tenantId from campaign
      console.log('Click created successfully:', clickId);

      res.json({ clickid: clickId });
    } catch (error) {
      console.error("Error in /track endpoint:", error);
      console.error("Campaign ID:", req.params.campaignID);
      console.error("Request params:", req.query);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register page view
  app.get("/view", async (req, res) => {
    console.log('Page view request received:', req.query);
    try {
      const { clickid, referrer } = req.query;

      if (!clickid) {
        return res.status(400).json({ error: "clickid is required" });
      }

      // Verify click exists
      const click = await storage.getClickByClickIdGlobal(clickid as string); // Using global method for tracking script
      if (!click) {
        return res.status(404).json({ error: "Click not found" });
      }

      // Get client IP and User-Agent for page view
      const clientIp = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers["user-agent"] || '';
      
      // Get geolocation data
      const geoData = await getGeoLocation(clientIp);
      
      // Parse user agent
      const deviceInfo = parseUserAgent(userAgent);
      
      // Create enriched page view record
      const pageViewData = {
        clickId: clickid as string,
        referrer: referrer as string || undefined,
        userAgent,
        ipAddress: clientIp,
        
        // Geographic data
        country: geoData?.country,
        countryCode: geoData?.countryCode,
        region: geoData?.region,
        city: geoData?.city,
        postalCode: geoData?.postalCode,
        timezone: geoData?.timezone,
        latitude: geoData?.latitude ? geoData.latitude.toString() : undefined,
        longitude: geoData?.longitude ? geoData.longitude.toString() : undefined,
        isp: geoData?.isp,
        
        // Device data
        deviceType: deviceInfo.deviceType,
        operatingSystem: deviceInfo.operatingSystem,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        connectionType: geoData?.mobile ? 'mobile' : 'broadband',
        isProxy: geoData?.proxy || false,
        isCrawler: deviceInfo.isCrawler
      };

      await storage.createPageView(click.tenantId, pageViewData); // Using tenantId from click
      console.log('Page view created successfully for click ID:', req.query.clickid);

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error in /view endpoint:", error);
      console.error("Click ID:", req.query.clickid);
      console.error("Request params:", req.query);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Performance Analytics APIs
  app.get("/api/performance/summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const summary = await storage.getPerformanceSummary(1, start, end); // tenantId = 1 (AutomatikBlog)
      res.json(summary);
    } catch (error) {
      console.error('Error fetching performance summary:', error);
      res.status(500).json({ error: 'Failed to fetch performance summary' });
    }
  });

  app.get("/api/performance/best-campaigns", async (req, res) => {
    try {
      const { period = 'today', limit = 3 } = req.query;
      const campaigns = await storage.getBestPerformingCampaigns(
        1, // tenantId = 1 (AutomatikBlog)
        period as 'today' | 'yesterday', 
        parseInt(limit as string)
      );
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching best campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch best campaigns' });
    }
  });

  app.get("/api/performance/best-ads", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const ads = await storage.getBestPerformingAds(1, parseInt(limit as string)); // tenantId = 1 (AutomatikBlog)
      res.json(ads);
    } catch (error) {
      console.error('Error fetching best ads:', error);
      res.status(500).json({ error: 'Failed to fetch best ads' });
    }
  });

  app.get("/api/performance/best-channels", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const channels = await storage.getBestTrafficChannels(1, parseInt(limit as string)); // tenantId = 1 (AutomatikBlog)
      res.json(channels);
    } catch (error) {
      console.error('Error fetching best channels:', error);
      res.status(500).json({ error: 'Failed to fetch best channels' });
    }
  });

  app.get("/api/performance/metrics-chart", async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const metrics = await storage.getMetricsChart(1, parseInt(days as string)); // tenantId = 1 (AutomatikBlog)
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics chart:', error);
      res.status(500).json({ error: 'Failed to fetch metrics chart' });
    }
  });

  // Geographic Analytics endpoints
  app.get("/api/analytics/geography", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const [countryStats, regionStats, deviceStats, timezoneStats] = await Promise.all([
        storage.getClicksGroupedByCountry(1, start, end), // tenantId = 1 (AutomatikBlog)
        storage.getClicksGroupedByRegion(1, start, end),
        storage.getClicksGroupedByDevice(1, start, end),
        storage.getClicksGroupedByTimezone(1, start, end)
      ]);
      
      res.json({
        countries: countryStats,
        regions: regionStats,
        devices: deviceStats,
        timezones: timezoneStats
      });
    } catch (error) {
      console.error("Error fetching geographic analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/top-countries", async (req, res) => {
    try {
      const { startDate, endDate, limit = 10 } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const topCountries = await storage.getTopCountries(parseInt(limit as string), start, end);
      
      res.json(topCountries);
    } catch (error) {
      console.error("Error fetching top countries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/device-performance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const deviceStats = await storage.getClicksGroupedByDevice(1, start, end);
      
      res.json(deviceStats);
    } catch (error) {
      console.error("Error fetching device performance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoints for dashboard
  app.get("/api/campaigns", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const campaigns = await storage.getAllCampaigns();
      
      // If date range is provided, add filtered ad spend data to each campaign
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        const campaignsWithSpend = await Promise.all(
          campaigns.map(async (campaign) => {
            const adSpendData = await storage.getAdSpend(1, campaign.campaignId, start, end);
            const totalSpend = adSpendData.reduce((sum, spend) => sum + parseFloat(spend.spend), 0);
            
            return {
              ...campaign,
              totalSpend: totalSpend.toFixed(2),
              adSpendData
            };
          })
        );
        
        res.json(campaignsWithSpend);
      } else {
        res.json(campaigns);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/clicks", async (req, res) => {
    try {
      const clicks = await storage.getAllClicks();
      res.json(clicks);
    } catch (error) {
      console.error("Error fetching clicks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/page-views", async (req, res) => {
    try {
      const pageViews = await storage.getAllPageViews();
      res.json(pageViews);
    } catch (error) {
      console.error("Error fetching page views:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const clicks = await storage.getAllClicks();
      const pageViews = await storage.getAllPageViews();
      const campaigns = await storage.getAllCampaigns();
      const conversions = await Promise.all(
        campaigns.map(c => storage.getConversionsByCampaignId(1, c.campaignId)) // tenantId = 1 for AutomatikBlog
      );
      const totalConversions = conversions.flat().length;

      // Calculate total spend for the date range
      let totalSpend = 0;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        const allSpendData = await Promise.all(
          campaigns.map(c => storage.getAdSpend(1, c.campaignId, start, end)) // tenantId = 1 for AutomatikBlog
        );
        totalSpend = allSpendData.flat().reduce((sum, spend) => sum + parseFloat(spend.spend), 0);
      } else {
        // Use campaign totalSpend if no date range specified
        totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.totalSpend || "0"), 0);
      }

      const stats = {
        totalClicks: clicks.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        pageViews: pageViews.length,
        totalConversions,
        totalSpend: totalSpend.toFixed(2),
        conversionRate: clicks.length > 0 ? ((totalConversions / clicks.length) * 100).toFixed(1) : "0.0"
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Conversion tracking endpoints
  app.get("/api/conversions", async (req, res) => {
    try {
      // Get ALL conversions directly from database using raw SQL to include direct conversions
      const allConversions = await db.select().from(conversions);
      
      // Sort by creation date manually
      allConversions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(allConversions);
    } catch (error) {
      console.error("Error fetching all conversions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/conversions", async (req, res) => {
    try {
      const { clickId, conversionType, value, currency } = req.body;

      if (!clickId || !conversionType) {
        return res.status(400).json({ error: "clickId and conversionType are required" });
      }

      // Verify click exists
      const click = await storage.getClickByClickId(1, clickId);
      if (!click) {
        return res.status(404).json({ error: "Click not found" });
      }

      // Create conversion
      const conversion = await storage.createConversion(1, {
        clickId,
        conversionType,
        value: value ? String(value) : null,
        currency: currency || "USD"
      });

      // Update click with conversion data
      await storage.updateClick(1, clickId, {
        conversionValue: value ? String(value) : null,
        convertedAt: new Date()
      });

      // Update campaign totals
      const campaign = await storage.getCampaignByCampaignId(1, click.campaignId);
      if (campaign) {
        await storage.updateCampaign(1, click.campaignId, {
          totalRevenue: String(parseFloat(campaign.totalRevenue || "0") + (value || 0)),
          conversionCount: (campaign.conversionCount || 0) + 1
        });
      }

      res.json(conversion);
    } catch (error) {
      console.error("Error creating conversion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/conversions/click/:clickId", async (req, res) => {
    try {
      const conversions = await storage.getConversionsByClickId(req.params.clickId);
      res.json(conversions);
    } catch (error) {
      console.error("Error fetching conversions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/campaigns/:campaignId/conversions", async (req, res) => {
    try {
      const conversions = await storage.getConversionsByCampaignId(req.params.campaignId);
      res.json(conversions);
    } catch (error) {
      console.error("Error fetching campaign conversions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  // Webhook endpoint for external conversions (Hotmart, custom checkout)
  app.post("/conversion", async (req, res) => {
    const startTime = Date.now();
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[WEBHOOK-${webhookId}] Received conversion webhook:`, {
      body: req.body,
      headers: req.headers,
      ip: req.ip
    });
    
    try {
      // 1. Extract SRC/SCK from request
      const sessionId = extractSessionId(req.body);
      console.log(`[WEBHOOK-${webhookId}] Extracted session ID: ${sessionId}`);
      
      // 2. Validate and find click record (might be null for direct conversions)
      const click = await findClickBySessionId(sessionId);
      
      if (click) {
        console.log(`[WEBHOOK-${webhookId}] Found click record: ${click.clickId} for campaign: ${click.campaignId}`);
        
        // 3. Check for duplicate conversion
        const existingConversions = await storage.getConversionsByClickId(1, click.clickId); // tenantId = 1 for AutomatikBlog
        if (existingConversions.length > 0) {
          console.log(`[WEBHOOK-${webhookId}] Duplicate conversion detected, returning existing conversion`);
          return res.json({ 
            success: true, 
            conversionId: existingConversions[0].id,
            clickId: click.clickId,
            message: 'Conversion already exists',
            duplicate: true
          });
        }
      } else {
        console.log(`[WEBHOOK-${webhookId}] No click record found - processing as direct conversion`);
      }
      
      // 4. Normalize conversion data
      const conversionData = normalizeConversionData(req.body, click);
      console.log(`[WEBHOOK-${webhookId}] Normalized conversion data:`, conversionData);
      
      // 5. Save conversion
      const conversion = await storage.createConversion(1, conversionData); // tenantId = 1 for AutomatikBlog
      console.log(`[WEBHOOK-${webhookId}] Created conversion: ${conversion.id}`);
      
      // 6. Update campaign metrics (if we have a click/campaign)
      if (click) {
        await updateCampaignMetrics(click.campaignId, conversionData);
        console.log(`[WEBHOOK-${webhookId}] Updated campaign metrics for: ${click.campaignId}`);
      }
      
      // 7. Return success response
      const processingTime = Date.now() - startTime;
      console.log(`[WEBHOOK-${webhookId}] Successfully processed in ${processingTime}ms`);
      
      res.json({ 
        success: true, 
        conversionId: conversion.id,
        clickId: click ? click.clickId : null,
        campaignId: click ? click.campaignId : null,
        processingTime: `${processingTime}ms`,
        webhookId
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResponse = {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        webhookId
      };
      
      console.error(`[WEBHOOK-${webhookId}] Failed after ${processingTime}ms:`, error);
      res.status(400).json(errorResponse);
    }
  });

  // Facebook API Test Endpoint
  app.get("/api/facebook/test", async (req, res) => {
    console.log("Facebook test endpoint called");
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Simple environment check first
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
      const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!accessToken || !adAccountId || !appId || !appSecret) {
        return res.status(400).json({ 
          error: "Facebook credentials not configured", 
          message: "Missing required environment variables",
          hasAccessToken: !!accessToken,
          hasAdAccountId: !!adAccountId,
          hasAppId: !!appId,
          hasAppSecret: !!appSecret
        });
      }

      // Test a simple Facebook API call first
      try {
        const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const testUrl = `https://graph.facebook.com/v18.0/${formattedAdAccountId}?fields=id,name,currency&access_token=${accessToken}`;
        
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (response.ok) {
          res.json({
            message: "Facebook API connected successfully",
            adAccountId: formattedAdAccountId,
            appId: appId,
            connected: true,
            accountData: data,
            status: "Facebook integration working"
          });
        } else {
          res.status(400).json({
            error: "Facebook API authentication failed",
            details: data,
            formattedAdAccountId,
            message: "Check access token permissions and ad account ID"
          });
        }
      } catch (apiError) {
        res.status(500).json({
          error: "Facebook API request failed",
          details: (apiError as Error).message,
          message: "Unable to connect to Facebook Graph API"
        });
      }
    } catch (error) {
      console.error("Facebook API test error:", error);
      res.status(500).json({ 
        error: "Facebook API test failed", 
        details: (error as Error).message 
      });
    }
  });

  // Facebook Campaigns endpoint
  app.get("/api/facebook/campaigns", async (req, res) => {
    try {
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
      const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
      
      if (!accessToken || !adAccountId) {
        return res.status(400).json({ error: "Facebook credentials not configured" });
      }

      const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const campaignsUrl = `https://graph.facebook.com/v18.0/${formattedAdAccountId}/campaigns?fields=id,name,status,objective,spend&access_token=${accessToken}`;
      
      const response = await fetch(campaignsUrl);
      const data = await response.json();
      
      if (response.ok) {
        res.json({
          campaigns: data.data || [],
          total: data.data?.length || 0
        });
      } else {
        res.status(400).json({ error: "Failed to fetch campaigns", details: data });
      }
    } catch (error) {
      console.error("Facebook campaigns error:", error);
      res.status(500).json({ error: "Failed to fetch Facebook campaigns" });
    }
  });

  // Facebook Campaign Sync endpoint
  app.post("/api/facebook/sync-campaign/:campaignId", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({ error: "Facebook access token not configured" });
      }

      // Get campaign insights for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const insightsUrl = `https://graph.facebook.com/v18.0/${campaignId}/insights?fields=spend,impressions,reach,clicks&time_range={'since':'${startDate.toISOString().split('T')[0]}','until':'${endDate.toISOString().split('T')[0]}'}&access_token=${accessToken}`;
      
      const response = await fetch(insightsUrl);
      const data = await response.json();
      
      if (response.ok && data.data && data.data.length > 0) {
        const insight = data.data[0];
        const spend = parseFloat(insight.spend || '0');
        
        // Find our internal campaign and update total cost
        const campaigns = await storage.getAllCampaigns();
        const internalCampaign = campaigns.find(c => c.facebookCampaignId === campaignId);
        
        if (internalCampaign) {
          await storage.updateCampaign(internalCampaign.campaignId, {
            totalCost: spend.toString(),
            updatedAt: new Date()
          });
          
          // Also create/update ad spend record
          await storage.upsertAdSpend({
            campaignId: internalCampaign.campaignId,
            date: endDate.toISOString().split('T')[0],
            spend: spend.toString(),
            impressions: parseInt(insight.impressions || '0'),
            reach: parseInt(insight.reach || '0'),
            frequency: '0'
          });
        }
        
        res.json({
          success: true,
          campaignId,
          spend,
          impressions: insight.impressions,
          reach: insight.reach,
          clicks: insight.clicks,
          dataPoints: 1
        });
      } else {
        res.status(400).json({ error: "No insights found", details: data });
      }
    } catch (error) {
      console.error("Facebook sync error:", error);
      res.status(500).json({ error: "Failed to sync Facebook campaign" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
