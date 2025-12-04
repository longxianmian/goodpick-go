/**
 * 收款二维码 - 多 PSP 适配层
 * 
 * 架构设计原则：
 * 1. PaymentProvider 是通用接口，Opn 只是第一个实现
 * 2. 业务逻辑不依赖 "只有 Opn" 假设
 * 3. 新增 PSP 时只需添加新的 Provider 实现
 * 4. 支持两种商户入驻模式：manual_id（已有账户）和 connect（新开户）
 */

import crypto from 'crypto';

// ============ 类型定义 ============

export type PSPCode = 'opn' | 'two_c2p' | string;
export type PaymentMethod = 'promptpay' | 'card';
export type OnboardingMode = 'manual_id' | 'connect';
export type OnboardingStatus = 'not_started' | 'invited' | 'in_progress' | 'completed' | 'failed';

// 商户入驻 - 模式 A: 已有 PSP 账户
export interface ValidateMerchantInput {
  merchantRef: string;  // PSP 商户号
  storeId: number;
}

export interface ValidateMerchantResult {
  valid: boolean;
  merchantName?: string;
  error?: string;
}

// 商户入驻 - 模式 B: 通过 Connect 开户
export interface CreateOnboardingInput {
  storeId: number;
  merchantId?: number;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  returnUrl: string;        // 入驻完成后返回 URL
  webhookUrl: string;       // 入驻状态回调 URL
}

export interface OnboardingLinkResult {
  success: boolean;
  onboardingUrl?: string;   // 跳转到 PSP 开户页面
  onboardingRef?: string;   // 内部跟踪用的 reference
  error?: string;
}

// 入驻 Webhook 解析结果
export interface OnboardingWebhookPayload {
  onboardingRef: string;
  status: OnboardingStatus;
  providerMerchantRef?: string;  // 入驻成功后的商户号
  failureReason?: string;
  rawData: any;
}

// 创建支付订单
export interface CreateChargeInput {
  amount: number;           // 金额（泰铢，小数形式如 100.00）
  currency: string;         // 货币代码 'THB'
  storeId: number;
  orderId: string;          // 内部订单号
  paymentMethod: PaymentMethod;  // V1 固定为 'promptpay'
  returnUrl: string;        // 支付成功后返回 URL
  webhookUrl: string;       // Webhook 回调 URL
  description?: string;
  providerMerchantRef?: string;  // PSP 商户号（用于子商户结算）
}

export interface CreateChargeResult {
  success: boolean;
  pspPaymentId?: string;    // PSP 返回的支付订单号
  redirectUrl?: string;     // 跳转到 PSP 支付页面的 URL
  qrCodeUrl?: string;       // PromptPay 二维码图片 URL（如适用）
  qrCodeData?: string;      // PromptPay 二维码原始数据
  error?: string;
}

// 支付 Webhook 解析结果
export interface PaymentWebhookPayload {
  pspPaymentId: string;
  status: 'paid' | 'failed' | 'expired';
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  rawData: any;
}

// ============ PSP 适配器接口（核心） ============

export interface PaymentProvider {
  code: PSPCode;
  displayName: string;
  
  /**
   * 检查该 PSP 是否处于 Mock 模式
   */
  isMockMode(): boolean;
  
  /**
   * 商户入驻 - 模式 B: 创建 Onboarding 链接（可选能力）
   * 如果 PSP 支持 Connect 模式，实现此方法
   */
  createOnboardingLink?(input: CreateOnboardingInput): Promise<OnboardingLinkResult>;
  
  /**
   * 商户入驻 - 模式 A: 验证已有商户账户（可选能力）
   */
  validateExistingMerchant?(input: ValidateMerchantInput): Promise<ValidateMerchantResult>;
  
  /**
   * 验证入驻 Webhook 签名
   */
  verifyOnboardingWebhookSignature?(rawBody: string, headers: Record<string, string>): boolean;
  
  /**
   * 解析入驻 Webhook
   */
  parseOnboardingWebhook?(rawBody: string): OnboardingWebhookPayload | null;
  
  /**
   * 创建支付订单
   */
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  
  /**
   * 验证支付 Webhook 签名
   */
  verifyPaymentWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;
  
  /**
   * 解析支付 Webhook
   */
  parsePaymentWebhook(rawBody: string): PaymentWebhookPayload | null;
}

