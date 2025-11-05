import express, { type Request, Response } from 'express';
import type { Express } from 'express';
import { createServer, type Server } from 'http';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { db } from './db';
import { admins, stores, campaigns, campaignStores, users, coupons, mediaFiles, staffPresets } from '@shared/schema';
import { eq, and, desc, sql, inArray, isNotNull } from 'drizzle-orm';
import { AliOssService } from './services/aliOssService';
import { verifyLineIdToken, exchangeLineAuthCode, getLineUserPhone } from './services/lineService';
import { translateText } from './services/translationService';
import type { Admin, User } from '@shared/schema';
import { nanoid } from 'nanoid';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    oauthStates?: {
      [key: string]: {
        campaignId: string;
        timestamp: number;
      };
    };
  }
}

const upload = multer({ storage: multer.memoryStorage() });

let ossService: AliOssService | null = null;
function getOssService(): AliOssService {
  if (!ossService) {
    ossService = new AliOssService();
  }
  return ossService;
}

// JWT_SECRET must be set in production for security
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET not set. Using insecure default for development only.');
  }
}

const JWT_SECRET_VALUE = JWT_SECRET || 'change_this_to_strong_secret';

declare global {
  namespace Express {
    interface Request {
      admin?: Admin;
      user?: User;
      staffInfo?: {
        id: number;
        storeId: number;
        name: string;
        staffId: string;
      };
    }
  }
}

// ============ Middleware ============

function adminAuthMiddleware(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE) as { id: number; email: string; type: 'admin' };
    if (decoded.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    req.admin = decoded as any;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function userAuthMiddleware(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE) as { id: number; lineUserId: string; type: 'user' };
    if (decoded.type !== 'user') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    req.user = decoded as any;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// Optional auth - doesn't fail if no token
function optionalUserAuth(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET_VALUE) as { id: number; lineUserId: string; type: 'user' };
      if (decoded.type === 'user') {
        req.user = decoded as any;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }
  next();
}

// Staff auth - verifies user is bound as staff
async function staffAuthMiddleware(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE) as { id: number; lineUserId: string; type: 'user' };
    if (decoded.type !== 'user') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Check if user is bound as staff
    const [staffPreset] = await db
      .select({
        id: staffPresets.id,
        storeId: staffPresets.storeId,
        name: staffPresets.name,
        staffId: staffPresets.staffId,
      })
      .from(staffPresets)
      .where(eq(staffPresets.boundUserId, decoded.id))
      .limit(1);

    if (!staffPreset) {
      return res.status(403).json({ 
        success: false, 
        message: '您还未绑定店员身份，请先扫描店员授权二维码' 
      });
    }

    req.user = decoded as any;
    req.staffInfo = staffPreset as any;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// ============ Helper Functions ============

async function generateUniqueCouponCode(): Promise<string> {
  const maxRetries = 10;
  
  for (let i = 0; i < maxRetries; i++) {
    // Generate 8-digit number (00000000-99999999)
    const code = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Check if code already exists
    const existing = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    
    if (existing.length === 0) {
      return code;
    }
    
    console.log(`[核销码冲突] ${code} 已存在，重新生成...`);
  }
  
  throw new Error('无法生成唯一核销码，请稍后重试');
}

async function translateCampaignContent(
  sourceLang: 'zh-cn' | 'en-us' | 'th-th',
  titleSource: string,
  descriptionSource: string
) {
  const targetLangs = ['zh-cn', 'en-us', 'th-th'].filter(lang => lang !== sourceLang) as Array<'zh-cn' | 'en-us' | 'th-th'>;
  
  const translations: any = {
    titleZh: sourceLang === 'zh-cn' ? titleSource : null,
    titleEn: sourceLang === 'en-us' ? titleSource : null,
    titleTh: sourceLang === 'th-th' ? titleSource : null,
    descriptionZh: sourceLang === 'zh-cn' ? descriptionSource : null,
    descriptionEn: sourceLang === 'en-us' ? descriptionSource : null,
    descriptionTh: sourceLang === 'th-th' ? descriptionSource : null,
  };

  for (const targetLang of targetLangs) {
    try {
      const [translatedTitle, translatedDesc] = await Promise.all([
        translateText(titleSource, sourceLang, targetLang),
        translateText(descriptionSource, sourceLang, targetLang),
      ]);

      if (targetLang === 'zh-cn') {
        translations.titleZh = translatedTitle;
        translations.descriptionZh = translatedDesc;
      } else if (targetLang === 'en-us') {
        translations.titleEn = translatedTitle;
        translations.descriptionEn = translatedDesc;
      } else if (targetLang === 'th-th') {
        translations.titleTh = translatedTitle;
        translations.descriptionTh = translatedDesc;
      }
    } catch (error) {
      console.error(`Translation failed for ${targetLang}:`, error);
    }
  }

  return translations;
}

function getCampaignTranslatedContent(campaign: any, language: string) {
  let title = campaign.titleSource;
  let description = campaign.descriptionSource;

  if (language === 'zh-cn' && campaign.titleZh) {
    title = campaign.titleZh;
    description = campaign.descriptionZh || description;
  } else if (language === 'en-us' && campaign.titleEn) {
    title = campaign.titleEn;
    description = campaign.descriptionEn || description;
  } else if (language === 'th-th' && campaign.titleTh) {
    title = campaign.titleTh;
    description = campaign.descriptionTh || description;
  }

  return { title, description };
}

