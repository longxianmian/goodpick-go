import { db } from "./db";
import {
  admins,
  stores,
  campaigns,
  campaignStores,
  users,
  coupons,
  mediaFiles,
  type Admin,
  type InsertAdmin,
  type Store,
  type InsertStore,
  type Campaign,
  type InsertCampaign,
  type CampaignStore,
  type InsertCampaignStore,
  type User,
  type InsertUser,
  type Coupon,
  type InsertCoupon,
  type MediaFile,
  type InsertMediaFile,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // Admin methods
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // Store methods
  getStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined>;
  deleteStore(id: number): Promise<boolean>;
  
  // Campaign methods
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  
  // Campaign-Store relationship methods
  getCampaignStores(campaignId: number): Promise<Store[]>;
  updateCampaignStores(campaignId: number, storeIds: number[]): Promise<void>;
  
  // User methods
  getUserByLineId(lineUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Coupon methods
  getUserCoupons(userId: number): Promise<Coupon[]>;
  getCoupon(id: number): Promise<Coupon | undefined>;
  getUserCouponsByCampaign(userId: number, campaignId: number): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCouponStatus(id: number, status: 'unused' | 'used' | 'expired', usedAt?: Date): Promise<Coupon | undefined>;
  
  // Media methods
  createMediaFile(media: InsertMediaFile): Promise<MediaFile>;
  getMediaFiles(): Promise<MediaFile[]>;
}

export class DbStorage implements IStorage {
  // Admin methods
  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    return result[0];
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const result = await db.insert(admins).values(admin).returning();
    return result[0];
  }

  // Store methods
  async getStores(): Promise<Store[]> {
    return await db.select().from(stores)
      .where(eq(stores.isActive, true))
      .orderBy(desc(stores.createdAt));
  }

  async getStore(id: number): Promise<Store | undefined> {
    const result = await db.select().from(stores)
      .where(and(eq(stores.id, id), eq(stores.isActive, true)))
      .limit(1);
    return result[0];
  }

  async createStore(store: InsertStore): Promise<Store> {
    const result = await db.insert(stores).values({
      ...store,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined> {
    const result = await db.update(stores)
      .set({
        ...store,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id))
      .returning();
    return result[0];
  }

  async deleteStore(id: number): Promise<boolean> {
    const result = await db.update(stores)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    return result.length > 0;
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns)
      .where(eq(campaigns.isActive, true))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.isActive, true)))
      .limit(1);
    return result[0];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const result = await db.insert(campaigns).values({
      ...campaign,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const result = await db.update(campaigns)
      .set({
        ...campaign,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();
    return result[0];
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const result = await db.update(campaigns)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return result.length > 0;
  }

  // Campaign-Store relationship methods
  async getCampaignStores(campaignId: number): Promise<Store[]> {
    const result = await db
      .select({
        id: stores.id,
        name: stores.name,
        brand: stores.brand,
        city: stores.city,
        address: stores.address,
        latitude: stores.latitude,
        longitude: stores.longitude,
        phone: stores.phone,
        isActive: stores.isActive,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
      })
      .from(campaignStores)
      .innerJoin(stores, eq(campaignStores.storeId, stores.id))
      .where(eq(campaignStores.campaignId, campaignId));
    return result;
  }

  async updateCampaignStores(campaignId: number, storeIds: number[]): Promise<void> {
    await db.delete(campaignStores).where(eq(campaignStores.campaignId, campaignId));
    
    if (storeIds.length > 0) {
      await db.insert(campaignStores).values(
        storeIds.map(storeId => ({ campaignId, storeId }))
      );
    }
  }

  // User methods
  async getUserByLineId(lineUserId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...user,
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({
        ...user,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Coupon methods
  async getUserCoupons(userId: number): Promise<Coupon[]> {
    return await db.select().from(coupons)
      .where(eq(coupons.userId, userId))
      .orderBy(desc(coupons.issuedAt));
  }

  async getCoupon(id: number): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return result[0];
  }

  async getUserCouponsByCampaign(userId: number, campaignId: number): Promise<Coupon[]> {
    return await db.select().from(coupons)
      .where(and(
        eq(coupons.userId, userId),
        eq(coupons.campaignId, campaignId)
      ));
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values(coupon).returning();
    return result[0];
  }

  async updateCouponStatus(id: number, status: 'unused' | 'used' | 'expired', usedAt?: Date): Promise<Coupon | undefined> {
    const result = await db.update(coupons)
      .set({
        status,
        ...(usedAt && { usedAt }),
      })
      .where(eq(coupons.id, id))
      .returning();
    return result[0];
  }

  // Media methods
  async createMediaFile(media: InsertMediaFile): Promise<MediaFile> {
    const result = await db.insert(mediaFiles).values(media).returning();
    return result[0];
  }

  async getMediaFiles(): Promise<MediaFile[]> {
    return await db.select().from(mediaFiles).orderBy(desc(mediaFiles.createdAt));
  }
}

export const storage = new DbStorage();

// Helper function to generate coupon codes
export function generateCouponCode(campaignId: number): string {
  const randomString = randomBytes(4).toString('hex').toUpperCase();
  return `CP${campaignId.toString().padStart(4, '0')}-${randomString}`;
}