// ============ Mock 模式判断 ============

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  // 占位值检测
  if (trimmed.includes('xxx') || trimmed.includes('XXX')) return true;
  if (trimmed === 'pkey_test_xxx' || trimmed === 'skey_test_xxx') return true;
  return false;
}

// ============ Opn Provider ============

export class OpnProvider implements PaymentProvider {
  code: PSPCode = 'opn';
  displayName = 'Opn (Thailand)';
  
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;
  private mockMode: boolean;
  
  constructor() {
    this.publicKey = process.env.OPN_PUBLIC_KEY || '';
    this.secretKey = process.env.OPN_SECRET_KEY || '';
    
    // 判断是否为 Mock 模式
    this.mockMode = isPlaceholderKey(this.publicKey) || isPlaceholderKey(this.secretKey);
    
    // Opn API 基础 URL（正式环境使用 api.omise.co）
    this.baseUrl = this.publicKey.startsWith('pkey_test_') 
      ? 'https://api.omise.co'  // Sandbox
      : 'https://api.omise.co'; // Production
    
    if (this.mockMode) {
      console.log('[OpnProvider] 🔶 Mock 模式已启用 - 等待真实 API Key');
    } else {
      console.log('[OpnProvider] ✅ 真实模式 - API Key 已配置');
    }
  }
  
  isMockMode(): boolean {
    return this.mockMode;
  }
  
  // ========== 商户入驻 - 模式 B: Connect ==========
  