export function registerRoutes(app: Express): Server {
  // Configure session middleware for OAuth state management
  const MemoryStore = createMemoryStore(session);
  app.use(session({
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      sameSite: 'lax' // CSRF protection
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
  }));

  // ============ Config Endpoint ============
  app.get('/api/config', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        liffId: process.env.LIFF_ID || '',
        lineChannelId: process.env.LINE_CHANNEL_ID || '',
      },
    });
  });

  // ============ A. User Authentication ============

  app.post('/api/auth/line/login', async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ success: false, message: 'idToken is required' });
      }

      const lineProfile = await verifyLineIdToken(idToken);

      if (!lineProfile) {
        return res.status(401).json({ success: false, message: 'Invalid LINE token' });
      }

      let [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.lineUserId, lineProfile.sub))
        .limit(1);

      if (!existingUser) {
        [existingUser] = await db
          .insert(users)
          .values({
            lineUserId: lineProfile.sub,
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            language: 'th-th',
          })
          .returning();
      } else {
        await db
          .update(users)
          .set({
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }

      const token = jwt.sign(
        {
          id: existingUser.id,
          lineUserId: existingUser.lineUserId,
          type: 'user' as const,
        },
        JWT_SECRET_VALUE,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      res.json({
        success: true,
        token,
        user: {
          id: existingUser.id,
          lineUserId: existingUser.lineUserId,
          displayName: existingUser.displayName,
          avatarUrl: existingUser.avatarUrl,
          language: existingUser.language,
        },
      });
    } catch (error) {
      console.error('LINE login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Store OAuth state for CSRF protection
  app.post('/api/auth/line/init-oauth', (req: Request, res: Response) => {
    const { state, campaignId } = req.body;

    if (!state || !campaignId) {
      return res.status(400).json({ success: false, message: 'State and campaignId required' });
    }

    // Validate state format
    if (typeof state !== 'string' || !/^[0-9a-f]{64}$/i.test(state)) {
      return res.status(400).json({ success: false, message: 'Invalid state format' });
    }

    // Check if session is available
    if (!req.session) {
      console.error('Session not available on init-oauth endpoint');
      return res.status(500).json({ success: false, message: 'Session not initialized' });
    }

    // Store state in session for CSRF validation
    if (!req.session.oauthStates) {
      req.session.oauthStates = {};
    }

    req.session.oauthStates[state] = {
      campaignId,
      timestamp: Date.now(),
    };

    res.json({ success: true });
  });

  // LINE OAuth callback endpoint
  app.get('/api/auth/line/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.redirect(`/?error=missing_params`);
      }

      // Validate state format (should be 64 hex characters for cryptographic nonce)
      if (typeof state !== 'string' || !/^[0-9a-f]{64}$/i.test(state)) {
        return res.redirect(`/?error=invalid_state`);
      }

      // CSRF Protection: Validate state against server-side stored value
      const storedStates = req.session.oauthStates || {};
      const storedOAuthData = storedStates[state];

      if (!storedOAuthData) {
        console.error('OAuth state not found in session');
        return res.redirect(`/?error=csrf_invalid_state`);
      }

      // Check timestamp to prevent replay attacks (valid for 5 minutes)
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - storedOAuthData.timestamp > fiveMinutes) {
        delete storedStates[state];
        return res.redirect(`/?error=oauth_expired`);
      }

      // Clear the used state to prevent replay
      delete storedStates[state];

      // Build redirect URI (must match what was used in OAuth request)
      // Force HTTPS for LINE OAuth (req.protocol may return 'http' due to reverse proxy)
      const redirectUri = `https://${req.get('host')}/api/auth/line/callback`;

      // Exchange authorization code for tokens
      const tokens = await exchangeLineAuthCode(code as string, redirectUri);

      if (!tokens || !tokens.id_token) {
        return res.redirect(`/?error=token_exchange_failed`);
      }

      // Verify ID token
      const lineProfile = await verifyLineIdToken(tokens.id_token);

      if (!lineProfile) {
        return res.redirect(`/?error=invalid_token`);
      }

      // Create or update user
      let [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.lineUserId, lineProfile.sub))
        .limit(1);

      if (!existingUser) {
        [existingUser] = await db
          .insert(users)
          .values({
            lineUserId: lineProfile.sub,
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            language: 'th-th',
          })
          .returning();
      } else {
        await db
          .update(users)
          .set({
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: existingUser.id,
          lineUserId: existingUser.lineUserId,
          type: 'user' as const,
        },
        JWT_SECRET_VALUE,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      // Redirect to campaign page with token and campaignId from verified session
      const redirectUrl = `/campaign/${storedOAuthData.campaignId}?token=${encodeURIComponent(token)}&autoClaim=true`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('LINE OAuth callback error:', error);
      res.redirect(`/?error=callback_failed`);
    }
  });

  // LINE OAuth callback for staff binding (simpler, no session needed)
  app.get('/api/auth/line/staff-callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof state !== 'string') {
        return res.redirect(`/staff/bind?error=missing_params`);
      }

      // SECURITY: Validate state parameter (authToken)
      // The state is the QR code's authToken - this provides CSRF protection because:
      // 1. authToken is a random, unguessable nonce (nanoid)
      // 2. It's only known to users who scanned the QR code
      // 3. Phone number verification ensures correct user binding
      const [staffPreset] = await db
        .select()
        .from(staffPresets)
        .where(eq(staffPresets.authToken, state))
        .limit(1);

      if (!staffPreset) {
        console.warn('Staff OAuth callback: Invalid authToken', { state });
        return res.redirect(`/staff/bind?token=${state}&error=invalid_token`);
      }

      // Check if already bound to prevent replay attacks
      if (staffPreset.isBound) {
        console.warn('Staff OAuth callback: Already bound', { 
          staffId: staffPreset.staffId,
          boundUserId: staffPreset.boundUserId 
        });
        return res.redirect(`/staff/bind?token=${state}&error=already_bound`);
      }

      // SECURITY: Check QR code age (optional but recommended)
      // Reject QR codes older than 24 hours to limit exposure window
      const qrCodeAge = Date.now() - staffPreset.createdAt.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (qrCodeAge > maxAge) {
        console.warn('Staff OAuth callback: Expired QR code', {
          staffId: staffPreset.staffId,
          ageHours: Math.round(qrCodeAge / (60 * 60 * 1000))
        });
        return res.redirect(`/staff/bind?token=${state}&error=qr_code_expired`);
      }

      // Build redirect URI
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const redirectUri = `${protocol}://${req.get('host')}/api/auth/line/staff-callback`;

      // Exchange code for tokens
      const tokens = await exchangeLineAuthCode(code as string, redirectUri);

      if (!tokens || !tokens.id_token) {
        return res.redirect(`/staff/bind?token=${state}&error=token_exchange_failed`);
      }

      // Verify ID token
      const lineProfile = await verifyLineIdToken(tokens.id_token);

      if (!lineProfile) {
        return res.redirect(`/staff/bind?token=${state}&error=invalid_line_token`);
      }

      // 🆕 使用access_token获取手机号
      const userPhone = await getLineUserPhone(tokens.access_token);
      
      if (!userPhone) {
        console.error('❌ 无法获取LINE手机号，用户可能未绑定手机号或未授权phone scope');
        return res.redirect(`/staff/bind?token=${state}&error=no_phone_number`);
      }

      // Verify phone number matches
      const normalizedUserPhone = userPhone.replace(/[^0-9]/g, '').slice(-9);
      const normalizedStaffPhone = staffPreset.phone.replace(/[^0-9]/g, '').slice(-9);

      // 🔍 详细调试日志
      console.log('📱 手机号验证详情:', {
        'LINE原始手机号': userPhone,
        'LINE规范化后': normalizedUserPhone,
        '员工预设原始': staffPreset.phone,
        '员工预设规范化': normalizedStaffPhone,
        '是否匹配': normalizedUserPhone === normalizedStaffPhone
      });

      if (normalizedUserPhone !== normalizedStaffPhone) {
        console.error('❌ 手机号不匹配！', {
          userPhone,
          staffPhone: staffPreset.phone,
          normalizedUserPhone,
          normalizedStaffPhone
        });
        return res.redirect(`/staff/bind?token=${state}&error=phone_mismatch`);
      }

      // Get or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.lineUserId, lineProfile.sub))
        .limit(1);

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            lineUserId: lineProfile.sub,
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            language: 'th-th',
          })
          .returning();
      }

      // Update staff preset with binding info
      await db
        .update(staffPresets)
        .set({
          isBound: true,
          boundUserId: user.id,
          boundAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(staffPresets.id, staffPreset.id));

      // Redirect to success page
      res.redirect(`/staff/bind?token=${state}&success=true`);
    } catch (error) {
      console.error('Staff LINE OAuth callback error:', error);
      res.redirect(`/staff/bind?error=callback_failed`);
    }
  });

  // ============ B. User Endpoints ============

  app.get('/api/campaigns/:id', optionalUserAuth, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const language = req.headers['accept-language'] || 'th-th';

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.isActive, true)))
        .limit(1);

      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      const campaignStoreList = await db
        .select({ storeId: campaignStores.storeId })
        .from(campaignStores)
        .where(eq(campaignStores.campaignId, campaignId));

      const storeIds = campaignStoreList.map(cs => cs.storeId);
      const storeList = storeIds.length > 0
        ? await db.select().from(stores).where(inArray(stores.id, storeIds))
        : [];

      const { title, description } = getCampaignTranslatedContent(campaign, language as string);

      let userClaimedCount = 0;
      if (req.user) {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(coupons)
          .where(and(eq(coupons.userId, req.user.id), eq(coupons.campaignId, campaignId)));
        userClaimedCount = Number(result[0]?.count || 0);
      }

      res.json({
        success: true,
        data: {
          id: campaign.id,
          title,
          description,
          bannerImageUrl: campaign.bannerImageUrl,
          mediaUrls: campaign.mediaUrls || [],
          couponValue: campaign.couponValue,
          discountType: campaign.discountType,
          originalPrice: campaign.originalPrice,
          startAt: campaign.startAt,
          endAt: campaign.endAt,
          maxPerUser: campaign.maxPerUser,
          maxTotal: campaign.maxTotal,
          currentClaimed: campaign.currentClaimed,
          channel: campaign.channel,
          stores: storeList.map(s => ({
            id: s.id,
            name: s.name,
            city: s.city,
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            phone: s.phone,
            imageUrl: s.imageUrl,
          })),
          userClaimedCount,
        },
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ success: false, message: 'Failed to get campaign' });
    }
  });

  app.post('/api/campaigns/:id/claim', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { channel = 'other' } = req.body;
      const userId = req.user!.id;

      console.log(`[领券请求] 用户ID: ${userId}, 活动ID: ${campaignId}, 渠道: ${channel}`);

      // 查询活动信息
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.isActive, true)))
        .limit(1);

      if (!campaign) {
        console.log(`[领券失败] 活动不存在或已停用 - 活动ID: ${campaignId}`);
        return res.status(404).json({ success: false, message: '活动不存在或已停用' });
      }

      const now = new Date();
      console.log(`[活动时间检查] 当前时间: ${now.toISOString()}, 开始时间: ${campaign.startAt.toISOString()}, 结束时间: ${campaign.endAt.toISOString()}`);

      // 检查活动是否已开始
      if (now < campaign.startAt) {
        console.log(`[领券失败] 活动未开始 - 活动ID: ${campaignId}`);
        return res.status(400).json({ success: false, message: '活动未开始' });
      }

      // 检查活动是否已结束
      if (now > campaign.endAt) {
        console.log(`[领券失败] 活动已结束 - 活动ID: ${campaignId}`);
        return res.status(400).json({ success: false, message: '活动已结束' });
      }

      // 检查总库存
      console.log(`[库存检查] 当前已领: ${campaign.currentClaimed}, 总库存: ${campaign.maxTotal || '无限制'}`);
      if (campaign.maxTotal && campaign.currentClaimed >= campaign.maxTotal) {
        console.log(`[领券失败] 优惠券已发完 - 活动ID: ${campaignId}`);
        return res.status(409).json({ success: false, message: '优惠券已发完' });
      }

      // 检查用户已领取数量
      const userCoupons = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.userId, userId), eq(coupons.campaignId, campaignId)));

      console.log(`[用户限制检查] 已领: ${userCoupons.length}, 限领: ${campaign.maxPerUser}`);
      if (userCoupons.length >= campaign.maxPerUser) {
        console.log(`[领券失败] 已达到个人限领数量 - 用户ID: ${userId}, 活动ID: ${campaignId}`);
        return res.status(409).json({ success: false, message: `您已达到该活动的领取上限（${campaign.maxPerUser}张）` });
      }

      // 生成优惠券
      const code = await generateUniqueCouponCode();
      console.log(`[生成优惠券] 8位数核销码: ${code}`);
      
      const [newCoupon] = await db
        .insert(coupons)
        .values({
          userId,
          campaignId,
          code,
          status: 'unused',
          expiredAt: campaign.endAt,
          channel: channel as any,
        })
        .returning();

      // 更新活动已领取数量
      await db
        .update(campaigns)
        .set({ currentClaimed: sql`${campaigns.currentClaimed} + 1` })
        .where(eq(campaigns.id, campaignId));

      console.log(`[领券成功] 用户ID: ${userId}, 活动ID: ${campaignId}, 优惠券ID: ${newCoupon.id}, 新的已领数: ${campaign.currentClaimed + 1}`);

      res.json({
        success: true,
        message: '领取成功',
        coupon: {
          id: newCoupon.id,
          code: newCoupon.code,
          campaignId: newCoupon.campaignId,
          status: newCoupon.status,
          issuedAt: newCoupon.issuedAt,
          expiredAt: newCoupon.expiredAt,
        },
      });
    } catch (error) {
      console.error('[领券系统错误]', error);
      console.error('错误详情:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      res.status(500).json({ success: false, message: '系统错误，请稍后重试' });
    }
  });

  app.get('/api/me/coupons', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const statusFilter = req.query.status as string | undefined;
      const language = req.headers['accept-language'] || 'th-th';

      let conditions = [eq(coupons.userId, userId)];
      if (statusFilter) {
        conditions.push(eq(coupons.status, statusFilter as any));
      }

      const results = await db
        .select({
          coupon: coupons,
          campaign: campaigns,
        })
        .from(coupons)
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .where(and(...conditions))
        .orderBy(desc(coupons.issuedAt));

      const data = results.map(({ coupon, campaign }) => {
        const { title, description } = getCampaignTranslatedContent(campaign, language as string);
        return {
          id: coupon.id,
          code: coupon.code,
          status: coupon.status,
          campaign: {
            id: campaign.id,
            title,
            description,
            bannerImageUrl: campaign.bannerImageUrl,
            couponValue: campaign.couponValue,
            discountType: campaign.discountType,
            originalPrice: campaign.originalPrice,
          },
          issuedAt: coupon.issuedAt,
          expiredAt: coupon.expiredAt,
          usedAt: coupon.usedAt,
          redeemedStoreId: coupon.redeemedStoreId,
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error('Get user coupons error:', error);
      res.status(500).json({ success: false, message: 'Failed to get coupons' });
    }
  });

  // ============ C. Staff Binding (QR Code Authorization) ============

  // Verify staff binding token and show preset info
  app.get('/api/staff/bind/verify', async (req: Request, res: Response) => {
    try {
      const authToken = req.query.token as string;

      if (!authToken) {
        return res.status(400).json({ 
          success: false, 
          message: 'Authorization token is required' 
        });
      }

      const [preset] = await db
        .select({
          id: staffPresets.id,
          storeId: staffPresets.storeId,
          storeName: stores.name,
          storeAddress: stores.address,
          staffName: staffPresets.name,
          staffId: staffPresets.staffId,
          phone: staffPresets.phone,
          isBound: staffPresets.isBound,
        })
        .from(staffPresets)
        .innerJoin(stores, eq(staffPresets.storeId, stores.id))
        .where(eq(staffPresets.authToken, authToken))
        .limit(1);

      if (!preset) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invalid authorization token' 
        });
      }

      if (preset.isBound) {
        return res.status(400).json({ 
          success: false, 
          message: 'This authorization has already been used' 
        });
      }

      res.json({ 
        success: true, 
        data: {
          storeName: preset.storeName,
          storeAddress: preset.storeAddress,
          staffName: preset.staffName,
          staffId: preset.staffId,
          phone: preset.phone,
        }
      });
    } catch (error) {
      console.error('Verify binding token error:', error);
      res.status(500).json({ success: false, message: 'Failed to verify token' });
    }
  });

  // Execute staff binding with LINE account
  app.post('/api/staff/bind', async (req: Request, res: Response) => {
    try {
      const { authToken, lineIdToken } = req.body;

      if (!authToken || !lineIdToken) {
        return res.status(400).json({ 
          success: false, 
          message: 'Authorization token and LINE ID token are required' 
        });
      }

      // Verify LINE ID token
      const lineProfile = await verifyLineIdToken(lineIdToken);
      if (!lineProfile) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid LINE ID token' 
        });
      }

      // Get staff preset
      const [preset] = await db
        .select()
        .from(staffPresets)
        .where(eq(staffPresets.authToken, authToken))
        .limit(1);

      if (!preset) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invalid authorization token' 
        });
      }

      if (preset.isBound) {
        return res.status(400).json({ 
          success: false, 
          message: 'This authorization has already been used' 
        });
      }

      // Get or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.lineUserId, lineProfile.sub))
        .limit(1);

      if (!user) {
        // Create new user
        [user] = await db
          .insert(users)
          .values({
            lineUserId: lineProfile.sub,
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            phone: lineProfile.phone,
            language: 'th-th',
          })
          .returning();
      } else {
        // Update user phone if available from LINE
        if (lineProfile.phone && !user.phone) {
          [user] = await db
            .update(users)
            .set({ phone: lineProfile.phone, updatedAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();
        }
      }

      // Verify phone number match
      const userPhone = user.phone?.replace(/\D/g, ''); // Remove non-digits
      const presetPhone = preset.phone.replace(/\D/g, '');

      if (!userPhone || userPhone !== presetPhone) {
        return res.status(403).json({ 
          success: false, 
          message: 'Phone number verification failed. Your LINE account phone number must match the registered staff phone number.',
          details: {
            required: preset.phone,
            provided: user.phone || 'Not available',
          }
        });
      }

      // Bind user to preset
      const [updatedPreset] = await db
        .update(staffPresets)
        .set({
          isBound: true,
          boundUserId: user.id,
          boundAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(staffPresets.id, preset.id))
        .returning();

      res.json({ 
        success: true, 
        message: 'Staff authorization successful! You can now redeem coupons at this store.',
        data: {
          staffName: preset.name,
          staffId: preset.staffId,
          storeId: preset.storeId,
        }
      });
    } catch (error) {
      console.error('Staff binding error:', error);
      res.status(500).json({ success: false, message: 'Binding failed. Please try again.' });
    }
  });

  // ============ D. Staff Redemption ============

  // Query coupon by code or ID
  app.post('/api/staff/redeem/query', staffAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { code, couponId } = req.body;
      const staffInfo = req.staffInfo!;

      if (!code && !couponId) {
        return res.status(400).json({ 
          success: false, 
          message: '请提供核销码或优惠券ID' 
        });
      }

      let couponQuery = db
        .select({
          coupon: coupons,
          campaign: campaigns,
          user: users,
        })
        .from(coupons)
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .innerJoin(users, eq(coupons.userId, users.id));

      if (code) {
        couponQuery = couponQuery.where(eq(coupons.code, code)) as any;
      } else {
        couponQuery = couponQuery.where(eq(coupons.id, couponId)) as any;
      }

      const [result] = await couponQuery.limit(1);

      if (!result) {
        return res.status(404).json({ 
          success: false, 
          message: '优惠券不存在' 
        });
      }

      const { coupon, campaign, user } = result;

      // CRITICAL: Check if this campaign is authorized for staff's store
      const [campaignStore] = await db
        .select()
        .from(campaignStores)
        .where(
          and(
            eq(campaignStores.campaignId, campaign.id),
            eq(campaignStores.storeId, staffInfo.storeId)
          )
        )
        .limit(1);

      if (!campaignStore) {
        console.log(`[核销权限拒绝] 店员 ${staffInfo.name} (门店ID: ${staffInfo.storeId}) 尝试核销不属于本店的优惠券 ${coupon.code} (活动ID: ${campaign.id})`);
        return res.status(403).json({ 
          success: false, 
          message: '该优惠券不属于您的门店，无法核销' 
        });
      }

      // Check if coupon is already used
      if (coupon.status === 'used') {
        return res.status(400).json({ 
          success: false, 
          message: '该优惠券已被使用',
          details: {
            usedAt: coupon.usedAt,
            redeemedStoreId: coupon.redeemedStoreId,
          }
        });
      }

      // Check if coupon is expired
      if (coupon.status === 'expired' || new Date() > coupon.expiredAt) {
        return res.status(400).json({ 
          success: false, 
          message: '该优惠券已过期',
          details: {
            expiredAt: coupon.expiredAt,
          }
        });
      }

      // Check if campaign is active
      if (!campaign.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: '该活动已停用' 
        });
      }

      // Return coupon details for confirmation
      res.json({ 
        success: true, 
        data: {
          coupon: {
            id: coupon.id,
            code: coupon.code,
            status: coupon.status,
            issuedAt: coupon.issuedAt,
            expiredAt: coupon.expiredAt,
          },
          campaign: {
            id: campaign.id,
            title: campaign.titleTh || campaign.titleSource,
            description: campaign.descriptionTh || campaign.descriptionSource,
            bannerImageUrl: campaign.bannerImageUrl,
            couponValue: campaign.couponValue,
            discountType: campaign.discountType,
            originalPrice: campaign.originalPrice,
          },
          user: {
            id: user.id,
            displayName: user.displayName,
            phone: user.phone,
          },
        }
      });
    } catch (error) {
      console.error('Query coupon error:', error);
      res.status(500).json({ success: false, message: '查询失败' });
    }
  });

  // Execute redemption
  app.post('/api/staff/redeem/execute', staffAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { couponId, notes } = req.body;
      const staffInfo = (req as any).staffInfo;

      if (!couponId) {
        return res.status(400).json({ 
          success: false, 
          message: '请提供优惠券ID' 
        });
      }

      // Get coupon with campaign info
      const [result] = await db
        .select({
          coupon: coupons,
          campaign: campaigns,
        })
        .from(coupons)
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .where(eq(coupons.id, couponId))
        .limit(1);

      if (!result) {
        return res.status(404).json({ 
          success: false, 
          message: '优惠券不存在' 
        });
      }

      const { coupon, campaign } = result;

      // CRITICAL: Check if this campaign is authorized for staff's store
      const [campaignStore] = await db
        .select()
        .from(campaignStores)
        .where(
          and(
            eq(campaignStores.campaignId, campaign.id),
            eq(campaignStores.storeId, staffInfo.storeId)
          )
        )
        .limit(1);

      if (!campaignStore) {
        console.log(`[核销权限拒绝] 店员 ${staffInfo.name} (门店ID: ${staffInfo.storeId}) 尝试核销不属于本店的优惠券 ${coupon.code} (活动ID: ${campaign.id})`);
        return res.status(403).json({ 
          success: false, 
          message: '该优惠券不属于您的门店，无法核销' 
        });
      }

      // Check if already used
      if (coupon.status === 'used') {
        return res.status(400).json({ 
          success: false, 
          message: '该优惠券已被使用' 
        });
      }

      // Check if expired
      if (coupon.status === 'expired' || new Date() > coupon.expiredAt) {
        return res.status(400).json({ 
          success: false, 
          message: '该优惠券已过期' 
        });
      }

      // Update coupon status
      const [updatedCoupon] = await db
        .update(coupons)
        .set({
          status: 'used',
          usedAt: new Date(),
          redeemedStoreId: staffInfo.storeId,
          notes: notes || null,
        })
        .where(eq(coupons.id, couponId))
        .returning();

      console.log(`[核销成功] 优惠券ID: ${couponId}, 核销码: ${coupon.code}, 店员: ${staffInfo.name}, 门店ID: ${staffInfo.storeId}`);

      res.json({ 
        success: true, 
        message: '核销成功',
        data: {
          couponId: updatedCoupon.id,
          code: updatedCoupon.code,
          usedAt: updatedCoupon.usedAt,
          redeemedStoreId: updatedCoupon.redeemedStoreId,
        }
      });
    } catch (error) {
      console.error('Execute redemption error:', error);
      res.status(500).json({ success: false, message: '核销失败' });
    }
  });

  // Staff Statistics - Summary
  app.get('/api/staff/summary', staffAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const staffInfo = req.staffInfo!;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get counts by time period
      const [todayCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(
          and(
            eq(coupons.redeemedStoreId, staffInfo.storeId),
            eq(coupons.status, 'used'),
            sql`${coupons.usedAt} >= ${todayStart}`
          )
        );

      const [weekCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(
          and(
            eq(coupons.redeemedStoreId, staffInfo.storeId),
            eq(coupons.status, 'used'),
            sql`${coupons.usedAt} >= ${weekStart}`
          )
        );

      const [monthCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(
          and(
            eq(coupons.redeemedStoreId, staffInfo.storeId),
            eq(coupons.status, 'used'),
            sql`${coupons.usedAt} >= ${monthStart}`
          )
        );

      // Get by campaign
      const byCampaign = await db
        .select({
          campaignId: campaigns.id,
          campaignTitle: campaigns.titleSource,
          count: sql<number>`count(*)::int`,
        })
        .from(coupons)
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .where(
          and(
            eq(coupons.redeemedStoreId, staffInfo.storeId),
            eq(coupons.status, 'used'),
            sql`${coupons.usedAt} >= ${monthStart}`
          )
        )
        .groupBy(campaigns.id, campaigns.titleSource)
        .orderBy(desc(sql`count(*)`));

      res.json({
        success: true,
        data: {
          today: todayCount?.count || 0,
          thisWeek: weekCount?.count || 0,
          thisMonth: monthCount?.count || 0,
          byCampaign: byCampaign,
        },
      });
    } catch (error) {
      console.error('Get staff summary error:', error);
      res.status(500).json({ success: false, message: '获取统计失败' });
    }
  });

  // Staff Statistics - Recent Redemptions
  app.get('/api/staff/recent-redemptions', staffAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const staffInfo = req.staffInfo!;
      const limit = parseInt(req.query.limit as string) || 20;

      const recentRedemptions = await db
        .select({
          id: coupons.id,
          code: coupons.code,
          usedAt: coupons.usedAt,
          campaignTitle: campaigns.titleSource,
          userName: users.displayName,
          couponValue: campaigns.couponValue,
        })
        .from(coupons)
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .innerJoin(users, eq(coupons.userId, users.id))
        .where(
          and(
            eq(coupons.redeemedStoreId, staffInfo.storeId),
            eq(coupons.status, 'used')
          )
        )
        .orderBy(desc(coupons.usedAt))
        .limit(limit);

      res.json({
        success: true,
        data: recentRedemptions,
      });
    } catch (error) {
      console.error('Get recent redemptions error:', error);
      res.status(500).json({ success: false, message: '获取记录失败' });
    }
  });

  // Staff - Get Active Campaigns for Current Store
  app.get('/api/staff/campaigns', staffAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const staffInfo = req.staffInfo!;
      const now = new Date();

      const activeCampaigns = await db
        .select({
          id: campaigns.id,
          titleSource: campaigns.titleSource,
          titleZh: campaigns.titleZh,
          titleEn: campaigns.titleEn,
          titleTh: campaigns.titleTh,
          descriptionSource: campaigns.descriptionSource,
          descriptionZh: campaigns.descriptionZh,
          descriptionEn: campaigns.descriptionEn,
          descriptionTh: campaigns.descriptionTh,
          bannerImageUrl: campaigns.bannerImageUrl,
          couponValue: campaigns.couponValue,
          discountType: campaigns.discountType,
          originalPrice: campaigns.originalPrice,
          startAt: campaigns.startAt,
          endAt: campaigns.endAt,
        })
        .from(campaigns)
        .innerJoin(campaignStores, eq(campaigns.id, campaignStores.campaignId))
        .where(
          and(
            eq(campaignStores.storeId, staffInfo.storeId),
            eq(campaigns.isActive, true),
            sql`${campaigns.startAt} <= ${now}`,
            sql`${campaigns.endAt} >= ${now}`
          )
        )
        .orderBy(desc(campaigns.startAt));

      res.json({
        success: true,
        data: activeCampaigns,
      });
    } catch (error) {
      console.error('Get staff campaigns error:', error);
      res.status(500).json({ success: false, message: '获取活动失败' });
    }
  });

  // ============ E. Admin Authentication ============

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);

      if (!admin || !admin.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email, type: 'admin' as const },
        JWT_SECRET_VALUE,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      res.json({
        success: true,
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // ============ D. Admin - Store Management ============

  app.get('/api/admin/stores', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const city = req.query.city as string;
      const offset = (page - 1) * limit;

      let conditions = [];
      if (city) {
        conditions.push(eq(stores.city, city));
      }

      const storeList = await db
        .select()
        .from(stores)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(stores.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(stores);

      res.json({
        success: true,
        data: storeList,
        pagination: {
          page,
          limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limit),
        },
      });
    } catch (error) {
      console.error('Get stores error:', error);
      res.status(500).json({ success: false, message: 'Failed to get stores' });
    }
  });

  app.post('/api/admin/stores', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { name, brand, city, address, latitude, longitude, phone, rating, imageUrl } = req.body;

      if (!name || !city || !address) {
        return res.status(400).json({ success: false, message: 'Name, city, and address are required' });
      }

      const [newStore] = await db
        .insert(stores)
        .values({
          name,
          brand,
          city,
          address,
          latitude,
          longitude,
          phone,
          rating,
          imageUrl,
          isActive: true,
        })
        .returning();

      res.json({ success: true, message: 'Store created', data: newStore });
    } catch (error) {
      console.error('Create store error:', error);
      res.status(500).json({ success: false, message: 'Failed to create store' });
    }
  });

  app.put('/api/admin/stores/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const { name, brand, city, address, latitude, longitude, phone, rating, imageUrl, isActive } = req.body;

      const [updatedStore] = await db
        .update(stores)
        .set({
          name,
          brand,
          city,
          address,
          latitude,
          longitude,
          phone,
          rating,
          imageUrl,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, storeId))
        .returning();

      if (!updatedStore) {
        return res.status(404).json({ success: false, message: 'Store not found' });
      }

      res.json({ success: true, message: 'Store updated', data: updatedStore });
    } catch (error) {
      console.error('Update store error:', error);
      res.status(500).json({ success: false, message: 'Failed to update store' });
    }
  });

  app.delete('/api/admin/stores/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);

      await db.delete(stores).where(eq(stores.id, storeId));

      res.json({ success: true, message: 'Store deleted' });
    } catch (error) {
      console.error('Delete store error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete store' });
    }
  });

  // ============ E. Admin - Staff Presets Management (Redemption Authorization) ============

  // Get all staff presets for a store
  app.get('/api/admin/stores/:storeId/staff-presets', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);

      const presets = await db
        .select({
          id: staffPresets.id,
          storeId: staffPresets.storeId,
          name: staffPresets.name,
          staffId: staffPresets.staffId,
          phone: staffPresets.phone,
          authToken: staffPresets.authToken,
          isBound: staffPresets.isBound,
          boundUserId: staffPresets.boundUserId,
          boundAt: staffPresets.boundAt,
          createdAt: staffPresets.createdAt,
          // Join with users to get bound user info
          boundUserName: users.displayName,
          boundUserPhone: users.phone,
        })
        .from(staffPresets)
        .leftJoin(users, eq(staffPresets.boundUserId, users.id))
        .where(eq(staffPresets.storeId, storeId))
        .orderBy(desc(staffPresets.createdAt));

      res.json({ success: true, data: presets });
    } catch (error) {
      console.error('Get staff presets error:', error);
      res.status(500).json({ success: false, message: 'Failed to get staff presets' });
    }
  });

  // Create a new staff preset
  app.post('/api/admin/stores/:storeId/staff-presets', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const { name, staffId, phone } = req.body;

      if (!name || !staffId || !phone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, staff ID, and phone are required' 
        });
      }

      // Generate unique auth token
      const authToken = nanoid(32);

      const [preset] = await db
        .insert(staffPresets)
        .values({
          storeId,
          name,
          staffId,
          phone,
          authToken,
        })
        .returning();

      res.json({ 
        success: true, 
        message: 'Staff preset created successfully', 
        data: preset 
      });
    } catch (error) {
      console.error('Create staff preset error:', error);
      res.status(500).json({ success: false, message: 'Failed to create staff preset' });
    }
  });

  // Delete a staff preset
  app.delete('/api/admin/staff-presets/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const presetId = parseInt(req.params.id);

      const [deletedPreset] = await db
        .delete(staffPresets)
        .where(eq(staffPresets.id, presetId))
        .returning();

      if (!deletedPreset) {
        return res.status(404).json({ success: false, message: 'Staff preset not found' });
      }

      res.json({ success: true, message: 'Staff preset deleted successfully' });
    } catch (error) {
      console.error('Delete staff preset error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete staff preset' });
    }
  });

  // Unbind a staff member from a preset
  app.post('/api/admin/staff-presets/:id/unbind', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const presetId = parseInt(req.params.id);

      const [updatedPreset] = await db
        .update(staffPresets)
        .set({
          isBound: false,
          boundUserId: null,
          boundAt: null,
          updatedAt: new Date(),
        })
        .where(eq(staffPresets.id, presetId))
        .returning();

      if (!updatedPreset) {
        return res.status(404).json({ success: false, message: 'Staff preset not found' });
      }

      res.json({ 
        success: true, 
        message: 'Staff unbounded successfully', 
        data: updatedPreset 
      });
    } catch (error) {
      console.error('Unbind staff error:', error);
      res.status(500).json({ success: false, message: 'Failed to unbind staff' });
    }
  });

  // ============ Google Places API Integration ============

  app.get('/api/admin/places/autocomplete', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const input = req.query.input as string;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!input || input.length < 2) {
        return res.json({ success: true, predictions: [] });
      }

      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Google Maps API key not configured' });
      }

      const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
      url.searchParams.set('input', input);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('language', 'th');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data);
        return res.status(500).json({ success: false, message: 'Places API error' });
      }

      res.json({
        success: true,
        predictions: data.predictions || [],
      });
    } catch (error) {
      console.error('Places autocomplete error:', error);
      res.status(500).json({ success: false, message: 'Failed to search places' });
    }
  });

  app.get('/api/admin/places/details/:placeId', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { placeId } = req.params;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Google Maps API key not configured' });
      }

      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('language', 'th');
      url.searchParams.set('fields', 'name,formatted_address,geometry,rating,photos,international_phone_number');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Places Details API error:', data);
        return res.status(500).json({ success: false, message: 'Places Details API error' });
      }

      const place = data.result;
      let imageUrl = null;

      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`;
      }

      res.json({
        success: true,
        place: {
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          rating: place.rating,
          phone: place.international_phone_number,
          imageUrl,
        },
      });
    } catch (error) {
      console.error('Places details error:', error);
      res.status(500).json({ success: false, message: 'Failed to get place details' });
    }
  });

  // ============ E. Admin - Campaign Management ============

  app.get('/api/admin/campaigns', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      let conditions = [];
      if (status === 'active') {
        conditions.push(eq(campaigns.isActive, true));
      } else if (status === 'inactive') {
        conditions.push(eq(campaigns.isActive, false));
      }

      const campaignList = await db
        .select()
        .from(campaigns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(campaigns.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(campaigns);

      res.json({
        success: true,
        data: campaignList,
        pagination: {
          page,
          limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limit),
        },
      });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ success: false, message: 'Failed to get campaigns' });
    }
  });

  app.post('/api/admin/campaigns', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const {
        titleSourceLang = 'th-th',
        titleSource,
        descriptionSourceLang = 'th-th',
        descriptionSource,
        bannerImageUrl,
        mediaUrls,
        couponValue,
        discountType,
        originalPrice,
        startAt,
        endAt,
        maxPerUser,
        maxTotal,
        channel,
        storeIds,
      } = req.body;

      if (!titleSource || !descriptionSource) {
        return res.status(400).json({ success: false, message: 'Title and description are required' });
      }

      const translations = await translateCampaignContent(
        titleSourceLang,
        titleSource,
        descriptionSource
      );

      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          titleSourceLang,
          titleSource,
          titleZh: translations.titleZh,
          titleEn: translations.titleEn,
          titleTh: translations.titleTh,
          descriptionSourceLang,
          descriptionSource,
          descriptionZh: translations.descriptionZh,
          descriptionEn: translations.descriptionEn,
          descriptionTh: translations.descriptionTh,
          bannerImageUrl,
          mediaUrls,
          couponValue,
          discountType,
          originalPrice,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          maxPerUser,
          maxTotal,
          channel,
          isActive: true,
        })
        .returning();

      if (storeIds && storeIds.length > 0) {
        await db.insert(campaignStores).values(
          storeIds.map((storeId: number) => ({
            campaignId: newCampaign.id,
            storeId,
          }))
        );
      }

      res.json({ success: true, message: 'Campaign created', data: newCampaign });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ success: false, message: 'Failed to create campaign' });
    }
  });

  app.put('/api/admin/campaigns/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const {
        titleSourceLang,
        titleSource,
        descriptionSourceLang,
        descriptionSource,
        bannerImageUrl,
        mediaUrls,
        couponValue,
        discountType,
        originalPrice,
        startAt,
        endAt,
        maxPerUser,
        maxTotal,
        channel,
        isActive,
        storeIds,
      } = req.body;

      let translations: any = {};
      if (titleSource && descriptionSource) {
        translations = await translateCampaignContent(
          titleSourceLang || 'th-th',
          titleSource,
          descriptionSource
        );
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (titleSource) {
        updateData.titleSourceLang = titleSourceLang;
        updateData.titleSource = titleSource;
        updateData.titleZh = translations.titleZh;
        updateData.titleEn = translations.titleEn;
        updateData.titleTh = translations.titleTh;
      }

      if (descriptionSource) {
        updateData.descriptionSourceLang = descriptionSourceLang;
        updateData.descriptionSource = descriptionSource;
        updateData.descriptionZh = translations.descriptionZh;
        updateData.descriptionEn = translations.descriptionEn;
        updateData.descriptionTh = translations.descriptionTh;
      }

      if (bannerImageUrl !== undefined) updateData.bannerImageUrl = bannerImageUrl;
      if (mediaUrls !== undefined) updateData.mediaUrls = mediaUrls;
      if (couponValue !== undefined) updateData.couponValue = couponValue;
      if (discountType !== undefined) updateData.discountType = discountType;
      if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
      if (startAt) updateData.startAt = new Date(startAt);
      if (endAt) updateData.endAt = new Date(endAt);
      if (maxPerUser !== undefined) updateData.maxPerUser = maxPerUser;
      if (maxTotal !== undefined) updateData.maxTotal = maxTotal;
      if (channel !== undefined) updateData.channel = channel;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updatedCampaign] = await db
        .update(campaigns)
        .set(updateData)
        .where(eq(campaigns.id, campaignId))
        .returning();

      if (!updatedCampaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (storeIds !== undefined) {
        await db.delete(campaignStores).where(eq(campaignStores.campaignId, campaignId));
        if (storeIds.length > 0) {
          await db.insert(campaignStores).values(
            storeIds.map((storeId: number) => ({
              campaignId,
              storeId,
            }))
          );
        }
      }

      res.json({ success: true, message: 'Campaign updated', data: updatedCampaign });
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({ success: false, message: 'Failed to update campaign' });
    }
  });

  app.delete('/api/admin/campaigns/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);

      await db.delete(campaigns).where(eq(campaigns.id, campaignId));

      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete campaign' });
    }
  });

  app.get('/api/admin/campaigns/:id/stores', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);

      const results = await db
        .select({ store: stores })
        .from(campaignStores)
        .innerJoin(stores, eq(campaignStores.storeId, stores.id))
        .where(eq(campaignStores.campaignId, campaignId));

      const storeList = results.map(r => r.store);

      res.json({ success: true, data: storeList });
    } catch (error) {
      console.error('Get campaign stores error:', error);
      res.status(500).json({ success: false, message: 'Failed to get campaign stores' });
    }
  });

  app.post('/api/admin/campaigns/:id/stores', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { storeIds } = req.body;

      if (!Array.isArray(storeIds)) {
        return res.status(400).json({ success: false, message: 'storeIds must be an array' });
      }

      // 删除现有关联
      await db.delete(campaignStores).where(eq(campaignStores.campaignId, campaignId));

      // 添加新关联
      if (storeIds.length > 0) {
        await db.insert(campaignStores).values(
          storeIds.map((storeId: number) => ({
            campaignId,
            storeId,
          }))
        );
      }

      res.json({ success: true, message: 'Campaign stores updated' });
    } catch (error) {
      console.error('Update campaign stores error:', error);
      res.status(500).json({ success: false, message: 'Failed to update campaign stores' });
    }
  });

  // ============ F. Admin - Coupon Management ============

  app.get('/api/admin/coupons', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const offset = (page - 1) * limit;

      let conditions = [];
      if (status) conditions.push(eq(coupons.status, status as any));
      if (campaignId) conditions.push(eq(coupons.campaignId, campaignId));

      const results = await db
        .select({
          coupon: coupons,
          user: users,
          campaign: campaigns,
        })
        .from(coupons)
        .innerJoin(users, eq(coupons.userId, users.id))
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(coupons.issuedAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(coupons);

      res.json({
        success: true,
        data: results.map(r => ({
          ...r.coupon,
          user: {
            id: r.user.id,
            displayName: r.user.displayName,
            lineUserId: r.user.lineUserId,
          },
          campaign: {
            id: r.campaign.id,
            titleSource: r.campaign.titleSource,
            couponValue: r.campaign.couponValue,
            discountType: r.campaign.discountType,
          },
        })),
        pagination: {
          page,
          limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limit),
        },
      });
    } catch (error) {
      console.error('Get coupons error:', error);
      res.status(500).json({ success: false, message: 'Failed to get coupons' });
    }
  });

  app.post('/api/admin/coupons/:id/redeem', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const couponId = parseInt(req.params.id);
      const { storeId, notes } = req.body;

      const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId)).limit(1);

      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      if (coupon.status === 'used') {
        return res.status(400).json({ success: false, message: 'Coupon already used' });
      }

      if (coupon.status === 'expired' || new Date() > coupon.expiredAt) {
        return res.status(400).json({ success: false, message: 'Coupon expired' });
      }

      const [updatedCoupon] = await db
        .update(coupons)
        .set({
          status: 'used',
          usedAt: new Date(),
          redeemedStoreId: storeId,
          notes,
        })
        .where(eq(coupons.id, couponId))
        .returning();

      let redeemedStore = null;
      if (storeId) {
        [redeemedStore] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
      }

      res.json({
        success: true,
        message: 'Coupon redeemed successfully',
        coupon: {
          id: updatedCoupon.id,
          code: updatedCoupon.code,
          status: updatedCoupon.status,
          usedAt: updatedCoupon.usedAt,
          redeemedStore: redeemedStore ? { id: redeemedStore.id, name: redeemedStore.name } : null,
        },
      });
    } catch (error) {
      console.error('Redeem coupon error:', error);
      res.status(500).json({ success: false, message: 'Failed to redeem coupon' });
    }
  });

  // ============ G. Dashboard Analytics ============

  // Dashboard - Summary (Current Month Overview)
  app.get('/api/admin/dashboard/summary', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const month = req.query.month as string || new Date().toISOString().substring(0, 7); // Format: YYYY-MM
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

      // Total coupons issued this month
      const [issuedResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(
          and(
            sql`${coupons.issuedAt} >= ${monthStart}`,
            sql`${coupons.issuedAt} <= ${monthEnd}`
          )
        );

      // Total coupons redeemed this month
      const [redeemedResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(
          and(
            eq(coupons.status, 'used'),
            sql`${coupons.usedAt} >= ${monthStart}`,
            sql`${coupons.usedAt} <= ${monthEnd}`
          )
        );

      // Redemption rate
      const issuedCount = issuedResult?.count || 0;
      const redeemedCount = redeemedResult?.count || 0;
      const redemptionRate = issuedCount > 0 ? (redeemedCount / issuedCount) * 100 : 0;

      // Active campaigns count
      const [activeCampaignsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.isActive, true),
            sql`${campaigns.startAt} <= ${monthEnd}`,
            sql`${campaigns.endAt} >= ${monthStart}`
          )
        );

      // Total stores count
      const [storesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(stores);

      res.json({
        success: true,
        data: {
          month,
          issuedCount,
          redeemedCount,
          redemptionRate: Math.round(redemptionRate * 100) / 100,
          activeCampaigns: activeCampaignsResult?.count || 0,
          totalStores: storesResult?.count || 0,
        },
      });
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      res.status(500).json({ success: false, message: '获取概览数据失败' });
    }
  });

  // Dashboard - Campaign Dimension
  app.get('/api/admin/dashboard/campaigns', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const month = req.query.month as string || new Date().toISOString().substring(0, 7);
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

      const campaignStats = await db
        .select({
          campaignId: campaigns.id,
          campaignTitle: campaigns.titleSource,
          issuedCount: sql<number>`count(CASE WHEN ${coupons.issuedAt} >= ${monthStart} AND ${coupons.issuedAt} <= ${monthEnd} THEN 1 END)::int`,
          redeemedCount: sql<number>`count(CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} THEN 1 END)::int`,
        })
        .from(campaigns)
        .leftJoin(coupons, eq(campaigns.id, coupons.campaignId))
        .where(eq(campaigns.isActive, true))
        .groupBy(campaigns.id, campaigns.titleSource)
        .orderBy(sql`count(CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} THEN 1 END) DESC`);

      const enrichedStats = campaignStats.map((stat) => ({
        ...stat,
        redemptionRate:
          stat.issuedCount > 0 ? Math.round((stat.redeemedCount / stat.issuedCount) * 10000) / 100 : 0,
      }));

      res.json({
        success: true,
        data: {
          month,
          campaigns: enrichedStats,
        },
      });
    } catch (error) {
      console.error('Get campaign stats error:', error);
      res.status(500).json({ success: false, message: '获取活动统计失败' });
    }
  });

  // Dashboard - Brand Dimension
  app.get('/api/admin/dashboard/brands', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const month = req.query.month as string || new Date().toISOString().substring(0, 7);
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

      const brandStats = await db
        .select({
          brand: stores.brand,
          storeCount: sql<number>`count(DISTINCT ${stores.id})::int`,
          issuedCount: sql<number>`count(CASE WHEN ${coupons.issuedAt} >= ${monthStart} AND ${coupons.issuedAt} <= ${monthEnd} THEN 1 END)::int`,
          redeemedCount: sql<number>`count(CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} THEN 1 END)::int`,
        })
        .from(stores)
        .leftJoin(coupons, eq(stores.id, coupons.redeemedStoreId))
        .where(isNotNull(stores.brand))
        .groupBy(stores.brand)
        .orderBy(sql`count(CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} THEN 1 END) DESC`);

      const enrichedStats = brandStats.map((stat) => ({
        ...stat,
        brand: stat.brand || 'Unknown',
        redemptionRate:
          stat.issuedCount > 0 ? Math.round((stat.redeemedCount / stat.issuedCount) * 10000) / 100 : 0,
      }));

      res.json({
        success: true,
        data: {
          month,
          brands: enrichedStats,
        },
      });
    } catch (error) {
      console.error('Get brand stats error:', error);
      res.status(500).json({ success: false, message: '获取品牌统计失败' });
    }
  });

  // Dashboard - Store Dimension (with pagination)
  app.get('/api/admin/dashboard/stores', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const month = req.query.month as string || new Date().toISOString().substring(0, 7);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

      const storeStats = await db
        .select({
          storeId: stores.id,
          storeName: stores.name,
          brand: stores.brand,
          city: stores.city,
          issuedCount: sql<number>`count(CASE WHEN ${coupons.issuedAt} >= ${monthStart} AND ${coupons.issuedAt} <= ${monthEnd} THEN 1 END)::int`,
          redeemedCount: sql<number>`count(CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} THEN 1 END)::int`,
        })
        .from(stores)
        .leftJoin(coupons, eq(stores.id, coupons.redeemedStoreId))
        .groupBy(stores.id, stores.name, stores.brand, stores.city)
        .orderBy(sql`count(CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} THEN 1 END) DESC`)
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(stores);

      const enrichedStats = storeStats.map((stat) => ({
        ...stat,
        redemptionRate:
          stat.issuedCount > 0 ? Math.round((stat.redeemedCount / stat.issuedCount) * 10000) / 100 : 0,
      }));

      res.json({
        success: true,
        data: {
          month,
          stores: enrichedStats,
          pagination: {
            page,
            limit,
            total: totalResult?.count || 0,
            totalPages: Math.ceil((totalResult?.count || 0) / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get store stats error:', error);
      res.status(500).json({ success: false, message: '获取门店统计失败' });
    }
  });

  // ============ H. Media Upload ============

  app.post('/api/admin/upload', adminAuthMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = req.file.originalname.split('.').pop();
      const objectName = `public/${timestamp}-${randomStr}.${ext}`;

      const fileUrl = await getOssService().uploadFile(
        objectName,
        req.file.buffer,
        req.file.mimetype
      );

      const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

      await db.insert(mediaFiles).values({
        fileName: req.file.originalname,
        fileUrl,
        fileType,
        fileSize: req.file.size,
        uploadedBy: req.admin!.id,
        isPublic: true,
      });

      res.json({
        success: true,
        fileUrl,
        fileType,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
