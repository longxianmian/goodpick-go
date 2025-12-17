import express, { type Request, Response } from 'express';
import type { Express } from 'express';
import { createServer, type Server } from 'http';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { db } from './db';
import { admins, stores, campaigns, campaignStores, users, coupons, mediaFiles, staffPresets, oaUserLinks, campaignBroadcasts, merchantStaffRoles, oauthAccounts, agentTokens, paymentConfigs, paymentTransactions, membershipRules, userStoreMemberships, creatorContents, promotionBindings, promotionEarnings, shortVideos, shortVideoLikes, shortVideoComments, shortVideoCommentLikes, shortVideoBookmarks, userFollows, products, productCategories, pspProviders, merchantPspAccounts, storeQrCodes, qrPayments, paymentPoints, chatConversations, chatMessages, discoverApplications, shuashuaApplications, insertDiscoverApplicationSchema, insertShuashuaApplicationSchema, carts, cartItems, deliveryAddresses, deliveryOrders, orderItems, deliveryAssignments, insertCartSchema, insertCartItemSchema, insertDeliveryAddressSchema, insertDeliveryOrderSchema, insertOrderItemSchema, liaoliaoFriends, liaoliaoGroups, liaoliaoGroupMembers, liaoliaoMessages, liaoliaoTranslations, liaoliaoFavorites, insertLiaoliaoFriendSchema, insertLiaoliaoGroupSchema, insertLiaoliaoMessageSchema, ttFriends, ttInvites, phoneHashRegistry, insertTtFriendSchema, insertTtInviteSchema, insertPhoneHashRegistrySchema } from '@shared/schema';
import { getPaymentProvider } from './services/paymentProvider';
import QRCode from 'qrcode';
import { eq, and, desc, sql, inArray, isNotNull, or, gte, gt } from 'drizzle-orm';
import { AliOssService } from './services/aliOssService';
import { verifyLineIdToken, exchangeLineAuthCode } from './services/lineService';
import { translateText, transcribeAudio } from './services/translationService';
import { sendWelcomeMessageIfNeeded } from './services/welcomeService';
import { createCampaignBroadcast, runBroadcastTask } from './services/broadcastService';
import { triggerTranscodeAfterUpload } from './services/transcodeService';
import { mapLineLangToPreferredLang } from './utils/language';
import type { Admin, User } from '@shared/schema';
import { nanoid } from 'nanoid';
import { TEST_ACCOUNTS, isTestAccount } from '@shared/testAccounts';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    oauthStates?: {
      [key: string]: {
        campaignId?: string;
        returnTo?: string;
        timestamp: number;
      };
    };
  }
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  }
});

let ossService: AliOssService | null = null;
function getOssService(): AliOssService {
  if (!ossService) {
    ossService = new AliOssService();
  }
  return ossService;
}