  async createOnboardingLink(input: CreateOnboardingInput): Promise<OnboardingLinkResult> {
    if (this.mockMode) {
      // Mock 模式：返回模拟数据
      const mockRef = `opn_onboard_${Date.now()}`;
      console.log('[OpnProvider] Mock createOnboardingLink', { storeId: input.storeId, ref: mockRef });
      
      return {
        success: true,
        onboardingRef: mockRef,
        onboardingUrl: `https://sandbox.opn.dev/mock-onboarding?ref=${mockRef}&return=${encodeURIComponent(input.returnUrl)}`,
      };
    }
    
    // 真实模式：调用 Opn API
    // TODO: 实现真实 Opn Connect API
    // Opn Connect 文档: https://docs.opn.ooo/connect
    try {
      // 占位：真实 API 调用结构
      // const response = await fetch(`${this.baseUrl}/connected_accounts`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     email: input.contactEmail,
      //     type: 'individual',
      //     return_uri: input.returnUrl,
      //   }),
      // });
      // const data = await response.json();
      
      // 暂时返回错误，等待真实实现
      return {
        success: false,
        error: 'Opn Connect API 尚未实现，请联系开发团队',
      };
    } catch (error) {
      console.error('[OpnProvider] createOnboardingLink error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // ========== 商户入驻 - 模式 A: 验证已有账户 ==========
  
  async validateExistingMerchant(input: ValidateMerchantInput): Promise<ValidateMerchantResult> {
    if (this.mockMode) {
      // Mock 模式：模拟验证成功
      console.log('[OpnProvider] Mock validateExistingMerchant', { merchantRef: input.merchantRef });
      return {
        valid: true,
        merchantName: `Mock Merchant ${input.merchantRef}`,
      };
    }
    
    // 真实模式：验证商户号
    try {
      // TODO: 实现真实验证逻辑
      // 可能需要调用 Opn API 验证商户号是否存在
      return {
        valid: true,
        merchantName: input.merchantRef,
      };
    } catch (error) {
      console.error('[OpnProvider] validateExistingMerchant error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }
  
  // ========== 入驻 Webhook ==========
  
  verifyOnboardingWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (this.mockMode || process.env.ALLOW_DEV_WEBHOOKS === 'true') {
      console.warn('[OpnProvider] ⚠️ 跳过入驻 Webhook 签名验证');
      return true;
    }
    
    // 真实验证逻辑与支付 Webhook 相同
    return this.verifyPaymentWebhookSignature(rawBody, headers);
  }
  
  parseOnboardingWebhook(rawBody: string): OnboardingWebhookPayload | null {
    try {
      const data = JSON.parse(rawBody);
      
      // Opn Connect webhook 格式（根据实际文档调整）
      // { key: 'connected_account.activated', data: { id: 'cact_xxx', ... } }
      
      if (!data.data) return null;
      
      let status: OnboardingStatus = 'in_progress';
      if (data.key === 'connected_account.activated') {
        status = 'completed';
      } else if (data.key === 'connected_account.rejected') {
        status = 'failed';
      }
      
      return {
        onboardingRef: data.data.id || '',
        status,
        providerMerchantRef: status === 'completed' ? data.data.id : undefined,
        failureReason: status === 'failed' ? data.data.failure_reason : undefined,
        rawData: data,
      };
    } catch (e) {
      console.error('[OpnProvider] parseOnboardingWebhook error:', e);
      return null;
    }
  }
  
  // ========== 创建支付订单 ==========
  
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    if (this.mockMode) {
      // Mock 模式：返回模拟的跳转 URL
      const mockPaymentId = `opn_chrg_mock_${Date.now()}`;
      const mockRedirectUrl = `${input.returnUrl}?payment_id=${input.orderId}&mock=true`;
      
      console.log('[OpnProvider] Mock createCharge', { 
        orderId: input.orderId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        mockPaymentId,
      });
      
      return {
        success: true,
        pspPaymentId: mockPaymentId,
        redirectUrl: mockRedirectUrl,
      };
    }
    
    // 真实模式：调用 Opn API 创建 PromptPay 支付
    try {
      // 金额转换为最小单位（萨当 = 泰铢 * 100）
      const amountInSatang = Math.round(input.amount * 100);
      
      // 步骤 1：创建 Source（PromptPay）
      const sourceResponse = await fetch(`${this.baseUrl}/sources`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.publicKey + ':').toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'promptpay',
          amount: amountInSatang.toString(),
          currency: input.currency.toLowerCase(),
        }).toString(),
      });
      
      const sourceData = await sourceResponse.json();
      
      if (sourceData.object === 'error') {
        console.error('[OpnProvider] Source creation failed:', sourceData);
        return {
          success: false,
          error: sourceData.message || 'Failed to create payment source',
        };
      }
      
      // 步骤 2：创建 Charge
      const chargeResponse = await fetch(`${this.baseUrl}/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: amountInSatang.toString(),
          currency: input.currency.toLowerCase(),
          source: sourceData.id,
          return_uri: input.returnUrl,
          webhook_endpoints: input.webhookUrl,
          description: input.description || `Payment for order ${input.orderId}`,
          metadata: JSON.stringify({
            order_id: input.orderId,
            store_id: input.storeId.toString(),
          }),
        }).toString(),
      });
      
      const chargeData = await chargeResponse.json();
      
      if (chargeData.object === 'error') {
        console.error('[OpnProvider] Charge creation failed:', chargeData);
        return {
          success: false,
          error: chargeData.message || 'Failed to create charge',
        };
      }
      
      console.log('[OpnProvider] Charge created:', { 
        id: chargeData.id, 
        status: chargeData.status,
        authorizeUri: chargeData.authorize_uri,
      });
      
      return {
        success: true,
        pspPaymentId: chargeData.id,
        redirectUrl: chargeData.authorize_uri,
        qrCodeUrl: sourceData.scannable_code?.image?.download_uri,
        qrCodeData: sourceData.scannable_code?.barcode,
      };
    } catch (error) {
      console.error('[OpnProvider] createCharge error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // ========== 支付 Webhook ==========
  
  verifyPaymentWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    // Mock 模式或开发环境跳过验证
    if (this.mockMode) {
      console.warn('[OpnProvider] ⚠️ Mock 模式: 跳过 Webhook 签名验证');
      return true;
    }
    
    if (process.env.ALLOW_DEV_WEBHOOKS === 'true') {
      console.warn('[OpnProvider] ⚠️ DEV 模式: 跳过 Webhook 签名验证');
      return true;
    }
    
    // 真实验证: HMAC-SHA256
    // Opn 使用 omise-signature header
    const signature = headers['omise-signature'] || headers['x-opn-signature'];
    if (!signature) {
      console.error('[OpnProvider] Missing webhook signature header');
      return false;
    }
    
    try {
      const expectedSig = crypto
        .createHmac('sha256', this.secretKey)
        .update(rawBody)
        .digest('hex');
      
      // 时间安全比较
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
      );
      
      if (!isValid) {
        console.error('[OpnProvider] Webhook signature mismatch');
      }
      
      return isValid;
    } catch (error) {
      console.error('[OpnProvider] Signature verification error:', error);
      return false;
    }
  }
  
  parsePaymentWebhook(rawBody: string): PaymentWebhookPayload | null {
    try {
      const data = JSON.parse(rawBody);
      
      // Opn webhook 格式
      // { key: 'charge.complete', data: { id: 'chrg_xxx', amount: 25000, status: 'successful', ... } }
      
      if (!data.data || !data.data.id) {
        console.warn('[OpnProvider] Invalid webhook payload structure');
        return null;
      }
      
      const charge = data.data;
      let status: 'paid' | 'failed' | 'expired' = 'failed';
      
      if (data.key === 'charge.complete' && charge.status === 'successful') {
        status = 'paid';
      } else if (charge.status === 'expired') {
        status = 'expired';
      }
      
      return {
        pspPaymentId: charge.id,
        status,
        amount: charge.amount / 100, // 萨当转泰铢
        currency: (charge.currency || 'thb').toUpperCase(),
        paymentMethod: charge.source?.type === 'promptpay' ? 'promptpay' : 'card',
        paidAt: charge.paid_at ? new Date(charge.paid_at) : undefined,
        rawData: data,
      };
    } catch (e) {
      console.error('[OpnProvider] parsePaymentWebhook error:', e);
      return null;
    }
  }
}

// ============ 2C2P Provider (预留) ============

export class TwoC2PProvider implements PaymentProvider {
  code: PSPCode = 'two_c2p';
  displayName = '2C2P Thailand';
  
  private merchantId: string;
  private secretKey: string;
  private mockMode: boolean;
  
  constructor() {
    this.merchantId = process.env.C2P_MERCHANT_ID || '';
    this.secretKey = process.env.C2P_SECRET_KEY || '';
    this.mockMode = isPlaceholderKey(this.merchantId) || isPlaceholderKey(this.secretKey);
    
    if (this.mockMode) {
      console.log('[TwoC2PProvider] 🔶 Mock 模式已启用');
    }
  }
  
  isMockMode(): boolean {
    return this.mockMode;
  }
  
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    if (this.mockMode) {
      const mockPaymentId = `2c2p_mock_${Date.now()}`;
      console.log('[TwoC2PProvider] Mock createCharge', { orderId: input.orderId });
      
      return {
        success: true,
        pspPaymentId: mockPaymentId,
        redirectUrl: `${input.returnUrl}?payment_id=${input.orderId}&mock=true`,
      };
    }
    
    // TODO: 实现 2C2P 真实 API
    return {
      success: false,
      error: '2C2P API 尚未实现',
    };
  }
  
  verifyPaymentWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (this.mockMode || process.env.ALLOW_DEV_WEBHOOKS === 'true') {
      return true;
    }
    // TODO: 实现 2C2P 签名验证
    return false;
  }
  
  parsePaymentWebhook(rawBody: string): PaymentWebhookPayload | null {
    try {
      const data = JSON.parse(rawBody);
      
      if (!data.paymentToken) return null;
      
      let status: 'paid' | 'failed' | 'expired' = 'failed';
      if (data.respCode === '00' || data.respCode === '0000') {
        status = 'paid';
      }
      
      return {
        pspPaymentId: data.paymentToken,
        status,
        amount: parseFloat(data.amount || '0'),
        currency: data.currencyCode || 'THB',
        paidAt: data.transactionDateTime ? new Date(data.transactionDateTime) : undefined,
        rawData: data,
      };
    } catch (e) {
      console.error('[TwoC2PProvider] parsePaymentWebhook error:', e);
      return null;
    }
  }
}

// ============ Provider Registry ============

const providers: Map<string, PaymentProvider> = new Map();

// 注册默认 Provider
providers.set('opn', new OpnProvider());
providers.set('two_c2p', new TwoC2PProvider());

export function getPaymentProvider(code: string): PaymentProvider | null {
  return providers.get(code) || null;
}

export function getAllProviders(): PaymentProvider[] {
  return Array.from(providers.values());
}

export function registerProvider(provider: PaymentProvider): void {
  providers.set(provider.code, provider);
}

/**
 * 获取支持某能力的 Provider 列表
 */
export function getProvidersWithCapability(
  capability: 'createOnboardingLink' | 'validateExistingMerchant'
): PaymentProvider[] {
  return getAllProviders().filter(p => typeof (p as any)[capability] === 'function');
}
