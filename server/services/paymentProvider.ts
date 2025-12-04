/**
 * 收款二维码 - PSP 适配层接口
 * 
 * 刷刷/DeeCard 只提供「收款页面 + 会员积分」服务
 * 不直接提供支付服务，资金由持牌 PSP 直接结算给商户
 */

// ============ 类型定义 ============

export interface CreateMerchantInput {
  storeId: number;
  settlementBankName: string;
  settlementBankCode: string;
  settlementAccountName: string;
  settlementAccountNumber: string;
  settlementBranch?: string;
  currency: string;
  idCardUrl?: string;
  companyRegistrationUrl?: string;
  businessLicenseUrl?: string;
}

export interface CreateMerchantResult {
  success: boolean;
  pspMerchantId?: string;
  error?: string;
}

export interface CreateChargeInput {
  amount: number;        // 金额（分）
  currency: string;      // 货币代码
  storeId: number;
  orderId: string;       // 内部订单号
  returnUrl: string;     // 支付成功后返回 URL
  webhookUrl: string;    // Webhook 回调 URL
  description?: string;
}

export interface CreateChargeResult {
  success: boolean;
  pspPaymentId?: string;
  redirectUrl?: string;  // 跳转到 PSP 支付页面的 URL
  qrCodeUrl?: string;    // PromptPay 二维码 URL（如适用）
  error?: string;
}

export interface WebhookPayload {
  pspPaymentId: string;
  status: 'paid' | 'failed' | 'expired';
  amount: number;
  currency: string;
  paidAt?: Date;
  rawData: any;
}

// ============ PSP 适配器接口 ============

export interface PaymentProvider {
  code: 'opn' | '2c2p';
  
  /**
   * 创建商户账户（提交开户申请到 PSP）
   */
  createMerchantAccount(input: CreateMerchantInput): Promise<CreateMerchantResult>;
  
  /**
   * 创建支付订单，返回跳转 URL
   */
  createQrCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  
  /**
   * 验证 Webhook 签名
   */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;
  
  /**
   * 解析 Webhook 数据
   */
  parseWebhookPayload(rawBody: string): WebhookPayload | null;
}

// ============ Opn Provider (Stub) ============

export class OpnProvider implements PaymentProvider {
  code: 'opn' = 'opn';
  
  private publicKey: string;
  private secretKey: string;
  
  constructor() {
    this.publicKey = process.env.OPN_PUBLIC_KEY || '';
    this.secretKey = process.env.OPN_SECRET_KEY || '';
  }
  
  async createMerchantAccount(input: CreateMerchantInput): Promise<CreateMerchantResult> {
    // TODO: 接入真实 Opn API
    // 目前返回 stub 数据用于测试
    console.log('[OpnProvider] createMerchantAccount stub', { storeId: input.storeId });
    
    return {
      success: true,
      pspMerchantId: `opn_merchant_${input.storeId}_${Date.now()}`,
    };
  }
  
  async createQrCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    // TODO: 接入真实 Opn API
    // 示例：创建 PromptPay 支付源
    console.log('[OpnProvider] createQrCharge stub', { 
      orderId: input.orderId,
      amount: input.amount 
    });
    
    // Stub: 返回模拟的跳转 URL
    const mockRedirectUrl = `${input.returnUrl}?payment_id=${input.orderId}&mock=true`;
    
