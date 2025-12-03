import express, { type Request, Response } from 'express';
import type { Express } from 'express';
import { createServer, type Server } from 'http';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { db } from './db';
import { admins, stores, campaigns, campaignStores, users, coupons, mediaFiles, staffPresets, oaUserLinks, campaignBroadcasts, merchantStaffRoles, oauthAccounts, agentTokens, paymentConfigs, paymentTransactions, membershipRules, userStoreMemberships, creatorContents, promotionBindings, promotionEarnings, shortVideos, shortVideoLikes, shortVideoComments, products, productCategories } from '@shared/schema';
import { eq, and, desc, sql, inArray, isNotNull } from 'drizzle-orm';
import { AliOssService } from './services/aliOssService';
import { verifyLineIdToken, exchangeLineAuthCode } from './services/lineService';
import { translateText } from './services/translationService';
import { sendWelcomeMessageIfNeeded } from './services/welcomeService';
import { createCampaignBroadcast, runBroadcastTask } from './services/broadcastService';
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

const upload = multer({ storage: multer.memoryStorage() });

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
 


  // LINE OAuth callback endpoint
      // LINE OAuth callback endpoint
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

      if (!req.session) {
        console.error('[OAUTH CB] req.session is undefined');
        return res.redirect('/?error=session_missing');
      }

      // CSRF Protection: Validate state against server-side stored value
      const storedStates = req.session.oauthStates || {};
      const storedOAuthData = storedStates[state];

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
      if (Date.now() - storedOAuthData.timestamp > fiveMinutes) {
        console.warn('[OAUTH CB] oauth state expired, state=', state);
        delete storedStates[state];
        return res.redirect(`/?error=oauth_expired`);
      }

      // Clear the used state to prevent replay
      delete storedStates[state];

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
        redirectUrl = `${storedOAuthData.returnTo}?token=${encodeURIComponent(
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

      res.json({
        success: true,
        data: activeCampaigns,
      });
    } catch (error) {
      console.error('Get campaigns list error:', error);
      res.status(500).json({ success: false, message: '获取活动列表失败' });
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
      
      res.json({ success: true, data: store });
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
        businessStatus,
        businessHours,
        coverImages,
        deliveryTime,
        pickupTime,
        businessLicenseUrl,
        foodLicenseUrl,
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
      if (businessStatus !== undefined) updateData.businessStatus = businessStatus;
      if (businessHours !== undefined) updateData.businessHours = businessHours;
      if (coverImages !== undefined) updateData.coverImages = coverImages;
      if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime;
      if (pickupTime !== undefined) updateData.pickupTime = pickupTime;
      if (businessLicenseUrl !== undefined) updateData.businessLicenseUrl = businessLicenseUrl;
      if (foodLicenseUrl !== undefined) updateData.foodLicenseUrl = foodLicenseUrl;

      const [updatedStore] = await db
        .update(stores)
        .set(updateData)
        .where(eq(stores.id, storeId))
        .returning();

      if (!updatedStore) {
        return res.status(404).json({ success: false, message: '门店不存在' });
      }

      res.json({ success: true, message: '门店信息已更新', data: updatedStore });
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

      await db.insert(mediaFiles).values({
        fileName: req.file.originalname,
        fileUrl,
        fileType,
        fileSize: req.file.size,
        uploadedBy: userId,
        isPublic: true,
      });

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
          creatorName: users.displayName,
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
          creatorName: users.displayName,
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
        coverImageUrl,
        thumbnailUrl,
        title: title || null,
        description: description || null,
        hashtags: hashtags ? JSON.parse(hashtags) : null,
        locationName: locationName || null,
        storeId: storeId ? parseInt(storeId) : null,
        campaignId: campaignId ? parseInt(campaignId) : null,
        status: 'ready', // 临时直接设为ready，后续接入MPS转码后改为processing
        isPublic: isPublic !== 'false',
        publishedAt: new Date(),
        fileSize: videoFile.size,
      }).returning();

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

  // 获取短视频评论
  app.get('/api/short-videos/:id/comments', async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const comments = await db
        .select({
          id: shortVideoComments.id,
          content: shortVideoComments.content,
          likeCount: shortVideoComments.likeCount,
          createdAt: shortVideoComments.createdAt,
          parentId: shortVideoComments.parentId,
          userId: shortVideoComments.userId,
          userName: users.displayName,
          userAvatar: users.avatarUrl,
        })
        .from(shortVideoComments)
        .leftJoin(users, eq(shortVideoComments.userId, users.id))
        .where(eq(shortVideoComments.videoId, videoId))
        .orderBy(desc(shortVideoComments.createdAt))
        .offset(cursor)
        .limit(limit + 1);

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, limit) : comments;

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
        .select({ displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, userId));

      res.json({
        success: true,
        data: {
          ...newComment,
          userName: user?.displayName,
          userAvatar: user?.avatarUrl,
        },
      });
    } catch (error) {
      console.error('Post short video comment error:', error);
      res.status(500).json({ success: false, message: '发表评论失败' });
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

  const httpServer = createServer(app);
  return httpServer;
}
