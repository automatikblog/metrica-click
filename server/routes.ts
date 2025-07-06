import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClickSchema, insertPageViewSchema, insertConversionSchema } from "@shared/schema";
import express from "express";
import path from "path";
import { FacebookAdsClient, createFacebookClient, getDateRange } from "./facebook-ads";
import { syncSingleCampaign, syncAllCampaigns, getSyncStatus } from "./sync/facebook-sync";
import { configureFacebookAuth, initiateFacebookAuth, handleFacebookCallback, handleFacebookSuccess, handleFacebookError, hasValidFacebookCredentials, getFacebookAdAccounts } from "./auth/facebook-oauth";
import passport from "passport";
import session from "express-session";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const settings = await storage.getCampaignSettings(campaignId);
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

      // Check if campaign exists
      const campaign = await storage.getCampaignByCampaignId(campaignID);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Generate unique click ID
      const timestamp = Date.now();
      const clickId = `mc_${campaignID}_${timestamp}`;

      // Create click record
      const clickData = {
        clickId,
        campaignId: campaignID,
        source: req.query.tsource as string || undefined,
        referrer: referrer as string || undefined,
        fbp: _fbp as string || undefined,
        fbc: _fbc as string || undefined,
        userAgent: req.headers["user-agent"] || undefined,
        ipAddress: req.ip || req.connection.remoteAddress || undefined,
      };

      await storage.createClick(clickData);
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
      const click = await storage.getClickByClickId(clickid as string);
      if (!click) {
        return res.status(404).json({ error: "Click not found" });
      }

      // Create page view record
      const pageViewData = {
        clickId: clickid as string,
        referrer: referrer as string || undefined,
        userAgent: req.headers["user-agent"] || undefined,
        ipAddress: req.ip || req.connection.remoteAddress || undefined,
      };

      await storage.createPageView(pageViewData);
      console.log('Page view created successfully for click ID:', req.query.clickid);

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error in /view endpoint:", error);
      console.error("Click ID:", req.query.clickid);
      console.error("Request params:", req.query);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API endpoints for dashboard
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
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
      const clicks = await storage.getAllClicks();
      const pageViews = await storage.getAllPageViews();
      const campaigns = await storage.getAllCampaigns();
      const conversions = await Promise.all(
        campaigns.map(c => storage.getConversionsByCampaignId(c.campaignId))
      );
      const totalConversions = conversions.flat().length;

      const stats = {
        totalClicks: clicks.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        pageViews: pageViews.length,
        totalConversions,
        conversionRate: clicks.length > 0 ? ((totalConversions / clicks.length) * 100).toFixed(1) : "0.0"
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Conversion tracking endpoints
  app.post("/api/conversions", async (req, res) => {
    try {
      const { clickId, conversionType, value, currency } = req.body;

      if (!clickId || !conversionType) {
        return res.status(400).json({ error: "clickId and conversionType are required" });
      }

      // Verify click exists
      const click = await storage.getClickByClickId(clickId);
      if (!click) {
        return res.status(404).json({ error: "Click not found" });
      }

      // Create conversion
      const conversion = await storage.createConversion({
        clickId,
        conversionType,
        value: value ? String(value) : null,
        currency: currency || "USD"
      });

      // Update click with conversion data
      await storage.updateClick(clickId, {
        conversionValue: value ? String(value) : null,
        convertedAt: new Date()
      });

      // Update campaign totals
      const campaign = await storage.getCampaignByCampaignId(click.campaignId);
      if (campaign) {
        await storage.updateCampaign(click.campaignId, {
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
          await storage.createAdSpend({
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
