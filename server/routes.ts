import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClickSchema, insertPageViewSchema } from "@shared/schema";
import express from "express";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
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

      res.json({ clickid: clickId });
    } catch (error) {
      console.error("Error in /track endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register page view
  app.get("/view", async (req, res) => {
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

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error in /view endpoint:", error);
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

      const stats = {
        totalClicks: clicks.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        pageViews: pageViews.length,
        conversionRate: clicks.length > 0 ? ((pageViews.length / clicks.length) * 100).toFixed(1) : "0.0"
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