    return {
      success: true,
      pspPaymentId: `opn_charge_${Date.now()}`,
      redirectUrl: mockRedirectUrl,
    };
  }
  
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    // ⚠️ SECURITY: Webhook signature verification
    // 
    // Production implementation must use HMAC-SHA256:
    // const signature = headers['omise-signature'] || headers['x-opn-signature'];
    // const expectedSig = crypto.createHmac('sha256', this.secretKey).update(rawBody).digest('hex');
    // return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expectedSig));
    // See: https://docs.omise.co/webhooks
    
    // If secret key is configured, require real verification
    if (this.secretKey) {
      // TODO: Implement real verification when API keys are available
      console.warn('[OpnProvider] Secret key set but verification not yet implemented');
      return false; // Fail-secure: reject until properly implemented
    }
    
    // Only allow unverified webhooks in development with explicit opt-in
    if (process.env.ALLOW_DEV_WEBHOOKS === 'true') {
      console.warn('[OpnProvider] ⚠️ DEV MODE: Skipping webhook signature verification');
      return true;
    }
    
    console.error('[OpnProvider] Webhook rejected: no secret key or ALLOW_DEV_WEBHOOKS not set');
    return false; // Fail-secure by default
  }
  
  parseWebhookPayload(rawBody: string): WebhookPayload | null {
    try {
      const data = JSON.parse(rawBody);
      
      // Opn webhook 格式
      // { key: 'charge.complete', data: { id: 'chrg_xxx', amount: 25000, ... } }
      
      if (!data.data || !data.data.id) {
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
        amount: charge.amount / 100, // Opn 使用分为单位
        currency: charge.currency?.toUpperCase() || 'THB',
        paidAt: charge.paid_at ? new Date(charge.paid_at) : undefined,
        rawData: data,
      };
    } catch (e) {
      console.error('[OpnProvider] parseWebhookPayload error:', e);
      return null;
    }
  }
}

// ============ 2C2P Provider (Stub) ============

export class TwoC2PProvider implements PaymentProvider {
  code: '2c2p' = '2c2p';
  
  private merchantId: string;
  private secretKey: string;
  
  constructor() {
    this.merchantId = process.env.C2P_MERCHANT_ID || '';
    this.secretKey = process.env.C2P_SECRET_KEY || '';
  }
  
  async createMerchantAccount(input: CreateMerchantInput): Promise<CreateMerchantResult> {
    // TODO: 接入真实 2C2P API
    console.log('[TwoC2PProvider] createMerchantAccount stub', { storeId: input.storeId });
    
    return {
      success: true,
      pspMerchantId: `2c2p_merchant_${input.storeId}_${Date.now()}`,
    };
  }
  
  async createQrCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    // TODO: 接入真实 2C2P API
    console.log('[TwoC2PProvider] createQrCharge stub', {
      orderId: input.orderId,
      amount: input.amount
    });
    
    const mockRedirectUrl = `${input.returnUrl}?payment_id=${input.orderId}&mock=true`;
    
    return {
      success: true,
      pspPaymentId: `2c2p_payment_${Date.now()}`,
      redirectUrl: mockRedirectUrl,
    };
  }
  
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    // ⚠️ SECURITY: Webhook signature verification
    // See: https://developer.2c2p.com/docs/webhook-signature
    
    // If secret key is configured, require real verification
    if (this.secretKey) {
      // TODO: Implement real 2C2P verification when API keys are available
      console.warn('[TwoC2PProvider] Secret key set but verification not yet implemented');
      return false; // Fail-secure: reject until properly implemented
    }
    
    // Only allow unverified webhooks in development with explicit opt-in
    if (process.env.ALLOW_DEV_WEBHOOKS === 'true') {
      console.warn('[TwoC2PProvider] ⚠️ DEV MODE: Skipping webhook signature verification');
      return true;
    }
    
    console.error('[TwoC2PProvider] Webhook rejected: no secret key or ALLOW_DEV_WEBHOOKS not set');
    return false; // Fail-secure by default
  }
  
  parseWebhookPayload(rawBody: string): WebhookPayload | null {
    try {
      const data = JSON.parse(rawBody);
      
      // 2C2P webhook 格式（根据实际文档调整）
      if (!data.paymentToken) {
        return null;
      }
      
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
      console.error('[TwoC2PProvider] parseWebhookPayload error:', e);
      return null;
    }
  }
}

// ============ Provider Factory ============

const providers: Record<string, PaymentProvider> = {
  opn: new OpnProvider(),
  '2c2p': new TwoC2PProvider(),
};

export function getPaymentProvider(code: string): PaymentProvider | null {
  return providers[code] || null;
}

export function getAllProviders(): PaymentProvider[] {
  return Object.values(providers);
}
