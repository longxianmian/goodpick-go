import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, generateCouponCode } from "./storage";
import { adminAuthMiddleware } from "./middleware/adminAuth";
import { userAuthMiddleware } from "./middleware/userAuth";
import { verifyLineIdToken } from "./services/lineService";
import { translateText } from "./services/translationService";
import { googleMapsService } from "./services/googleMapsService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { insertStoreSchema, insertCampaignSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_strong_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function registerRoutes(app: Express): Server {
  // ==================== Admin Auth Routes ====================

  app.post("/api/auth/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ ok: false, message: "Email and password are required" });
      }

      const admin = await storage.getAdminByEmail(email);
      
      if (!admin) {
        return res.status(401).json({ ok: false, message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ ok: false, message: "Invalid credentials" });
      }

      if (!admin.isActive) {
        return res.status(403).json({ ok: false, message: "Account is inactive" });
      }

      const token = jwt.sign(
        { adminId: admin.id, email: admin.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        ok: true,
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.post("/api/auth/admin/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ ok: false, message: "Email, password, and name are required" });
      }

      const existingAdmin = await storage.getAdminByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ ok: false, message: "Admin with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const admin = await storage.createAdmin({
        email,
        password: hashedPassword,
        name,
        isActive: true,
      });

      const token = jwt.sign(
        { adminId: admin.id, email: admin.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        ok: true,
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      });
    } catch (error) {
      console.error('Admin registration error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== User Auth Routes (LINE Login) ====================

  app.post("/api/auth/line/login", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ ok: false, message: "ID token is required" });
      }

      const lineData = await verifyLineIdToken(idToken);
      
      if (!lineData) {
        return res.status(401).json({ ok: false, message: "Invalid LINE ID token" });
      }

      let user = await storage.getUserByLineId(lineData.sub);

      if (!user) {
        user = await storage.createUser({
          lineUserId: lineData.sub,
          displayName: lineData.name || 'LINE User',
          avatarUrl: lineData.picture,
          language: 'zh-cn',
        });
      } else {
        user = await storage.updateUser(user.id, {
          displayName: lineData.name || user.displayName,
          avatarUrl: lineData.picture || user.avatarUrl,
        }) || user;
      }

      const token = jwt.sign(
        { userId: user.id, lineUserId: user.lineUserId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          language: user.language,
        },
      });
    } catch (error) {
      console.error('LINE login error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== Admin Store Routes ====================

  app.get("/api/admin/stores", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const stores = await storage.getStores();
      res.json({ ok: true, stores });
    } catch (error) {
      console.error('Get stores error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.get("/api/admin/stores/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const store = await storage.getStore(id);
      
      if (!store) {
        return res.status(404).json({ ok: false, message: "Store not found" });
      }

      res.json({ ok: true, store });
    } catch (error) {
      console.error('Get store error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/stores", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      console.log('Store creation request body:', JSON.stringify(req.body, null, 2));
      const validatedData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(validatedData);
      res.json({ ok: true, store });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Store validation error:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
      }
      console.error('Create store error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.put("/api/admin/stores/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertStoreSchema.partial().parse(req.body);
      const store = await storage.updateStore(id, validatedData);
      
      if (!store) {
        return res.status(404).json({ ok: false, message: "Store not found" });
      }

      res.json({ ok: true, store });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
      }
      console.error('Update store error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/stores/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStore(id);
      
      if (!success) {
        return res.status(404).json({ ok: false, message: "Store not found" });
      }

      res.json({ ok: true, message: "Store deleted successfully" });
    } catch (error) {
      console.error('Delete store error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== Admin Campaign Routes ====================

  app.get("/api/admin/campaigns", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json({ ok: true, campaigns });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.get("/api/admin/campaigns/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ ok: false, message: "Campaign not found" });
      }

      res.json({ ok: true, campaign });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.json({ ok: true, campaign });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
      }
      console.error('Create campaign error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.put("/api/admin/campaigns/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(id, validatedData);
      
      if (!campaign) {
        return res.status(404).json({ ok: false, message: "Campaign not found" });
      }

      res.json({ ok: true, campaign });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
      }
      console.error('Update campaign error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.delete("/api/admin/campaigns/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaign(id);
      
      if (!success) {
        return res.status(404).json({ ok: false, message: "Campaign not found" });
      }

      res.json({ ok: true, message: "Campaign deleted successfully" });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== Campaign-Store Relationship Routes ====================

  app.get("/api/admin/campaigns/:id/stores", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stores = await storage.getCampaignStores(id);
      res.json({ ok: true, stores });
    } catch (error) {
      console.error('Get campaign stores error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.post("/api/admin/campaigns/:id/stores", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { storeIds } = req.body;

      if (!Array.isArray(storeIds)) {
        return res.status(400).json({ ok: false, message: "storeIds must be an array" });
      }

      await storage.updateCampaignStores(id, storeIds);
      res.json({ ok: true, message: "Campaign stores updated successfully" });
    } catch (error) {
      console.error('Update campaign stores error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== Google Maps Places API Routes ====================

  app.get("/api/admin/places/autocomplete", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { input } = req.query;
      
      if (!input || typeof input !== 'string' || input.trim().length < 2) {
        return res.json({ ok: true, suggestions: [] });
      }

      const suggestions = await googleMapsService.getPlaceAutocomplete(input, {
        types: 'establishment',
        components: 'country:th',
        language: 'th',
      });

      res.json({ ok: true, suggestions });
    } catch (error) {
      console.error('Places autocomplete error:', error);
      res.status(500).json({ ok: false, message: 'Failed to fetch place suggestions' });
    }
  });

  app.get("/api/admin/places/details", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { placeId } = req.query;
      
      if (!placeId || typeof placeId !== 'string') {
        return res.status(400).json({ ok: false, message: 'placeId is required' });
      }

      const placeDetails = await googleMapsService.getPlaceDetails(placeId, {
        fields: 'name,formatted_address,geometry,rating,opening_hours,formatted_phone_number,website,address_components',
        language: 'th',
      });

      if (!placeDetails) {
        return res.status(404).json({ ok: false, message: 'Place not found' });
      }

      let city = '';
      
      if (placeDetails.addressComponents) {
        city = googleMapsService.extractCityFromComponents(placeDetails.addressComponents);
      }
      
      if (!city && placeDetails.address) {
        const addressParts = placeDetails.address.split(',').map(part => part.trim());
        if (addressParts.length >= 2) {
          city = addressParts[addressParts.length - 2];
          city = city.replace(/\d{5}.*$/, '').trim();
        }
      }
      
      if (!city && placeDetails.lat && placeDetails.lng) {
        try {
          const geocodeResult = await googleMapsService.reverseGeocode(placeDetails.lat, placeDetails.lng);
          if (geocodeResult) {
            city = googleMapsService.extractCityFromComponents(geocodeResult.addressComponents);
          }
        } catch (error) {
          console.log('Reverse geocoding failed, but already tried other methods for city');
        }
      }

      const enrichedDetails = {
        name: placeDetails.name,
        address: placeDetails.address,
        city,
        lat: placeDetails.lat,
        lng: placeDetails.lng,
        rating: placeDetails.rating,
        phone: placeDetails.phone,
        website: placeDetails.website,
        openingHours: placeDetails.openingHours,
        placeId,
      };

      res.json({ ok: true, details: enrichedDetails });
    } catch (error) {
      console.error('Places details error:', error);
      res.status(500).json({ ok: false, message: 'Failed to fetch place details' });
    }
  });

  // ==================== Public Routes ====================

  app.get("/api/public/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const campaign = await storage.getCampaign(id);
      
      if (!campaign || !campaign.isActive) {
        return res.status(404).json({ ok: false, message: "Campaign not found" });
      }

      const stores = await storage.getCampaignStores(id);

      res.json({
        ok: true,
        campaign: {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          bannerImageUrl: campaign.bannerImageUrl,
          couponValue: campaign.couponValue,
          discountType: campaign.discountType,
          startAt: campaign.startAt,
          endAt: campaign.endAt,
          maxPerUser: campaign.maxPerUser,
          maxTotal: campaign.maxTotal,
          stores,
        },
      });
    } catch (error) {
      console.error('Get public campaign error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== User Coupon Routes ====================

  app.post("/api/user/campaigns/:id/claim", userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const userId = req.user!.userId;
      const { channel } = req.body;

      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign || !campaign.isActive) {
        return res.status(404).json({ ok: false, message: "Campaign not found or inactive" });
      }

      const now = new Date();
      if (now < campaign.startAt || now > campaign.endAt) {
        return res.status(400).json({ ok: false, message: "Campaign is not currently active" });
      }

      const userCoupons = await storage.getUserCouponsByCampaign(userId, campaignId);
      
      if (userCoupons.length >= campaign.maxPerUser) {
        return res.status(400).json({ ok: false, message: "Maximum coupons per user reached" });
      }

      const code = generateCouponCode(campaignId);
      const expiredAt = campaign.endAt;

      const coupon = await storage.createCoupon({
        userId,
        campaignId,
        code,
        status: 'unused',
        issuedAt: now,
        expiredAt,
        channel: channel || 'other',
        storeId: null,
        usedAt: null,
      });

      res.json({ ok: true, coupon });
    } catch (error) {
      console.error('Claim coupon error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.get("/api/user/coupons", userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const coupons = await storage.getUserCoupons(userId);
      res.json({ ok: true, coupons });
    } catch (error) {
      console.error('Get user coupons error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  app.get("/api/user/coupons/:id", userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.userId;
      
      const coupon = await storage.getCoupon(id);
      
      if (!coupon || coupon.userId !== userId) {
        return res.status(404).json({ ok: false, message: "Coupon not found" });
      }

      const campaign = await storage.getCampaign(coupon.campaignId);
      const stores = campaign ? await storage.getCampaignStores(campaign.id) : [];

      res.json({
        ok: true,
        coupon,
        campaign,
        stores,
      });
    } catch (error) {
      console.error('Get user coupon error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // ==================== Admin Coupon Redemption ====================

  app.post("/api/admin/coupons/:id/redeem", adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const coupon = await storage.getCoupon(id);
      
      if (!coupon) {
        return res.status(404).json({ ok: false, message: "Coupon not found" });
      }

      if (coupon.status !== 'unused') {
        return res.status(400).json({ ok: false, message: `Coupon is already ${coupon.status}` });
      }

      const updatedCoupon = await storage.updateCouponStatus(id, 'used', new Date());

      res.json({ ok: true, coupon: updatedCoupon });
    } catch (error) {
      console.error('Redeem coupon error:', error);
      res.status(500).json({ ok: false, message: "Internal server error" });
    }
  });

  // Health check
  app.get("/healthz", (req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