// 将HTTP URL转换为HTTPS（解决混合内容安全问题）
function convertHttpToHttps(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// 将URL数组中的HTTP转换为HTTPS
function convertUrlArrayToHttps(urls: string[] | null | undefined): string[] | null | undefined {
  if (!urls) return urls;
  return urls.map(url => convertHttpToHttps(url) as string);
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

// Simple memory cache for QR code metadata (30 second TTL)
const qrMetaCache = new Map<string, { data: any; expiry: number }>();
const QR_CACHE_TTL = 30000; // 30 seconds

function getCachedQrMeta(qrToken: string) {
  const cached = qrMetaCache.get(qrToken);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  qrMetaCache.delete(qrToken);
  return null;
}

function setCachedQrMeta(qrToken: string, data: any) {
  qrMetaCache.set(qrToken, { data, expiry: Date.now() + QR_CACHE_TTL });
}

// OA Configuration for messaging system
const GOODPICK_MAIN_OA_ID = process.env.GOODPICK_MAIN_OA_ID ?? 'GOODPICK_MAIN_OA';
const DEECARD_MAIN_OA_ID = process.env.DEECARD_MAIN_OA_ID ?? 'DEECARD_MAIN_OA';

// LINE OAuth Configuration
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || process.env.LINE_LOGIN_CHANNEL_ID || '';

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
    console.log(`[AUTH] 401 - Missing auth header for ${req.method} ${req.path}`);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE) as { id: number; lineUserId: string; type: 'user' };
    if (decoded.type !== 'user') {
      console.log(`[AUTH] 403 - Wrong token type: ${decoded.type} for ${req.method} ${req.path}`);
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    req.user = decoded as any;
    next();
  } catch (error) {
    console.log(`[AUTH] 401 - Invalid token for ${req.method} ${req.path}:`, error);
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
      .where(
        and(
          eq(staffPresets.boundUserId, decoded.id),
          eq(staffPresets.isBound, true)
        )
      )
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
  descriptionSource: string,
  staffInstructionsSource?: string,
  staffTrainingSource?: string
) {
  const targetLangs = ['zh-cn', 'en-us', 'th-th'].filter(lang => lang !== sourceLang) as Array<'zh-cn' | 'en-us' | 'th-th'>;
  
  // 初始化翻译结果：源语言使用原文，其他语言先用原文作为兜底
  const translations: any = {
    titleZh: sourceLang === 'zh-cn' ? titleSource : titleSource,
    titleEn: sourceLang === 'en-us' ? titleSource : titleSource,
    titleTh: sourceLang === 'th-th' ? titleSource : titleSource,
    descriptionZh: sourceLang === 'zh-cn' ? descriptionSource : descriptionSource,
    descriptionEn: sourceLang === 'en-us' ? descriptionSource : descriptionSource,
    descriptionTh: sourceLang === 'th-th' ? descriptionSource : descriptionSource,
  };

  // 如果有员工指引和培训内容，也初始化它们
  if (staffInstructionsSource) {
    translations.staffInstructionsZh = sourceLang === 'zh-cn' ? staffInstructionsSource : staffInstructionsSource;
    translations.staffInstructionsEn = sourceLang === 'en-us' ? staffInstructionsSource : staffInstructionsSource;
    translations.staffInstructionsTh = sourceLang === 'th-th' ? staffInstructionsSource : staffInstructionsSource;
  }
  
  if (staffTrainingSource) {
    translations.staffTrainingZh = sourceLang === 'zh-cn' ? staffTrainingSource : staffTrainingSource;
    translations.staffTrainingEn = sourceLang === 'en-us' ? staffTrainingSource : staffTrainingSource;
    translations.staffTrainingTh = sourceLang === 'th-th' ? staffTrainingSource : staffTrainingSource;
  }

  // 尝试翻译到其他语言，失败时使用原文（已在上面设置）
  for (const targetLang of targetLangs) {
    try {
      const textsToTranslate = [titleSource, descriptionSource];
      if (staffInstructionsSource) textsToTranslate.push(staffInstructionsSource);
      if (staffTrainingSource) textsToTranslate.push(staffTrainingSource);

      const translatedTexts = await Promise.all(
        textsToTranslate.map(text => translateText(text, sourceLang, targetLang))
      );

      let idx = 0;
      const translatedTitle = translatedTexts[idx++];
      const translatedDesc = translatedTexts[idx++];
      const translatedInstructions = staffInstructionsSource ? translatedTexts[idx++] : undefined;
      const translatedTraining = staffTrainingSource ? translatedTexts[idx++] : undefined;

      // 只有翻译成功且不是原文时才更新（translateText失败时返回原文）
      if (targetLang === 'zh-cn') {
        translations.titleZh = translatedTitle;
        translations.descriptionZh = translatedDesc;
        if (translatedInstructions) translations.staffInstructionsZh = translatedInstructions;
        if (translatedTraining) translations.staffTrainingZh = translatedTraining;
      } else if (targetLang === 'en-us') {
        translations.titleEn = translatedTitle;
        translations.descriptionEn = translatedDesc;
        if (translatedInstructions) translations.staffInstructionsEn = translatedInstructions;
        if (translatedTraining) translations.staffTrainingEn = translatedTraining;
      } else if (targetLang === 'th-th') {
        translations.titleTh = translatedTitle;
        translations.descriptionTh = translatedDesc;
        if (translatedInstructions) translations.staffInstructionsTh = translatedInstructions;
        if (translatedTraining) translations.staffTrainingTh = translatedTraining;
      }
    } catch (error) {
      // 翻译失败不影响系统运行，使用原文兜底
      console.error(`❌ 翻译${targetLang}失败，使用原文:`, error);
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
  // 告诉 Express：我们跑在反向代理（Nginx）后面，要信任 X-Forwarded-* 头
  // 这样在 HTTPS + secure cookie 的情况下，才会正确设置 Session Cookie
  app.set('trust proxy', 1);

  // Configure session middleware for OAuth state management
  const MemoryStore = createMemoryStore(session);
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
  const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

  app.use(session({
    name: 'goodpickgo.sid',  // ✅ 新的 cookie 名，避免和历史 connect.sid 冲突
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 线上必须是 true（HTTPS）
      sameSite: 'lax', // CSRF protection，当前同域访问足够
      maxAge: ONE_WEEK_MS, // 一周过期
      domain: COOKIE_DOMAIN,
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
  }));

     // ============ Config Endpoint ============
  app.get('/api/config', (req: Request, res: Response) => {
    const sessionId = req.headers['x-gpgo-session'] || 'no-session-id';
    const ua = req.headers['user-agent'] || 'no-ua';
    console.log(
      '[API]',
      new Date().toISOString(),
      req.method,
      req.path,
      'session=',
      sessionId,
      'ua=',
      ua
    );

    // 兼容两种配置方式
    const liffId =
      process.env.LIFF_ID ||
      process.env.VITE_LINE_LIFF_ID_MAIN ||
      '';

    const lineChannelId =
      process.env.LINE_CHANNEL_ID ||
      process.env.LINE_LOGIN_CHANNEL_ID ||
      '';

    console.log('[API CONFIG]', { liffId, lineChannelId });

    res.json({
      success: true,
      data: {
        liffId,
        lineChannelId,
      },
    });
  });

  // ============ Media Proxy Endpoint ============
  // Proxies OSS videos to fix Content-Disposition headers and enable inline playback
  app.get('/api/media/video/:objectKey(*)', async (req: Request, res: Response) => {
    try {
      const objectKey = req.params.objectKey;
      
      // Security: Only allow public/* prefix to prevent open proxy abuse
      if (!objectKey.startsWith('public/')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: Invalid object path' 
        });
      }
      
      const axios = await import('axios');
      const ossUrl = `https://prodee-h5-assets.oss-ap-southeast-1.aliyuncs.com/${objectKey}`;
      
      // 支持Range请求（视频拖动）
      const headers: any = {};
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }
      
      // 流式代理OSS响应
      const ossResponse = await axios.default.get(ossUrl, {
        responseType: 'stream',
        headers,
        validateStatus: (status) => status < 500 // 允许206等状态码
      });
      
      // 设置正确的响应头
      res.status(ossResponse.status);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      // 关键：强制内联播放，覆盖OSS的attachment头
      res.setHeader('Content-Disposition', 'inline');
      
      // 转发关键头信息
      if (ossResponse.headers['content-length']) {
        res.setHeader('Content-Length', ossResponse.headers['content-length']);
      }
      if (ossResponse.headers['content-range']) {
        res.setHeader('Content-Range', ossResponse.headers['content-range']);
      }
      
      // 流式传输
      ossResponse.data.pipe(res);
      
    } catch (error) {
      console.error('[Media Proxy Error]', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to proxy video' 
        });
      }
    }
  });

  // ============ A. User Authentication ============

  // Verify JWT token and return user info
  app.get('/api/user/verify', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET_VALUE) as { 
        id: number; 
        lineUserId: string; 
        type: 'user' | 'admin';
        staffId?: string;
        staffName?: string;
        storeId?: number;
      };

      if (decoded.type !== 'user') {
        return res.status(403).json({ success: false, message: 'Invalid token type' });
      }

      // Fetch user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          language: user.language,
        },
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  });

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

  // ============ 开发环境测试登录（仅限开发环境 + 测试账号） ============
  // 安全措施：
  // 1. 只在非生产环境可用
  // 2. 只允许预定义的测试账号列表
  // 3. 所有调用都记录日志
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/auth/dev-login', async (req: Request, res: Response) => {
      console.warn('[DEV LOGIN] ⚠️ 开发环境测试登录被调用 - 这个端点在生产环境不可用');
      
      try {
        const { lineUserId } = req.body;
        
        if (!lineUserId) {
          return res.status(400).json({ success: false, message: 'lineUserId is required' });
        }

        // 安全检查：只允许预定义的测试账号
        if (!isTestAccount(lineUserId)) {
          console.warn(`[DEV LOGIN] 拒绝非测试账号登录尝试: ${lineUserId}`);
          return res.status(403).json({ success: false, message: 'Only test accounts allowed' });
        }

        const testAccount = TEST_ACCOUNTS.find(acc => acc.lineUserId === lineUserId);
        
        // 查找或创建测试用户
        let [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.lineUserId, lineUserId))
          .limit(1);

        if (!existingUser) {
          [existingUser] = await db
            .insert(users)
            .values({
              lineUserId: lineUserId,
              displayName: testAccount?.displayName || 'Test User',
              language: 'zh-cn',
            })
            .returning();
          console.log(`[DEV LOGIN] 创建测试用户: ${existingUser.displayName}`);
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

        console.log(`[DEV LOGIN] ✅ 测试账号登录成功: ${existingUser.displayName} (${existingUser.lineUserId})`);

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
        console.error('[DEV LOGIN] 登录失败:', error);
        res.status(500).json({ success: false, message: 'Dev login failed' });
      }
    });
    
    console.log('📌 开发环境测试登录端点已启用: POST /api/auth/dev-login');
  }

  // LINE OAuth 初始化（H5 用）

  // 当前登录用户信息（给前端 AuthContext 用）- 增强版，包含角色信息
  app.get('/api/me', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = (req.user as any).id;

      // 获取用户基本信息
      const [user] = await db
        .select({
          id: users.id,
          lineUserId: users.lineUserId,
          displayName: users.displayName,
          shuaName: users.shuaName,
          shuaBio: users.shuaBio,
          avatarUrl: users.avatarUrl,
          language: users.language,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // 获取用户在各门店的角色
      const userRoles = await db
        .select({
          storeId: merchantStaffRoles.storeId,
          storeName: stores.name,
          storeImageUrl: stores.imageUrl,
          role: merchantStaffRoles.role,
        })
        .from(merchantStaffRoles)
        .innerJoin(stores, eq(merchantStaffRoles.storeId, stores.id))
        .where(
          and(
            eq(merchantStaffRoles.userId, userId),
            eq(merchantStaffRoles.isActive, true),
            eq(stores.isActive, true)
          )
        )
        .orderBy(desc(merchantStaffRoles.createdAt));

      // 🔥 刷刷平台 - 测试账号检测
      // 测试账号拥有所有7种账号类型的权限
      const { isTestAccount } = await import('../shared/testAccounts');
      const isTestUser = isTestAccount(user.lineUserId);
      
      if (isTestUser) {
        console.log(`[TEST ACCOUNT] 检测到测试账号: ${user.displayName} (${user.lineUserId})`);
      }

      // 判断主要角色类型：优先级 owner > operator > verifier > consumer
      // 用户默认都是消费者，如果有其他角色则显示最高优先级角色
      let primaryRole: 'consumer' | 'owner' | 'operator' | 'verifier' | 'sysadmin' | 'creator' = 'consumer';
      const roleSet = new Set(userRoles.map(r => r.role));
      
      // 测试账号默认显示sysadmin角色
      if (isTestUser) {
        primaryRole = 'sysadmin';
      } else if (roleSet.has('owner')) {
        primaryRole = 'owner';
      } else if (roleSet.has('operator')) {
        primaryRole = 'operator';
      } else if (roleSet.has('verifier')) {
        primaryRole = 'verifier';
      }

      return res.json({
        success: true,
        data: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          shuaName: user.shuaName,
          shuaBio: user.shuaBio,
          avatarUrl: user.avatarUrl,
          language: user.language,
          // 主要角色（用于UI切换）
          primaryRole,
          // 所有角色列表（用于角色切换）
          roles: userRoles.map(r => ({
            storeId: r.storeId,
            storeName: r.storeName,
            storeImageUrl: r.storeImageUrl,
            role: r.role,
          })),
          // 是否有各类角色的快速判断
          // 🔥 测试账号拥有所有角色权限
          hasOwnerRole: isTestUser || roleSet.has('owner'),
          hasOperatorRole: isTestUser || roleSet.has('operator'),
          hasVerifierRole: isTestUser || roleSet.has('verifier'),
          hasSysAdminRole: isTestUser,
          hasCreatorRole: isTestUser,
          hasMemberRole: isTestUser,
          // 标记是否是测试账号
          isTestAccount: isTestUser,
        },
      });
    } catch (error) {
      console.error('[API /api/me] error', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

  // 刷刷升级 - 获取当前用户在各门店的角色
  app.get('/api/me/roles', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = (req.user as any).id;

      // 获取用户基本信息
      const [user] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // 获取用户在各门店的角色
      const roles = await db
        .select({
          storeId: merchantStaffRoles.storeId,
          storeName: stores.name,
          storeImageUrl: stores.imageUrl,
          role: merchantStaffRoles.role,
        })
        .from(merchantStaffRoles)
        .innerJoin(stores, eq(merchantStaffRoles.storeId, stores.id))
        .where(
          and(
            eq(merchantStaffRoles.userId, userId),
            eq(merchantStaffRoles.isActive, true),
            eq(stores.isActive, true)
          )
        )
        .orderBy(desc(merchantStaffRoles.createdAt));

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
          roles: roles.map(r => ({
            storeId: r.storeId,
            storeName: r.storeName,
            storeImageUrl: r.storeImageUrl,
            role: r.role,
          })),
        },
      });
    } catch (error) {
      console.error('[API /api/me/roles] error', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

  app.post("/api/auth/line/init-oauth", async (req, res) => {
    try {
      const { state: rawState, campaignId, returnTo } = req.body ?? {};
      const sessionID = (req as any).sessionID;

      // campaignId is now optional - if not provided, will redirect to /me after login
      if (!campaignId) {
        console.log("[OAUTH INIT] no campaignId provided, will redirect to /me after login");
      }

      if (!LINE_CHANNEL_ID) {
        console.error("[OAUTH INIT] LINE_CHANNEL_ID not configured");
        return res.status(500).json({
          success: false,
          message: "LINE login not configured",
        });
      }

      let state: string;
      if (typeof rawState === "string" && rawState.length > 0) {
        state = rawState;
        console.log("[OAUTH INIT] using client state", { state, campaignId, sessionID });
      } else {
        state = nanoid();
        console.warn("[OAUTH INIT] missing state from client, generated on server", {
          state,
          campaignId,
          sessionID,
        });
      }

      if (!req.session) {
        throw new Error("Session is not initialized");
      }
      if (!(req.session as any).oauthStates) {
        (req.session as any).oauthStates = {};
      }

      (req.session as any).oauthStates[state] = {
        campaignId: campaignId ? String(campaignId) : null,
        returnTo: typeof returnTo === "string" ? returnTo : (campaignId ? undefined : '/me'),
        timestamp: Date.now(),
      };

      console.log("[OAUTH INIT] stored state OK", {
        sessionID,
        state,
        oauthStatesKeys: Object.keys((req.session as any).oauthStates),
      });

      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/line/callback`;
      const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", LINE_CHANNEL_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("scope", "profile openid");

      console.log("[OAUTH INIT] response 200 redirectUrl=", authUrl.toString());
      return res.json({
        success: true,
        redirectUrl: authUrl.toString(),
      });
    } catch (err) {
      console.error("[OAUTH INIT] error:", err);
      return res.status(500).json({
        success: false,
        message: "LINE OAuth init failed",
      });
    }
  });
 


  // LIFF ID Token login endpoint (POST)
  // Used when logging in via LIFF SDK - receives ID token directly
  app.post('/api/auth/line/callback', async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        console.error('[LIFF LOGIN] missing idToken');
        return res.status(400).json({ success: false, message: 'Missing ID token' });
      }

      // Verify ID token
      const lineProfile = await verifyLineIdToken(idToken);

      if (!lineProfile) {
        console.error('[LIFF LOGIN] invalid id_token');
        return res.status(401).json({ success: false, message: 'Invalid ID token' });
      }

      console.log('[LIFF LOGIN] profile:', {
        sub: lineProfile.sub,
        name: lineProfile.name,
      });

      // Create or update user (same logic as OAuth callback)
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
        console.log('[LIFF LOGIN] created new user:', existingUser.id);
      } else {
        await db
          .update(users)
          .set({
            displayName: lineProfile.name,
            avatarUrl: lineProfile.picture,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
        console.log('[LIFF LOGIN] updated existing user:', existingUser.id);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: existingUser.id,
          lineUserId: existingUser.lineUserId,
          type: 'user' as const,
        },
        JWT_SECRET_VALUE,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      // Return user data with token
      return res.json({
        success: true,
        token,
        user: {
          id: existingUser.id,
          lineUserId: existingUser.lineUserId,
          displayName: existingUser.displayName,
          avatarUrl: existingUser.avatarUrl,
        },
      });
    } catch (err) {
      console.error('[LIFF LOGIN] error:', err);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // LINE OAuth callback endpoint (GET)
  // Used for traditional OAuth flow with authorization code
  // Supports two state formats:
  // 1. Session-based: state is a random string, OAuth data stored in session
  // 2. Encoded-in-state: state is base64url-encoded JSON with redirectPath and fromChannel (for external H5)
  app.get('/api/auth/line/callback', async (req: Request, res: Response) => {
    try {
      console.log('[OAUTH CB] query=', req.query);
      console.log('[OAUTH CB] cookie=', req.headers.cookie || '');
      console.log('[OAUTH CB] sessionID=', (req as any).sessionID);
      console.log(
        '[OAUTH CB] hasSession=',
        !!req.session,
        'oauthStatesKeys=',
        req.session && req.session.oauthStates
          ? Object.keys(req.session.oauthStates)
          : []
      );

      const { code, state } = req.query;

      if (!code || !state || typeof state !== "string") {
        console.warn("[OAUTH CB] missing code or state", { code, state });
        return res.redirect("/?error=missing_params");
      }

      // Try to decode state as base64url JSON (external H5 flow)
      let decodedStatePayload: { redirectPath?: string; fromChannel?: string; timestamp?: number } | null = null;
      let isEncodedState = false;
      
      try {
        // Add padding if needed for base64url
        const base64 = state.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const decoded = Buffer.from(padded, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        
        // Validate it looks like our expected format
        if (parsed && typeof parsed === 'object' && (parsed.redirectPath || parsed.fromChannel)) {
          decodedStatePayload = parsed;
          isEncodedState = true;
          console.log('[OAUTH CB] Decoded state payload (external H5):', decodedStatePayload);
        }
      } catch (e) {
        // Not a valid base64url JSON, treat as session-based state
        console.log('[OAUTH CB] State is not encoded JSON, using session-based validation');
      }

      let storedOAuthData: { returnTo?: string; campaignId?: string; timestamp?: number; fromChannel?: string } | null = null;
      
      if (isEncodedState && decodedStatePayload) {
        // External H5 flow: state contains redirect info directly
        // Validate timestamp to prevent replay attacks (valid for 5 minutes)
        const fiveMinutes = 5 * 60 * 1000;
        if (decodedStatePayload.timestamp && Date.now() - decodedStatePayload.timestamp > fiveMinutes) {
          console.warn('[OAUTH CB] External H5 state expired');
          return res.redirect(`/?error=oauth_expired`);
        }
        
        storedOAuthData = {
          returnTo: decodedStatePayload.redirectPath || '/',
          fromChannel: decodedStatePayload.fromChannel || 'direct',
          timestamp: decodedStatePayload.timestamp,
        };
        console.log('[OAUTH CB] Using external H5 state:', storedOAuthData);
      } else {
        // Session-based flow: validate state against server-side stored value
        if (!req.session) {
          console.error('[OAUTH CB] req.session is undefined');
          return res.redirect('/?error=session_missing');
        }

        // CSRF Protection: Validate state against server-side stored value
        const storedStates = req.session.oauthStates || {};
        storedOAuthData = storedStates[state] || null;

        console.log('[OAUTH CB] storedOAuthData=', storedOAuthData);

        if (!req.session.oauthStates || !storedOAuthData) {
          console.error('[OAUTH CB] state not found', {
            state,
            sessionID: (req as any).sessionID,
            hasStates: !!req.session.oauthStates,
            availableStates: req.session.oauthStates ? Object.keys(req.session.oauthStates) : [],
          });
          return res.redirect(`/?error=csrf_invalid_state`);
        }

        // Check timestamp to prevent replay attacks (valid for 5 minutes)
        const fiveMinutes = 5 * 60 * 1000;
        if (storedOAuthData.timestamp && Date.now() - storedOAuthData.timestamp > fiveMinutes) {
          console.warn('[OAUTH CB] oauth state expired, state=', state);
          delete storedStates[state];
          return res.redirect(`/?error=oauth_expired`);
        }

        // Clear the used state to prevent replay
        delete storedStates[state];
      }

      // Build redirect URI (must match what was used in OAuth request)
      const redirectUri = `https://${req.get('host')}/api/auth/line/callback`;
      console.log('[OAUTH CB] redirectUri for token exchange=', redirectUri);

      // Exchange authorization code for tokens
      const tokens = await exchangeLineAuthCode(code as string, redirectUri);

      if (!tokens || !tokens.id_token) {
        console.error('[OAUTH CB] token_exchange_failed, tokens=', tokens);
        return res.redirect(`/?error=token_exchange_failed`);
      }

      // Verify ID token
      const lineProfile = await verifyLineIdToken(tokens.id_token);

      if (!lineProfile) {
        console.error('[OAUTH CB] invalid id_token');
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

      // Step 5.2-B: Update user's preferred_language if not set
      const preferredLang = mapLineLangToPreferredLang(lineProfile.language);
      
      // Refresh user data to get latest values
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingUser.id))
        .limit(1);

      if (currentUser && !currentUser.preferredLanguage) {
        await db
          .update(users)
          .set({
            preferredLanguage: preferredLang,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
        
        console.log('[OAUTH CB] Set preferred_language for user:', {
          userId: existingUser.id,
          preferredLanguage: preferredLang,
        });
      }

      // Step 5.3: Upsert oa_user_links (track OA relationship, no welcome message yet)
      // 产品设计：入口是 GoodPick Go OA，但欢迎消息来自 DeeCard OA
      const oaId = DEECARD_MAIN_OA_ID;
      const lineUserId = lineProfile.sub;

      const [existingLink] = await db
        .select()
        .from(oaUserLinks)
        .where(
          and(
            eq(oaUserLinks.oaId, oaId),
            eq(oaUserLinks.lineUserId, lineUserId)
          )
        )
        .limit(1);

      if (!existingLink) {
        // First time seeing this LINE user for this OA - create new link
        await db.insert(oaUserLinks).values({
          oaId,
          lineUserId,
          userId: existingUser.id,
          initialLanguage: preferredLang,
          welcomeSent: false,
          welcomeSentAt: null,
        });

        console.log('[OAUTH CB] Created new oa_user_link:', {
          oaId,
          lineUserId,
          userId: existingUser.id,
          initialLanguage: preferredLang,
        });
      } else if (!existingLink.userId) {
        // Link exists but userId not set (from follow event?) - update it
        await db
          .update(oaUserLinks)
          .set({
            userId: existingUser.id,
            updatedAt: new Date(),
          })
          .where(eq(oaUserLinks.id, existingLink.id));

        console.log('[OAUTH CB] Updated oa_user_link with userId:', {
          linkId: existingLink.id,
          userId: existingUser.id,
        });
      } else {
        console.log('[OAUTH CB] oa_user_link already exists and complete:', {
          linkId: existingLink.id,
          userId: existingLink.userId,
        });
      }

      // Step 6: Send welcome message if needed
      // Re-fetch the link to get the latest state (including initialLanguage)
      const [latestLink] = await db
        .select()
        .from(oaUserLinks)
        .where(
          and(
            eq(oaUserLinks.oaId, oaId),
            eq(oaUserLinks.lineUserId, lineUserId)
          )
        )
        .limit(1);

      // Re-fetch user to get latest preferredLanguage
      const [latestUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingUser.id))
        .limit(1);

      if (latestLink && latestUser) {
        try {
          await sendWelcomeMessageIfNeeded({
            user: {
              id: latestUser.id,
              preferredLanguage: latestUser.preferredLanguage ?? null,
            },
            lineUserId,
            oaId,
            initialLanguage: latestLink.initialLanguage,
          });
        } catch (error) {
          // Don't let welcome message failure break the login flow
          console.error('[OAUTH CB] Welcome message failed, but login continues:', {
            error: error instanceof Error ? error.message : String(error),
            userId: latestUser.id,
          });
        }
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

      let redirectUrl: string;
      if (storedOAuthData.returnTo) {
        // 检查returnTo是否已有query参数，决定用?还是&
        const separator = storedOAuthData.returnTo.includes('?') ? '&' : '?';
        redirectUrl = `${storedOAuthData.returnTo}${separator}token=${encodeURIComponent(
          token
        )}&firstLogin=true`;
      } else if (storedOAuthData.campaignId) {
        redirectUrl = `/campaign/${storedOAuthData.campaignId}?token=${encodeURIComponent(
          token
        )}&autoClaim=true`;
      } else {
        redirectUrl = `/?token=${encodeURIComponent(token)}`;
      }

      console.log('[OAUTH CB] success, redirectUrl=', redirectUrl);

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

      // ✅ 手机号已在前端验证完成，后端不再重复验证
      console.log('✅ LINE OAuth成功，用户:', {
        lineUserId: lineProfile.sub,
        displayName: lineProfile.name,
        staffId: staffPreset.staffId
      });

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

      // 刷刷升级：同时写入 merchantStaffRoles 表，授予核销员角色
      await db
        .insert(merchantStaffRoles)
        .values({
          userId: user.id,
          storeId: staffPreset.storeId,
          role: 'verifier',
        })
        .onConflictDoNothing();

      // Generate JWT token for staff
      const token = jwt.sign(
        {
          id: user.id,
          lineUserId: user.lineUserId,
          type: 'user' as const,
          staffId: staffPreset.staffId,
          staffName: staffPreset.name,
          storeId: staffPreset.storeId,
        },
        JWT_SECRET_VALUE,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      console.log('✅ 员工绑定成功，跳转到工作台', {
        staffId: staffPreset.staffId,
        userId: user.id
      });

      // Redirect to staff work area with token
      res.redirect(`/staff/redeem?token=${encodeURIComponent(token)}&firstLogin=true`);
    } catch (error) {
      console.error('Staff LINE OAuth callback error:', error);
      res.redirect(`/staff/bind?error=callback_failed`);
    }
  });

  // ============ B. User Endpoints ============

  // 获取所有活跃活动列表（公开，无需认证）
  app.get('/api/campaigns', async (req: Request, res: Response) => {
    try {
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
          staffInstructionsSource: campaigns.staffInstructionsSource,
          staffInstructionsZh: campaigns.staffInstructionsZh,
          staffInstructionsEn: campaigns.staffInstructionsEn,
          staffInstructionsTh: campaigns.staffInstructionsTh,
          staffTrainingSource: campaigns.staffTrainingSource,
          staffTrainingZh: campaigns.staffTrainingZh,
          staffTrainingEn: campaigns.staffTrainingEn,
          staffTrainingTh: campaigns.staffTrainingTh,
          staffTrainingMediaUrls: campaigns.staffTrainingMediaUrls,
        })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.isActive, true),
            sql`${campaigns.startAt} <= ${now}`,
            sql`${campaigns.endAt} >= ${now}`
          )
        )
        .orderBy(desc(campaigns.startAt));

      // 获取每个活动关联的店铺信息
      const campaignsWithStores = await Promise.all(
        activeCampaigns.map(async (campaign) => {
          const storeList = await db
            .select({
              id: stores.id,
              name: stores.name,
              imageUrl: stores.imageUrl,
              city: stores.city,
              address: stores.address,
              category: stores.category,
            })
            .from(stores)
            .innerJoin(campaignStores, eq(stores.id, campaignStores.storeId))
            .where(eq(campaignStores.campaignId, campaign.id));
          
          return {
            ...campaign,
            stores: storeList,
          };
        })
      );

      res.json({
        success: true,
        data: campaignsWithStores,
      });
    } catch (error) {
      console.error('Get campaigns list error:', error);
      res.status(500).json({ success: false, message: '获取活动列表失败' });
    }
  });

  // 公开的商品列表API（发现页使用）
  app.get('/api/products', async (req: Request, res: Response) => {
    try {
      const { limit = 20 } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 20, 50);

      const activeProducts = await db
        .select({
          id: products.id,
          storeId: products.storeId,
          name: products.name,
          descriptionSource: products.descriptionSource,
          descriptionZh: products.descriptionZh,
          descriptionEn: products.descriptionEn,
          descriptionTh: products.descriptionTh,
          price: products.price,
          originalPrice: products.originalPrice,
          unit: products.unit,
          coverImage: products.coverImage,
          status: products.status,
          isRecommend: products.isRecommend,
          isNew: products.isNew,
          isHot: products.isHot,
          salesCount: products.salesCount,
        })
        .from(products)
        .where(eq(products.status, 'active'))
        .orderBy(desc(products.salesCount), desc(products.createdAt))
        .limit(limitNum);

      // 获取每个商品关联的店铺信息
      const productsWithStores = await Promise.all(
        activeProducts.map(async (product) => {
          const [store] = await db
            .select({
              id: stores.id,
              name: stores.name,
              imageUrl: stores.imageUrl,
              city: stores.city,
              category: stores.category,
            })
            .from(stores)
            .where(eq(stores.id, product.storeId))
            .limit(1);
          
          return {
            ...product,
            store: store || null,
          };
        })
      );

      res.json({
        success: true,
        data: productsWithStores,
      });
    } catch (error) {
      console.error('Get products list error:', error);
      res.status(500).json({ success: false, message: '获取商品列表失败' });
    }
  });

  // 公开的商品详情API（消费者端使用）
  app.get('/api/products/:id', async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ success: false, message: '无效的商品ID' });
      }

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在' });
      }

      // 获取店铺信息
      const [store] = await db
        .select({
          id: stores.id,
          name: stores.name,
          imageUrl: stores.imageUrl,
          city: stores.city,
          address: stores.address,
          phone: stores.phone,
        })
        .from(stores)
        .where(eq(stores.id, product.storeId))
        .limit(1);

      res.json({
        success: true,
        data: {
          ...product,
          store: store || null,
        },
      });
    } catch (error) {
      console.error('Get product detail error:', error);
      res.status(500).json({ success: false, message: '获取商品详情失败' });
    }
  });

      app.get('/api/campaigns/:id', optionalUserAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['x-gpgo-session'] || 'no-session-id';
      const ua = req.headers['user-agent'] || 'no-ua';
      console.log('[API]', new Date().toISOString(), req.method, req.path, 'session=', sessionId, 'ua=', ua);
      
      const campaignId = parseInt(req.params.id);
      const language = req.headers['accept-language'] || 'th-th';

      const [campaign] = await db
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
          mediaUrls: campaigns.mediaUrls,
          couponValue: campaigns.couponValue,
          discountType: campaigns.discountType,
          originalPrice: campaigns.originalPrice,
          startAt: campaigns.startAt,
          endAt: campaigns.endAt,
          maxPerUser: campaigns.maxPerUser,
          maxTotal: campaigns.maxTotal,
          currentClaimed: campaigns.currentClaimed,
          channel: campaigns.channel,
          staffInstructionsSource: campaigns.staffInstructionsSource,
          staffInstructionsZh: campaigns.staffInstructionsZh,
          staffInstructionsEn: campaigns.staffInstructionsEn,
          staffInstructionsTh: campaigns.staffInstructionsTh,
          staffTrainingSource: campaigns.staffTrainingSource,
          staffTrainingZh: campaigns.staffTrainingZh,
          staffTrainingEn: campaigns.staffTrainingEn,
          staffTrainingTh: campaigns.staffTrainingTh,
          staffTrainingMediaUrls: campaigns.staffTrainingMediaUrls,
        })
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
          titleSource: campaign.titleSource,
          titleZh: campaign.titleZh,
          titleEn: campaign.titleEn,
          titleTh: campaign.titleTh,
          description,
          descriptionSource: campaign.descriptionSource,
          descriptionZh: campaign.descriptionZh,
          descriptionEn: campaign.descriptionEn,
          descriptionTh: campaign.descriptionTh,
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
          staffInstructionsSource: campaign.staffInstructionsSource,
          staffInstructionsZh: campaign.staffInstructionsZh,
          staffInstructionsEn: campaign.staffInstructionsEn,
          staffInstructionsTh: campaign.staffInstructionsTh,
          staffTrainingSource: campaign.staffTrainingSource,
          staffTrainingZh: campaign.staffTrainingZh,
          staffTrainingEn: campaign.staffTrainingEn,
          staffTrainingTh: campaign.staffTrainingTh,
          staffTrainingMediaUrls: campaign.staffTrainingMediaUrls || [],
          stores: storeList.map(s => ({
            id: s.id,
            name: s.name,
            city: s.city,
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            phone: s.phone,
            imageUrl: s.imageUrl,
            floorInfo: s.floorInfo,
          })),
          userClaimedCount,
          myStatus: {
            loggedIn: !!req.user,
            hasClaimed: userClaimedCount > 0,
          },
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

      // 刷刷升级：同时写入 merchantStaffRoles 表，授予核销员角色
      await db
        .insert(merchantStaffRoles)
        .values({
          userId: user.id,
          storeId: preset.storeId,
          role: 'verifier',
        })
        .onConflictDoNothing();

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
      
      // 使用泰国时区 (UTC+7)
      const BANGKOK_OFFSET = 7 * 60; // 7小时 = 420分钟
      const now = new Date();
      const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET * 60 * 1000);
      
      // 泰国今天0点 (UTC时间)
      const todayStart = new Date(Date.UTC(
        bangkokNow.getUTCFullYear(),
        bangkokNow.getUTCMonth(),
        bangkokNow.getUTCDate()
      ) - BANGKOK_OFFSET * 60 * 1000);
      
      // 7天前
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // 泰国本月1号0点 (UTC时间)
      const monthStart = new Date(Date.UTC(
        bangkokNow.getUTCFullYear(),
        bangkokNow.getUTCMonth(),
        1
      ) - BANGKOK_OFFSET * 60 * 1000);

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
          staffInstructionsSource: campaigns.staffInstructionsSource,
          staffInstructionsZh: campaigns.staffInstructionsZh,
          staffInstructionsEn: campaigns.staffInstructionsEn,
          staffInstructionsTh: campaigns.staffInstructionsTh,
          staffTrainingSource: campaigns.staffTrainingSource,
          staffTrainingZh: campaigns.staffTrainingZh,
          staffTrainingEn: campaigns.staffTrainingEn,
          staffTrainingTh: campaigns.staffTrainingTh,
          staffTrainingMediaUrls: campaigns.staffTrainingMediaUrls,
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
      const { name, brand, city, address, latitude, longitude, phone, rating, imageUrl, floorInfo } = req.body;

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
          floorInfo,
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
      const { name, brand, city, address, latitude, longitude, phone, rating, imageUrl, floorInfo, isActive } = req.body;

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
          floorInfo,
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
      url.searchParams.set('components', 'country:th');
      url.searchParams.set('location', '13.7563,100.5018');
      url.searchParams.set('radius', '50000');

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
      url.searchParams.set('fields', 'name,formatted_address,address_components,geometry,rating,photos,international_phone_number,formatted_phone_number');

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

      // 智能提取城市/府名 - 优先级：府(Province) > 城市(City) > 区(District)
      let city = '';
      if (place.address_components && Array.isArray(place.address_components)) {
        // 对于泰国，administrative_area_level_1 是府（Province），相当于中国的市
        // 优先使用府名作为城市，这样能确保规范性
        const provinceComponent = place.address_components.find((component: any) =>
          component.types.includes('administrative_area_level_1')
        );
        const localityComponent = place.address_components.find((component: any) =>
          component.types.includes('locality')
        );
        const districtComponent = place.address_components.find((component: any) =>
          component.types.includes('administrative_area_level_2')
        );
        
        // 按优先级选择：府 > 城市 > 区
        if (provinceComponent) {
          city = provinceComponent.long_name;
        } else if (localityComponent) {
          city = localityComponent.long_name;
        } else if (districtComponent) {
          city = districtComponent.long_name;
        }
      }

      const phone = place.international_phone_number || place.formatted_phone_number || null;

      res.json({
        success: true,
        place: {
          name: place.name,
          address: place.formatted_address,
          city: city,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          rating: place.rating,
          phone: phone,
          imageUrl,
        },
      });
    } catch (error) {
      console.error('Places details error:', error);
      res.status(500).json({ success: false, message: 'Failed to get place details' });
    }
  });

  // ============ Google Places API (公开访问，因为只是地址搜索，不涉及敏感数据) ============

  app.get('/api/places/autocomplete', async (req: Request, res: Response) => {
    try {
      const input = req.query.input as string;
      const language = req.query.language as string || 'en';
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
      url.searchParams.set('language', language);
      // 不限制国家，支持全球搜索
      url.searchParams.set('types', 'establishment|geocode');

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

  app.get('/api/places/details/:placeId', async (req: Request, res: Response) => {
    try {
      const { placeId } = req.params;
      const language = req.query.language as string || 'en';
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Google Maps API key not configured' });
      }

      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('language', language);
      url.searchParams.set('fields', 'name,formatted_address,address_components,geometry');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Places Details API error:', data);
        return res.status(500).json({ success: false, message: 'Places Details API error' });
      }

      const place = data.result;

      // 智能提取城市和国家
      let city = '';
      let country = '';
      if (place.address_components && Array.isArray(place.address_components)) {
        // 提取国家
        const countryComponent = place.address_components.find((component: any) =>
          component.types.includes('country')
        );
        if (countryComponent) {
          country = countryComponent.long_name;
        }

        // 提取城市（按优先级）
        const provinceComponent = place.address_components.find((component: any) =>
          component.types.includes('administrative_area_level_1')
        );
        const localityComponent = place.address_components.find((component: any) =>
          component.types.includes('locality')
        );
        const districtComponent = place.address_components.find((component: any) =>
          component.types.includes('administrative_area_level_2')
        );
        
        if (provinceComponent) {
          city = provinceComponent.long_name;
        } else if (localityComponent) {
          city = localityComponent.long_name;
        } else if (districtComponent) {
          city = districtComponent.long_name;
        }
      }

      res.json({
        success: true,
        place: {
          name: place.name,
          address: place.formatted_address,
          city: city,
          country: country,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
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
        staffInstructionsSourceLang = 'th-th',
        staffInstructionsSource,
        staffTrainingSourceLang = 'th-th',
        staffTrainingSource,
        staffTrainingMediaUrls,
      } = req.body;

      if (!titleSource || !descriptionSource) {
        return res.status(400).json({ success: false, message: 'Title and description are required' });
      }

      const translations = await translateCampaignContent(
        titleSourceLang,
        titleSource,
        descriptionSource,
        staffInstructionsSource,
        staffTrainingSource
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
          staffInstructionsSourceLang,
          staffInstructionsSource,
          staffInstructionsZh: translations.staffInstructionsZh,
          staffInstructionsEn: translations.staffInstructionsEn,
          staffInstructionsTh: translations.staffInstructionsTh,
          staffTrainingSourceLang,
          staffTrainingSource,
          staffTrainingZh: translations.staffTrainingZh,
          staffTrainingEn: translations.staffTrainingEn,
          staffTrainingTh: translations.staffTrainingTh,
          staffTrainingMediaUrls,
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
        staffInstructionsSourceLang,
        staffInstructionsSource,
        staffTrainingSourceLang,
        staffTrainingSource,
        staffTrainingMediaUrls,
      } = req.body;

      let translations: any = {};
      if (titleSource && descriptionSource) {
        translations = await translateCampaignContent(
          titleSourceLang || 'th-th',
          titleSource,
          descriptionSource,
          staffInstructionsSource,
          staffTrainingSource
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

      if (staffInstructionsSource) {
        updateData.staffInstructionsSourceLang = staffInstructionsSourceLang || 'th-th';
        updateData.staffInstructionsSource = staffInstructionsSource;
        updateData.staffInstructionsZh = translations.staffInstructionsZh;
        updateData.staffInstructionsEn = translations.staffInstructionsEn;
        updateData.staffInstructionsTh = translations.staffInstructionsTh;
      }

      if (staffTrainingSource) {
        updateData.staffTrainingSourceLang = staffTrainingSourceLang || 'th-th';
        updateData.staffTrainingSource = staffTrainingSource;
        updateData.staffTrainingZh = translations.staffTrainingZh;
        updateData.staffTrainingEn = translations.staffTrainingEn;
        updateData.staffTrainingTh = translations.staffTrainingTh;
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
      if (staffTrainingMediaUrls !== undefined) updateData.staffTrainingMediaUrls = staffTrainingMediaUrls;

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

  // ============ E2. Admin - Campaign Broadcast ============

  /**
   * Create and trigger a campaign broadcast
   * POST /api/admin/campaigns/:id/broadcast
   * 
   * Creates a broadcast task and immediately executes it.
   * Sends campaign message to all OA-linked users.
   */
  app.post('/api/admin/campaigns/:id/broadcast', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const admin = req.admin as Admin;
      const oaId = GOODPICK_MAIN_OA_ID;

      // Validate campaign exists
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found',
        });
      }

      console.log('[ADMIN BROADCAST] Creating broadcast for campaign:', {
        campaignId,
        adminId: admin.id,
        oaId,
      });

      // Create broadcast task
      const broadcast = await createCampaignBroadcast(campaignId, admin.id, oaId);

      // Trigger broadcast execution asynchronously
      // Don't await - let it run in background
      runBroadcastTask(broadcast.id).catch(error => {
        console.error('[ADMIN BROADCAST] Background broadcast task failed:', {
          broadcastId: broadcast.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      res.json({
        success: true,
        message: 'Broadcast task created and started',
        data: {
          broadcastId: broadcast.id,
          campaignId: broadcast.campaignId,
          status: broadcast.status,
        },
      });
    } catch (error) {
      console.error('[ADMIN BROADCAST] Error creating broadcast:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create broadcast',
      });
    }
  });

  /**
   * Get broadcast history for a campaign
   * GET /api/admin/campaigns/:id/broadcasts
   */
  app.get('/api/admin/campaigns/:id/broadcasts', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);

      const broadcasts = await db
        .select()
        .from(campaignBroadcasts)
        .where(eq(campaignBroadcasts.campaignId, campaignId))
        .orderBy(desc(campaignBroadcasts.createdAt));

      res.json({
        success: true,
        data: broadcasts,
      });
    } catch (error) {
      console.error('[ADMIN BROADCAST] Error fetching broadcasts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch broadcast history',
      });
    }
  });

  /**
   * Get broadcast task status
   * GET /api/admin/broadcasts/:id
   */
  app.get('/api/admin/broadcasts/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const broadcastId = parseInt(req.params.id);

      const [broadcast] = await db
        .select()
        .from(campaignBroadcasts)
        .where(eq(campaignBroadcasts.id, broadcastId))
        .limit(1);

      if (!broadcast) {
        return res.status(404).json({
          success: false,
          message: 'Broadcast not found',
        });
      }

      res.json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      console.error('[ADMIN BROADCAST] Error fetching broadcast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch broadcast status',
      });
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

      // Get brand stats by joining through campaign_stores
      const brandStats = await db
        .select({
          brand: stores.brand,
          storeCount: sql<number>`count(DISTINCT ${stores.id})::int`,
          issuedCount: sql<number>`count(DISTINCT CASE WHEN ${coupons.issuedAt} >= ${monthStart} AND ${coupons.issuedAt} <= ${monthEnd} THEN ${coupons.id} END)::int`,
          redeemedCount: sql<number>`count(DISTINCT CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} AND ${coupons.redeemedStoreId} = ${stores.id} THEN ${coupons.id} END)::int`,
        })
        .from(stores)
        .leftJoin(campaignStores, eq(stores.id, campaignStores.storeId))
        .leftJoin(coupons, eq(campaignStores.campaignId, coupons.campaignId))
        .where(isNotNull(stores.brand))
        .groupBy(stores.brand)
        .orderBy(sql`count(DISTINCT CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} AND ${coupons.redeemedStoreId} = ${stores.id} THEN ${coupons.id} END) DESC`);

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

      // Get store stats by joining through campaign_stores
      const storeStats = await db
        .select({
          storeId: stores.id,
          storeName: stores.name,
          brand: stores.brand,
          city: stores.city,
          issuedCount: sql<number>`count(DISTINCT CASE WHEN ${coupons.issuedAt} >= ${monthStart} AND ${coupons.issuedAt} <= ${monthEnd} THEN ${coupons.id} END)::int`,
          redeemedCount: sql<number>`count(DISTINCT CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} AND ${coupons.redeemedStoreId} = ${stores.id} THEN ${coupons.id} END)::int`,
        })
        .from(stores)
        .leftJoin(campaignStores, eq(stores.id, campaignStores.storeId))
        .leftJoin(coupons, eq(campaignStores.campaignId, coupons.campaignId))
        .groupBy(stores.id, stores.name, stores.brand, stores.city)
        .orderBy(sql`count(DISTINCT CASE WHEN ${coupons.status} = 'used' AND ${coupons.usedAt} >= ${monthStart} AND ${coupons.usedAt} <= ${monthEnd} AND ${coupons.redeemedStoreId} = ${stores.id} THEN ${coupons.id} END) DESC`)
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

  // ============ H. Payment Config API ============

  // Get store payment config
  app.get('/api/admin/stores/:id/payment', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      
      const [config] = await db
        .select()
        .from(paymentConfigs)
        .where(eq(paymentConfigs.storeId, storeId));
      
      const [rule] = await db
        .select()
        .from(membershipRules)
        .where(eq(membershipRules.storeId, storeId));
      
      res.json({
        success: true,
        data: {
          paymentConfig: config || null,
          membershipRule: rule || null,
        },
      });
    } catch (error) {
      console.error('Get payment config error:', error);
      res.status(500).json({ success: false, message: '获取支付配置失败' });
    }
  });

  // Create or update store payment config
  app.put('/api/admin/stores/:id/payment', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const { bankName, accountNumber, accountName, promptpayId, qrCodeUrl, isActive } = req.body;
      
      const [existing] = await db
        .select()
        .from(paymentConfigs)
        .where(eq(paymentConfigs.storeId, storeId));
      
      let config;
      if (existing) {
        [config] = await db
          .update(paymentConfigs)
          .set({
            bankName,
            accountNumber,
            accountName,
            promptpayId,
            qrCodeUrl,
            isActive: isActive ?? true,
            updatedAt: new Date(),
          })
          .where(eq(paymentConfigs.storeId, storeId))
          .returning();
      } else {
        [config] = await db
          .insert(paymentConfigs)
          .values({
            storeId,
            provider: 'promptpay',
            bankName,
            accountNumber,
            accountName,
            promptpayId,
            qrCodeUrl,
            isActive: isActive ?? true,
          })
          .returning();
      }
      
      res.json({ success: true, data: config });
    } catch (error) {
      console.error('Update payment config error:', error);
      res.status(500).json({ success: false, message: '更新支付配置失败' });
    }
  });

  // Update membership rules
  app.put('/api/admin/stores/:id/membership-rules', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const { silverThreshold, goldThreshold, platinumThreshold, pointsDivisor, welcomeCampaignId } = req.body;
      
      const [existing] = await db
        .select()
        .from(membershipRules)
        .where(eq(membershipRules.storeId, storeId));
      
      let rule;
      if (existing) {
        [rule] = await db
          .update(membershipRules)
          .set({
            silverThreshold: silverThreshold?.toString(),
            goldThreshold: goldThreshold?.toString(),
            platinumThreshold: platinumThreshold?.toString(),
            pointsDivisor,
            welcomeCampaignId,
            updatedAt: new Date(),
          })
          .where(eq(membershipRules.storeId, storeId))
          .returning();
      } else {
        [rule] = await db
          .insert(membershipRules)
          .values({
            storeId,
            silverThreshold: silverThreshold?.toString() || '500',
            goldThreshold: goldThreshold?.toString() || '2000',
            platinumThreshold: platinumThreshold?.toString() || '5000',
            pointsDivisor: pointsDivisor || 10,
            welcomeCampaignId,
          })
          .returning();
      }
      
      res.json({ success: true, data: rule });
    } catch (error) {
      console.error('Update membership rules error:', error);
      res.status(500).json({ success: false, message: '更新会员规则失败' });
    }
  });

  // Merchant: Get my stores (stores owned by current user)
  app.get('/api/stores/my', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: '未登录' });
      }
      
      // Get stores where user is owner or has operator role
      const ownedStores = await db
        .select()
        .from(stores)
        .where(eq(stores.ownerId, userId))
        .orderBy(desc(stores.createdAt));
      
      // Also get stores where user has operator role
      const operatorRoles = await db
        .select({
          storeId: merchantStaffRoles.storeId,
        })
        .from(merchantStaffRoles)
        .where(
          and(
            eq(merchantStaffRoles.userId, userId),
            eq(merchantStaffRoles.role, 'operator')
          )
        );
      
      const operatorStoreIds = operatorRoles.map(r => r.storeId).filter((id): id is number => id !== null);
      
      let operatorStores: any[] = [];
      if (operatorStoreIds.length > 0) {
        operatorStores = await db
          .select()
          .from(stores)
          .where(inArray(stores.id, operatorStoreIds));
      }
      
      // Combine and deduplicate
      const allStores = [...ownedStores];
      for (const store of operatorStores) {
        if (!allStores.find(s => s.id === store.id)) {
          allStores.push(store);
        }
      }
      
      res.json({ success: true, data: allStores });
    } catch (error) {
      console.error('Get my stores error:', error);
      res.status(500).json({ success: false, message: '获取店铺列表失败' });
    }
  });

  // Public: Get single store details (for store front page)
  app.get('/api/stores/:id', async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      
      if (isNaN(storeId)) {
        return res.status(400).json({ success: false, message: '无效的店铺ID' });
      }
      
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, storeId));
      
      if (!store) {
        return res.status(404).json({ success: false, message: '店铺不存在' });
      }
      
      // 安全处理：不返回敏感 Token，只返回是否已配置的标识
      const safeStore = {
        ...store,
        lineOaChannelToken: undefined, // 不返回实际 Token
        hasLineOaToken: !!store.lineOaChannelToken, // 只返回是否已配置
      };
      
      res.json({ success: true, data: safeStore });
    } catch (error) {
      console.error('Get store error:', error);
      res.status(500).json({ success: false, message: '获取店铺信息失败' });
    }
  });

  // Merchant: Create new store
  app.post('/api/stores', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: '未登录' });
      }

      const {
        name,
        brand,
        city,
        address,
        phone,
        descriptionZh,
        descriptionEn,
        descriptionTh,
        industryType,
        businessHours,
        coverImages,
        deliveryTime,
        pickupTime,
      } = req.body;

      // Validate required fields
      if (!name || !city || !address) {
        return res.status(400).json({ 
          success: false, 
          message: '店铺名称、城市和地址是必填项' 
        });
      }

      // Create store
      const [newStore] = await db
        .insert(stores)
        .values({
          name,
          brand: brand || null,
          city,
          address,
          phone: phone || null,
          descriptionZh: descriptionZh || null,
          descriptionEn: descriptionEn || null,
          descriptionTh: descriptionTh || null,
          industryType: industryType || 'food',
          businessStatus: 'open',
          businessHours: businessHours || null,
          coverImages: coverImages || null,
          deliveryTime: deliveryTime || null,
          pickupTime: pickupTime || null,
          isActive: true,
        })
        .returning();

      // Create owner role for this user
      await db.insert(merchantStaffRoles).values({
        userId,
        storeId: newStore.id,
        role: 'owner',
        isActive: true,
      });

      res.json({ 
        success: true, 
        data: newStore,
        message: '门店创建成功'
      });
    } catch (error) {
      console.error('Create store error:', error);
      res.status(500).json({ success: false, message: '创建门店失败' });
    }
  });

  // Merchant: Update store details
  app.patch('/api/stores/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (isNaN(storeId)) {
        return res.status(400).json({ success: false, message: '无效的店铺ID' });
      }

      if (!userId) {
        return res.status(401).json({ success: false, message: '未登录' });
      }

      // Check if user is owner of this store
      const [userStaffRole] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, storeId),
          eq(merchantStaffRoles.role, 'owner')
        ));

      if (!userStaffRole) {
        return res.status(403).json({ success: false, message: '您没有权限编辑此门店' });
      }

      const {
        name,
        brand,
        city,
        address,
        phone,
        description,
        industryType,
        category,
        businessStatus,
        businessHours,
        coverImages,
        deliveryTime,
        pickupTime,
        businessLicenseUrl,
        foodLicenseUrl,
        imageUrl,
        lineOaId,
        lineOaUrl,
        lineOaChannelToken,
      } = req.body;

      const updateData: any = { updatedAt: new Date() };
      
      if (name !== undefined) updateData.name = name;
      if (brand !== undefined) updateData.brand = brand;
      if (city !== undefined) updateData.city = city;
      if (address !== undefined) updateData.address = address;
      if (phone !== undefined) updateData.phone = phone;
      
      // 自动翻译描述到多语言
      if (description !== undefined && description.trim()) {
        updateData.descriptionZh = description;
        // 异步翻译其他语言（不阻塞主流程）
        translateText(description, 'zh-cn', 'en-us').then(enText => {
          db.update(stores).set({ descriptionEn: enText }).where(eq(stores.id, storeId)).execute();
        }).catch(err => console.error('Auto-translate EN failed:', err));
        translateText(description, 'zh-cn', 'th-th').then(thText => {
          db.update(stores).set({ descriptionTh: thText }).where(eq(stores.id, storeId)).execute();
        }).catch(err => console.error('Auto-translate TH failed:', err));
      }
      
      if (industryType !== undefined) updateData.industryType = industryType;
      if (category !== undefined) updateData.category = category;
      if (businessStatus !== undefined) updateData.businessStatus = businessStatus;
      if (businessHours !== undefined) updateData.businessHours = businessHours;
      if (coverImages !== undefined) updateData.coverImages = coverImages;
      if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime;
      if (pickupTime !== undefined) updateData.pickupTime = pickupTime;
      if (businessLicenseUrl !== undefined) updateData.businessLicenseUrl = businessLicenseUrl;
      if (foodLicenseUrl !== undefined) updateData.foodLicenseUrl = foodLicenseUrl;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      
      // LINE OA 配置
      if (lineOaId !== undefined) updateData.lineOaId = lineOaId;
      if (lineOaUrl !== undefined) updateData.lineOaUrl = lineOaUrl;
      // Token 只有在有值时才更新（前端只在用户输入新值时才发送）
      if (lineOaChannelToken !== undefined && lineOaChannelToken.trim()) {
        updateData.lineOaChannelToken = lineOaChannelToken;
      }

      const [updatedStore] = await db
        .update(stores)
        .set(updateData)
        .where(eq(stores.id, storeId))
        .returning();

      if (!updatedStore) {
        return res.status(404).json({ success: false, message: '门店不存在' });
      }

      // 安全处理：不返回敏感 Token
      const safeStore = {
        ...updatedStore,
        lineOaChannelToken: undefined,
        hasLineOaToken: !!updatedStore.lineOaChannelToken,
      };

      res.json({ success: true, message: '门店信息已更新', data: safeStore });
    } catch (error) {
      console.error('Update store error:', error);
      res.status(500).json({ success: false, message: '更新门店信息失败' });
    }
  });

  // Generate store payment QR code page URL
  app.get('/api/stores/:id/pay', async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, storeId));
      
      if (!store) {
        return res.status(404).json({ success: false, message: '门店不存在' });
      }
      
      const [config] = await db
        .select()
        .from(paymentConfigs)
        .where(eq(paymentConfigs.storeId, storeId));
      
      res.json({
        success: true,
        data: {
          store: {
            id: store.id,
            name: store.name,
            brand: store.brand,
            imageUrl: store.imageUrl,
          },
          paymentConfig: config ? {
            provider: config.provider,
            bankName: config.bankName,
            accountName: config.accountName,
            promptpayId: config.promptpayId,
            qrCodeUrl: config.qrCodeUrl,
            isActive: config.isActive,
          } : null,
        },
      });
    } catch (error) {
      console.error('Get store payment info error:', error);
      res.status(500).json({ success: false, message: '获取门店支付信息失败' });
    }
  });

  // Payment callback webhook (for future payment provider integration)
  app.post('/api/webhooks/payment/:provider', async (req: Request, res: Response) => {
    try {
      const provider = req.params.provider;
      console.log(`[PAYMENT WEBHOOK] Received from ${provider}:`, JSON.stringify(req.body));
      
      // TODO: Implement actual payment provider verification
      // For now, just log and acknowledge
      
      res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  });

  // Record payment and create membership
  app.post('/api/stores/:id/payment-complete', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const { amount, providerTxnId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: '金额无效' });
      }
      
      // Create payment transaction record
      const [transaction] = await db
        .insert(paymentTransactions)
        .values({
          storeId,
          userId,
          provider: 'promptpay',
          providerTxnId: providerTxnId || `manual_${Date.now()}`,
          amount: amount.toString(),
          status: 'paid',
          paidAt: new Date(),
        })
        .returning();
      
      // Get membership rules
      const [rule] = await db
        .select()
        .from(membershipRules)
        .where(eq(membershipRules.storeId, storeId));
      
      const pointsDivisor = rule?.pointsDivisor || 10;
      const earnedPoints = Math.floor(amount / pointsDivisor);
      
      // Update or create membership
      const [existingMembership] = await db
        .select()
        .from(userStoreMemberships)
        .where(and(
          eq(userStoreMemberships.userId, userId),
          eq(userStoreMemberships.storeId, storeId)
        ));
      
      let membership;
      if (existingMembership) {
        const newTotalAmount = parseFloat(existingMembership.totalAmount || '0') + amount;
        const newPoints = (existingMembership.points || 0) + earnedPoints;
        const newVisitCount = (existingMembership.visitCount || 0) + 1;
        
        // Calculate new tier
        let newTier: 'basic' | 'silver' | 'gold' | 'platinum' = 'basic';
        const silverThreshold = parseFloat(rule?.silverThreshold || '500');
        const goldThreshold = parseFloat(rule?.goldThreshold || '2000');
        const platinumThreshold = parseFloat(rule?.platinumThreshold || '5000');
        
        if (newTotalAmount >= platinumThreshold) newTier = 'platinum';
        else if (newTotalAmount >= goldThreshold) newTier = 'gold';
        else if (newTotalAmount >= silverThreshold) newTier = 'silver';
        
        [membership] = await db
          .update(userStoreMemberships)
          .set({
            totalAmount: newTotalAmount.toString(),
            points: newPoints,
            visitCount: newVisitCount,
            tier: newTier,
            lastVisitAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userStoreMemberships.id, existingMembership.id))
          .returning();
      } else {
        // Create new membership
        let tier: 'basic' | 'silver' | 'gold' | 'platinum' = 'basic';
        const silverThreshold = parseFloat(rule?.silverThreshold || '500');
        
        if (amount >= silverThreshold) tier = 'silver';
        
        [membership] = await db
          .insert(userStoreMemberships)
          .values({
            userId,
            storeId,
            tier,
            points: earnedPoints,
            totalAmount: amount.toString(),
            visitCount: 1,
            lastVisitAt: new Date(),
            joinedAt: new Date(),
          })
          .returning();
      }
      
      // Get store info for response
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, storeId));
      
      res.json({
        success: true,
        data: {
          transaction,
          membership,
          store: {
            id: store.id,
            name: store.name,
            brand: store.brand,
          },
          earnedPoints,
        },
      });
    } catch (error) {
      console.error('Payment complete error:', error);
      res.status(500).json({ success: false, message: '处理支付失败' });
    }
  });

  // Get user's memberships
  app.get('/api/me/memberships', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      const memberships = await db
        .select({
          id: userStoreMemberships.id,
          tier: userStoreMemberships.tier,
          points: userStoreMemberships.points,
          totalAmount: userStoreMemberships.totalAmount,
          visitCount: userStoreMemberships.visitCount,
          lastVisitAt: userStoreMemberships.lastVisitAt,
          joinedAt: userStoreMemberships.joinedAt,
          storeId: stores.id,
          storeName: stores.name,
          storeBrand: stores.brand,
          storeImageUrl: stores.imageUrl,
        })
        .from(userStoreMemberships)
        .innerJoin(stores, eq(userStoreMemberships.storeId, stores.id))
        .where(eq(userStoreMemberships.userId, userId))
        .orderBy(desc(userStoreMemberships.lastVisitAt));
      
      res.json({ success: true, data: memberships });
    } catch (error) {
      console.error('Get memberships error:', error);
      res.status(500).json({ success: false, message: '获取会员信息失败' });
    }
  });

  // ============ I. Media Upload ============

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

  // 用户媒体上传 API
  app.post('/api/user/upload', userAuthMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const userId = req.user!.id;
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = req.file.originalname.split('.').pop();
      const objectName = `user/${userId}/${timestamp}-${randomStr}.${ext}`;

      const fileUrl = await getOssService().uploadFile(
        objectName,
        req.file.buffer,
        req.file.mimetype
      );

      const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

      // 注意：不写入 media_files 表，因为该表的 uploaded_by 字段是外键约束到 admins 表
      // 普通用户上传的文件直接返回 URL 即可，无需记录到 media_files

      res.json({
        success: true,
        fileUrl,
        fileType,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error('User upload file error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
  });

  // 通用图片上传 API (商户商品图片等)
  app.post('/api/upload/image', userAuthMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ success: false, message: 'Only images are allowed' });
      }

      const userId = req.user!.id;
      const folder = req.body.folder || 'images';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = req.file.originalname.split('.').pop();
      const objectName = `${folder}/${userId}/${timestamp}-${randomStr}.${ext}`;

      const fileUrl = await getOssService().uploadFile(
        objectName,
        req.file.buffer,
        req.file.mimetype
      );

      // 注意：不写入 media_files 表，因为该表的 uploaded_by 字段是外键约束到 admins 表
      // 普通用户上传的文件直接返回 URL 即可

      res.json({
        success: true,
        url: fileUrl,
        fileType: 'image',
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
  });

  // ============ J. 刷刷号创作者 API ============

  // 将creator content转换为驼峰格式
  function formatCreatorContent(content: any) {
    return {
      id: content.id,
      creatorUserId: content.creatorUserId,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      mediaUrls: content.mediaUrls,
      coverImageUrl: content.coverImageUrl,
      status: content.status,
      category: content.category,
      viewCount: content.viewCount,
      likeCount: content.likeCount,
      commentCount: content.commentCount,
      shareCount: content.shareCount,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  // 获取创作者内容列表
  app.get('/api/creator/contents', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string || undefined;
      
      let query = db
        .select()
        .from(creatorContents)
        .where(eq(creatorContents.creatorUserId, userId));
      
      if (status && (status === 'draft' || status === 'published')) {
        query = db
          .select()
          .from(creatorContents)
          .where(and(
            eq(creatorContents.creatorUserId, userId),
            eq(creatorContents.status, status)
          ));
      }
      
      const contents = await query.orderBy(desc(creatorContents.updatedAt));
      
      res.json({ success: true, data: contents.map(formatCreatorContent) });
    } catch (error) {
      console.error('Get creator contents error:', error);
      res.status(500).json({ success: false, message: '获取内容列表失败' });
    }
  });

  // 获取单个内容详情
  app.get('/api/creator/contents/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const contentId = parseInt(req.params.id);
      
      const [content] = await db
        .select()
        .from(creatorContents)
        .where(and(
          eq(creatorContents.id, contentId),
          eq(creatorContents.creatorUserId, userId)
        ))
        .limit(1);
      
      if (!content) {
        return res.status(404).json({ success: false, message: '内容不存在' });
      }
      
      // 获取绑定的推广信息
      const bindings = await db
        .select({
          binding: promotionBindings,
          campaign: campaigns,
          store: stores,
        })
        .from(promotionBindings)
        .leftJoin(campaigns, eq(promotionBindings.campaignId, campaigns.id))
        .leftJoin(stores, eq(promotionBindings.storeId, stores.id))
        .where(eq(promotionBindings.contentId, contentId));
      
      res.json({ 
        success: true, 
        data: { 
          ...formatCreatorContent(content), 
          promotionBindings: bindings 
        } 
      });
    } catch (error) {
      console.error('Get creator content error:', error);
      res.status(500).json({ success: false, message: '获取内容详情失败' });
    }
  });

  // 创建新内容
  app.post('/api/creator/contents', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { contentType, category, title, description, mediaUrls, coverImageUrl, status } = req.body;
      
      const [newContent] = await db
        .insert(creatorContents)
        .values({
          creatorUserId: userId,
          contentType: contentType || 'video',
          category: category || null,
          title,
          description,
          mediaUrls: mediaUrls || [],
          coverImageUrl,
          status: status || 'draft',
          publishedAt: status === 'published' ? new Date() : null,
        })
        .returning();
      
      // 如果直接发布，同步到short_videos表供刷刷首页feed显示
      if (status === 'published' && mediaUrls?.length > 0) {
        const finalContentType = contentType || 'video';
        
        if (finalContentType === 'video') {
          // 视频类型
          const videoUrl = mediaUrls.find((url: string) => url.match(/\.(mp4|mov|webm|m3u8)$/i)) || mediaUrls[0];
          await db.insert(shortVideos).values({
            creatorUserId: userId,
            contentType: 'video',
            sourceContentId: newContent.id,
            videoUrl: videoUrl,
            coverImageUrl: coverImageUrl || null,
            thumbnailUrl: coverImageUrl || null,
            title: title,
            description: description || null,
            category: category || null,
            status: 'ready',
            isPublic: true,
            publishedAt: new Date(),
          });
          console.log(`[SYNC] 已同步创作者视频 #${newContent.id} 到Feed (分类: ${category || '无'})`);
        } else if (finalContentType === 'article') {
          // 图文日记类型
          await db.insert(shortVideos).values({
            creatorUserId: userId,
            contentType: 'article',
            sourceContentId: newContent.id,
            videoUrl: null,
            coverImageUrl: coverImageUrl || mediaUrls[0] || null,  // 优先使用封面图，否则用第一张图
            thumbnailUrl: coverImageUrl || mediaUrls[0] || null,
            mediaUrls: mediaUrls,
            title: title,
            description: description || null,
            category: category || null,
            status: 'ready',
            isPublic: true,
            publishedAt: new Date(),
          });
          console.log(`[SYNC] 已同步创作者图文 #${newContent.id} 到Feed (分类: ${category || '无'})`);
        }
      }
      
      res.json({ success: true, data: newContent });
    } catch (error) {
      console.error('Create creator content error:', error);
      res.status(500).json({ success: false, message: '创建内容失败' });
    }
  });

  // 更新内容
  app.put('/api/creator/contents/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const contentId = parseInt(req.params.id);
      const { contentType, category, title, description, mediaUrls, coverImageUrl, status } = req.body;
      
      // 验证内容所有权
      const [existing] = await db
        .select()
        .from(creatorContents)
        .where(and(
          eq(creatorContents.id, contentId),
          eq(creatorContents.creatorUserId, userId)
        ))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ success: false, message: '内容不存在' });
      }
      
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (contentType) updateData.contentType = contentType;
      if (category !== undefined) updateData.category = category;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (mediaUrls !== undefined) updateData.mediaUrls = mediaUrls;
      if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
      
      const isNewlyPublished = status === 'published' && existing.status !== 'published';
      if (status) {
        updateData.status = status;
        if (isNewlyPublished) {
          updateData.publishedAt = new Date();
        }
      }
      
      const [updated] = await db
        .update(creatorContents)
        .set(updateData)
        .where(eq(creatorContents.id, contentId))
        .returning();
      
      // 如果刚刚发布，同步到short_videos表供刷刷首页feed显示
      const finalMediaUrls = mediaUrls !== undefined ? mediaUrls : existing.mediaUrls;
      const finalContentType = contentType || existing.contentType;
      const finalTitle = title !== undefined ? title : existing.title;
      const finalDescription = description !== undefined ? description : existing.description;
      const finalCoverImageUrl = coverImageUrl !== undefined ? coverImageUrl : existing.coverImageUrl;
      const finalCategory = category !== undefined ? category : existing.category;
      
      if (isNewlyPublished && finalMediaUrls?.length > 0) {
        if (finalContentType === 'video') {
          // 视频类型
          const videoUrl = finalMediaUrls.find((url: string) => url.match(/\.(mp4|mov|webm|m3u8)$/i)) || finalMediaUrls[0];
          await db.insert(shortVideos).values({
            creatorUserId: userId,
            contentType: 'video',
            sourceContentId: contentId,
            videoUrl: videoUrl,
            coverImageUrl: finalCoverImageUrl || null,
            thumbnailUrl: finalCoverImageUrl || null,
            title: finalTitle,
            description: finalDescription || null,
            category: finalCategory || null,
            status: 'ready',
            isPublic: true,
            publishedAt: new Date(),
          });
          console.log(`[SYNC] 已同步创作者视频 #${contentId} 到Feed (分类: ${finalCategory || '无'})`);
        } else if (finalContentType === 'article') {
          // 图文日记类型
          await db.insert(shortVideos).values({
            creatorUserId: userId,
            contentType: 'article',
            sourceContentId: contentId,
            videoUrl: null,
            coverImageUrl: finalCoverImageUrl || finalMediaUrls[0] || null,  // 优先使用封面图，否则用第一张图
            thumbnailUrl: finalCoverImageUrl || finalMediaUrls[0] || null,
            mediaUrls: finalMediaUrls,
            title: finalTitle,
            description: finalDescription || null,
            category: finalCategory || null,
            status: 'ready',
            isPublic: true,
            publishedAt: new Date(),
          });
          console.log(`[SYNC] 已同步创作者图文 #${contentId} 到Feed (分类: ${finalCategory || '无'})`);
        }
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Update creator content error:', error);
      res.status(500).json({ success: false, message: '更新内容失败' });
    }
  });

  // 删除内容
  app.delete('/api/creator/contents/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const contentId = parseInt(req.params.id);
      
      const [deleted] = await db
        .delete(creatorContents)
        .where(and(
          eq(creatorContents.id, contentId),
          eq(creatorContents.creatorUserId, userId)
        ))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ success: false, message: '内容不存在' });
      }
      
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      console.error('Delete creator content error:', error);
      res.status(500).json({ success: false, message: '删除内容失败' });
    }
  });

  // 获取可用的推广项目（卡券/活动）
  app.get('/api/creator/available-promotions', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      
      // 获取所有活跃的活动
      const activeCampaigns = await db
        .select({
          id: campaigns.id,
          title: campaigns.titleSource,
          titleZh: campaigns.titleZh,
          titleEn: campaigns.titleEn,
          titleTh: campaigns.titleTh,
          bannerImageUrl: campaigns.bannerImageUrl,
          couponValue: campaigns.couponValue,
          discountType: campaigns.discountType,
          endAt: campaigns.endAt,
        })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.isActive, true),
            sql`${campaigns.startAt} <= ${now}`,
            sql`${campaigns.endAt} >= ${now}`
          )
        )
        .orderBy(desc(campaigns.startAt));
      
      // 获取活动关联的门店
      const campaignIds = activeCampaigns.map(c => c.id);
      const storeLinks = campaignIds.length > 0 
        ? await db
            .select({
              campaignId: campaignStores.campaignId,
              storeId: campaignStores.storeId,
              storeName: stores.name,
            })
            .from(campaignStores)
            .innerJoin(stores, eq(campaignStores.storeId, stores.id))
            .where(inArray(campaignStores.campaignId, campaignIds))
        : [];
      
      // 组合数据，添加默认计费模式
      const promotions = activeCampaigns.map(campaign => {
        const storeLink = storeLinks.find(s => s.campaignId === campaign.id);
        return {
          id: campaign.id,
          type: 'campaign' as const,
          title: campaign.titleZh || campaign.title,
          merchantName: storeLink?.storeName || '未知商户',
          storeId: storeLink?.storeId,
          bannerImageUrl: campaign.bannerImageUrl,
          couponValue: campaign.couponValue,
          discountType: campaign.discountType,
          endAt: campaign.endAt,
          // 默认计费模式，实际可由商户配置
          billingMode: 'cpc' as const,
          price: 0.5, // 默认单价 $0.5/点击
        };
      });
      
      res.json({ success: true, data: promotions });
    } catch (error) {
      console.error('Get available promotions error:', error);
      res.status(500).json({ success: false, message: '获取推广项目失败' });
    }
  });

  // 绑定推广到内容
  app.post('/api/creator/contents/:id/bind-promotion', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const contentId = parseInt(req.params.id);
      const { promotionType, campaignId, storeId, billingMode, price } = req.body;
      
      // 验证内容所有权
      const [content] = await db
        .select()
        .from(creatorContents)
        .where(and(
          eq(creatorContents.id, contentId),
          eq(creatorContents.creatorUserId, userId)
        ))
        .limit(1);
      
      if (!content) {
        return res.status(404).json({ success: false, message: '内容不存在' });
      }
      
      // 创建绑定
      const [binding] = await db
        .insert(promotionBindings)
        .values({
          contentId,
          promotionType: promotionType || 'campaign',
          campaignId,
          storeId,
          billingMode: billingMode || 'cpc',
          price: price || '0.5',
          platformFeeRate: '0.30',
        })
        .returning();
      
      res.json({ success: true, data: binding });
    } catch (error) {
      console.error('Bind promotion error:', error);
      res.status(500).json({ success: false, message: '绑定推广失败' });
    }
  });

  // 解除推广绑定
  app.delete('/api/creator/bindings/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const bindingId = parseInt(req.params.id);
      
      // 验证绑定属于该创作者的内容
      const [binding] = await db
        .select({
          binding: promotionBindings,
          content: creatorContents,
        })
        .from(promotionBindings)
        .innerJoin(creatorContents, eq(promotionBindings.contentId, creatorContents.id))
        .where(and(
          eq(promotionBindings.id, bindingId),
          eq(creatorContents.creatorUserId, userId)
        ))
        .limit(1);
      
      if (!binding) {
        return res.status(404).json({ success: false, message: '绑定不存在' });
      }
      
      await db
        .delete(promotionBindings)
        .where(eq(promotionBindings.id, bindingId));
      
      res.json({ success: true, message: '解除绑定成功' });
    } catch (error) {
      console.error('Unbind promotion error:', error);
      res.status(500).json({ success: false, message: '解除绑定失败' });
    }
  });

  // 获取创作者收益统计
  app.get('/api/creator/earnings', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // 获取总收益
      const [totalEarnings] = await db
        .select({
          totalGross: sql<string>`COALESCE(SUM(${promotionEarnings.grossAmount}), 0)`,
          totalPlatformFee: sql<string>`COALESCE(SUM(${promotionEarnings.platformFee}), 0)`,
          totalCreatorEarning: sql<string>`COALESCE(SUM(${promotionEarnings.creatorEarning}), 0)`,
        })
        .from(promotionEarnings)
        .where(eq(promotionEarnings.creatorUserId, userId));
      
      // 获取最近的收益记录
      const recentEarnings = await db
        .select()
        .from(promotionEarnings)
        .where(eq(promotionEarnings.creatorUserId, userId))
        .orderBy(desc(promotionEarnings.createdAt))
        .limit(20);
      
      res.json({
        success: true,
        data: {
          summary: {
            totalGross: parseFloat(totalEarnings?.totalGross || '0'),
            totalPlatformFee: parseFloat(totalEarnings?.totalPlatformFee || '0'),
            totalCreatorEarning: parseFloat(totalEarnings?.totalCreatorEarning || '0'),
          },
          recentEarnings,
        },
      });
    } catch (error) {
      console.error('Get creator earnings error:', error);
      res.status(500).json({ success: false, message: '获取收益统计失败' });
    }
  });

  // 获取创作者统计数据
  app.get('/api/creator/stats', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // 内容统计
      const [contentStats] = await db
        .select({
          totalContents: sql<number>`COUNT(*)`,
          publishedContents: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
          draftContents: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
          totalViews: sql<number>`COALESCE(SUM(view_count), 0)`,
          totalLikes: sql<number>`COALESCE(SUM(like_count), 0)`,
        })
        .from(creatorContents)
        .where(eq(creatorContents.creatorUserId, userId));
      
      // 收益统计
      const [earningStats] = await db
        .select({
          totalEarning: sql<string>`COALESCE(SUM(${promotionEarnings.creatorEarning}), 0)`,
        })
        .from(promotionEarnings)
        .where(eq(promotionEarnings.creatorUserId, userId));
      
      res.json({
        success: true,
        data: {
          contents: {
            total: Number(contentStats?.totalContents || 0),
            published: Number(contentStats?.publishedContents || 0),
            drafts: Number(contentStats?.draftContents || 0),
          },
          engagement: {
            views: Number(contentStats?.totalViews || 0),
            likes: Number(contentStats?.totalLikes || 0),
          },
          earnings: {
            total: parseFloat(earningStats?.totalEarning || '0'),
          },
        },
      });
    } catch (error) {
      console.error('Get creator stats error:', error);
      res.status(500).json({ success: false, message: '获取统计数据失败' });
    }
  });

  // 获取创作者详细分析数据（时间维度统计）
  app.get('/api/creator/analytics', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // 获取创作者所有内容
      const allContents = await db
        .select()
        .from(creatorContents)
        .where(eq(creatorContents.creatorUserId, userId));
      
      // 总体统计
      const totalViews = allContents.reduce((sum, c) => sum + (c.viewCount || 0), 0);
      const totalLikes = allContents.reduce((sum, c) => sum + (c.likeCount || 0), 0);
      const totalShares = allContents.reduce((sum, c) => sum + (c.shareCount || 0), 0);
      const publishedContents = allContents.filter(c => c.status === 'published');
      
      // 粉丝统计
      const [followerStats] = await db
        .select({
          totalFollowers: sql<number>`COUNT(*)`,
        })
        .from(userFollows)
        .where(eq(userFollows.followingId, userId));
      
      const [followingStats] = await db
        .select({
          totalFollowing: sql<number>`COUNT(*)`,
        })
        .from(userFollows)
        .where(eq(userFollows.followerId, userId));
      
      // 7天内新增粉丝
      const [newFollowers7d] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followingId, userId),
            gte(userFollows.createdAt, sevenDaysAgo)
          )
        );
      
      // 评论统计（使用短视频评论表）
      const contentIds = publishedContents.map(c => c.id);
      let totalComments = 0;
      if (contentIds.length > 0) {
        const [commentStats] = await db
          .select({
            count: sql<number>`COUNT(*)`,
          })
          .from(shortVideoComments)
          .where(inArray(shortVideoComments.videoId, contentIds));
        totalComments = Number(commentStats?.count || 0);
      }
      
      // 收益统计
      const [earningStats] = await db
        .select({
          totalEarning: sql<string>`COALESCE(SUM(${promotionEarnings.creatorEarning}), 0)`,
        })
        .from(promotionEarnings)
        .where(eq(promotionEarnings.creatorUserId, userId));
      
      // 7天收益
      const [earning7d] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${promotionEarnings.creatorEarning}), 0)`,
        })
        .from(promotionEarnings)
        .where(
          and(
            eq(promotionEarnings.creatorUserId, userId),
            gte(promotionEarnings.createdAt, sevenDaysAgo)
          )
        );
      
      // 30天收益
      const [earning30d] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${promotionEarnings.creatorEarning}), 0)`,
        })
        .from(promotionEarnings)
        .where(
          and(
            eq(promotionEarnings.creatorUserId, userId),
            gte(promotionEarnings.createdAt, thirtyDaysAgo)
          )
        );
      
      // 生成过去7天的趋势数据（简化版，基于内容创建时间）
      const trendData: Array<{ date: string; views: number; likes: number; followers: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        // 简化的趋势数据 - 基于当天发布的内容
        const dayContents = publishedContents.filter(c => {
          const pubDate = c.publishedAt || c.createdAt;
          return pubDate && pubDate.toISOString().split('T')[0] === dateStr;
        });
        
        trendData.push({
          date: dateStr,
          views: dayContents.reduce((sum, c) => sum + (c.viewCount || 0), 0),
          likes: dayContents.reduce((sum, c) => sum + (c.likeCount || 0), 0),
          followers: 0, // 简化处理
        });
      }
      
      // 内容分类统计
      const categoryStats: Record<string, { count: number; views: number; likes: number }> = {};
      publishedContents.forEach(c => {
        const cat = c.category || 'other';
        if (!categoryStats[cat]) {
          categoryStats[cat] = { count: 0, views: 0, likes: 0 };
        }
        categoryStats[cat].count++;
        categoryStats[cat].views += c.viewCount || 0;
        categoryStats[cat].likes += c.likeCount || 0;
      });
      
      // 热门内容（按播放量排序）
      const topContents = [...publishedContents]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          title: c.title,
          contentType: c.contentType,
          coverImageUrl: c.coverImageUrl,
          viewCount: c.viewCount || 0,
          likeCount: c.likeCount || 0,
          shareCount: c.shareCount || 0,
        }));
      
      res.json({
        success: true,
        data: {
          overview: {
            totalViews,
            totalLikes,
            totalShares,
            totalComments,
            totalContents: publishedContents.length,
            totalFollowers: Number(followerStats?.totalFollowers || 0),
            totalFollowing: Number(followingStats?.totalFollowing || 0),
            newFollowers7d: Number(newFollowers7d?.count || 0),
          },
          earnings: {
            total: parseFloat(earningStats?.totalEarning || '0'),
            last7Days: parseFloat(earning7d?.total || '0'),
            last30Days: parseFloat(earning30d?.total || '0'),
          },
          trend: trendData,
          categoryStats,
          topContents,
        },
      });
    } catch (error) {
      console.error('Get creator analytics error:', error);
      res.status(500).json({ success: false, message: '获取分析数据失败' });
    }
  });

  // 更新刷刷号资料 (名称、简介)
  app.patch('/api/creator/profile', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { shuaName, shuaBio } = req.body;
      
      const updateData: any = {};
      if (shuaName !== undefined) {
        updateData.shuaName = shuaName.trim() || null;
      }
      if (shuaBio !== undefined) {
        updateData.shuaBio = shuaBio.trim() || null;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: '没有要更新的内容' });
      }
      
      updateData.updatedAt = new Date();
      
      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      res.json({
        success: true,
        data: {
          id: updated.id,
          shuaName: updated.shuaName,
          shuaBio: updated.shuaBio,
          displayName: updated.displayName,
        },
      });
    } catch (error) {
      console.error('Update creator profile error:', error);
      res.status(500).json({ success: false, message: '更新刷刷号资料失败' });
    }
  });

  // ============================================
  // 用户公开信息 API
  // ============================================
  
  // 获取用户公开资料
  app.get('/api/users/:id/profile', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
      }
      
      const [user] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          shuaName: users.shuaName,
          shuaBio: users.shuaBio,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({ success: false, message: '获取用户资料失败' });
    }
  });
  
  // 获取用户公开发布的内容
  app.get('/api/users/:id/contents', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
      }
      
      // 从 shortVideos 表获取用户发布的内容
      const userContents = await db
        .select({
          id: shortVideos.id,
          title: shortVideos.title,
          contentType: shortVideos.contentType,
          mediaUrls: shortVideos.mediaUrls,
          coverImageUrl: shortVideos.coverImageUrl,
          viewCount: shortVideos.viewCount,
          likeCount: shortVideos.likeCount,
        })
        .from(shortVideos)
        .where(and(
          eq(shortVideos.creatorUserId, userId),
          eq(shortVideos.status, 'ready'),
          eq(shortVideos.isPublic, true)
        ))
        .orderBy(desc(shortVideos.createdAt));
      
      res.json({ success: true, data: userContents });
    } catch (error) {
      console.error('Get user contents error:', error);
      res.status(500).json({ success: false, message: '获取用户内容失败' });
    }
  });

  // 获取用户统计数据（关注数、粉丝数、作品统计）
  app.get('/api/users/:id/stats', optionalUserAuth, async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.user?.id;
      
      if (isNaN(targetUserId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
      }

      // 获取关注数（该用户关注了多少人）
      const [followingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userFollows)
        .where(eq(userFollows.followerId, targetUserId));

      // 获取粉丝数（多少人关注了该用户）
      const [followerCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userFollows)
        .where(eq(userFollows.followingId, targetUserId));

      // 获取作品统计
      const [worksStats] = await db
        .select({
          worksCount: sql<number>`count(*)::int`,
          totalLikes: sql<number>`coalesce(sum(${shortVideos.likeCount}), 0)::int`,
          totalViews: sql<number>`coalesce(sum(${shortVideos.viewCount}), 0)::int`,
        })
        .from(shortVideos)
        .where(and(
          eq(shortVideos.creatorUserId, targetUserId),
          eq(shortVideos.status, 'ready'),
          eq(shortVideos.isPublic, true)
        ));

      // 检查当前用户是否关注了目标用户
      let isFollowing = false;
      if (currentUserId && currentUserId !== targetUserId) {
        const [followRecord] = await db
          .select()
          .from(userFollows)
          .where(and(
            eq(userFollows.followerId, currentUserId),
            eq(userFollows.followingId, targetUserId)
          ));
        isFollowing = !!followRecord;
      }

      res.json({
        success: true,
        data: {
          followingCount: followingCount?.count || 0,
          followerCount: followerCount?.count || 0,
          worksCount: worksStats?.worksCount || 0,
          totalLikes: worksStats?.totalLikes || 0,
          totalViews: worksStats?.totalViews || 0,
          isFollowing,
          isSelf: currentUserId === targetUserId,
        },
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ success: false, message: '获取用户统计失败' });
    }
  });

  // 关注/取消关注用户
  app.post('/api/users/:id/follow', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.user!.id;

      if (isNaN(targetUserId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
      }

      if (currentUserId === targetUserId) {
        return res.status(400).json({ success: false, message: '不能关注自己' });
      }

      // 检查目标用户是否存在
      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, targetUserId));

      if (!targetUser) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      // 检查是否已关注
      const [existingFollow] = await db
        .select()
        .from(userFollows)
        .where(and(
          eq(userFollows.followerId, currentUserId),
          eq(userFollows.followingId, targetUserId)
        ));

      if (existingFollow) {
        // 取消关注
        await db
          .delete(userFollows)
          .where(eq(userFollows.id, existingFollow.id));

        res.json({ success: true, following: false, message: '已取消关注' });
      } else {
        // 添加关注
        await db.insert(userFollows).values({
          followerId: currentUserId,
          followingId: targetUserId,
        });

        res.json({ success: true, following: true, message: '关注成功' });
      }
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({ success: false, message: '操作失败' });
    }
  });

  // 获取用户的关注列表
  app.get('/api/users/:id/following', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = (page - 1) * limit;

      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
      }

      const followingList = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          shuaName: users.shuaName,
          avatarUrl: users.avatarUrl,
          followedAt: userFollows.createdAt,
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followingId, users.id))
        .where(eq(userFollows.followerId, userId))
        .orderBy(desc(userFollows.createdAt))
        .offset(offset)
        .limit(limit);

      res.json({ success: true, data: followingList });
    } catch (error) {
      console.error('Get following list error:', error);
      res.status(500).json({ success: false, message: '获取关注列表失败' });
    }
  });

  // 获取用户的粉丝列表
  app.get('/api/users/:id/followers', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = (page - 1) * limit;

      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: '无效的用户ID' });
      }

      const followersList = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          shuaName: users.shuaName,
          avatarUrl: users.avatarUrl,
          followedAt: userFollows.createdAt,
        })
        .from(userFollows)
        .innerJoin(users, eq(userFollows.followerId, users.id))
        .where(eq(userFollows.followingId, userId))
        .orderBy(desc(userFollows.createdAt))
        .offset(offset)
        .limit(limit);

      res.json({ success: true, data: followersList });
    } catch (error) {
      console.error('Get followers list error:', error);
      res.status(500).json({ success: false, message: '获取粉丝列表失败' });
    }
  });

  // ============================================
  // 抖音式短视频系统 API
  // ============================================

  // 获取短视频流（游标分页，用于无限滚动）
  app.get('/api/short-videos/feed', optionalUserAuth, async (req: Request, res: Response) => {
    try {
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const category = req.query.category as string | undefined;
      const userId = req.user?.id;

      // 构建筛选条件
      const conditions = [
        eq(shortVideos.status, 'ready'),
        eq(shortVideos.isPublic, true)
      ];
      
      // 如果指定了分类且不是 'all'，则添加分类筛选
      if (category && category !== 'all') {
        conditions.push(eq(shortVideos.category, category));
      }

      // 获取公开且已就绪的内容（视频和图文）
      const videos = await db
        .select({
          id: shortVideos.id,
          contentType: shortVideos.contentType,  // 内容类型：video或article
          sourceContentId: shortVideos.sourceContentId,
          videoUrl: shortVideos.videoUrl,
          hlsUrl: shortVideos.hlsUrl,
          coverImageUrl: shortVideos.coverImageUrl,
          thumbnailUrl: shortVideos.thumbnailUrl,
          mediaUrls: shortVideos.mediaUrls,  // 图文的多张图片
          duration: shortVideos.duration,
          title: shortVideos.title,
          description: shortVideos.description,
          category: shortVideos.category,
          hashtags: shortVideos.hashtags,
          locationName: shortVideos.locationName,
          viewCount: shortVideos.viewCount,
          likeCount: shortVideos.likeCount,
          commentCount: shortVideos.commentCount,
          shareCount: shortVideos.shareCount,
          createdAt: shortVideos.createdAt,
          creatorUserId: shortVideos.creatorUserId,
          storeId: shortVideos.storeId,
          campaignId: shortVideos.campaignId,
          creatorShuaName: users.shuaName,
          creatorDisplayName: users.displayName,
          creatorAvatar: users.avatarUrl,
        })
        .from(shortVideos)
        .leftJoin(users, eq(shortVideos.creatorUserId, users.id))
        .where(and(...conditions))
        .orderBy(desc(shortVideos.publishedAt))
        .offset(cursor)
        .limit(limit + 1);

      const hasMore = videos.length > limit;
      const items = hasMore ? videos.slice(0, limit) : videos;

      // 如果用户已登录，检查每个视频是否已点赞
      let likedVideoIds: number[] = [];
      if (userId && items.length > 0) {
        const videoIds = items.map(v => v.id);
        const likes = await db
          .select({ videoId: shortVideoLikes.videoId })
          .from(shortVideoLikes)
          .where(and(
            inArray(shortVideoLikes.videoId, videoIds),
            eq(shortVideoLikes.userId, userId)
          ));
        likedVideoIds = likes.map(l => l.videoId);
      }

      res.json({
        success: true,
        data: {
          items: items.map(v => ({
            ...v,
            creatorName: v.creatorShuaName || v.creatorDisplayName || '匿名用户',
            videoUrl: convertHttpToHttps(v.videoUrl),
            hlsUrl: convertHttpToHttps(v.hlsUrl),
            coverImageUrl: convertHttpToHttps(v.coverImageUrl),
            thumbnailUrl: convertHttpToHttps(v.thumbnailUrl),
            mediaUrls: convertUrlArrayToHttps(v.mediaUrls),
            creatorAvatar: convertHttpToHttps(v.creatorAvatar),
            isLiked: likedVideoIds.includes(v.id),
          })),
          nextCursor: hasMore ? cursor + limit : null,
          hasMore,
        },
      });
    } catch (error) {
      console.error('Get short videos feed error:', error);
      res.status(500).json({ success: false, message: '获取视频流失败' });
    }
  });

  // 获取单个短视频详情
  app.get('/api/short-videos/:id', optionalUserAuth, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user?.id;

      const [video] = await db
        .select({
          id: shortVideos.id,
          contentType: shortVideos.contentType,
          videoUrl: shortVideos.videoUrl,
          hlsUrl: shortVideos.hlsUrl,
          coverImageUrl: shortVideos.coverImageUrl,
          mediaUrls: shortVideos.mediaUrls,
          duration: shortVideos.duration,
          title: shortVideos.title,
          description: shortVideos.description,
          hashtags: shortVideos.hashtags,
          locationName: shortVideos.locationName,
          viewCount: shortVideos.viewCount,
          likeCount: shortVideos.likeCount,
          commentCount: shortVideos.commentCount,
          shareCount: shortVideos.shareCount,
          createdAt: shortVideos.createdAt,
          creatorUserId: shortVideos.creatorUserId,
          storeId: shortVideos.storeId,
          campaignId: shortVideos.campaignId,
          creatorShuaName: users.shuaName,
          creatorDisplayName: users.displayName,
          creatorAvatar: users.avatarUrl,
        })
        .from(shortVideos)
        .leftJoin(users, eq(shortVideos.creatorUserId, users.id))
        .where(eq(shortVideos.id, videoId));

      if (!video) {
        return res.status(404).json({ success: false, message: '视频不存在' });
      }

      // 增加观看次数
      await db
        .update(shortVideos)
        .set({ viewCount: sql`${shortVideos.viewCount} + 1` })
        .where(eq(shortVideos.id, videoId));

      // 检查是否已点赞
      let isLiked = false;
      if (userId) {
        const [like] = await db
          .select()
          .from(shortVideoLikes)
          .where(and(
            eq(shortVideoLikes.videoId, videoId),
            eq(shortVideoLikes.userId, userId)
          ));
        isLiked = !!like;
      }

      res.json({
        success: true,
        data: { 
          ...video, 
          creatorName: video.creatorShuaName || video.creatorDisplayName || '匿名用户',
          videoUrl: convertHttpToHttps(video.videoUrl),
          hlsUrl: convertHttpToHttps(video.hlsUrl),
          coverImageUrl: convertHttpToHttps(video.coverImageUrl),
          mediaUrls: convertUrlArrayToHttps(video.mediaUrls),
          creatorAvatar: convertHttpToHttps(video.creatorAvatar),
          isLiked 
        },
      });
    } catch (error) {
      console.error('Get short video detail error:', error);
      res.status(500).json({ success: false, message: '获取视频详情失败' });
    }
  });

  // 上传短视频
  app.post('/api/short-videos', userAuthMiddleware, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]), async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const files = req.files as { [key: string]: Express.Multer.File[] };
      
      if (!files.video || !files.video[0]) {
        return res.status(400).json({ success: false, message: '请上传视频文件' });
      }

      const videoFile = files.video[0];
      const coverFile = files.cover?.[0];
      const thumbnailFile = files.thumbnail?.[0];

      const timestamp = Date.now();
      const randomStr = nanoid(8);

      // 上传视频
      const videoExt = videoFile.originalname.split('.').pop();
      const videoObjectName = `short-videos/${userId}/${timestamp}-${randomStr}.${videoExt}`;
      const videoUrl = await getOssService().uploadFile(
        videoObjectName,
        videoFile.buffer,
        videoFile.mimetype
      );

      // 生成 HLS 流式转码 URL（边转边播）
      const hlsUrl = getOssService().buildHlsBaseUrl(videoObjectName);
      console.log('[Short Video] Generated HLS URL:', hlsUrl);

      // 上传封面图（如果有）
      let coverImageUrl: string | undefined;
      if (coverFile) {
        const coverExt = coverFile.originalname.split('.').pop();
        const coverObjectName = `short-videos/${userId}/${timestamp}-${randomStr}-cover.${coverExt}`;
        coverImageUrl = await getOssService().uploadFile(
          coverObjectName,
          coverFile.buffer,
          coverFile.mimetype
        );
      }

      // 上传缩略图（如果有）
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.originalname.split('.').pop();
        const thumbObjectName = `short-videos/${userId}/${timestamp}-${randomStr}-thumb.${thumbExt}`;
        thumbnailUrl = await getOssService().uploadFile(
          thumbObjectName,
          thumbnailFile.buffer,
          thumbnailFile.mimetype
        );
      }

      // 解析请求体
      const { title, description, hashtags, locationName, storeId, campaignId, isPublic } = req.body;

      // 创建短视频记录
      const [newVideo] = await db.insert(shortVideos).values({
        creatorUserId: userId,
        videoUrl,
        hlsUrl,
        videoObjectKey: videoObjectName,
        coverImageUrl,
        thumbnailUrl,
        title: title || null,
        description: description || null,
        hashtags: hashtags ? JSON.parse(hashtags) : null,
        locationName: locationName || null,
        storeId: storeId ? parseInt(storeId) : null,
        campaignId: campaignId ? parseInt(campaignId) : null,
        status: 'ready',
        isPublic: isPublic !== 'false',
        publishedAt: new Date(),
        fileSize: videoFile.size,
        transcodeStatus: 'PENDING',
      }).returning();

      triggerTranscodeAfterUpload(videoObjectName, newVideo.id).catch(err => {
        console.error('[Short Video] Transcode trigger error:', err);
      });

      res.json({
        success: true,
        data: newVideo,
      });
    } catch (error) {
      console.error('Upload short video error:', error);
      res.status(500).json({ success: false, message: '上传视频失败' });
    }
  });

  // 点赞/取消点赞短视频
  app.post('/api/short-videos/:id/like', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user!.id;

      // 检查是否已点赞
      const [existingLike] = await db
        .select()
        .from(shortVideoLikes)
        .where(and(
          eq(shortVideoLikes.videoId, videoId),
          eq(shortVideoLikes.userId, userId)
        ));

      if (existingLike) {
        // 取消点赞
        await db
          .delete(shortVideoLikes)
          .where(eq(shortVideoLikes.id, existingLike.id));
        
        await db
          .update(shortVideos)
          .set({ likeCount: sql`GREATEST(${shortVideos.likeCount} - 1, 0)` })
          .where(eq(shortVideos.id, videoId));

        res.json({ success: true, liked: false });
      } else {
        // 添加点赞
        await db.insert(shortVideoLikes).values({
          videoId,
          userId,
        });

        await db
          .update(shortVideos)
          .set({ likeCount: sql`${shortVideos.likeCount} + 1` })
          .where(eq(shortVideos.id, videoId));

        res.json({ success: true, liked: true });
      }
    } catch (error) {
      console.error('Like short video error:', error);
      res.status(500).json({ success: false, message: '操作失败' });
    }
  });

  // 收藏/取消收藏短视频
  app.post('/api/short-videos/:id/bookmark', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user!.id;

      // 检查是否已收藏
      const [existingBookmark] = await db
        .select()
        .from(shortVideoBookmarks)
        .where(and(
          eq(shortVideoBookmarks.videoId, videoId),
          eq(shortVideoBookmarks.userId, userId)
        ));

      if (existingBookmark) {
        // 取消收藏
        await db
          .delete(shortVideoBookmarks)
          .where(eq(shortVideoBookmarks.id, existingBookmark.id));

        res.json({ success: true, bookmarked: false });
      } else {
        // 添加收藏
        await db.insert(shortVideoBookmarks).values({
          videoId,
          userId,
        });

        res.json({ success: true, bookmarked: true });
      }
    } catch (error) {
      console.error('Bookmark short video error:', error);
      res.status(500).json({ success: false, message: '操作失败' });
    }
  });

  // 获取短视频评论（支持嵌套回复结构）
  app.get('/api/short-videos/:id/comments', optionalUserAuth, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user?.id;
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      // 获取所有评论（包括回复）
      const allComments = await db
        .select({
          id: shortVideoComments.id,
          content: shortVideoComments.content,
          likeCount: shortVideoComments.likeCount,
          createdAt: shortVideoComments.createdAt,
          parentId: shortVideoComments.parentId,
          userId: shortVideoComments.userId,
          userName: sql<string>`COALESCE(${users.shuaName}, ${users.displayName}, '匿名用户')`,
          userAvatar: users.avatarUrl,
        })
        .from(shortVideoComments)
        .leftJoin(users, eq(shortVideoComments.userId, users.id))
        .where(eq(shortVideoComments.videoId, videoId))
        .orderBy(desc(shortVideoComments.createdAt));

      // 检查用户点赞状态
      let likedCommentIds: number[] = [];
      if (userId) {
        const likes = await db
          .select({ commentId: shortVideoCommentLikes.commentId })
          .from(shortVideoCommentLikes)
          .where(eq(shortVideoCommentLikes.userId, userId));
        likedCommentIds = likes.map(l => l.commentId);
      }

      // 分离顶层评论和回复
      const topLevelComments = allComments.filter(c => !c.parentId);
      const replies = allComments.filter(c => c.parentId);

      // 构建嵌套结构
      const commentsWithReplies = topLevelComments.map(comment => ({
        ...comment,
        userAvatar: convertHttpToHttps(comment.userAvatar),
        isLiked: likedCommentIds.includes(comment.id),
        replies: replies
          .filter(r => r.parentId === comment.id)
          .map(r => ({
            ...r,
            userAvatar: convertHttpToHttps(r.userAvatar),
            isLiked: likedCommentIds.includes(r.id),
          }))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        replyCount: replies.filter(r => r.parentId === comment.id).length,
      }));

      // 分页处理（只对顶层评论分页）
      const hasMore = commentsWithReplies.length > cursor + limit;
      const items = commentsWithReplies.slice(cursor, cursor + limit);

      res.json({
        success: true,
        data: {
          items,
          nextCursor: hasMore ? cursor + limit : null,
          hasMore,
        },
      });
    } catch (error) {
      console.error('Get short video comments error:', error);
      res.status(500).json({ success: false, message: '获取评论失败' });
    }
  });

  // 发表评论
  app.post('/api/short-videos/:id/comments', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { content, parentId } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: '评论内容不能为空' });
      }

      const [newComment] = await db.insert(shortVideoComments).values({
        videoId,
        userId,
        content: content.trim(),
        parentId: parentId ? parseInt(parentId) : null,
      }).returning();

      // 更新评论计数
      await db
        .update(shortVideos)
        .set({ commentCount: sql`${shortVideos.commentCount} + 1` })
        .where(eq(shortVideos.id, videoId));

      // 获取用户信息
      const [user] = await db
        .select({ 
          displayName: users.displayName, 
          shuaName: users.shuaName,
          avatarUrl: users.avatarUrl 
        })
        .from(users)
        .where(eq(users.id, userId));

      res.json({
        success: true,
        data: {
          ...newComment,
          userName: user?.shuaName || user?.displayName || '匿名用户',
          userAvatar: convertHttpToHttps(user?.avatarUrl),
        },
      });
    } catch (error) {
      console.error('Post short video comment error:', error);
      res.status(500).json({ success: false, message: '发表评论失败' });
    }
  });

  // 评论点赞/取消点赞
  app.post('/api/short-videos/comments/:id/like', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.user!.id;

      // 检查评论是否存在
      const [comment] = await db
        .select()
        .from(shortVideoComments)
        .where(eq(shortVideoComments.id, commentId));

      if (!comment) {
        return res.status(404).json({ success: false, message: '评论不存在' });
      }

      // 检查是否已点赞
      const [existingLike] = await db
        .select()
        .from(shortVideoCommentLikes)
        .where(and(
          eq(shortVideoCommentLikes.commentId, commentId),
          eq(shortVideoCommentLikes.userId, userId)
        ));

      if (existingLike) {
        // 取消点赞
        await db
          .delete(shortVideoCommentLikes)
          .where(eq(shortVideoCommentLikes.id, existingLike.id));
        
        await db
          .update(shortVideoComments)
          .set({ likeCount: sql`GREATEST(${shortVideoComments.likeCount} - 1, 0)` })
          .where(eq(shortVideoComments.id, commentId));

        res.json({ success: true, liked: false });
      } else {
        // 添加点赞
        await db.insert(shortVideoCommentLikes).values({
          commentId,
          userId,
        });

        await db
          .update(shortVideoComments)
          .set({ likeCount: sql`${shortVideoComments.likeCount} + 1` })
          .where(eq(shortVideoComments.id, commentId));

        res.json({ success: true, liked: true });
      }
    } catch (error) {
      console.error('Like comment error:', error);
      res.status(500).json({ success: false, message: '操作失败' });
    }
  });

  // 获取创作者的短视频列表
  app.get('/api/creator/short-videos', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string || undefined;

      let query = db
        .select()
        .from(shortVideos)
        .where(eq(shortVideos.creatorUserId, userId))
        .orderBy(desc(shortVideos.createdAt));

      if (status) {
        query = db
          .select()
          .from(shortVideos)
          .where(and(
            eq(shortVideos.creatorUserId, userId),
            eq(shortVideos.status, status as any)
          ))
          .orderBy(desc(shortVideos.createdAt));
      }

      const videos = await query;

      res.json({
        success: true,
        data: videos,
      });
    } catch (error) {
      console.error('Get creator short videos error:', error);
      res.status(500).json({ success: false, message: '获取视频列表失败' });
    }
  });

  // 删除短视频
  app.delete('/api/short-videos/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user!.id;

      // 验证所有权
      const [video] = await db
        .select()
        .from(shortVideos)
        .where(and(
          eq(shortVideos.id, videoId),
          eq(shortVideos.creatorUserId, userId)
        ));

      if (!video) {
        return res.status(404).json({ success: false, message: '视频不存在或无权限删除' });
      }

      // 软删除：更新状态为deleted
      await db
        .update(shortVideos)
        .set({ status: 'deleted', isPublic: false })
        .where(eq(shortVideos.id, videoId));

      res.json({ success: true });
    } catch (error) {
      console.error('Delete short video error:', error);
      res.status(500).json({ success: false, message: '删除视频失败' });
    }
  });

  // ========== 商品管理 API ==========

  // 获取门店商品分类列表
  app.get('/api/stores/:storeId/product-categories', async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      
      const categories = await db
        .select()
        .from(productCategories)
        .where(and(
          eq(productCategories.storeId, storeId),
          eq(productCategories.isActive, true)
        ))
        .orderBy(productCategories.sortOrder);

      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Get product categories error:', error);
      res.status(500).json({ success: false, message: '获取商品分类失败' });
    }
  });

  // 创建商品分类
  app.post('/api/stores/:storeId/product-categories', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const { nameSource, sortOrder } = req.body;

      const [category] = await db
        .insert(productCategories)
        .values({
          storeId,
          nameSource,
          nameZh: nameSource,
          sortOrder: sortOrder || 0,
        })
        .returning();

      // 异步翻译
      translateText(nameSource, 'zh-cn', 'en-us').then(enText => {
        db.update(productCategories).set({ nameEn: enText }).where(eq(productCategories.id, category.id)).execute();
      }).catch(err => console.error('Translate category EN failed:', err));
      translateText(nameSource, 'zh-cn', 'th-th').then(thText => {
        db.update(productCategories).set({ nameTh: thText }).where(eq(productCategories.id, category.id)).execute();
      }).catch(err => console.error('Translate category TH failed:', err));

      res.json({ success: true, data: category });
    } catch (error) {
      console.error('Create product category error:', error);
      res.status(500).json({ success: false, message: '创建分类失败' });
    }
  });

  // 更新商品分类
  app.patch('/api/stores/:storeId/product-categories/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const categoryId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const { nameSource, sortOrder, isActive } = req.body;
      const updateData: any = { updatedAt: new Date() };
      
      if (nameSource !== undefined) {
        updateData.nameSource = nameSource;
        updateData.nameZh = nameSource;
        // 异步翻译
        translateText(nameSource, 'zh-cn', 'en-us').then(enText => {
          db.update(productCategories).set({ nameEn: enText }).where(eq(productCategories.id, categoryId)).execute();
        }).catch(err => console.error('Translate category EN failed:', err));
        translateText(nameSource, 'zh-cn', 'th-th').then(thText => {
          db.update(productCategories).set({ nameTh: thText }).where(eq(productCategories.id, categoryId)).execute();
        }).catch(err => console.error('Translate category TH failed:', err));
      }
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [category] = await db
        .update(productCategories)
        .set(updateData)
        .where(and(
          eq(productCategories.id, categoryId),
          eq(productCategories.storeId, storeId)
        ))
        .returning();

      res.json({ success: true, data: category });
    } catch (error) {
      console.error('Update product category error:', error);
      res.status(500).json({ success: false, message: '更新分类失败' });
    }
  });

  // 删除商品分类
  app.delete('/api/stores/:storeId/product-categories/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const categoryId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      // 软删除
      await db
        .update(productCategories)
        .set({ isActive: false })
        .where(and(
          eq(productCategories.id, categoryId),
          eq(productCategories.storeId, storeId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error('Delete product category error:', error);
      res.status(500).json({ success: false, message: '删除分类失败' });
    }
  });

  // 获取门店商品列表
  app.get('/api/stores/:storeId/products', async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const { status, categoryId, search } = req.query;
      
      let query = db
        .select()
        .from(products)
        .where(eq(products.storeId, storeId))
        .orderBy(products.sortOrder, desc(products.createdAt));

      const productList = await query;
      
      // 过滤
      let filtered = productList;
      if (status) {
        filtered = filtered.filter(p => p.status === status);
      }
      if (categoryId) {
        filtered = filtered.filter(p => p.categoryId === parseInt(categoryId as string));
      }
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
        );
      }

      res.json({ success: true, data: filtered });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ success: false, message: '获取商品列表失败' });
    }
  });

  // 获取单个商品详情
  app.get('/api/stores/:storeId/products/:id', async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const productId = parseInt(req.params.id);
      
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.storeId, storeId)
        ));

      if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在' });
      }

      res.json({ success: true, data: product });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ success: false, message: '获取商品详情失败' });
    }
  });

  // 创建商品
  app.post('/api/stores/:storeId/products', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const {
        name,
        categoryId,
        sku,
        description,
        price,
        originalPrice,
        unit,
        inventory,
        coverImage,
        gallery,
        status,
        isRecommend,
        isNew,
        isHot,
        minPurchaseQty,
        maxPurchaseQty,
        dailyLimit,
        isAvailableForDelivery,
        isAvailableForPickup,
        prepTimeMinutes,
        sortOrder,
      } = req.body;

      const [product] = await db
        .insert(products)
        .values({
          storeId,
          name,
          categoryId: categoryId || null,
          sku: sku || null,
          descriptionSource: description || null,
          descriptionZh: description || null,
          price,
          originalPrice: originalPrice || null,
          unit: unit || '份',
          inventory: inventory || 0,
          coverImage: coverImage || null,
          gallery: gallery || null,
          status: status || 'draft',
          isRecommend: isRecommend || false,
          isNew: isNew || false,
          isHot: isHot || false,
          minPurchaseQty: minPurchaseQty || 1,
          maxPurchaseQty: maxPurchaseQty || null,
          dailyLimit: dailyLimit || null,
          isAvailableForDelivery: isAvailableForDelivery !== false,
          isAvailableForPickup: isAvailableForPickup !== false,
          prepTimeMinutes: prepTimeMinutes || 15,
          sortOrder: sortOrder || 0,
        })
        .returning();

      // 异步翻译描述
      if (description) {
        translateText(description, 'zh-cn', 'en-us').then(enText => {
          db.update(products).set({ descriptionEn: enText }).where(eq(products.id, product.id)).execute();
        }).catch(err => console.error('Translate product EN failed:', err));
        translateText(description, 'zh-cn', 'th-th').then(thText => {
          db.update(products).set({ descriptionTh: thText }).where(eq(products.id, product.id)).execute();
        }).catch(err => console.error('Translate product TH failed:', err));
      }

      res.json({ success: true, data: product, message: '商品创建成功' });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ success: false, message: '创建商品失败' });
    }
  });

  // 更新商品
  app.patch('/api/stores/:storeId/products/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const productId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const {
        name,
        categoryId,
        sku,
        description,
        price,
        originalPrice,
        unit,
        inventory,
        coverImage,
        gallery,
        status,
        isRecommend,
        isNew,
        isHot,
        minPurchaseQty,
        maxPurchaseQty,
        dailyLimit,
        isAvailableForDelivery,
        isAvailableForPickup,
        prepTimeMinutes,
        sortOrder,
      } = req.body;

      const updateData: any = { updatedAt: new Date() };
      
      if (name !== undefined) updateData.name = name;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (sku !== undefined) updateData.sku = sku;
      if (description !== undefined) {
        updateData.descriptionSource = description;
        updateData.descriptionZh = description;
        // 异步翻译
        translateText(description, 'zh-cn', 'en-us').then(enText => {
          db.update(products).set({ descriptionEn: enText }).where(eq(products.id, productId)).execute();
        }).catch(err => console.error('Translate product EN failed:', err));
        translateText(description, 'zh-cn', 'th-th').then(thText => {
          db.update(products).set({ descriptionTh: thText }).where(eq(products.id, productId)).execute();
        }).catch(err => console.error('Translate product TH failed:', err));
      }
      if (price !== undefined) updateData.price = price;
      if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
      if (unit !== undefined) updateData.unit = unit;
      if (inventory !== undefined) updateData.inventory = inventory;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      if (gallery !== undefined) updateData.gallery = gallery;
      if (status !== undefined) updateData.status = status;
      if (isRecommend !== undefined) updateData.isRecommend = isRecommend;
      if (isNew !== undefined) updateData.isNew = isNew;
      if (isHot !== undefined) updateData.isHot = isHot;
      if (minPurchaseQty !== undefined) updateData.minPurchaseQty = minPurchaseQty;
      if (maxPurchaseQty !== undefined) updateData.maxPurchaseQty = maxPurchaseQty;
      if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit;
      if (isAvailableForDelivery !== undefined) updateData.isAvailableForDelivery = isAvailableForDelivery;
      if (isAvailableForPickup !== undefined) updateData.isAvailableForPickup = isAvailableForPickup;
      if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = prepTimeMinutes;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const [product] = await db
        .update(products)
        .set(updateData)
        .where(and(
          eq(products.id, productId),
          eq(products.storeId, storeId)
        ))
        .returning();

      if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在' });
      }

      res.json({ success: true, data: product, message: '商品更新成功' });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ success: false, message: '更新商品失败' });
    }
  });

  // 批量更新商品状态（上架/下架）
  app.post('/api/stores/:storeId/products/batch-status', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const { productIds, status } = req.body;
      
      if (!productIds?.length || !status) {
        return res.status(400).json({ success: false, message: '参数错误' });
      }

      await db
        .update(products)
        .set({ status, updatedAt: new Date() })
        .where(and(
          inArray(products.id, productIds),
          eq(products.storeId, storeId)
        ));

      res.json({ success: true, message: '批量更新成功' });
    } catch (error) {
      console.error('Batch update products status error:', error);
      res.status(500).json({ success: false, message: '批量更新失败' });
    }
  });

  // 更新商品库存
  app.patch('/api/stores/:storeId/products/:id/inventory', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const productId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const { inventory } = req.body;
      
      const [product] = await db
        .update(products)
        .set({ inventory, updatedAt: new Date() })
        .where(and(
          eq(products.id, productId),
          eq(products.storeId, storeId)
        ))
        .returning();

      if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在' });
      }

      res.json({ success: true, data: product });
    } catch (error) {
      console.error('Update product inventory error:', error);
      res.status(500).json({ success: false, message: '更新库存失败' });
    }
  });

  // 删除商品（软删除 - 设为inactive）
  app.delete('/api/stores/:storeId/products/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const productId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      await db
        .update(products)
        .set({ status: 'inactive' })
        .where(and(
          eq(products.id, productId),
          eq(products.storeId, storeId)
        ));

      res.json({ success: true, message: '商品已删除' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ success: false, message: '删除商品失败' });
    }
  });

  // ============ 商户店铺活动管理 API ============

  // 获取店铺活动列表 (需要验证用户对店铺的权限)
  app.get('/api/stores/:storeId/campaigns', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user?.id;
      const { status } = req.query;
      const now = new Date();

      // 验证用户对该店铺的权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限访问该店铺活动' });
      }

      // 获取与该店铺关联的活动
      const storeCampaigns = await db
        .select({
          id: campaigns.id,
          titleSource: campaigns.titleSource,
          titleZh: campaigns.titleZh,
          titleEn: campaigns.titleEn,
          titleTh: campaigns.titleTh,
          descriptionSource: campaigns.descriptionSource,
          descriptionZh: campaigns.descriptionZh,
          bannerImageUrl: campaigns.bannerImageUrl,
          couponValue: campaigns.couponValue,
          discountType: campaigns.discountType,
          originalPrice: campaigns.originalPrice,
          startAt: campaigns.startAt,
          endAt: campaigns.endAt,
          maxTotal: campaigns.maxTotal,
          currentClaimed: campaigns.currentClaimed,
          isActive: campaigns.isActive,
          createdAt: campaigns.createdAt,
        })
        .from(campaigns)
        .innerJoin(campaignStores, eq(campaigns.id, campaignStores.campaignId))
        .where(eq(campaignStores.storeId, storeId))
        .orderBy(desc(campaigns.createdAt));

      // 计算活动状态
      const campaignsWithStatus = storeCampaigns.map(c => {
        let computedStatus = 'inactive';
        if (c.isActive) {
          if (now < new Date(c.startAt)) {
            computedStatus = 'scheduled';
          } else if (now > new Date(c.endAt)) {
            computedStatus = 'ended';
          } else {
            computedStatus = 'active';
          }
        }
        return { ...c, status: computedStatus };
      });

      // 状态过滤
      let filtered = campaignsWithStatus;
      if (status) {
        filtered = filtered.filter(c => c.status === status);
      }

      res.json({ success: true, data: filtered });
    } catch (error) {
      console.error('Get store campaigns error:', error);
      res.status(500).json({ success: false, message: '获取活动列表失败' });
    }
  });

  // 获取单个活动详情 (需要验证用户对店铺的权限)
  app.get('/api/stores/:storeId/campaigns/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const campaignId = parseInt(req.params.id);
      const userId = req.user?.id;

      // 验证用户对该店铺的权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限访问该店铺活动' });
      }

      const [campaign] = await db
        .select({
          id: campaigns.id,
          titleSourceLang: campaigns.titleSourceLang,
          titleSource: campaigns.titleSource,
          titleZh: campaigns.titleZh,
          titleEn: campaigns.titleEn,
          titleTh: campaigns.titleTh,
          descriptionSourceLang: campaigns.descriptionSourceLang,
          descriptionSource: campaigns.descriptionSource,
          descriptionZh: campaigns.descriptionZh,
          descriptionEn: campaigns.descriptionEn,
          descriptionTh: campaigns.descriptionTh,
          bannerImageUrl: campaigns.bannerImageUrl,
          mediaUrls: campaigns.mediaUrls,
          couponValue: campaigns.couponValue,
          discountType: campaigns.discountType,
          originalPrice: campaigns.originalPrice,
          startAt: campaigns.startAt,
          endAt: campaigns.endAt,
          maxPerUser: campaigns.maxPerUser,
          maxTotal: campaigns.maxTotal,
          currentClaimed: campaigns.currentClaimed,
          isActive: campaigns.isActive,
          createdAt: campaigns.createdAt,
        })
        .from(campaigns)
        .innerJoin(campaignStores, eq(campaigns.id, campaignStores.campaignId))
        .where(and(
          eq(campaignStores.storeId, storeId),
          eq(campaigns.id, campaignId)
        ));

      if (!campaign) {
        return res.status(404).json({ success: false, message: '活动不存在' });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      console.error('Get store campaign error:', error);
      res.status(500).json({ success: false, message: '获取活动详情失败' });
    }
  });

  // 创建店铺活动
  app.post('/api/stores/:storeId/campaigns', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = req.user?.id;

      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      const {
        titleSource,
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
      } = req.body;

      if (!titleSource || !descriptionSource || !couponValue || !discountType || !startAt || !endAt) {
        return res.status(400).json({ success: false, message: '请填写必填字段' });
      }

      // 翻译内容
      const translations = await translateCampaignContent(
        'zh-cn',
        titleSource,
        descriptionSource,
        undefined,
        undefined
      );

      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          titleSourceLang: 'zh-cn',
          titleSource,
          titleZh: titleSource,
          titleEn: translations.titleEn,
          titleTh: translations.titleTh,
          descriptionSourceLang: 'zh-cn',
          descriptionSource,
          descriptionZh: descriptionSource,
          descriptionEn: translations.descriptionEn,
          descriptionTh: translations.descriptionTh,
          bannerImageUrl,
          mediaUrls,
          couponValue,
          discountType,
          originalPrice: originalPrice || null,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          maxPerUser: maxPerUser || 1,
          maxTotal: maxTotal || null,
          isActive: true,
        })
        .returning();

      // 关联店铺
      await db.insert(campaignStores).values({
        campaignId: newCampaign.id,
        storeId,
      });

      res.json({ success: true, data: newCampaign, message: '活动创建成功' });
    } catch (error) {
      console.error('Create store campaign error:', error);
      res.status(500).json({ success: false, message: '创建活动失败' });
    }
  });

  // 更新店铺活动
  app.patch('/api/stores/:storeId/campaigns/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const campaignId = parseInt(req.params.id);
      const userId = req.user?.id;

      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      // 验证活动属于该店铺
      const [campaignStore] = await db
        .select()
        .from(campaignStores)
        .where(and(
          eq(campaignStores.campaignId, campaignId),
          eq(campaignStores.storeId, storeId)
        ));

      if (!campaignStore) {
        return res.status(404).json({ success: false, message: '活动不存在' });
      }

      const {
        titleSource,
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
        isActive,
      } = req.body;

      const updateData: any = { updatedAt: new Date() };

      if (titleSource !== undefined) {
        updateData.titleSource = titleSource;
        updateData.titleZh = titleSource;
        // 异步翻译
        translateText(titleSource, 'zh-cn', 'en-us').then(text => {
          db.update(campaigns).set({ titleEn: text }).where(eq(campaigns.id, campaignId)).execute();
        }).catch(err => console.error('Translate campaign title EN failed:', err));
        translateText(titleSource, 'zh-cn', 'th-th').then(text => {
          db.update(campaigns).set({ titleTh: text }).where(eq(campaigns.id, campaignId)).execute();
        }).catch(err => console.error('Translate campaign title TH failed:', err));
      }

      if (descriptionSource !== undefined) {
        updateData.descriptionSource = descriptionSource;
        updateData.descriptionZh = descriptionSource;
        translateText(descriptionSource, 'zh-cn', 'en-us').then(text => {
          db.update(campaigns).set({ descriptionEn: text }).where(eq(campaigns.id, campaignId)).execute();
        }).catch(err => console.error('Translate campaign desc EN failed:', err));
        translateText(descriptionSource, 'zh-cn', 'th-th').then(text => {
          db.update(campaigns).set({ descriptionTh: text }).where(eq(campaigns.id, campaignId)).execute();
        }).catch(err => console.error('Translate campaign desc TH failed:', err));
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
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updatedCampaign] = await db
        .update(campaigns)
        .set(updateData)
        .where(eq(campaigns.id, campaignId))
        .returning();

      res.json({ success: true, data: updatedCampaign, message: '活动更新成功' });
    } catch (error) {
      console.error('Update store campaign error:', error);
      res.status(500).json({ success: false, message: '更新活动失败' });
    }
  });

  // 删除店铺活动
  app.delete('/api/stores/:storeId/campaigns/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const campaignId = parseInt(req.params.id);
      const userId = req.user?.id;

      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId!),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: '无权限操作' });
      }

      // 验证活动属于该店铺
      const [campaignStore] = await db
        .select()
        .from(campaignStores)
        .where(and(
          eq(campaignStores.campaignId, campaignId),
          eq(campaignStores.storeId, storeId)
        ));

      if (!campaignStore) {
        return res.status(404).json({ success: false, message: '活动不存在' });
      }

      // 软删除 - 设为不活跃
      await db
        .update(campaigns)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));

      res.json({ success: true, message: '活动已删除' });
    } catch (error) {
      console.error('Delete store campaign error:', error);
      res.status(500).json({ success: false, message: '删除活动失败' });
    }
  });

  // ============ 收款二维码功能 API ============

  // 获取可用的 PSP 列表
  app.get('/api/psp-providers', async (req: Request, res: Response) => {
    try {
      const providers = await db
        .select()
        .from(pspProviders)
        .where(eq(pspProviders.status, 'active'));

      res.json({ success: true, data: providers });
    } catch (error) {
      console.error('Get PSP providers error:', error);
      res.status(500).json({ success: false, message: 'Failed to get PSP providers' });
    }
  });

  // 获取商户 PSP 账户配置
  app.get('/api/merchant/psp-accounts', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // 获取用户管理的门店
      const userRoles = await db
        .select({ storeId: merchantStaffRoles.storeId })
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          inArray(merchantStaffRoles.role, ['owner', 'operator']),
          eq(merchantStaffRoles.isActive, true)
        ));

      const storeIds = userRoles.map(r => r.storeId);

      if (storeIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // 获取 PSP 账户
      const accounts = await db
        .select({
          id: merchantPspAccounts.id,
          storeId: merchantPspAccounts.storeId,
          storeName: stores.name,
          pspCode: merchantPspAccounts.pspCode,
          onboardingMode: merchantPspAccounts.onboardingMode,
          onboardingStatus: merchantPspAccounts.onboardingStatus,
          settlementBankName: merchantPspAccounts.settlementBankName,
          settlementAccountNumber: merchantPspAccounts.settlementAccountNumber,
          status: merchantPspAccounts.status,
          createdAt: merchantPspAccounts.createdAt,
        })
        .from(merchantPspAccounts)
        .innerJoin(stores, eq(merchantPspAccounts.storeId, stores.id))
        .where(inArray(merchantPspAccounts.storeId, storeIds));

      // 脱敏账号显示
      const maskedAccounts = accounts.map(a => ({
        ...a,
        settlementAccountNumber: a.settlementAccountNumber 
          ? '****' + a.settlementAccountNumber.slice(-4) 
          : null,
      }));

      res.json({ success: true, data: maskedAccounts });
    } catch (error) {
      console.error('Get merchant PSP accounts error:', error);
      res.status(500).json({ success: false, message: 'Failed to get PSP accounts' });
    }
  });

  // 创建/更新商户 PSP 账户配置
  app.post('/api/merchant/psp-accounts', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        storeId,
        pspCode,
        onboardingMode = 'manual_id',
        providerMerchantRef,
        settlementBankName,
        settlementBankCode,
        settlementAccountName,
        settlementAccountNumber,
        settlementBranch,
        idCardUrl,
        companyRegistrationUrl,
        businessLicenseUrl,
      } = req.body;

      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator']),
          eq(merchantStaffRoles.isActive, true)
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: 'No permission for this store' });
      }

      // 检查是否已有配置
      const [existingAccount] = await db
        .select()
        .from(merchantPspAccounts)
        .where(eq(merchantPspAccounts.storeId, storeId));

      if (existingAccount) {
        // 更新现有配置
        const [updated] = await db
          .update(merchantPspAccounts)
          .set({
            pspCode,
            onboardingMode,
            providerMerchantRef,
            onboardingStatus: onboardingMode === 'manual_id' && providerMerchantRef ? 'completed' : 'not_started',
            settlementBankName,
            settlementBankCode,
            settlementAccountName,
            settlementAccountNumber,
            settlementBranch,
            idCardUrl,
            companyRegistrationUrl,
            businessLicenseUrl,
            status: onboardingMode === 'manual_id' && providerMerchantRef ? 'active' : 'pending_review',
            updatedAt: new Date(),
          })
          .where(eq(merchantPspAccounts.id, existingAccount.id))
          .returning();

        res.json({ success: true, data: updated, message: 'PSP account updated' });
      } else {
        // 创建新配置
        const [created] = await db
          .insert(merchantPspAccounts)
          .values({
            storeId,
            pspCode,
            onboardingMode,
            providerMerchantRef,
            onboardingStatus: onboardingMode === 'manual_id' && providerMerchantRef ? 'completed' : 'not_started',
            settlementBankName,
            settlementBankCode,
            settlementAccountName,
            settlementAccountNumber,
            settlementBranch,
            idCardUrl,
            companyRegistrationUrl,
            businessLicenseUrl,
            currency: 'THB',
            status: onboardingMode === 'manual_id' && providerMerchantRef ? 'active' : 'pending_review',
          })
          .returning();

        res.json({ success: true, data: created, message: 'PSP account created' });
      }
    } catch (error) {
      console.error('Create/update merchant PSP account error:', error);
      res.status(500).json({ success: false, message: 'Failed to save PSP account' });
    }
  });

  // 生成门店收款二维码
  app.post('/api/merchant/qr-codes', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { storeId } = req.body;

      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator']),
          eq(merchantStaffRoles.isActive, true)
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: 'No permission for this store' });
      }

      // 检查是否已有 PSP 账户配置
      const [pspAccount] = await db
        .select()
        .from(merchantPspAccounts)
        .where(and(
          eq(merchantPspAccounts.storeId, storeId),
          eq(merchantPspAccounts.status, 'active')
        ));

      if (!pspAccount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please configure and activate PSP account first' 
        });
      }

      // 检查是否已有二维码
      const [existingQr] = await db
        .select()
        .from(storeQrCodes)
        .where(and(
          eq(storeQrCodes.storeId, storeId),
          eq(storeQrCodes.status, 'active')
        ));

      if (existingQr) {
        return res.json({ 
          success: true, 
          data: existingQr, 
          message: 'QR code already exists' 
        });
      }

      // 生成新二维码
      const qrToken = nanoid(12);
      const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
      const qrPayload = `${baseUrl}/p/${qrToken}`;

      // 生成二维码图片 (Data URL)
      const qrImageDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      // 保存到数据库
      const [qrCode] = await db
        .insert(storeQrCodes)
        .values({
          storeId,
          qrType: 'h5_pay_entry',
          qrPayload,
          qrToken,
          qrImageUrl: qrImageDataUrl,
          status: 'active',
        })
        .returning();

      res.json({ success: true, data: qrCode });
    } catch (error) {
      console.error('Generate store QR code error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate QR code' });
    }
  });

  // 获取门店二维码列表
  app.get('/api/merchant/qr-codes/:storeId', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const storeId = parseInt(req.params.storeId);

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // 验证权限
      const [role] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, storeId),
          inArray(merchantStaffRoles.role, ['owner', 'operator']),
          eq(merchantStaffRoles.isActive, true)
        ));

      if (!role) {
        return res.status(403).json({ success: false, message: 'No permission for this store' });
      }

      const qrCodes = await db
        .select()
        .from(storeQrCodes)
        .where(eq(storeQrCodes.storeId, storeId))
        .orderBy(desc(storeQrCodes.createdAt));

      res.json({ success: true, data: qrCodes });
    } catch (error) {
      console.error('Get store QR codes error:', error);
      res.status(500).json({ success: false, message: 'Failed to get QR codes' });
    }
  });

  // H5 支付入口 - 获取二维码元数据 (带缓存优化)
  app.get('/api/payments/qrcode/meta', async (req: Request, res: Response) => {
    try {
      const { qr_token } = req.query;

      if (!qr_token || typeof qr_token !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing qr_token' });
      }

      // 检查缓存
      const cachedData = getCachedQrMeta(qr_token);
      if (cachedData) {
        return res.json({ success: true, data: cachedData });
      }

      // 查询二维码和关联门店
      const [qrCode] = await db
        .select({
          id: storeQrCodes.id,
          storeId: storeQrCodes.storeId,
          qrToken: storeQrCodes.qrToken,
          status: storeQrCodes.status,
          storeName: stores.name,
          storeAddress: stores.address,
          storeImageUrl: stores.imageUrl,
        })
        .from(storeQrCodes)
        .innerJoin(stores, eq(storeQrCodes.storeId, stores.id))
        .where(eq(storeQrCodes.qrToken, qr_token));

      if (!qrCode || qrCode.status !== 'active') {
        return res.status(404).json({ success: false, message: 'QR code not found or disabled' });
      }

      // 获取该门店的 PSP 配置
      const [pspAccount] = await db
        .select({
          pspCode: merchantPspAccounts.pspCode,
        })
        .from(merchantPspAccounts)
        .where(and(
          eq(merchantPspAccounts.storeId, qrCode.storeId),
          eq(merchantPspAccounts.status, 'active')
        ));

      // 获取 PSP 显示名称（从 Provider 获取，不写死）
      let pspDisplayName = 'Payment Service';
      if (pspAccount?.pspCode) {
        const provider = getPaymentProvider(pspAccount.pspCode);
        if (provider) {
          pspDisplayName = provider.displayName;
        }
      }

      const responseData = {
        qrCodeId: qrCode.id,
        storeId: qrCode.storeId,
        storeName: qrCode.storeName,
        storeAddress: qrCode.storeAddress,
        storeImageUrl: convertHttpToHttps(qrCode.storeImageUrl),
        currency: 'THB',
        pspDisplayName,
      };

      // 存入缓存
      setCachedQrMeta(qr_token, responseData);

      res.json({ success: true, data: responseData });
    } catch (error) {
      console.error('Get QR code meta error:', error);
      res.status(500).json({ success: false, message: 'Failed to get QR code info' });
    }
  });

  // 获取用户在指定门店可用的优惠券（安全：从 qr_token 解析 store_id）
  app.get('/api/payments/qrcode/available-coupons', async (req: Request, res: Response) => {
    try {
      const { store_id } = req.query;
      
      // 从 JWT token 获取用户信息
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.json({ success: true, data: [] }); // 未登录返回空列表
      }
      
      const token = authHeader.slice(7);
      let userId: number;
      
      try {
        const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
        const decoded = jwt.verify(token, jwtSecret) as any;
        userId = decoded.userId;
      } catch (err) {
        return res.json({ success: true, data: [] }); // Token 无效返回空列表
      }
      
      if (!store_id || typeof store_id !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing store_id' });
      }
      
      const storeIdNum = parseInt(store_id);
      
      // 查询用户可用的优惠券（未使用、未过期，且该券的活动关联了此门店）
      const now = new Date();
      
      const availableCoupons = await db
        .select({
          id: coupons.id,
          code: coupons.code,
          status: coupons.status,
          issuedAt: coupons.issuedAt,
          expiredAt: coupons.expiredAt,
          campaignId: coupons.campaignId,
          campaignTitle: campaigns.titleSource,
          campaignTitleZh: campaigns.titleZh,
          campaignTitleEn: campaigns.titleEn,
          couponValue: campaigns.couponValue,
          discountType: campaigns.discountType,
        })
        .from(coupons)
        .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
        .innerJoin(campaignStores, eq(campaigns.id, campaignStores.campaignId))
        .where(and(
          eq(coupons.userId, userId),
          eq(coupons.status, 'unused'),
          gt(coupons.expiredAt, now),
          eq(campaignStores.storeId, storeIdNum),
          eq(campaigns.isActive, true)
        ))
        .orderBy(desc(coupons.issuedAt));
      
      res.json({ 
        success: true, 
        data: availableCoupons.map(c => ({
          id: c.id,
          code: c.code,
          campaignId: c.campaignId,
          campaignTitle: c.campaignTitleZh || c.campaignTitleEn || c.campaignTitle,
          couponValue: c.couponValue,
          discountType: c.discountType,
          expiredAt: c.expiredAt,
        }))
      });
    } catch (error) {
      console.error('Get available coupons error:', error);
      res.status(500).json({ success: false, message: 'Failed to get coupons' });
    }
  });

  // 创建支付订单
  app.post('/api/payments/qrcode/create', async (req: Request, res: Response) => {
    try {
      const { qr_token, amount, currency = 'THB', line_user_id, user_id, coupon_id, discount_amount } = req.body;

      if (!qr_token || !amount) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // 安全验证: 如果提供了 line_user_id/user_id，必须验证 JWT Token 以防冒充
      let verifiedLineUserId: string | null = null;
      let verifiedUserId: number | null = null;
      
      if (line_user_id || user_id || coupon_id) {
        // 安全检查：如果没有配置 JWT_SECRET，拒绝处理用户身份
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.warn('[Security] JWT_SECRET not configured, rejecting user identity in payment');
          return res.status(500).json({ 
            success: false, 
            message: 'Server security configuration error' 
          });
        }
        
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({ 
            success: false, 
            message: 'Authentication required when providing user identity' 
          });
        }
        
        const token = authHeader.slice(7);
        try {
          const decoded = jwt.verify(token, jwtSecret) as any;
          
          // 验证 token 中的用户身份与提交的一致
          if (line_user_id && decoded.lineUserId !== line_user_id) {
            return res.status(403).json({ 
              success: false, 
              message: 'LINE user identity mismatch' 
            });
          }
          if (user_id && decoded.userId !== user_id) {
            return res.status(403).json({ 
              success: false, 
              message: 'User identity mismatch' 
            });
          }
          
          verifiedLineUserId = decoded.lineUserId || null;
          verifiedUserId = decoded.userId || null;
        } catch (jwtError) {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid authentication token' 
          });
        }
      }

      // 查询二维码和 PSP 账户
      const [qrCode] = await db
        .select({
          id: storeQrCodes.id,
          storeId: storeQrCodes.storeId,
          status: storeQrCodes.status,
        })
        .from(storeQrCodes)
        .where(eq(storeQrCodes.qrToken, qr_token));

      if (!qrCode || qrCode.status !== 'active') {
        return res.status(404).json({ success: false, message: 'QR code not found or disabled' });
      }

      // 获取 PSP 配置
      const [pspAccount] = await db
        .select()
        .from(merchantPspAccounts)
        .where(and(
          eq(merchantPspAccounts.storeId, qrCode.storeId),
          eq(merchantPspAccounts.status, 'active')
        ));

      if (!pspAccount) {
        return res.status(400).json({ success: false, message: 'Store payment not configured' });
      }

      const provider = getPaymentProvider(pspAccount.pspCode);
      if (!provider) {
        return res.status(500).json({ success: false, message: 'PSP provider not available' });
      }

      // 优惠券验证
      let validatedCouponId: number | null = null;
      let validatedDiscountAmount: string | null = null;
      let originalAmount: string | null = null;
      
      if (coupon_id && verifiedUserId) {
        const now = new Date();
        
        const [coupon] = await db
          .select({
            id: coupons.id,
            userId: coupons.userId,
            campaignId: coupons.campaignId,
            status: coupons.status,
            expiredAt: coupons.expiredAt,
            couponValue: campaigns.couponValue,
            discountType: campaigns.discountType,
          })
          .from(coupons)
          .innerJoin(campaigns, eq(coupons.campaignId, campaigns.id))
          .innerJoin(campaignStores, eq(campaigns.id, campaignStores.campaignId))
          .where(and(
            eq(coupons.id, coupon_id),
            eq(coupons.userId, verifiedUserId),
            eq(coupons.status, 'unused'),
            gt(coupons.expiredAt, now),
            eq(campaignStores.storeId, qrCode.storeId),
            eq(campaigns.isActive, true)
          ));
        
        if (!coupon) {
          return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
        }
        
        const couponValue = parseFloat(coupon.couponValue || '0');
        let expectedDiscount = 0;
        
        if (coupon.discountType === 'percentage_off') {
          expectedDiscount = (parseFloat(amount) + parseFloat(discount_amount || '0')) * (couponValue / 100);
        } else if (coupon.discountType === 'cash_voucher') {
          expectedDiscount = Math.min(couponValue, parseFloat(amount) + parseFloat(discount_amount || '0'));
        }
        
        expectedDiscount = Math.round(expectedDiscount * 100) / 100;
        const clientDiscount = parseFloat(discount_amount || '0');
        
        if (Math.abs(expectedDiscount - clientDiscount) > 0.01) {
          return res.status(400).json({ success: false, message: 'Discount amount mismatch' });
        }
        
        validatedCouponId = coupon.id;
        validatedDiscountAmount = clientDiscount.toFixed(2);
        originalAmount = (parseFloat(amount) + clientDiscount).toFixed(2);
      }

      // 创建支付记录
      const orderId = `pay_${nanoid(16)}`;
      const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
      const returnUrl = `${baseUrl}/success/${orderId}`;
      const webhookUrl = `${baseUrl}/api/payments/webhook/${pspAccount.pspCode}`;

      // 调用 PSP 创建订单（金额保持泰铢小数形式，Provider 内部处理单位转换）
      const chargeResult = await provider.createCharge({
        amount: parseFloat(amount),
        currency,
        storeId: qrCode.storeId,
        orderId,
        paymentMethod: 'promptpay',  // V1 固定为 PromptPay
        returnUrl,
        webhookUrl,
        description: `Payment for store #${qrCode.storeId}`,
        providerMerchantRef: pspAccount.providerMerchantRef || undefined,
      });

      if (!chargeResult.success) {
        return res.status(500).json({ success: false, message: chargeResult.error || 'Failed to create charge' });
      }

      // 保存支付记录（包含 orderId 和验证后的用户信息用于自动积分）
      const [payment] = await db
        .insert(qrPayments)
        .values({
          storeId: qrCode.storeId,
          qrCodeId: qrCode.id,
          orderId,  // 保存订单号用于前端查询
          lineUserId: verifiedLineUserId,  // 使用验证后的 LINE 用户 ID，防止冒充
          userId: verifiedUserId,
          pspCode: pspAccount.pspCode,
          pspPaymentId: chargeResult.pspPaymentId,
          amount: amount.toString(),
          originalAmount: originalAmount,
          couponId: validatedCouponId,
          discountAmount: validatedDiscountAmount,
          currency,
          paymentMethod: 'promptpay',
          status: 'pending',
          redirectUrl: chargeResult.redirectUrl,
        })
        .returning();

      res.json({
        success: true,
        data: {
          payment_id: orderId,
          redirect_url: chargeResult.redirectUrl,
        }
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ success: false, message: 'Failed to create payment' });
    }
  });

  // 查询支付状态
  app.get('/api/payments/:paymentId', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;

      // 优先用 orderId 查询，如果没有再用 pspPaymentId 兜底
      const [payment] = await db
        .select({
          id: qrPayments.id,
          storeId: qrPayments.storeId,
          orderId: qrPayments.orderId,
          lineUserId: qrPayments.lineUserId,
          autoPointsGranted: qrPayments.autoPointsGranted,
          amount: qrPayments.amount,
          currency: qrPayments.currency,
          status: qrPayments.status,
          paidAt: qrPayments.paidAt,
          createdAt: qrPayments.createdAt,
          storeName: stores.name,
          lineOaUrl: stores.lineOaUrl,
          lineOaId: stores.lineOaId,
        })
        .from(qrPayments)
        .innerJoin(stores, eq(qrPayments.storeId, stores.id))
        .where(or(eq(qrPayments.orderId, paymentId), eq(qrPayments.pspPaymentId, paymentId)))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      // 查询关联积分
      const [points] = await db
        .select()
        .from(paymentPoints)
        .where(eq(paymentPoints.paymentId, payment.id));

      res.json({
        success: true,
        data: {
          ...payment,
          points: points?.points || 0,
          pointsStatus: points?.status || 'unclaimed',
          autoPointsGranted: payment.autoPointsGranted || false,
          lineOaUrl: payment.lineOaUrl || null,
          lineOaId: payment.lineOaId || null,
        }
      });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ success: false, message: 'Failed to get payment' });
    }
  });

  // Webhook: Opn 支付回调
  app.post('/api/payments/webhook/opn', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
      const rawBody = req.body.toString();
      const headers = req.headers as Record<string, string>;

      const provider = getPaymentProvider('opn');
      if (!provider) {
        return res.status(500).json({ success: false, message: 'Provider not configured' });
      }

      // 验证签名
      if (!provider.verifyPaymentWebhookSignature(rawBody, headers)) {
        console.warn('[Webhook/opn] Invalid signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      // 解析数据
      const payload = provider.parsePaymentWebhook(rawBody);
      if (!payload) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      console.log('[Webhook/opn] Received:', { 
        pspPaymentId: payload.pspPaymentId, 
        status: payload.status 
      });

      // 更新支付记录（幂等）
      const [payment] = await db
        .select()
        .from(qrPayments)
        .where(eq(qrPayments.pspPaymentId, payload.pspPaymentId));

      if (!payment) {
        console.warn('[Webhook/opn] Payment not found:', payload.pspPaymentId);
        return res.json({ success: true, message: 'Payment not found, ignored' });
      }

      if (payment.status === 'paid') {
        return res.json({ success: true, message: 'Already processed' });
      }

      // 更新状态
      await db
        .update(qrPayments)
        .set({
          status: payload.status,
          paidAt: payload.paidAt || new Date(),
          rawPayload: JSON.stringify(payload.rawData),
          updatedAt: new Date(),
        })
        .where(eq(qrPayments.id, payment.id));

      // 如果支付成功，创建积分记录并自动发放
      if (payload.status === 'paid') {
        const pointsAmount = Math.floor(payload.amount); // 1 THB = 1 积分

        // 检查用户是否已登录（有 lineUserId）
        const hasUser = !!payment.lineUserId;

        await db
          .insert(paymentPoints)
          .values({
            paymentId: payment.id,
            points: pointsAmount,
            lineUserId: payment.lineUserId || null,
            memberId: payment.userId || null,
            // 有用户信息则自动认领，无则待认领
            status: hasUser ? 'claimed' : 'unclaimed',
            claimedAt: hasUser ? new Date() : null,
          });

        // 如果使用了优惠券，标记为已使用
        if (payment.couponId) {
          await db
            .update(coupons)
            .set({
              status: 'used',
              usedAt: new Date(),
            })
            .where(eq(coupons.id, payment.couponId));
          console.log('[Webhook/opn] Coupon marked as used:', payment.couponId);
        }

        console.log('[Webhook/opn] Points created:', { 
          paymentId: payment.id, 
          points: pointsAmount,
          autoGranted: hasUser,
        });

        // 如果有用户信息，标记自动发放并尝试发送 LINE 消息
        if (hasUser) {
          await db
            .update(qrPayments)
            .set({ autoPointsGranted: true })
            .where(eq(qrPayments.id, payment.id));

          // 尝试发送 LINE 消息（异步，不阻塞响应）
          // 注意：直接从数据库查询 Token，不通过 API（API 会脱敏）
          (async () => {
            try {
              const [storeWithToken] = await db
                .select({
                  name: stores.name,
                  lineOaChannelToken: stores.lineOaChannelToken,
                })
                .from(stores)
                .where(eq(stores.id, payment.storeId));

              if (storeWithToken?.lineOaChannelToken && payment.lineUserId) {
                const { sendPaymentNotification } = await import('./services/lineMessagingService');
                await sendPaymentNotification(
                  storeWithToken.lineOaChannelToken,  // 直接从 DB 获取真实 Token
                  payment.lineUserId,
                  storeWithToken.name,
                  parseFloat(payment.amount),
                  pointsAmount
                );
                console.log('[Webhook/opn] LINE message sent to:', payment.lineUserId);
              }
            } catch (msgError) {
              console.error('[Webhook/opn] Failed to send LINE message:', msgError);
            }
          })();
        }
      }

      res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      console.error('Webhook/opn error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  });

  // Webhook: 2C2P 支付回调
  app.post('/api/payments/webhook/two_c2p', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
      const rawBody = req.body.toString();
      const headers = req.headers as Record<string, string>;

      const provider = getPaymentProvider('two_c2p');
      if (!provider) {
        return res.status(500).json({ success: false, message: 'Provider not configured' });
      }

      if (!provider.verifyPaymentWebhookSignature(rawBody, headers)) {
        console.warn('[Webhook/2c2p] Invalid signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      const payload = provider.parsePaymentWebhook(rawBody);
      if (!payload) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      console.log('[Webhook/2c2p] Received:', { 
        pspPaymentId: payload.pspPaymentId, 
        status: payload.status 
      });

      const [payment] = await db
        .select()
        .from(qrPayments)
        .where(eq(qrPayments.pspPaymentId, payload.pspPaymentId));

      if (!payment) {
        console.warn('[Webhook/2c2p] Payment not found:', payload.pspPaymentId);
        return res.json({ success: true, message: 'Payment not found, ignored' });
      }

      if (payment.status === 'paid') {
        return res.json({ success: true, message: 'Already processed' });
      }

      await db
        .update(qrPayments)
        .set({
          status: payload.status,
          paidAt: payload.paidAt || new Date(),
          rawPayload: JSON.stringify(payload.rawData),
          updatedAt: new Date(),
        })
        .where(eq(qrPayments.id, payment.id));

      // 如果支付成功，创建积分记录并自动发放
      if (payload.status === 'paid') {
        const pointsAmount = Math.floor(payload.amount);
        const hasUser = !!payment.lineUserId;

        await db
          .insert(paymentPoints)
          .values({
            paymentId: payment.id,
            points: pointsAmount,
            lineUserId: payment.lineUserId || null,
            memberId: payment.userId || null,
            status: hasUser ? 'claimed' : 'unclaimed',
            claimedAt: hasUser ? new Date() : null,
          });

        // 如果使用了优惠券，标记为已使用
        if (payment.couponId) {
          await db
            .update(coupons)
            .set({
              status: 'used',
              usedAt: new Date(),
            })
            .where(eq(coupons.id, payment.couponId));
          console.log('[Webhook/2c2p] Coupon marked as used:', payment.couponId);
        }

        console.log('[Webhook/2c2p] Points created:', { 
          paymentId: payment.id, 
          points: pointsAmount,
          autoGranted: hasUser,
        });

        // 如果有用户信息，标记自动发放并尝试发送 LINE 消息
        if (hasUser) {
          await db
            .update(qrPayments)
            .set({ autoPointsGranted: true })
            .where(eq(qrPayments.id, payment.id));

          // 直接从数据库查询 Token，不通过 API（API 会脱敏）
          (async () => {
            try {
              const [storeWithToken] = await db
                .select({
                  name: stores.name,
                  lineOaChannelToken: stores.lineOaChannelToken,
                })
                .from(stores)
                .where(eq(stores.id, payment.storeId));

              if (storeWithToken?.lineOaChannelToken && payment.lineUserId) {
                const { sendPaymentNotification } = await import('./services/lineMessagingService');
                await sendPaymentNotification(
                  storeWithToken.lineOaChannelToken,
                  payment.lineUserId,
                  storeWithToken.name,
                  parseFloat(payment.amount),
                  pointsAmount
                );
                console.log('[Webhook/2c2p] LINE message sent to:', payment.lineUserId);
              }
            } catch (msgError) {
              console.error('[Webhook/2c2p] Failed to send LINE message:', msgError);
            }
          })();
        }
      }

      res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      console.error('Webhook/2c2p error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  });

  // Mock Webhook - 仅开发环境，用于测试支付成功流程
  app.post('/api/payments/mock-complete', async (req: Request, res: Response) => {
    // 仅开发环境可用
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    try {
      const { payment_id } = req.body;

      if (!payment_id) {
        return res.status(400).json({ success: false, message: 'Missing payment_id' });
      }

      // 查找支付记录（优先用 orderId，兼容 pspPaymentId）
      const [payment] = await db
        .select()
        .from(qrPayments)
        .where(or(eq(qrPayments.orderId, payment_id), eq(qrPayments.pspPaymentId, payment_id)));

      if (!payment) {
        console.log('[Mock Complete] Payment not found for id:', payment_id);
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      if (payment.status === 'paid') {
        return res.json({ success: true, message: 'Already completed', data: { paymentId: payment.id } });
      }

      // 更新状态为已支付
      await db
        .update(qrPayments)
        .set({
          status: 'paid',
          paidAt: new Date(),
          rawPayload: JSON.stringify({ mock: true, completedAt: new Date().toISOString() }),
          updatedAt: new Date(),
        })
        .where(eq(qrPayments.id, payment.id));

      // 检查是否已有积分记录（幂等性）
      const [existingPoints] = await db
        .select()
        .from(paymentPoints)
        .where(eq(paymentPoints.paymentId, payment.id));

      let pointsAmount = Math.floor(parseFloat(payment.amount));
      const hasUser = !!payment.lineUserId;
      
      if (!existingPoints) {
        // 创建积分记录（有用户信息则自动认领）
        await db
          .insert(paymentPoints)
          .values({
            paymentId: payment.id,
            points: pointsAmount,
            lineUserId: payment.lineUserId || null,
            memberId: payment.userId || null,
            status: hasUser ? 'claimed' : 'unclaimed',
            claimedAt: hasUser ? new Date() : null,
          });

        console.log('[Mock Webhook] Payment completed & points created:', { 
          paymentId: payment.id, 
          pspPaymentId: payment_id,
          points: pointsAmount,
          autoGranted: hasUser,
        });

        // 如果有用户信息，标记自动发放并尝试发送 LINE 消息
        if (hasUser) {
          await db
            .update(qrPayments)
            .set({ autoPointsGranted: true })
            .where(eq(qrPayments.id, payment.id));

          // 直接从数据库查询 Token（API 会脱敏，webhook 需要真实 Token）
          (async () => {
            try {
              const [storeWithToken] = await db
                .select({
                  name: stores.name,
                  lineOaChannelToken: stores.lineOaChannelToken,
                })
                .from(stores)
                .where(eq(stores.id, payment.storeId));

              if (storeWithToken?.lineOaChannelToken && payment.lineUserId) {
                const { sendPaymentNotification } = await import('./services/lineMessagingService');
                await sendPaymentNotification(
                  storeWithToken.lineOaChannelToken,
                  payment.lineUserId,
                  storeWithToken.name,
                  parseFloat(payment.amount),
                  pointsAmount
                );
                console.log('[Mock Webhook] LINE message sent to:', payment.lineUserId);
              }
            } catch (msgError) {
              console.error('[Mock Webhook] Failed to send LINE message:', msgError);
            }
          })();
        }
      } else {
        pointsAmount = existingPoints.points;
        console.log('[Mock Webhook] Payment completed, points already exist:', { 
          paymentId: payment.id, 
          existingPoints: pointsAmount 
        });
      }

      res.json({ 
        success: true, 
        message: 'Payment mock-completed', 
        data: { 
          paymentId: payment.id,
          points: pointsAmount,
          autoGranted: hasUser && !existingPoints,
        } 
      });
    } catch (error) {
      console.error('Mock complete error:', error);
      res.status(500).json({ success: false, message: 'Mock complete failed' });
    }
  });

  // 积分认领 API（支付即会员核心功能）
  app.post('/api/points/claim', async (req: Request, res: Response) => {
    try {
      const { payment_id, line_user_id } = req.body;

      if (!payment_id || !line_user_id) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // 查询支付记录（优先用 orderId，兼容 pspPaymentId）
      const [payment] = await db
        .select()
        .from(qrPayments)
        .where(or(eq(qrPayments.orderId, payment_id), eq(qrPayments.pspPaymentId, payment_id)));

      if (!payment || payment.status !== 'paid') {
        return res.status(404).json({ success: false, message: 'Payment not found or not paid' });
      }

      // 查询积分记录
      const [points] = await db
        .select()
        .from(paymentPoints)
        .where(eq(paymentPoints.paymentId, payment.id));

      if (!points) {
        return res.status(404).json({ success: false, message: 'Points not found' });
      }

      // 查询门店信息（获取 LINE OA 配置）
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, payment.storeId));

      // 检查 LINE OA 配置是否完整（用于返回跳转 URL）
      const hasCompleteLineOaConfig = store?.lineOaUrl && store?.lineOaChannelToken;
      
      if (points.status === 'claimed') {
        // 已领取，直接返回（仅当配置完整时返回 LINE OA URL）
        return res.json({ 
          success: true, 
          message: 'Points already claimed', 
          data: {
            ...points,
            lineOaUrl: hasCompleteLineOaConfig ? store.lineOaUrl : null,
          }
        });
      }

      // 查找或创建用户
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.lineUserId, line_user_id));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            lineUserId: line_user_id,
            displayName: 'LINE User',
            language: 'th-th',
          })
          .returning();
      }

      // 更新积分记录
      const [updatedPoints] = await db
        .update(paymentPoints)
        .set({
          memberId: user.id,
          lineUserId: line_user_id,
          status: 'claimed',
          claimedAt: new Date(),
        })
        .where(eq(paymentPoints.id, points.id))
        .returning();

      // 注意：hasCompleteLineOaConfig 在上面已经定义
      const hasValidLineOaConfig = hasCompleteLineOaConfig;
      
      // 发送 LINE 消息通知（仅当配置完整时）
      let lineMessageSent = false;
      if (hasValidLineOaConfig && store.lineOaChannelToken) {
        try {
          const amount = parseFloat(payment.amount).toFixed(2);
          const pointsEarned = updatedPoints.points;
          const storeName = store.name;
          
          // 多语言消息模板
          const message = {
            type: 'text',
            text: `🎉 感谢您在「${storeName}」消费了 ${amount} THB！\n\n` +
                  `✨ 您的 ${pointsEarned} 积分已存入您的积分卡包！\n\n` +
                  `📱 随时在刷刷App查看您的会员权益～`,
          };

          // 使用商户自己的 Channel Token 发送
          const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${store.lineOaChannelToken}`,
            },
            body: JSON.stringify({
              to: line_user_id,
              messages: [message],
            }),
          });

          if (response.ok) {
            lineMessageSent = true;
            console.log('[Points/Claim] LINE message sent:', { 
              storeId: store.id, 
              userId: line_user_id.substring(0, 8) + '...',
              points: pointsEarned,
            });
          } else {
            const errorText = await response.text();
            console.warn('[Points/Claim] LINE message failed:', { 
              status: response.status, 
              error: errorText.substring(0, 100),
            });
          }
        } catch (lineError) {
          console.error('[Points/Claim] LINE API error:', lineError);
          // 不影响积分领取流程，继续返回成功
        }
      } else if (store?.lineOaUrl && !store?.lineOaChannelToken) {
        // 只配置了 URL 没配置 Token - 记录警告
        console.warn('[Points/Claim] Store has lineOaUrl but no channelToken:', { storeId: store.id });
      }

      res.json({
        success: true,
        data: {
          points: updatedPoints.points,
          status: 'claimed',
          memberId: user.id,
          // 只有配置了完整 LINE OA 才返回跳转 URL
          lineOaUrl: hasValidLineOaConfig ? store.lineOaUrl : null,
          lineMessageSent,
        },
        message: 'Points claimed successfully'
      });
    } catch (error) {
      console.error('Claim points error:', error);
      res.status(500).json({ success: false, message: 'Failed to claim points' });
    }
  });

  // 初始化 PSP Providers（开发用，只运行一次）
  app.post('/api/admin/init-psp-providers', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      // 检查是否已有数据
      const existing = await db.select().from(pspProviders);
      if (existing.length > 0) {
        return res.json({ success: true, message: 'PSP providers already initialized', data: existing });
      }

      // 插入默认 PSP
      const providers = await db
        .insert(pspProviders)
        .values([
          { code: 'opn', name: 'Opn Thailand', status: 'active' },
          { code: '2c2p', name: '2C2P Thailand', status: 'active' },
        ])
        .returning();

      res.json({ success: true, message: 'PSP providers initialized', data: providers });
    } catch (error) {
      console.error('Init PSP providers error:', error);
      res.status(500).json({ success: false, message: 'Failed to init PSP providers' });
    }
  });

  // ============ 聊天功能 API ============

  // 消费者端：创建或获取与门店的会话
  app.post('/api/chat/conversations', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const consumerId = req.user!.id;
      const { storeId } = req.body;

      if (!storeId) {
        return res.status(400).json({ success: false, message: 'Store ID is required' });
      }

      // 检查门店是否存在
      const [store] = await db.select().from(stores).where(eq(stores.id, storeId));
      if (!store) {
        return res.status(404).json({ success: false, message: 'Store not found' });
      }

      // 查找已有会话或创建新会话
      let [conversation] = await db
        .select()
        .from(chatConversations)
        .where(and(
          eq(chatConversations.storeId, storeId),
          eq(chatConversations.consumerId, consumerId)
        ));

      if (!conversation) {
        [conversation] = await db
          .insert(chatConversations)
          .values({
            storeId,
            consumerId,
            status: 'active',
          })
          .returning();
      }

      res.json({
        success: true,
        data: {
          id: conversation.id,
          storeId: conversation.storeId,
          storeName: store.name,
          storeImageUrl: store.imageUrl,
          status: conversation.status,
          lastMessagePreview: conversation.lastMessagePreview,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: conversation.unreadCountConsumer,
        },
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ success: false, message: 'Failed to create conversation' });
    }
  });

  // 消费者端：获取自己的会话列表
  app.get('/api/chat/my-conversations', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const consumerId = req.user!.id;

      const conversations = await db
        .select({
          id: chatConversations.id,
          storeId: chatConversations.storeId,
          storeName: stores.name,
          storeImageUrl: stores.imageUrl,
          lastMessagePreview: chatConversations.lastMessagePreview,
          lastMessageAt: chatConversations.lastMessageAt,
          unreadCount: chatConversations.unreadCountConsumer,
          status: chatConversations.status,
        })
        .from(chatConversations)
        .innerJoin(stores, eq(chatConversations.storeId, stores.id))
        .where(eq(chatConversations.consumerId, consumerId))
        .orderBy(desc(chatConversations.lastMessageAt));

      res.json({ success: true, data: conversations });
    } catch (error) {
      console.error('Get my conversations error:', error);
      res.status(500).json({ success: false, message: 'Failed to get conversations' });
    }
  });

  // 商户端：获取门店的会话列表
  app.get('/api/chat/store/:storeId/conversations', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const storeId = parseInt(req.params.storeId);

      // 验证用户是否是该门店的owner或operator
      const [staff] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.storeId, storeId),
          eq(merchantStaffRoles.userId, userId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      if (!staff) {
        return res.status(403).json({ success: false, message: 'No permission to access this store' });
      }

      const conversations = await db
        .select({
          id: chatConversations.id,
          consumerId: chatConversations.consumerId,
          consumerName: users.displayName,
          consumerShuaName: users.shuaName,
          consumerAvatar: users.avatarUrl,
          lastMessagePreview: chatConversations.lastMessagePreview,
          lastMessageAt: chatConversations.lastMessageAt,
          unreadCount: chatConversations.unreadCountMerchant,
          status: chatConversations.status,
        })
        .from(chatConversations)
        .innerJoin(users, eq(chatConversations.consumerId, users.id))
        .where(eq(chatConversations.storeId, storeId))
        .orderBy(desc(chatConversations.lastMessageAt));

      res.json({ success: true, data: conversations });
    } catch (error) {
      console.error('Get store conversations error:', error);
      res.status(500).json({ success: false, message: 'Failed to get conversations' });
    }
  });

  // 商户端：获取所有门店的未读消息总数
  app.get('/api/chat/merchant/unread-count', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // 获取用户管理的所有门店
      const staffRoles = await db
        .select({ storeId: merchantStaffRoles.storeId })
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          inArray(merchantStaffRoles.role, ['owner', 'operator'])
        ));

      const storeIds = staffRoles.map(s => s.storeId);
      
      if (storeIds.length === 0) {
        return res.json({ success: true, data: { totalUnread: 0, stores: [] } });
      }

      // 统计每个门店的未读消息
      const storeUnreads = await db
        .select({
          storeId: chatConversations.storeId,
          storeName: stores.name,
          unreadCount: sql<number>`SUM(${chatConversations.unreadCountMerchant})::int`,
        })
        .from(chatConversations)
        .innerJoin(stores, eq(chatConversations.storeId, stores.id))
        .where(inArray(chatConversations.storeId, storeIds))
        .groupBy(chatConversations.storeId, stores.name);

      const totalUnread = storeUnreads.reduce((sum, s) => sum + (s.unreadCount || 0), 0);

      res.json({
        success: true,
        data: {
          totalUnread,
          stores: storeUnreads,
        },
      });
    } catch (error) {
      console.error('Get merchant unread count error:', error);
      res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
  });

  // 发送消息
  app.post('/api/chat/conversations/:conversationId/messages', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { content, messageType = 'text', imageUrl } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
      }

      // 获取会话信息
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId));

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      // 判断发送者身份
      let senderType: 'consumer' | 'merchant' = 'consumer';
      
      if (conversation.consumerId === userId) {
        senderType = 'consumer';
      } else {
        // 检查是否是商户
        const [staff] = await db
          .select()
          .from(merchantStaffRoles)
          .where(and(
            eq(merchantStaffRoles.storeId, conversation.storeId),
            eq(merchantStaffRoles.userId, userId),
            inArray(merchantStaffRoles.role, ['owner', 'operator'])
          ));
        
        if (staff) {
          senderType = 'merchant';
        } else {
          return res.status(403).json({ success: false, message: 'No permission to send message' });
        }
      }

      // 插入消息
      const [message] = await db
        .insert(chatMessages)
        .values({
          conversationId,
          senderType,
          senderId: userId,
          messageType,
          content,
          imageUrl,
          isReadByMerchant: senderType === 'merchant',
          isReadByConsumer: senderType === 'consumer',
        })
        .returning();

      // 更新会话的最后消息预览和时间
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
      const updateData: any = {
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      };

      // 增加对方的未读计数
      if (senderType === 'consumer') {
        updateData.unreadCountMerchant = sql`${chatConversations.unreadCountMerchant} + 1`;
      } else {
        updateData.unreadCountConsumer = sql`${chatConversations.unreadCountConsumer} + 1`;
      }

      await db
        .update(chatConversations)
        .set(updateData)
        .where(eq(chatConversations.id, conversationId));

      res.json({
        success: true,
        data: {
          id: message.id,
          conversationId: message.conversationId,
          senderType: message.senderType,
          senderId: message.senderId,
          messageType: message.messageType,
          content: message.content,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
        },
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  });

  // 获取会话消息列表
  app.get('/api/chat/conversations/:conversationId/messages', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;

      // 获取会话信息
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId));

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      // 验证访问权限
      let isConsumer = conversation.consumerId === userId;
      let isMerchant = false;
      
      if (!isConsumer) {
        const [staff] = await db
          .select()
          .from(merchantStaffRoles)
          .where(and(
            eq(merchantStaffRoles.storeId, conversation.storeId),
            eq(merchantStaffRoles.userId, userId),
            inArray(merchantStaffRoles.role, ['owner', 'operator'])
          ));
        
        if (staff) {
          isMerchant = true;
        }
      }

      if (!isConsumer && !isMerchant) {
        return res.status(403).json({ success: false, message: 'No permission to view messages' });
      }

      // 获取消息
      let query = db
        .select({
          id: chatMessages.id,
          conversationId: chatMessages.conversationId,
          senderType: chatMessages.senderType,
          senderId: chatMessages.senderId,
          messageType: chatMessages.messageType,
          content: chatMessages.content,
          imageUrl: chatMessages.imageUrl,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(
          before
            ? and(eq(chatMessages.conversationId, conversationId), sql`${chatMessages.id} < ${before}`)
            : eq(chatMessages.conversationId, conversationId)
        )
        .orderBy(desc(chatMessages.id))
        .limit(limit);

      const messages = await query;

      // 标记消息为已读并重置未读计数
      if (isConsumer) {
        await db
          .update(chatMessages)
          .set({ isReadByConsumer: true })
          .where(and(
            eq(chatMessages.conversationId, conversationId),
            eq(chatMessages.isReadByConsumer, false)
          ));
        await db
          .update(chatConversations)
          .set({ unreadCountConsumer: 0 })
          .where(eq(chatConversations.id, conversationId));
      } else {
        await db
          .update(chatMessages)
          .set({ isReadByMerchant: true })
          .where(and(
            eq(chatMessages.conversationId, conversationId),
            eq(chatMessages.isReadByMerchant, false)
          ));
        await db
          .update(chatConversations)
          .set({ unreadCountMerchant: 0 })
          .where(eq(chatConversations.id, conversationId));
      }

      res.json({
        success: true,
        data: messages.reverse(), // 返回按时间正序
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ success: false, message: 'Failed to get messages' });
    }
  });

  // ============ 账号申请系统 ============

  // 获取用户的申请状态（发现号和刷刷号）
  app.get('/api/me/application-status', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // 查询发现号申请
      const [discoverApp] = await db
        .select()
        .from(discoverApplications)
        .where(eq(discoverApplications.userId, userId))
        .orderBy(desc(discoverApplications.createdAt))
        .limit(1);

      // 查询刷刷号申请
      const [shuashuaApp] = await db
        .select()
        .from(shuashuaApplications)
        .where(eq(shuashuaApplications.userId, userId))
        .orderBy(desc(shuashuaApplications.createdAt))
        .limit(1);

      // 检查用户是否已经是商家（有 owner 角色）
      const [merchantRole] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.role, 'owner'),
          eq(merchantStaffRoles.isActive, true)
        ))
        .limit(1);

      // 检查用户是否已经是创作者（有 shuaName）
      const [userData] = await db
        .select({ shuaName: users.shuaName })
        .from(users)
        .where(eq(users.id, userId));

      res.json({
        success: true,
        data: {
          discover: {
            hasApplied: !!discoverApp,
            status: discoverApp?.status || null,
            isMerchant: !!merchantRole,
            application: discoverApp || null,
          },
          shuashua: {
            hasApplied: !!shuashuaApp,
            status: shuashuaApp?.status || null,
            isCreator: !!userData?.shuaName,
            application: shuashuaApp || null,
          },
        },
      });
    } catch (error) {
      console.error('Get application status error:', error);
      res.status(500).json({ success: false, message: 'Failed to get application status' });
    }
  });

  // 提交发现号申请（商家入驻）
  app.post('/api/applications/discover', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // 检查是否已经是商家
      const [existingMerchant] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.role, 'owner'),
          eq(merchantStaffRoles.isActive, true)
        ))
        .limit(1);

      if (existingMerchant) {
        return res.status(400).json({ 
          success: false, 
          message: '您已经是商家，无需重复申请' 
        });
      }

      // 检查是否有待审核的申请
      const [pendingApp] = await db
        .select()
        .from(discoverApplications)
        .where(and(
          eq(discoverApplications.userId, userId),
          eq(discoverApplications.status, 'pending')
        ))
        .limit(1);

      if (pendingApp) {
        return res.status(400).json({ 
          success: false, 
          message: '您有待审核的申请，请耐心等待' 
        });
      }

      // 验证请求数据
      const validatedData = insertDiscoverApplicationSchema.parse({
        ...req.body,
        userId,
      });

      // 创建申请
      const [newApplication] = await db
        .insert(discoverApplications)
        .values(validatedData)
        .returning();

      res.json({
        success: true,
        message: '申请已提交，请等待审核',
        data: newApplication,
      });
    } catch (error: any) {
      console.error('Submit discover application error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          message: '请填写完整的申请信息',
          errors: error.errors,
        });
      }
      res.status(500).json({ success: false, message: 'Failed to submit application' });
    }
  });

  // 提交刷刷号申请（创作者入驻）
  app.post('/api/applications/shuashua', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // 检查是否已经是创作者
      const [userData] = await db
        .select({ shuaName: users.shuaName })
        .from(users)
        .where(eq(users.id, userId));

      if (userData?.shuaName) {
        return res.status(400).json({ 
          success: false, 
          message: '您已经是创作者，无需重复申请' 
        });
      }

      // 检查是否有待审核的申请
      const [pendingApp] = await db
        .select()
        .from(shuashuaApplications)
        .where(and(
          eq(shuashuaApplications.userId, userId),
          eq(shuashuaApplications.status, 'pending')
        ))
        .limit(1);

      if (pendingApp) {
        return res.status(400).json({ 
          success: false, 
          message: '您有待审核的申请，请耐心等待' 
        });
      }

      // 检查刷刷号名称是否已被使用
      const { shuaName } = req.body;
      const [existingShuaName] = await db
        .select()
        .from(users)
        .where(eq(users.shuaName, shuaName))
        .limit(1);

      if (existingShuaName) {
        return res.status(400).json({ 
          success: false, 
          message: '该刷刷号名称已被使用，请换一个' 
        });
      }

      // 也检查待审核的申请中是否有相同的刷刷号名称
      const [pendingSameName] = await db
        .select()
        .from(shuashuaApplications)
        .where(and(
          eq(shuashuaApplications.shuaName, shuaName),
          eq(shuashuaApplications.status, 'pending')
        ))
        .limit(1);

      if (pendingSameName) {
        return res.status(400).json({ 
          success: false, 
          message: '该刷刷号名称已被其他用户申请，请换一个' 
        });
      }

      // 验证请求数据
      const validatedData = insertShuashuaApplicationSchema.parse({
        ...req.body,
        userId,
      });

      // 创建申请
      const [newApplication] = await db
        .insert(shuashuaApplications)
        .values(validatedData)
        .returning();

      res.json({
        success: true,
        message: '申请已提交，请等待审核',
        data: newApplication,
      });
    } catch (error: any) {
      console.error('Submit shuashua application error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          message: '请填写完整的申请信息',
          errors: error.errors,
        });
      }
      res.status(500).json({ success: false, message: 'Failed to submit application' });
    }
  });

  // ============ 购物车 API ============
  
  // 获取当前用户的购物车
  app.get('/api/cart', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const storeId = parseInt(req.query.storeId as string);
      
      if (!storeId) {
        return res.status(400).json({ success: false, message: '门店ID必填' });
      }

      // 查找活跃购物车
      const [cart] = await db
        .select()
        .from(carts)
        .where(and(
          eq(carts.userId, userId),
          eq(carts.storeId, storeId),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (!cart) {
        return res.json({ success: true, data: null });
      }

      // 获取门店信息
      const [store] = await db
        .select({
          id: stores.id,
          name: stores.name,
          imageUrl: stores.imageUrl,
        })
        .from(stores)
        .where(eq(stores.id, storeId))
        .limit(1);

      // 获取购物车商品
      const items = await db
        .select({
          id: cartItems.id,
          cartId: cartItems.cartId,
          productId: cartItems.productId,
          quantity: cartItems.quantity,
          unitPrice: cartItems.unitPrice,
          options: cartItems.options,
          note: cartItems.note,
          product: {
            id: products.id,
            name: products.name,
            coverImage: products.coverImage,
            price: products.price,
            originalPrice: products.originalPrice,
            status: products.status,
          }
        })
        .from(cartItems)
        .leftJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.cartId, cart.id));

      res.json({
        success: true,
        data: {
          ...cart,
          store,
          items,
        },
      });
    } catch (error: any) {
      console.error('Get cart error:', error);
      res.status(500).json({ success: false, message: 'Failed to get cart' });
    }
  });

  // 添加商品到购物车
  app.post('/api/cart/items', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { storeId, productId, quantity = 1, options, note } = req.body;

      if (!storeId || !productId) {
        return res.status(400).json({ success: false, message: '门店ID和商品ID必填' });
      }

      // 获取商品信息
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.storeId, storeId),
          eq(products.status, 'active')
        ))
        .limit(1);

      if (!product) {
        return res.status(404).json({ success: false, message: '商品不存在或已下架' });
      }

      // 查找或创建购物车
      let [cart] = await db
        .select()
        .from(carts)
        .where(and(
          eq(carts.userId, userId),
          eq(carts.storeId, storeId),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (!cart) {
        [cart] = await db
          .insert(carts)
          .values({
            userId,
            storeId,
            status: 'active',
            orderType: 'delivery',
          })
          .returning();
      }

      // 检查购物车是否已有该商品
      const [existingItem] = await db
        .select()
        .from(cartItems)
        .where(and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, productId)
        ))
        .limit(1);

      if (existingItem) {
        // 更新数量
        await db
          .update(cartItems)
          .set({
            quantity: existingItem.quantity + quantity,
            options: options || existingItem.options,
            note: note || existingItem.note,
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        // 添加新商品
        await db
          .insert(cartItems)
          .values({
            cartId: cart.id,
            productId,
            quantity,
            unitPrice: product.price,
            options: options ? JSON.stringify(options) : null,
            note,
          });
      }

      // 重新计算购物车总价
      await updateCartTotals(cart.id);

      res.json({ success: true, message: '商品已添加到购物车' });
    } catch (error: any) {
      console.error('Add to cart error:', error);
      res.status(500).json({ success: false, message: 'Failed to add to cart' });
    }
  });

  // 更新购物车商品数量
  app.patch('/api/cart/items/:itemId', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const itemId = parseInt(req.params.itemId);
      const { quantity } = req.body;

      // 验证购物车属于当前用户
      const [item] = await db
        .select({
          item: cartItems,
          cart: carts,
        })
        .from(cartItems)
        .innerJoin(carts, eq(cartItems.cartId, carts.id))
        .where(and(
          eq(cartItems.id, itemId),
          eq(carts.userId, userId)
        ))
        .limit(1);

      if (!item) {
        return res.status(404).json({ success: false, message: '购物车商品不存在' });
      }

      if (quantity <= 0) {
        // 删除商品
        await db.delete(cartItems).where(eq(cartItems.id, itemId));
      } else {
        // 更新数量
        await db
          .update(cartItems)
          .set({ quantity, updatedAt: new Date() })
          .where(eq(cartItems.id, itemId));
      }

      await updateCartTotals(item.cart.id);

      res.json({ success: true, message: '购物车已更新' });
    } catch (error: any) {
      console.error('Update cart item error:', error);
      res.status(500).json({ success: false, message: 'Failed to update cart' });
    }
  });

  // 删除购物车商品
  app.delete('/api/cart/items/:itemId', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const itemId = parseInt(req.params.itemId);

      const [item] = await db
        .select({
          item: cartItems,
          cart: carts,
        })
        .from(cartItems)
        .innerJoin(carts, eq(cartItems.cartId, carts.id))
        .where(and(
          eq(cartItems.id, itemId),
          eq(carts.userId, userId)
        ))
        .limit(1);

      if (!item) {
        return res.status(404).json({ success: false, message: '购物车商品不存在' });
      }

      await db.delete(cartItems).where(eq(cartItems.id, itemId));
      await updateCartTotals(item.cart.id);

      res.json({ success: true, message: '商品已从购物车移除' });
    } catch (error: any) {
      console.error('Delete cart item error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete cart item' });
    }
  });

  // 清空购物车
  app.delete('/api/cart', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const storeId = parseInt(req.query.storeId as string);

      if (!storeId) {
        return res.status(400).json({ success: false, message: '门店ID必填' });
      }

      const [cart] = await db
        .select()
        .from(carts)
        .where(and(
          eq(carts.userId, userId),
          eq(carts.storeId, storeId),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (cart) {
        await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
        await db.delete(carts).where(eq(carts.id, cart.id));
      }

      res.json({ success: true, message: '购物车已清空' });
    } catch (error: any) {
      console.error('Clear cart error:', error);
      res.status(500).json({ success: false, message: 'Failed to clear cart' });
    }
  });

  // 辅助函数：更新购物车总价
  async function updateCartTotals(cartId: number) {
    const items = await db
      .select({
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));

    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * parseFloat(item.unitPrice || '0'));
    }, 0);

    await db
      .update(carts)
      .set({
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2), // 配送费等在结算时计算
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId));
  }

  // ============ 配送地址 API ============

  // 获取用户配送地址列表
  app.get('/api/delivery-addresses', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const addresses = await db
        .select()
        .from(deliveryAddresses)
        .where(eq(deliveryAddresses.userId, userId))
        .orderBy(desc(deliveryAddresses.isDefault), desc(deliveryAddresses.updatedAt));

      res.json({ success: true, data: addresses });
    } catch (error: any) {
      console.error('Get addresses error:', error);
      res.status(500).json({ success: false, message: 'Failed to get addresses' });
    }
  });

  // 添加配送地址
  app.post('/api/delivery-addresses', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const data = insertDeliveryAddressSchema.parse({
        ...req.body,
        userId,
      });

      // 如果设为默认，先取消其他默认地址
      if (data.isDefault) {
        await db
          .update(deliveryAddresses)
          .set({ isDefault: false })
          .where(eq(deliveryAddresses.userId, userId));
      }

      const [address] = await db
        .insert(deliveryAddresses)
        .values(data)
        .returning();

      res.json({ success: true, data: address });
    } catch (error: any) {
      console.error('Add address error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: '请填写完整的地址信息' });
      }
      res.status(500).json({ success: false, message: 'Failed to add address' });
    }
  });

  // 更新配送地址
  app.patch('/api/delivery-addresses/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const addressId = parseInt(req.params.id);

      const [existing] = await db
        .select()
        .from(deliveryAddresses)
        .where(and(
          eq(deliveryAddresses.id, addressId),
          eq(deliveryAddresses.userId, userId)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ success: false, message: '地址不存在' });
      }

      if (req.body.isDefault) {
        await db
          .update(deliveryAddresses)
          .set({ isDefault: false })
          .where(eq(deliveryAddresses.userId, userId));
      }

      const [updated] = await db
        .update(deliveryAddresses)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(deliveryAddresses.id, addressId))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Update address error:', error);
      res.status(500).json({ success: false, message: 'Failed to update address' });
    }
  });

  // 删除配送地址
  app.delete('/api/delivery-addresses/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const addressId = parseInt(req.params.id);

      await db
        .delete(deliveryAddresses)
        .where(and(
          eq(deliveryAddresses.id, addressId),
          eq(deliveryAddresses.userId, userId)
        ));

      res.json({ success: true, message: '地址已删除' });
    } catch (error: any) {
      console.error('Delete address error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
  });

  // ============ 外卖订单 API ============

  // 计算配送费
  app.post('/api/delivery/calculate-fee', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { storeId, addressId, subtotal } = req.body;

      if (!storeId || !addressId) {
        return res.status(400).json({ success: false, message: '门店ID和地址ID必填' });
      }

      const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
      const [address] = await db.select().from(deliveryAddresses).where(eq(deliveryAddresses.id, addressId)).limit(1);

      if (!store || !address) {
        return res.status(404).json({ success: false, message: '门店或地址不存在' });
      }

      // 计算距离（使用 Haversine 公式）
      const storeLat = parseFloat(store.latitude || '0');
      const storeLng = parseFloat(store.longitude || '0');
      const addrLat = parseFloat(address.latitude || '0');
      const addrLng = parseFloat(address.longitude || '0');

      let distance = 0;
      if (storeLat && storeLng && addrLat && addrLng) {
        distance = calculateHaversineDistance(storeLat, storeLng, addrLat, addrLng);
      }

      // 检查是否在配送范围内
      const maxRadius = parseFloat(store.deliveryRadiusKm || '5');
      if (distance > maxRadius) {
        return res.json({
          success: true,
          data: {
            distance,
            deliveryFee: 0,
            outOfRange: true,
            message: `超出配送范围(${maxRadius}公里)`,
          },
        });
      }

      // 计算配送费
      const baseFee = parseFloat(store.baseDeliveryFee || '20');
      const perKmFee = parseFloat(store.perKmFee || '5');
      const freeMinAmount = parseFloat(store.freeDeliveryMinAmount || '0');

      let deliveryFee = baseFee + (distance * perKmFee);

      // 满额免配送费
      if (freeMinAmount > 0 && subtotal >= freeMinAmount) {
        deliveryFee = 0;
      }

      res.json({
        success: true,
        data: {
          distance: Math.round(distance * 10) / 10,
          deliveryFee: Math.round(deliveryFee * 100) / 100,
          baseFee,
          perKmFee,
          freeMinAmount,
          outOfRange: false,
        },
      });
    } catch (error: any) {
      console.error('Calculate fee error:', error);
      res.status(500).json({ success: false, message: 'Failed to calculate delivery fee' });
    }
  });

  // Haversine 距离计算（公里）
  function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 创建外卖订单（结算）
  app.post('/api/delivery-orders', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { storeId, addressId, orderType = 'delivery', customerNote, paymentMethod } = req.body;

      if (!storeId) {
        return res.status(400).json({ success: false, message: '门店ID必填' });
      }

      // 获取购物车
      const [cart] = await db
        .select()
        .from(carts)
        .where(and(
          eq(carts.userId, userId),
          eq(carts.storeId, storeId),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (!cart) {
        return res.status(400).json({ success: false, message: '购物车为空' });
      }

      // 获取购物车商品
      const items = await db
        .select({
          item: cartItems,
          product: products,
        })
        .from(cartItems)
        .leftJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.cartId, cart.id));

      if (items.length === 0) {
        return res.status(400).json({ success: false, message: '购物车为空' });
      }

      // 获取门店信息
      const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
      if (!store) {
        return res.status(404).json({ success: false, message: '门店不存在' });
      }

      // 计算小计
      const subtotal = items.reduce((sum, { item }) => {
        return sum + (item.quantity * parseFloat(item.unitPrice || '0'));
      }, 0);

      // 检查最低起送金额
      const minAmount = parseFloat(store.minOrderAmount || '0');
      if (subtotal < minAmount) {
        return res.status(400).json({ 
          success: false, 
          message: `订单金额未达到最低起送金额 ${minAmount} 泰铢` 
        });
      }

      let deliveryFee = 0;
      let distance = 0;
      let addressSnapshot = null;

      if (orderType === 'delivery') {
        if (!addressId) {
          return res.status(400).json({ success: false, message: '请选择配送地址' });
        }

        const [address] = await db.select().from(deliveryAddresses).where(eq(deliveryAddresses.id, addressId)).limit(1);
        if (!address) {
          return res.status(404).json({ success: false, message: '地址不存在' });
        }

        // 计算配送距离和费用
        const storeLat = parseFloat(store.latitude || '0');
        const storeLng = parseFloat(store.longitude || '0');
        const addrLat = parseFloat(address.latitude || '0');
        const addrLng = parseFloat(address.longitude || '0');

        if (storeLat && storeLng && addrLat && addrLng) {
          distance = calculateHaversineDistance(storeLat, storeLng, addrLat, addrLng);
        }

        const maxRadius = parseFloat(store.deliveryRadiusKm || '5');
        if (distance > maxRadius) {
          return res.status(400).json({ success: false, message: '超出配送范围' });
        }

        const baseFee = parseFloat(store.baseDeliveryFee || '20');
        const perKmFee = parseFloat(store.perKmFee || '5');
        const freeMinAmount = parseFloat(store.freeDeliveryMinAmount || '0');

        deliveryFee = baseFee + (distance * perKmFee);
        if (freeMinAmount > 0 && subtotal >= freeMinAmount) {
          deliveryFee = 0;
        }

        addressSnapshot = JSON.stringify({
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          district: address.district,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          latitude: address.latitude,
          longitude: address.longitude,
        });
      }

      const packagingFee = parseFloat(store.packagingFee || '0');
      const total = subtotal + deliveryFee + packagingFee;

      // 生成订单号
      const orderNo = `D${Date.now()}${nanoid(4).toUpperCase()}`;

      // 创建订单
      const [order] = await db
        .insert(deliveryOrders)
        .values({
          orderNo,
          userId,
          storeId,
          cartId: cart.id,
          addressId: orderType === 'delivery' ? addressId : null,
          orderType,
          status: 'pending_payment',
          addressSnapshot,
          subtotal: subtotal.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          packagingFee: packagingFee.toFixed(2),
          discount: '0',
          total: total.toFixed(2),
          currency: 'THB',
          distanceKm: distance.toFixed(2),
          estimatedPrepTime: store.pickupTime || 20,
          estimatedDeliveryTime: orderType === 'delivery' ? Math.ceil(distance * 5) + 15 : null,
          customerNote,
          paymentMethod,
        })
        .returning();

      // 创建订单商品快照
      for (const { item, product } of items) {
        await db.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          productName: product?.name || '未知商品',
          productImage: product?.coverImage,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: (item.quantity * parseFloat(item.unitPrice || '0')).toFixed(2),
          options: item.options,
          note: item.note,
        });
      }

      // 更新购物车状态
      await db
        .update(carts)
        .set({ status: 'checked_out', updatedAt: new Date() })
        .where(eq(carts.id, cart.id));

      res.json({
        success: true,
        data: order,
        message: '订单创建成功',
      });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(500).json({ success: false, message: 'Failed to create order' });
    }
  });

  // 获取用户订单列表
  app.get('/api/delivery-orders', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string;

      let query = db
        .select({
          order: deliveryOrders,
          store: {
            id: stores.id,
            name: stores.name,
            imageUrl: stores.imageUrl,
          },
        })
        .from(deliveryOrders)
        .leftJoin(stores, eq(deliveryOrders.storeId, stores.id))
        .where(eq(deliveryOrders.userId, userId))
        .orderBy(desc(deliveryOrders.createdAt));

      const orders = await query;

      // 获取每个订单的商品
      const ordersWithItems = await Promise.all(
        orders.map(async ({ order, store }) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          return {
            ...order,
            store,
            items,
          };
        })
      );

      res.json({ success: true, data: ordersWithItems });
    } catch (error: any) {
      console.error('Get orders error:', error);
      res.status(500).json({ success: false, message: 'Failed to get orders' });
    }
  });

  // 获取订单详情
  app.get('/api/delivery-orders/:id', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.id);

      const [result] = await db
        .select({
          order: deliveryOrders,
          store: stores,
        })
        .from(deliveryOrders)
        .leftJoin(stores, eq(deliveryOrders.storeId, stores.id))
        .where(and(
          eq(deliveryOrders.id, orderId),
          eq(deliveryOrders.userId, userId)
        ))
        .limit(1);

      if (!result) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // 获取配送信息
      const [assignment] = await db
        .select()
        .from(deliveryAssignments)
        .where(eq(deliveryAssignments.orderId, orderId))
        .limit(1);

      res.json({
        success: true,
        data: {
          ...result.order,
          store: result.store,
          items,
          delivery: assignment,
        },
      });
    } catch (error: any) {
      console.error('Get order detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to get order' });
    }
  });

  // ============ 商户外卖订单管理 API ============

  // 获取商户订单列表
  app.get('/api/merchant/delivery-orders', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string;

      // 获取用户管理的门店
      const staffRoles = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          or(
            eq(merchantStaffRoles.role, 'owner'),
            eq(merchantStaffRoles.role, 'operator')
          )
        ));

      if (staffRoles.length === 0) {
        return res.status(403).json({ success: false, message: '无权限' });
      }

      const storeIds = staffRoles.map(r => r.storeId);

      let conditions: any[] = [inArray(deliveryOrders.storeId, storeIds)];
      if (status) {
        conditions.push(eq(deliveryOrders.status, status as any));
      }

      const orders = await db
        .select({
          order: deliveryOrders,
          user: {
            id: users.id,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(deliveryOrders)
        .leftJoin(users, eq(deliveryOrders.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(deliveryOrders.createdAt));

      // 获取订单商品
      const ordersWithItems = await Promise.all(
        orders.map(async ({ order, user }) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          return {
            ...order,
            customer: user,
            items,
          };
        })
      );

      res.json({ success: true, data: ordersWithItems });
    } catch (error: any) {
      console.error('Get merchant orders error:', error);
      res.status(500).json({ success: false, message: 'Failed to get orders' });
    }
  });

  // 商户接单
  app.post('/api/merchant/delivery-orders/:id/accept', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.id);
      const { estimatedPrepTime } = req.body;

      const [order] = await db
        .select()
        .from(deliveryOrders)
        .where(eq(deliveryOrders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      // 验证权限
      const [staffRole] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, order.storeId),
          or(
            eq(merchantStaffRoles.role, 'owner'),
            eq(merchantStaffRoles.role, 'operator')
          )
        ))
        .limit(1);

      if (!staffRole) {
        return res.status(403).json({ success: false, message: '无权限' });
      }

      if (order.status !== 'paid') {
        return res.status(400).json({ success: false, message: '订单状态不允许接单' });
      }

      await db
        .update(deliveryOrders)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          estimatedPrepTime: estimatedPrepTime || order.estimatedPrepTime,
          updatedAt: new Date(),
        })
        .where(eq(deliveryOrders.id, orderId));

      res.json({ success: true, message: '已接单' });
    } catch (error: any) {
      console.error('Accept order error:', error);
      res.status(500).json({ success: false, message: 'Failed to accept order' });
    }
  });

  // 商户标记备餐完成
  app.post('/api/merchant/delivery-orders/:id/ready', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.id);

      const [order] = await db
        .select()
        .from(deliveryOrders)
        .where(eq(deliveryOrders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const [staffRole] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, order.storeId),
          or(
            eq(merchantStaffRoles.role, 'owner'),
            eq(merchantStaffRoles.role, 'operator')
          )
        ))
        .limit(1);

      if (!staffRole) {
        return res.status(403).json({ success: false, message: '无权限' });
      }

      if (order.status !== 'accepted' && order.status !== 'preparing') {
        return res.status(400).json({ success: false, message: '订单状态不允许此操作' });
      }

      await db
        .update(deliveryOrders)
        .set({
          status: 'ready_for_pickup',
          preparedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deliveryOrders.id, orderId));

      res.json({ success: true, message: '已标记备餐完成' });
    } catch (error: any) {
      console.error('Mark ready error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark order ready' });
    }
  });

  // 商户完成自取订单
  app.post('/api/merchant/delivery-orders/:id/complete', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.id);

      const [order] = await db
        .select()
        .from(deliveryOrders)
        .where(eq(deliveryOrders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const [staffRole] = await db
        .select()
        .from(merchantStaffRoles)
        .where(and(
          eq(merchantStaffRoles.userId, userId),
          eq(merchantStaffRoles.storeId, order.storeId),
          or(
            eq(merchantStaffRoles.role, 'owner'),
            eq(merchantStaffRoles.role, 'operator')
          )
        ))
        .limit(1);

      if (!staffRole) {
        return res.status(403).json({ success: false, message: '无权限' });
      }

      await db
        .update(deliveryOrders)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deliveryOrders.id, orderId));

      res.json({ success: true, message: '订单已完成' });
    } catch (error: any) {
      console.error('Complete order error:', error);
      res.status(500).json({ success: false, message: 'Failed to complete order' });
    }
  });

  // ============================================
  // 聊聊模块 API - LiaoLiao Social Chat
  // ============================================

  // 消息翻译 API - 将消息翻译成用户浏览器语言
  app.post('/api/translate/message', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { translateMessage, isTranslationEnabled } = await import('./services/translationService');
      
      const { text, targetLang } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ success: false, message: '文本不能为空' });
      }
      
      if (!targetLang || typeof targetLang !== 'string') {
        return res.status(400).json({ success: false, message: '目标语言不能为空' });
      }
      
      // 检查翻译服务是否可用
      if (!isTranslationEnabled()) {
        return res.json({ 
          success: true, 
          translatedText: text,
          originalText: text,
          detectedLang: 'unknown',
          needsTranslation: false,
          serviceAvailable: false
        });
      }
      
      const result = await translateMessage(text, targetLang);
      
      res.json({ 
        success: true,
        translatedText: result.translatedText,
        originalText: text,
        detectedLang: result.detectedLang,
        needsTranslation: result.needsTranslation,
        serviceAvailable: true
      });
    } catch (error: any) {
      console.error('Translation error:', error);
      res.status(500).json({ 
        success: false, 
        message: '翻译服务出错',
        translatedText: req.body?.text || '',
        originalText: req.body?.text || ''
      });
    }
  });

  // 批量翻译消息 API - 一次翻译多条消息
  app.post('/api/translate/messages', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { translateMessage, isTranslationEnabled } = await import('./services/translationService');
      
      const { messages, targetLang } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: '消息列表不能为空' });
      }
      
      if (!targetLang || typeof targetLang !== 'string') {
        return res.status(400).json({ success: false, message: '目标语言不能为空' });
      }
      
      // 检查翻译服务是否可用
      if (!isTranslationEnabled()) {
        return res.json({ 
          success: true,
          translations: messages.map((msg: { id: number; text: string }) => ({
            id: msg.id,
            translatedText: msg.text,
            originalText: msg.text,
            detectedLang: 'unknown',
            needsTranslation: false
          })),
          serviceAvailable: false
        });
      }
      
      // 并行翻译所有消息
      const translations = await Promise.all(
        messages.map(async (msg: { id: number; text: string }) => {
          try {
            const result = await translateMessage(msg.text, targetLang);
            return {
              id: msg.id,
              translatedText: result.translatedText,
              originalText: msg.text,
              detectedLang: result.detectedLang,
              needsTranslation: result.needsTranslation
            };
          } catch (error) {
            return {
              id: msg.id,
              translatedText: msg.text,
              originalText: msg.text,
              detectedLang: 'unknown',
              needsTranslation: false
            };
          }
        })
      );
      
      res.json({ 
        success: true,
        translations,
        serviceAvailable: true
      });
    } catch (error: any) {
      console.error('Batch translation error:', error);
      res.status(500).json({ success: false, message: '翻译服务出错' });
    }
  });

  // AI聊天接口
  app.post('/api/liaoliao/ai-chat', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { chat, isAiChatEnabled } = await import('./services/aiChatService');
      
      if (!isAiChatEnabled()) {
        return res.status(503).json({ 
          success: false, 
          message: 'AI服务暂不可用',
          reply: '抱歉，AI服务暂时不可用。请稍后再试。'
        });
      }

      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: '消息不能为空' });
      }

      const reply = await chat(messages);
      
      res.json({ success: true, reply });
    } catch (error: any) {
      console.error('AI Chat error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'AI服务出错',
        reply: '抱歉，AI服务暂时出错。请稍后再试。'
      });
    }
  });

  // 获取好友列表
  app.get('/api/liaoliao/friends', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // 获取已接受的好友
      const friendships = await db
        .select({
          friend: liaoliaoFriends,
          user: users,
        })
        .from(liaoliaoFriends)
        .innerJoin(users, eq(liaoliaoFriends.friendId, users.id))
        .where(and(
          eq(liaoliaoFriends.userId, userId),
          eq(liaoliaoFriends.status, 'accepted')
        ))
        .orderBy(desc(liaoliaoFriends.updatedAt));

      // 获取最后一条消息
      const friendsWithLastMessage = await Promise.all(
        friendships.map(async ({ friend, user }) => {
          const [lastMessage] = await db
            .select()
            .from(liaoliaoMessages)
            .where(or(
              and(
                eq(liaoliaoMessages.fromUserId, userId),
                eq(liaoliaoMessages.toUserId, friend.friendId)
              ),
              and(
                eq(liaoliaoMessages.fromUserId, friend.friendId),
                eq(liaoliaoMessages.toUserId, userId)
              )
            ))
            .orderBy(desc(liaoliaoMessages.createdAt))
            .limit(1);

          // 统计未读消息
          const [unreadCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(liaoliaoMessages)
            .where(and(
              eq(liaoliaoMessages.fromUserId, friend.friendId),
              eq(liaoliaoMessages.toUserId, userId),
              eq(liaoliaoMessages.isRead, false)
            ));

          return {
            id: friend.friendId,
            displayName: friend.remarkName || user.displayName || user.lineDisplayName,
            avatarUrl: user.avatarUrl || user.lineAvatarUrl,
            lastMessage: lastMessage?.content,
            lastMessageAt: lastMessage?.createdAt,
            unreadCount: unreadCount?.count || 0,
            isOnline: false,
          };
        })
      );

      res.json(friendsWithLastMessage);
    } catch (error: any) {
      console.error('Get friends error:', error);
      res.status(500).json({ message: 'Failed to get friends' });
    }
  });

  // 获取好友请求列表
  app.get('/api/liaoliao/friend-requests', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const requests = await db
        .select({
          request: liaoliaoFriends,
          user: users,
        })
        .from(liaoliaoFriends)
        .innerJoin(users, eq(liaoliaoFriends.userId, users.id))
        .where(and(
          eq(liaoliaoFriends.friendId, userId),
          eq(liaoliaoFriends.status, 'pending')
        ))
        .orderBy(desc(liaoliaoFriends.createdAt));

      res.json(requests.map(({ request, user }) => ({
        id: request.id,
        userId: request.userId,
        displayName: user.displayName || user.lineDisplayName,
        avatarUrl: user.avatarUrl || user.lineAvatarUrl,
        createdAt: request.createdAt,
      })));
    } catch (error: any) {
      console.error('Get friend requests error:', error);
      res.status(500).json({ message: 'Failed to get friend requests' });
    }
  });

  // 发送好友请求
  app.post('/api/liaoliao/friends/request', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { friendId } = req.body;

      if (!friendId || friendId === userId) {
        return res.status(400).json({ message: 'Invalid friend ID' });
      }

      // 检查是否已经是好友
      const [existing] = await db
        .select()
        .from(liaoliaoFriends)
        .where(and(
          eq(liaoliaoFriends.userId, userId),
          eq(liaoliaoFriends.friendId, friendId)
        ))
        .limit(1);

      if (existing) {
        return res.status(400).json({ message: 'Friend request already exists' });
      }

      await db.insert(liaoliaoFriends).values({
        userId,
        friendId,
        status: 'pending',
      });

      res.json({ success: true, message: 'Friend request sent' });
    } catch (error: any) {
      console.error('Send friend request error:', error);
      res.status(500).json({ message: 'Failed to send friend request' });
    }
  });

  // 接受好友请求
  app.post('/api/liaoliao/friends/accept', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { requesterId } = req.body;

      // 更新请求状态
      await db
        .update(liaoliaoFriends)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(and(
          eq(liaoliaoFriends.userId, requesterId),
          eq(liaoliaoFriends.friendId, userId),
          eq(liaoliaoFriends.status, 'pending')
        ));

      // 创建双向好友关系
      await db.insert(liaoliaoFriends).values({
        userId,
        friendId: requesterId,
        status: 'accepted',
      }).onConflictDoUpdate({
        target: [liaoliaoFriends.userId, liaoliaoFriends.friendId],
        set: { status: 'accepted', updatedAt: new Date() },
      });

      res.json({ success: true, message: 'Friend request accepted' });
    } catch (error: any) {
      console.error('Accept friend request error:', error);
      res.status(500).json({ message: 'Failed to accept friend request' });
    }
  });

  // 获取私聊消息
  app.get('/api/liaoliao/messages/:friendId', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const friendId = parseInt(req.params.friendId);
      const { before, limit = 50 } = req.query;

      let query = db
        .select({
          message: liaoliaoMessages,
          fromUser: users,
        })
        .from(liaoliaoMessages)
        .innerJoin(users, eq(liaoliaoMessages.fromUserId, users.id))
        .where(and(
          or(
            and(
              eq(liaoliaoMessages.fromUserId, userId),
              eq(liaoliaoMessages.toUserId, friendId)
            ),
            and(
              eq(liaoliaoMessages.fromUserId, friendId),
              eq(liaoliaoMessages.toUserId, userId)
            )
          ),
          eq(liaoliaoMessages.isDeleted, false)
        ))
        .orderBy(desc(liaoliaoMessages.createdAt))
        .limit(Number(limit));

      const results = await query;

      // 标记消息为已读
      await db
        .update(liaoliaoMessages)
        .set({ isRead: true })
        .where(and(
          eq(liaoliaoMessages.fromUserId, friendId),
          eq(liaoliaoMessages.toUserId, userId),
          eq(liaoliaoMessages.isRead, false)
        ));

      res.json({
        messages: results.reverse().map(({ message, fromUser }) => ({
          id: message.id,
          fromUserId: message.fromUserId,
          toUserId: message.toUserId,
          messageType: message.messageType,
          content: message.content,
          mediaUrl: message.mediaUrl,
          metadata: message.mediaMetadata ? JSON.parse(message.mediaMetadata) : null,
          createdAt: message.createdAt,
          fromUser: {
            id: fromUser.id,
            displayName: fromUser.displayName || fromUser.lineDisplayName,
            avatarUrl: fromUser.avatarUrl || fromUser.lineAvatarUrl,
          },
        })),
        hasMore: results.length === Number(limit),
      });
    } catch (error: any) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  // 发送私聊消息
  app.post('/api/liaoliao/messages', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { toUserId, content, messageType = 'text', mediaUrl, metadata } = req.body;

      if (!toUserId || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const [message] = await db.insert(liaoliaoMessages).values({
        fromUserId: userId,
        toUserId,
        content,
        messageType,
        mediaUrl,
        mediaMetadata: metadata ? JSON.stringify(metadata) : null,
      }).returning();

      // 获取发送者信息
      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // 如果是语音消息，异步进行语音转文字（前端发送 'audio' 类型）
      console.log(`[Liaoliao] 消息类型: ${messageType}, mediaUrl: ${mediaUrl ? '有' : '无'}`);
      if ((messageType === 'voice' || messageType === 'audio') && mediaUrl) {
        console.log(`[Liaoliao] 🎤 开始异步转录语音消息 ${message.id}...`);
        // 异步转录，不阻塞响应
        (async () => {
          try {
            console.log(`[Liaoliao] 📥 下载并转录: ${mediaUrl}`);
            const result = await transcribeAudio(mediaUrl);
            console.log(`[Liaoliao] 转录结果:`, result);
            if (result && result.transcript) {
              // 更新消息的 metadata，添加转录文本
              const existingMetadata = metadata || {};
              const updatedMetadata = {
                ...existingMetadata,
                transcript: result.transcript,
                transcriptLanguage: result.detectedLanguage,
                transcriptionStatus: 'completed',
              };
              await db.update(liaoliaoMessages)
                .set({ mediaMetadata: JSON.stringify(updatedMetadata) })
                .where(eq(liaoliaoMessages.id, message.id));
              console.log(`✅ 语音消息 ${message.id} 转录完成`);
            }
          } catch (err) {
            console.error(`❌ 语音消息 ${message.id} 转录失败:`, err);
          }
        })();
      }

      res.json({
        id: message.id,
        fromUserId: message.fromUserId,
        toUserId: message.toUserId,
        messageType: message.messageType,
        content: message.content,
        mediaUrl: message.mediaUrl,
        metadata: message.mediaMetadata ? JSON.parse(message.mediaMetadata) : null,
        createdAt: message.createdAt,
        fromUser: {
          id: sender.id,
          displayName: sender.displayName || sender.lineDisplayName,
          avatarUrl: sender.avatarUrl || sender.lineAvatarUrl,
        },
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // 获取群组列表
  app.get('/api/liaoliao/groups', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const groupList = await db
        .select({
          group: liaoliaoGroups,
          member: liaoliaoGroupMembers,
        })
        .from(liaoliaoGroupMembers)
        .innerJoin(liaoliaoGroups, eq(liaoliaoGroupMembers.groupId, liaoliaoGroups.id))
        .where(eq(liaoliaoGroupMembers.userId, userId))
        .orderBy(desc(liaoliaoGroups.updatedAt));

      res.json(groupList.map(({ group, member }) => ({
        id: group.id,
        name: group.name,
        avatarUrl: group.avatarUrl,
        description: group.description,
        role: member.role,
        isMuted: member.isMuted,
      })));
    } catch (error: any) {
      console.error('Get groups error:', error);
      res.status(500).json({ message: 'Failed to get groups' });
    }
  });

  // 创建群组
  app.post('/api/liaoliao/groups', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { name, memberIds = [] } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
      }

      // 创建群组
      const [group] = await db.insert(liaoliaoGroups).values({
        name,
        ownerId: userId,
      }).returning();

      // 添加群主
      await db.insert(liaoliaoGroupMembers).values({
        groupId: group.id,
        userId,
        role: 'owner',
      });

      // 添加其他成员
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await db.insert(liaoliaoGroupMembers).values({
            groupId: group.id,
            userId: memberId,
            role: 'member',
          });
        }
      }

      res.json(group);
    } catch (error: any) {
      console.error('Create group error:', error);
      res.status(500).json({ message: 'Failed to create group' });
    }
  });

  // 获取群消息
  app.get('/api/liaoliao/groups/:groupId/messages', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.groupId);
      const { limit = 50 } = req.query;

      // 验证用户是否是群成员
      const [member] = await db
        .select()
        .from(liaoliaoGroupMembers)
        .where(and(
          eq(liaoliaoGroupMembers.groupId, groupId),
          eq(liaoliaoGroupMembers.userId, userId)
        ))
        .limit(1);

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }

      const results = await db
        .select({
          message: liaoliaoMessages,
          fromUser: users,
        })
        .from(liaoliaoMessages)
        .innerJoin(users, eq(liaoliaoMessages.fromUserId, users.id))
        .where(and(
          eq(liaoliaoMessages.groupId, groupId),
          eq(liaoliaoMessages.isDeleted, false)
        ))
        .orderBy(desc(liaoliaoMessages.createdAt))
        .limit(Number(limit));

      res.json({
        messages: results.reverse().map(({ message, fromUser }) => ({
          id: message.id,
          fromUserId: message.fromUserId,
          groupId: message.groupId,
          messageType: message.messageType,
          content: message.content,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt,
          fromUser: {
            id: fromUser.id,
            displayName: fromUser.displayName || fromUser.lineDisplayName,
            avatarUrl: fromUser.avatarUrl || fromUser.lineAvatarUrl,
          },
        })),
        hasMore: results.length === Number(limit),
      });
    } catch (error: any) {
      console.error('Get group messages error:', error);
      res.status(500).json({ message: 'Failed to get group messages' });
    }
  });

  // 发送群消息
  app.post('/api/liaoliao/groups/:groupId/messages', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const groupId = parseInt(req.params.groupId);
      const { content, messageType = 'text', mediaUrl, metadata } = req.body;

      // 验证用户是否是群成员
      const [member] = await db
        .select()
        .from(liaoliaoGroupMembers)
        .where(and(
          eq(liaoliaoGroupMembers.groupId, groupId),
          eq(liaoliaoGroupMembers.userId, userId)
        ))
        .limit(1);

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }

      const [message] = await db.insert(liaoliaoMessages).values({
        fromUserId: userId,
        groupId,
        content,
        messageType,
        mediaUrl,
        mediaMetadata: metadata ? JSON.stringify(metadata) : null,
      }).returning();

      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // 如果是语音消息，异步进行语音转文字（前端发送 'audio' 类型）
      if ((messageType === 'voice' || messageType === 'audio') && mediaUrl) {
        (async () => {
          try {
            const result = await transcribeAudio(mediaUrl);
            if (result && result.transcript) {
              const existingMetadata = metadata || {};
              const updatedMetadata = {
                ...existingMetadata,
                transcript: result.transcript,
                transcriptLanguage: result.detectedLanguage,
                transcriptionStatus: 'completed',
              };
              await db.update(liaoliaoMessages)
                .set({ mediaMetadata: JSON.stringify(updatedMetadata) })
                .where(eq(liaoliaoMessages.id, message.id));
              console.log(`✅ 群组语音消息 ${message.id} 转录完成`);
            }
          } catch (err) {
            console.error(`❌ 群组语音消息 ${message.id} 转录失败:`, err);
          }
        })();
      }

      res.json({
        id: message.id,
        fromUserId: message.fromUserId,
        groupId: message.groupId,
        messageType: message.messageType,
        content: message.content,
        mediaUrl: message.mediaUrl,
        metadata: message.mediaMetadata ? JSON.parse(message.mediaMetadata) : null,
        createdAt: message.createdAt,
        fromUser: {
          id: sender.id,
          displayName: sender.displayName || sender.lineDisplayName,
          avatarUrl: sender.avatarUrl || sender.lineAvatarUrl,
        },
      });
    } catch (error: any) {
      console.error('Send group message error:', error);
      res.status(500).json({ message: 'Failed to send group message' });
    }
  });

  // 搜索用户（添加好友用）
  app.get('/api/liaoliao/users/search', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { q } = req.query;

      if (!q || String(q).length < 2) {
        return res.json([]);
      }

      const results = await db
        .select()
        .from(users)
        .where(and(
          sql`(${users.displayName} ILIKE ${'%' + q + '%'} OR ${users.lineDisplayName} ILIKE ${'%' + q + '%'} OR ${users.phone} = ${q})`,
          sql`${users.id} != ${userId}`
        ))
        .limit(20);

      res.json(results.map(user => ({
        id: user.id,
        displayName: user.displayName || user.lineDisplayName,
        avatarUrl: user.avatarUrl || user.lineAvatarUrl,
      })));
    } catch (error: any) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  // 获取聊天列表（好友+群组合并）
  app.get('/api/liaoliao/chats', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const chats: any[] = [];
      const addedFriendIds = new Set<number>();

      // 获取liaoliao_friends表中的好友
      const friendships = await db
        .select({
          friend: liaoliaoFriends,
          user: users,
        })
        .from(liaoliaoFriends)
        .innerJoin(users, eq(liaoliaoFriends.friendId, users.id))
        .where(and(
          eq(liaoliaoFriends.userId, userId),
          eq(liaoliaoFriends.status, 'accepted')
        ));

      for (const { friend, user } of friendships) {
        addedFriendIds.add(friend.friendId);
        const [lastMessage] = await db
          .select()
          .from(liaoliaoMessages)
          .where(or(
            and(
              eq(liaoliaoMessages.fromUserId, userId),
              eq(liaoliaoMessages.toUserId, friend.friendId)
            ),
            and(
              eq(liaoliaoMessages.fromUserId, friend.friendId),
              eq(liaoliaoMessages.toUserId, userId)
            )
          ))
          .orderBy(desc(liaoliaoMessages.createdAt))
          .limit(1);

        const [unreadCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(liaoliaoMessages)
          .where(and(
            eq(liaoliaoMessages.fromUserId, friend.friendId),
            eq(liaoliaoMessages.toUserId, userId),
            eq(liaoliaoMessages.isRead, false)
          ));

        chats.push({
          type: 'friend',
          id: friend.friendId,
          name: friend.remarkName || user.displayName || user.lineDisplayName,
          avatarUrl: user.avatarUrl || user.lineAvatarUrl,
          lastMessage: lastMessage?.content,
          lastMessageAt: lastMessage?.createdAt,
          unreadCount: unreadCount?.count || 0,
        });
      }

      // 获取tt_friends表中的好友（邀请系统创建的好友）
      const ttFriendships = await db
        .select({
          friend: ttFriends,
          user: users,
        })
        .from(ttFriends)
        .innerJoin(users, eq(ttFriends.friendUserId, users.id))
        .where(and(
          eq(ttFriends.userId, userId),
          eq(ttFriends.status, 'accepted')
        ));

      for (const { friend, user } of ttFriendships) {
        // 跳过已添加的好友（避免重复）
        if (addedFriendIds.has(friend.friendUserId)) continue;
        addedFriendIds.add(friend.friendUserId);

        const [lastMessage] = await db
          .select()
          .from(liaoliaoMessages)
          .where(or(
            and(
              eq(liaoliaoMessages.fromUserId, userId),
              eq(liaoliaoMessages.toUserId, friend.friendUserId)
            ),
            and(
              eq(liaoliaoMessages.fromUserId, friend.friendUserId),
              eq(liaoliaoMessages.toUserId, userId)
            )
          ))
          .orderBy(desc(liaoliaoMessages.createdAt))
          .limit(1);

        const [unreadCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(liaoliaoMessages)
          .where(and(
            eq(liaoliaoMessages.fromUserId, friend.friendUserId),
            eq(liaoliaoMessages.toUserId, userId),
            eq(liaoliaoMessages.isRead, false)
          ));

        chats.push({
          type: 'friend',
          id: friend.friendUserId,
          name: friend.nickname || user.displayName || (user as any).lineDisplayName,
          avatarUrl: user.avatarUrl || (user as any).lineAvatarUrl,
          lastMessage: lastMessage?.content,
          lastMessageAt: lastMessage?.createdAt,
          unreadCount: unreadCount?.count || 0,
        });
      }

      // 获取群组聊天
      const groupList = await db
        .select({
          group: liaoliaoGroups,
        })
        .from(liaoliaoGroupMembers)
        .innerJoin(liaoliaoGroups, eq(liaoliaoGroupMembers.groupId, liaoliaoGroups.id))
        .where(eq(liaoliaoGroupMembers.userId, userId));

      for (const { group } of groupList) {
        const [lastMessage] = await db
          .select()
          .from(liaoliaoMessages)
          .where(eq(liaoliaoMessages.groupId, group.id))
          .orderBy(desc(liaoliaoMessages.createdAt))
          .limit(1);

        chats.push({
          type: 'group',
          id: group.id,
          name: group.name,
          avatarUrl: group.avatarUrl,
          lastMessage: lastMessage?.content,
          lastMessageAt: lastMessage?.createdAt,
          unreadCount: 0,
        });
      }

      // 按最后消息时间排序
      chats.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });

      res.json(chats);
    } catch (error: any) {
      console.error('Get chats error:', error);
      res.status(500).json({ message: 'Failed to get chats' });
    }
  });

  // ==================== 超级通讯录 API ====================

  // 获取超级通讯录列表
  app.get('/api/contacts/super', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { type, status } = req.query;

      // 获取所有好友关系
      const friendships = await db
        .select({
          friend: ttFriends,
          user: users,
        })
        .from(ttFriends)
        .innerJoin(users, eq(ttFriends.friendUserId, users.id))
        .where(eq(ttFriends.userId, userId));

      // 获取用户发出的邀请记录
      const invites = await db
        .select()
        .from(ttInvites)
        .where(eq(ttInvites.inviterUserId, userId));

      // 构建统一联系人列表
      const contacts: any[] = [];

      // 添加好友
      for (const { friend, user } of friendships) {
        const inviteForUser = invites.find(inv => inv.usedByUserId === user.id);
        
        contacts.push({
          id: `user_${user.id}`,
          displayName: friend.nickname || user.displayName || user.lineDisplayName || `User ${user.id}`,
          avatarUrl: convertHttpToHttps(user.avatarUrl || user.lineAvatarUrl),
          contactType: 'user',
          sources: [
            {
              sourceType: 'platform',
              status: friend.status === 'accepted' ? 'friend' : friend.status === 'pending' ? 'invited' : 'registered',
              inviteChannel: friend.sourceChannel || undefined,
            }
          ],
          isFriend: friend.status === 'accepted',
          isRegistered: true,
          lastMessageAt: null,
          languages: user.preferredLang ? [user.preferredLang] : [],
        });
      }

      // 添加已邀请但未注册的联系人
      for (const invite of invites) {
        if (!invite.usedByUserId) {
          const channelLabels: Record<string, string> = {
            line: 'LINE',
            whatsapp: 'WhatsApp',
            viber: 'Viber',
            telegram: 'Telegram',
            sms: '短信',
            facebook: 'Facebook',
            generic: '链接',
            qr: '二维码',
          };
          const channelLabel = channelLabels[invite.inviteChannel] || invite.inviteChannel;
          
          contacts.push({
            id: `invite_${invite.id}`,
            displayName: `待注册邀请 #${invite.id}`,
            avatarUrl: null,
            contactType: 'pending_invite',
            inviteCode: invite.inviteCode,
            inviteChannel: invite.inviteChannel,
            inviteChannelLabel: channelLabel,
            scene: invite.scene,
            clickedCount: invite.clickedCount || 0,
            createdAt: invite.createdAt?.toISOString(),
            sources: [
              {
                sourceType: 'im',
                imChannel: invite.inviteChannel,
                status: 'invited',
                lastInvitedAt: invite.createdAt?.toISOString(),
                inviteChannel: invite.inviteChannel,
              }
            ],
            isFriend: false,
            isRegistered: false,
            lastMessageAt: null,
            languages: [],
          });
        }
      }

      // 根据type和status过滤
      let filteredContacts = contacts;
      if (type && type !== 'all') {
        filteredContacts = filteredContacts.filter(c => c.contactType === type);
      }
      if (status) {
        filteredContacts = filteredContacts.filter(c => {
          if (status === 'friend') return c.isFriend;
          if (status === 'registered') return c.isRegistered && !c.isFriend;
          if (status === 'invited') return !c.isRegistered;
          return true;
        });
      }

      res.json({ data: filteredContacts });
    } catch (error: any) {
      console.error('Get super contacts error:', error);
      res.status(500).json({ message: 'Failed to get contacts' });
    }
  });

  // 生成邀请链接
  app.post('/api/invites/generate', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { channel = 'generic', scene = 'super_contacts', phoneHash, meta } = req.body;

      // 生成唯一邀请码
      const inviteCode = nanoid(8);

      // 创建邀请记录
      const [invite] = await db
        .insert(ttInvites)
        .values({
          inviterUserId: userId,
          inviteCode,
          inviteChannel: channel,
          scene: scene,
          phoneHash: phoneHash || null,
          meta: meta ? JSON.stringify(meta) : null,
        })
        .returning();

      // 构建邀请URL - 根据环境自动选择正确的baseUrl
      // 开发环境使用请求的host，生产环境使用APP_BASE_URL
      let baseUrl: string;
      if (process.env.NODE_ENV === 'development') {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        baseUrl = `${protocol}://${host}`;
      } else {
        baseUrl = process.env.APP_BASE_URL || 'https://shuashua.app';
      }
      const inviteUrl = `${baseUrl}/invite?code=${inviteCode}&channel=${channel}`;

      // 生成二维码（可选）
      let inviteQrImageUrl = null;
      try {
        const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#38B03B',
            light: '#FFFFFF',
          }
        });
        inviteQrImageUrl = qrDataUrl;
      } catch (qrError) {
        console.warn('Failed to generate QR code:', qrError);
      }

      res.json({
        inviteCode,
        inviteUrl,
        inviteQrImageUrl,
      });
    } catch (error: any) {
      console.error('Generate invite error:', error);
      res.status(500).json({ message: 'Failed to generate invite' });
    }
  });

  // 获取邀请信息（公开接口，用于落地页）
  app.get('/api/invites/:code', async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      const [invite] = await db
        .select({
          invite: ttInvites,
          inviter: users,
        })
        .from(ttInvites)
        .innerJoin(users, eq(ttInvites.inviterUserId, users.id))
        .where(eq(ttInvites.inviteCode, code))
        .limit(1);

      if (!invite) {
        return res.status(404).json({ message: 'Invite not found' });
      }

      // 更新点击次数
      await db
        .update(ttInvites)
        .set({ clickedCount: sql`${ttInvites.clickedCount} + 1` })
        .where(eq(ttInvites.inviteCode, code));

      // 注意：不在这里检查isOwnInvite，因为LIFF环境下localStorage可能被共享导致token错误
      // isOwnInvite检查移到 /api/invites/accept 接口
      res.json({
        inviteCode: code,
        channel: invite.invite.inviteChannel,
        scene: invite.invite.scene,
        inviter: {
          id: invite.inviter.id,
          displayName: invite.inviter.displayName || invite.inviter.lineDisplayName,
          avatarUrl: convertHttpToHttps(invite.inviter.avatarUrl || invite.inviter.lineAvatarUrl),
        },
        isUsed: !!invite.invite.usedByUserId,
      });
    } catch (error: any) {
      console.error('Get invite error:', error);
      res.status(500).json({ message: 'Failed to get invite' });
    }
  });

  // 接受邀请并建立好友关系
  app.post('/api/invites/accept', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { inviteCode } = req.body;

      if (!inviteCode) {
        return res.status(400).json({ message: 'Invite code is required' });
      }

      // 查找邀请记录
      const [invite] = await db
        .select()
        .from(ttInvites)
        .where(eq(ttInvites.inviteCode, inviteCode))
        .limit(1);

      if (!invite) {
        return res.status(404).json({ message: 'Invite not found' });
      }

      // 不能接受自己的邀请
      if (invite.inviterUserId === userId) {
        return res.status(400).json({ message: 'Cannot accept your own invite' });
      }

      // 更新邀请记录
      await db
        .update(ttInvites)
        .set({
          usedByUserId: userId,
          registeredAt: new Date(),
        })
        .where(eq(ttInvites.inviteCode, inviteCode));

      // 建立双向好友关系
      // 邀请人 -> 被邀请人
      await db
        .insert(ttFriends)
        .values({
          userId: invite.inviterUserId,
          friendUserId: userId,
          status: 'accepted',
          sourceChannel: invite.inviteChannel,
        })
        .onConflictDoNothing();

      // 被邀请人 -> 邀请人
      await db
        .insert(ttFriends)
        .values({
          userId: userId,
          friendUserId: invite.inviterUserId,
          status: 'accepted',
          sourceChannel: invite.inviteChannel,
        })
        .onConflictDoNothing();

      // 获取邀请人信息返回
      const [inviter] = await db
        .select()
        .from(users)
        .where(eq(users.id, invite.inviterUserId))
        .limit(1);

      res.json({
        success: true,
        message: 'Invite accepted, you are now friends!',
        inviter: inviter ? {
          id: inviter.id,
          displayName: inviter.displayName || inviter.lineDisplayName,
          avatarUrl: convertHttpToHttps(inviter.avatarUrl || inviter.lineAvatarUrl),
        } : null,
      });
    } catch (error: any) {
      console.error('Accept invite error:', error);
      res.status(500).json({ message: 'Failed to accept invite' });
    }
  });

  // 手机通讯录哈希匹配
  app.post('/api/contacts/phone-import/check', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { phoneHashes } = req.body;

      if (!Array.isArray(phoneHashes) || phoneHashes.length === 0) {
        return res.json({ matches: [] });
      }

      // 限制一次最多匹配500个
      const limitedHashes = phoneHashes.slice(0, 500);

      // 查找匹配的用户
      const matches = await db
        .select({
          registry: phoneHashRegistry,
          user: users,
        })
        .from(phoneHashRegistry)
        .innerJoin(users, eq(phoneHashRegistry.userId, users.id))
        .where(inArray(phoneHashRegistry.phoneHash, limitedHashes));

      // 获取当前用户的好友列表
      const friends = await db
        .select()
        .from(ttFriends)
        .where(and(
          eq(ttFriends.userId, userId),
          eq(ttFriends.status, 'accepted')
        ));

      const friendIds = new Set(friends.map(f => f.friendUserId));

      // 构建匹配结果
      const result = matches
        .filter(m => m.user.id !== userId) // 排除自己
        .map(m => ({
          phoneHash: m.registry.phoneHash,
          userId: `user_${m.user.id}`,
          displayName: m.user.displayName || m.user.lineDisplayName || `User ${m.user.id}`,
          avatarUrl: convertHttpToHttps(m.user.avatarUrl || m.user.lineAvatarUrl),
          isFriend: friendIds.has(m.user.id),
        }));

      res.json({ matches: result });
    } catch (error: any) {
      console.error('Phone import check error:', error);
      res.status(500).json({ message: 'Failed to check phone hashes' });
    }
  });

  // 添加好友（通过手机通讯录匹配）
  app.post('/api/contacts/add-friend', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { friendUserId, sourceChannel } = req.body;

      // 解析用户ID
      const targetId = typeof friendUserId === 'string' && friendUserId.startsWith('user_') 
        ? parseInt(friendUserId.replace('user_', ''))
        : parseInt(friendUserId);

      if (isNaN(targetId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      if (targetId === userId) {
        return res.status(400).json({ message: 'Cannot add yourself as friend' });
      }

      // 检查目标用户是否存在
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // 建立双向好友关系
      await db
        .insert(ttFriends)
        .values({
          userId: userId,
          friendUserId: targetId,
          status: 'accepted',
          sourceChannel: sourceChannel || 'generic',
        })
        .onConflictDoNothing();

      await db
        .insert(ttFriends)
        .values({
          userId: targetId,
          friendUserId: userId,
          status: 'accepted',
          sourceChannel: sourceChannel || 'generic',
        })
        .onConflictDoNothing();

      res.json({
        success: true,
        message: 'Friend added successfully',
        friend: {
          id: targetUser.id,
          displayName: targetUser.displayName || targetUser.lineDisplayName,
          avatarUrl: convertHttpToHttps(targetUser.avatarUrl || targetUser.lineAvatarUrl),
        },
      });
    } catch (error: any) {
      console.error('Add friend error:', error);
      res.status(500).json({ message: 'Failed to add friend' });
    }
  });

  // 获取好友列表
  app.get('/api/contacts/friends', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const friendships = await db
        .select({
          friend: ttFriends,
          user: users,
        })
        .from(ttFriends)
        .innerJoin(users, eq(ttFriends.friendUserId, users.id))
        .where(and(
          eq(ttFriends.userId, userId),
          eq(ttFriends.status, 'accepted')
        ));

      const friends = friendships.map(({ friend, user }) => ({
        id: user.id,
        displayName: friend.nickname || user.displayName || user.lineDisplayName || `User ${user.id}`,
        avatarUrl: convertHttpToHttps(user.avatarUrl || user.lineAvatarUrl),
        sourceChannel: friend.sourceChannel,
        createdAt: friend.createdAt,
      }));

      res.json({ friends });
    } catch (error: any) {
      console.error('Get friends error:', error);
      res.status(500).json({ message: 'Failed to get friends' });
    }
  });

  // 注册手机号哈希（用户登录/注册时调用）
  app.post('/api/contacts/register-phone-hash', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { phoneHash } = req.body;

      if (!phoneHash) {
        return res.status(400).json({ message: 'Phone hash is required' });
      }

      // 注册或更新手机号哈希
      await db
        .insert(phoneHashRegistry)
        .values({
          phoneHash,
          userId,
        })
        .onConflictDoUpdate({
          target: phoneHashRegistry.phoneHash,
          set: { userId, updatedAt: new Date() },
        });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Register phone hash error:', error);
      res.status(500).json({ message: 'Failed to register phone hash' });
    }
  });

  // ============ 阿里云MPS转码回调接口 ============
  app.post('/api/transcode/callback', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      console.log('[Transcode Callback] 收到回调:', JSON.stringify(payload, null, 2));

      // 解析阿里云MPS/VOD转码回调payload（兼容多种格式）
      // Aliyun MPS格式: InputFile.Object, Output.OutputFiles.File[].Object
      // 简化格式: input.object, outputs[].object
      const jobId = payload.JobId || payload.jobId || payload.RunId || payload.MediaWorkflowExecution?.RunId || '';
      const status = payload.State || payload.Status || payload.status || 
                     payload.MediaWorkflowExecution?.State || '';
      
      // 解析输入文件路径（支持多种Aliyun格式）
      let inputObject = '';
      if (payload.InputFile?.Object) {
        inputObject = payload.InputFile.Object;
      } else if (payload.Input?.Object) {
        inputObject = payload.Input.Object;
      } else if (payload.input?.object) {
        inputObject = payload.input.object;
      } else if (payload.MediaWorkflowExecution?.Input?.InputFile?.Object) {
        inputObject = payload.MediaWorkflowExecution.Input.InputFile.Object;
      }

      // 解析输出文件路径（获取m3u8）
      let m3u8ObjectKey = '';
      
      // Aliyun MPS标准格式（按优先级检查多种可能的路径）
      let outputFiles: any[] = [];
      
      // MediaWorkflowExecution格式（最常见的工作流回调格式）
      if (payload.MediaWorkflowExecution?.Output?.OutputFiles?.File) {
        const mweFiles = payload.MediaWorkflowExecution.Output.OutputFiles.File;
        outputFiles = Array.isArray(mweFiles) ? mweFiles : [mweFiles];
      }
      // 直接Output格式
      else if (payload.Output?.OutputFiles?.File) {
        const outFiles = payload.Output.OutputFiles.File;
        outputFiles = Array.isArray(outFiles) ? outFiles : [outFiles];
      }
      // OutputFiles格式
      else if (payload.OutputFiles?.File) {
        const files = payload.OutputFiles.File;
        outputFiles = Array.isArray(files) ? files : [files];
      }
      // 简化格式
      else if (payload.outputs) {
        outputFiles = Array.isArray(payload.outputs) ? payload.outputs : [payload.outputs];
      }
      
      if (outputFiles.length > 0) {
        // 优先找m3u8文件
        const hlsOutput = outputFiles.find((o: any) => 
          (o.Object || o.object || '').endsWith('.m3u8')
        );
        m3u8ObjectKey = hlsOutput?.Object || hlsOutput?.object || '';
        
        // 如果没找到m3u8，取第一个输出
        if (!m3u8ObjectKey && outputFiles[0]) {
          m3u8ObjectKey = outputFiles[0].Object || outputFiles[0].object || '';
        }
      } else if (payload.Output?.OutputFile?.Object) {
        m3u8ObjectKey = payload.Output.OutputFile.Object;
      } else if (payload.MediaWorkflowExecution?.Output?.OutputFile?.Object) {
        m3u8ObjectKey = payload.MediaWorkflowExecution.Output.OutputFile.Object;
      }

      console.log('[Transcode Callback] 解析结果:', { jobId, status, inputObject, m3u8ObjectKey });

      if (!inputObject) {
        console.warn('[Transcode Callback] 无法识别输入文件，忽略');
        return res.json({ success: true, message: 'Callback received but input not recognized' });
      }

      // 通过videoObjectKey关联数据库记录
      const [video] = await db
        .select()
        .from(shortVideos)
        .where(eq(shortVideos.videoObjectKey, inputObject))
        .limit(1);

      if (!video) {
        console.warn('[Transcode Callback] 未找到匹配视频记录:', inputObject);
        return res.json({ success: true, message: 'Video record not found' });
      }

      const isSuccess = status.toUpperCase() === 'SUCCESS' || status === 'Succeed';
      const isFailed = status.toUpperCase() === 'FAILED' || status === 'Fail';

      if (isSuccess && m3u8ObjectKey) {
        // 构建HLS URL
        const ossRegion = process.env.OSS_REGION || 'oss-ap-southeast-1';
        const ossBucket = process.env.OSS_BUCKET || 'prodee-h5-assets';
        const hlsUrl = `https://${ossBucket}.${ossRegion}.aliyuncs.com/${m3u8ObjectKey}`;

        await db
          .update(shortVideos)
          .set({
            hlsUrl,
            transcodeStatus: 'SUCCESS',
            transcodeJobId: jobId,
            transcodedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(shortVideos.id, video.id));

        console.log('[Transcode Callback] 转码成功，已更新视频:', video.id, hlsUrl);
      } else if (isFailed) {
        const errorMsg = payload.message || payload.Message || payload.FailReason || 'Unknown error';
        await db
          .update(shortVideos)
          .set({
            transcodeStatus: 'FAILED',
            transcodeJobId: jobId,
            transcodeError: errorMsg,
            updatedAt: new Date(),
          })
          .where(eq(shortVideos.id, video.id));

        console.log('[Transcode Callback] 转码失败:', video.id, errorMsg);
      } else {
        // 处理中状态
        await db
          .update(shortVideos)
          .set({
            transcodeStatus: 'PROCESSING',
            transcodeJobId: jobId,
            updatedAt: new Date(),
          })
          .where(eq(shortVideos.id, video.id));

        console.log('[Transcode Callback] 转码处理中:', video.id);
      }

      res.json({ success: true, message: 'Callback processed' });
    } catch (error) {
      console.error('[Transcode Callback] 处理错误:', error);
      res.status(500).json({ success: false, message: 'Callback processing failed' });
    }
  });

  // 手动触发单个视频转码
  app.post('/api/transcode/trigger/:videoId', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const [video] = await db
        .select()
        .from(shortVideos)
        .where(eq(shortVideos.id, videoId))
        .limit(1);

      if (!video) {
        return res.status(404).json({ success: false, message: '视频不存在' });
      }

      if (!video.videoObjectKey) {
        return res.status(400).json({ success: false, message: '视频缺少OSS路径信息' });
      }

      triggerTranscodeAfterUpload(video.videoObjectKey, video.id);
      
      res.json({ success: true, message: '转码任务已提交' });
    } catch (error) {
      console.error('Trigger transcode error:', error);
      res.status(500).json({ success: false, message: '触发转码失败' });
    }
  });

  // 批量触发待转码视频
  app.post('/api/transcode/batch', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const pendingVideos = await db
        .select()
        .from(shortVideos)
        .where(and(
          eq(shortVideos.transcodeStatus, 'PENDING'),
          isNotNull(shortVideos.videoObjectKey)
        ))
        .limit(10);

      let triggered = 0;
      for (const video of pendingVideos) {
        if (video.videoObjectKey) {
          triggerTranscodeAfterUpload(video.videoObjectKey, video.id);
          triggered++;
        }
      }

      res.json({ 
        success: true, 
        message: `已触发 ${triggered} 个视频的转码任务`,
        count: triggered 
      });
    } catch (error) {
      console.error('Batch transcode error:', error);
      res.status(500).json({ success: false, message: '批量转码失败' });
    }
  });

  // 手动触发转码状态检查（调试用）
  app.get('/api/transcode/status/:videoId', userAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const [video] = await db
        .select({
          id: shortVideos.id,
          videoUrl: shortVideos.videoUrl,
          hlsUrl: shortVideos.hlsUrl,
          videoObjectKey: shortVideos.videoObjectKey,
          transcodeStatus: shortVideos.transcodeStatus,
          transcodeJobId: shortVideos.transcodeJobId,
          transcodeError: shortVideos.transcodeError,
          transcodedAt: shortVideos.transcodedAt,
        })
        .from(shortVideos)
        .where(eq(shortVideos.id, videoId))
        .limit(1);

      if (!video) {
        return res.status(404).json({ success: false, message: '视频不存在' });
      }

      res.json({ success: true, data: video });
    } catch (error) {
      console.error('Get transcode status error:', error);
      res.status(500).json({ success: false, message: '获取转码状态失败' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
