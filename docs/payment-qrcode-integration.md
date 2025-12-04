# 刷刷平台收款二维码功能开发文档

## 1. 功能概述

### 1.1 业务目标
在刷刷平台"运营中心 > 资产"页面集成收款二维码功能，实现：
- 商户生成专属收款二维码
- 顾客扫码支付自动成为会员
- 支持多种支付方式（PromptPay、银行卡、电子钱包等）
- 实时到账与交易记录

### 1.2 核心功能
1. **商户入驻审核** - 收集银行账户信息、营业执照等资料
2. **收款码生成** - 静态码（固定金额）和动态码（订单金额）
3. **支付通知** - 实时推送支付成功消息
4. **交易管理** - 查询、退款、对账
5. **资金结算** - 定期结算到商户银行账户

---

## 2. PSP（支付服务商）选型

### 2.1 推荐方案：双PSP架构

| PSP | 定位 | 优势 | 费率 |
|-----|------|------|------|
| **Opn Payments (Omise)** | 主力PSP | 开发者友好、费率低、本地支付全覆盖 | 1.6%-3.65% |
| **2C2P** | 备用PSP | 企业级稳定性、跨境支付强 | 定制费率 |

### 2.2 支持的支付方式
- PromptPay（泰国银行二维码）
- TrueMoney Wallet
- Rabbit LINE Pay
- 信用卡/借记卡（Visa、Mastercard、JCB）
- 网银转账
- Alipay、WeChat Pay（中国游客）

### 2.3 Opn Payments API 概览
```
基础URL: https://api.omise.co
认证方式: HTTP Basic Auth (Secret Key)
沙盒URL: https://vault.omise.co (测试环境)
```

核心接口：
- `POST /charges` - 创建支付
- `GET /charges/{id}` - 查询支付状态
- `POST /refunds` - 发起退款
- `POST /sources` - 创建支付源（PromptPay等）
- Webhook - 接收支付通知

---

## 3. 数据库设计

### 3.1 商户收款账户表 (merchant_payment_accounts)
```sql
CREATE TABLE merchant_payment_accounts (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  
  -- 银行账户信息
  bank_name VARCHAR(100) NOT NULL,           -- 银行名称
  bank_code VARCHAR(20),                      -- 银行代码 (如: BBL, KBANK, SCB)
  account_number VARCHAR(50) NOT NULL,        -- 银行账号
  account_name VARCHAR(200) NOT NULL,         -- 账户名称
  account_type VARCHAR(20) DEFAULT 'savings', -- savings/current
  branch_name VARCHAR(100),                   -- 开户支行
  
  -- PromptPay 信息
  promptpay_id VARCHAR(20),                   -- PromptPay ID (手机号或身份证)
  promptpay_type VARCHAR(10),                 -- phone/national_id
  
  -- PSP 关联
  psp_provider VARCHAR(20) DEFAULT 'omise',   -- omise/2c2p
  psp_customer_id VARCHAR(100),               -- PSP 商户ID
  psp_recipient_id VARCHAR(100),              -- PSP 收款人ID
  
  -- 审核状态
  status VARCHAR(20) DEFAULT 'pending',       -- pending/approved/rejected
  verified_at TIMESTAMP,
  rejected_reason TEXT,
  
  -- 资料文件
  id_card_front_url TEXT,                     -- 身份证正面
  id_card_back_url TEXT,                      -- 身份证背面
  bank_book_url TEXT,                         -- 银行存折首页
  business_license_url TEXT,                  -- 营业执照
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 收款码表 (payment_qrcodes)
```sql
CREATE TABLE payment_qrcodes (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  account_id INTEGER REFERENCES merchant_payment_accounts(id),
  
  -- 二维码信息
  qr_type VARCHAR(20) NOT NULL,               -- static/dynamic
  qr_code_url TEXT NOT NULL,                  -- 二维码图片URL
  qr_data TEXT,                               -- 二维码数据内容
  
  -- 金额设置（静态码可选）
  fixed_amount DECIMAL(10,2),                 -- 固定金额
  min_amount DECIMAL(10,2),                   -- 最小金额
  max_amount DECIMAL(10,2),                   -- 最大金额
  
  -- 有效期
  expires_at TIMESTAMP,                       -- 过期时间（动态码）
  is_active BOOLEAN DEFAULT true,
  
  -- PSP 信息
  psp_source_id VARCHAR(100),                 -- PSP 返回的source ID
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 支付交易表 (payment_transactions)
```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  qrcode_id INTEGER REFERENCES payment_qrcodes(id),
  
  -- 交易信息
  transaction_no VARCHAR(50) NOT NULL UNIQUE, -- 刷刷交易号
  psp_charge_id VARCHAR(100),                 -- PSP 交易ID
  psp_provider VARCHAR(20),                   -- omise/2c2p
  
  -- 金额
  amount DECIMAL(10,2) NOT NULL,              -- 交易金额
  currency VARCHAR(3) DEFAULT 'THB',          -- 币种
  fee_amount DECIMAL(10,2),                   -- 手续费
  net_amount DECIMAL(10,2),                   -- 实收金额
  
  -- 支付方式
  payment_method VARCHAR(30),                 -- promptpay/credit_card/truemoney等
  payment_channel VARCHAR(50),                -- 具体渠道
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending',       -- pending/successful/failed/refunded
  paid_at TIMESTAMP,
  
  -- 付款人
  payer_name VARCHAR(100),
  payer_phone VARCHAR(20),
  payer_user_id INTEGER REFERENCES users(id), -- 关联刷刷用户（自动成为会员）
  
  -- 结算
  settlement_status VARCHAR(20) DEFAULT 'unsettled', -- unsettled/settled
  settled_at TIMESTAMP,
  settlement_batch_id VARCHAR(50),
  
  -- 元数据
  metadata JSONB,                             -- 额外信息
  webhook_data JSONB,                         -- PSP 回调原始数据
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_store ON payment_transactions(store_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_date ON payment_transactions(created_at);
```

### 3.4 结算记录表 (payment_settlements)
```sql
CREATE TABLE payment_settlements (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  account_id INTEGER REFERENCES merchant_payment_accounts(id),
  
  -- 结算信息
  batch_no VARCHAR(50) NOT NULL UNIQUE,       -- 结算批次号
  settlement_date DATE NOT NULL,              -- 结算日期
  
  -- 金额
  total_amount DECIMAL(12,2) NOT NULL,        -- 总交易额
  total_fee DECIMAL(10,2) NOT NULL,           -- 总手续费
  net_amount DECIMAL(12,2) NOT NULL,          -- 结算金额
  transaction_count INTEGER NOT NULL,         -- 交易笔数
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending',       -- pending/processing/completed/failed
  transfer_ref VARCHAR(100),                  -- 银行转账参考号
  completed_at TIMESTAMP,
  
  -- 期间
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Drizzle Schema (TypeScript)

```typescript
// shared/schema.ts - 添加以下表定义

import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, jsonb, date } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// 商户收款账户
export const merchantPaymentAccounts = pgTable('merchant_payment_accounts', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  
  // 银行信息
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  bankCode: varchar('bank_code', { length: 20 }),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).default('savings'),
  branchName: varchar('branch_name', { length: 100 }),
  
  // PromptPay
  promptpayId: varchar('promptpay_id', { length: 20 }),
  promptpayType: varchar('promptpay_type', { length: 10 }),
  
  // PSP
  pspProvider: varchar('psp_provider', { length: 20 }).default('omise'),
  pspCustomerId: varchar('psp_customer_id', { length: 100 }),
  pspRecipientId: varchar('psp_recipient_id', { length: 100 }),
  
  // 审核
  status: varchar('status', { length: 20 }).default('pending'),
  verifiedAt: timestamp('verified_at'),
  rejectedReason: text('rejected_reason'),
  
  // 资料
  idCardFrontUrl: text('id_card_front_url'),
  idCardBackUrl: text('id_card_back_url'),
  bankBookUrl: text('bank_book_url'),
  businessLicenseUrl: text('business_license_url'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 收款码
export const paymentQrcodes = pgTable('payment_qrcodes', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  accountId: integer('account_id'),
  
  qrType: varchar('qr_type', { length: 20 }).notNull(),
  qrCodeUrl: text('qr_code_url').notNull(),
  qrData: text('qr_data'),
  
  fixedAmount: decimal('fixed_amount', { precision: 10, scale: 2 }),
  minAmount: decimal('min_amount', { precision: 10, scale: 2 }),
  maxAmount: decimal('max_amount', { precision: 10, scale: 2 }),
  
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  pspSourceId: varchar('psp_source_id', { length: 100 }),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// 支付交易
export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  qrcodeId: integer('qrcode_id'),
  
  transactionNo: varchar('transaction_no', { length: 50 }).notNull().unique(),
  pspChargeId: varchar('psp_charge_id', { length: 100 }),
  pspProvider: varchar('psp_provider', { length: 20 }),
  
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('THB'),
  feeAmount: decimal('fee_amount', { precision: 10, scale: 2 }),
  netAmount: decimal('net_amount', { precision: 10, scale: 2 }),
  
  paymentMethod: varchar('payment_method', { length: 30 }),
  paymentChannel: varchar('payment_channel', { length: 50 }),
  
  status: varchar('status', { length: 20 }).default('pending'),
  paidAt: timestamp('paid_at'),
  
  payerName: varchar('payer_name', { length: 100 }),
  payerPhone: varchar('payer_phone', { length: 20 }),
  payerUserId: integer('payer_user_id'),
  
  settlementStatus: varchar('settlement_status', { length: 20 }).default('unsettled'),
  settledAt: timestamp('settled_at'),
  settlementBatchId: varchar('settlement_batch_id', { length: 50 }),
  
  metadata: jsonb('metadata'),
  webhookData: jsonb('webhook_data'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 结算记录
export const paymentSettlements = pgTable('payment_settlements', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  accountId: integer('account_id'),
  
  batchNo: varchar('batch_no', { length: 50 }).notNull().unique(),
  settlementDate: date('settlement_date').notNull(),
  
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  totalFee: decimal('total_fee', { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull(),
  transactionCount: integer('transaction_count').notNull(),
  
  status: varchar('status', { length: 20 }).default('pending'),
  transferRef: varchar('transfer_ref', { length: 100 }),
  completedAt: timestamp('completed_at'),
  
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Insert Schemas
export const insertMerchantPaymentAccountSchema = createInsertSchema(merchantPaymentAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  pspCustomerId: true,
  pspRecipientId: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type MerchantPaymentAccount = typeof merchantPaymentAccounts.$inferSelect;
export type InsertMerchantPaymentAccount = z.infer<typeof insertMerchantPaymentAccountSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type PaymentQrcode = typeof paymentQrcodes.$inferSelect;
export type PaymentSettlement = typeof paymentSettlements.$inferSelect;
```

---

## 5. API 设计

### 5.1 商户收款账户 API

```typescript
// 提交收款账户申请
POST /api/merchant/payment-accounts
Body: {
  storeId: number,
  bankName: string,
  bankCode: string,
  accountNumber: string,
  accountName: string,
  accountType: 'savings' | 'current',
  branchName?: string,
  promptpayId?: string,
  promptpayType?: 'phone' | 'national_id',
  idCardFrontUrl: string,
  idCardBackUrl: string,
  bankBookUrl: string,
  businessLicenseUrl?: string
}
Response: { id: number, status: 'pending' }

// 获取收款账户状态
GET /api/merchant/payment-accounts/:storeId
Response: {
  id: number,
  status: 'pending' | 'approved' | 'rejected',
  bankName: string,
  accountNumber: string, // 脱敏显示
  ...
}

// 运营后台：审核收款账户
POST /api/ops/payment-accounts/:id/review
Body: { action: 'approve' | 'reject', reason?: string }
```

### 5.2 收款码 API

```typescript
// 生成收款码
POST /api/merchant/qrcodes
Body: {
  storeId: number,
  qrType: 'static' | 'dynamic',
  fixedAmount?: number,  // 静态码可设置固定金额
  orderId?: string,      // 动态码关联订单
  expiresIn?: number     // 过期时间（分钟）
}
Response: {
  id: number,
  qrCodeUrl: string,     // 二维码图片URL
  qrData: string,        // 二维码数据
  expiresAt?: string
}

// 获取收款码列表
GET /api/merchant/qrcodes/:storeId
Response: { qrcodes: PaymentQrcode[] }

// 停用收款码
DELETE /api/merchant/qrcodes/:id
```

### 5.3 支付 API

```typescript
// 创建支付（顾客扫码后调用）
POST /api/payments/create
Body: {
  qrcodeId: number,
  amount: number,
  paymentMethod: 'promptpay' | 'credit_card' | 'truemoney',
  returnUrl?: string
}
Response: {
  transactionNo: string,
  authorizeUri?: string,  // 支付跳转URL（如需要）
  qrCodeUrl?: string,     // PromptPay 支付码
  status: 'pending'
}

// 查询支付状态
GET /api/payments/:transactionNo
Response: {
  transactionNo: string,
  status: 'pending' | 'successful' | 'failed',
  amount: number,
  paidAt?: string
}

// PSP Webhook 回调
POST /api/webhooks/omise
Headers: { 'Omise-Signature': string }
Body: { Omise Event Object }

POST /api/webhooks/2c2p
Body: { 2C2P Callback Object }
```

### 5.4 交易管理 API

```typescript
// 商户交易列表
GET /api/merchant/transactions/:storeId
Query: { 
  page?: number,
  limit?: number,
  status?: string,
  startDate?: string,
  endDate?: string,
  paymentMethod?: string
}
Response: {
  transactions: PaymentTransaction[],
  total: number,
  summary: {
    totalAmount: number,
    totalFee: number,
    totalCount: number
  }
}

// 发起退款
POST /api/merchant/transactions/:transactionNo/refund
Body: { amount?: number, reason: string }
Response: { refundId: string, status: 'pending' }

// 结算记录
GET /api/merchant/settlements/:storeId
Response: { settlements: PaymentSettlement[] }
```

---

## 6. 前端组件设计

### 6.1 页面结构

```
client/src/pages/merchant/
├── PaymentAccountSetup.tsx    # 收款账户设置页面
├── PaymentQrcode.tsx          # 收款码管理页面
├── PaymentTransactions.tsx    # 交易记录页面
└── PaymentSettings.tsx        # 支付设置页面

client/src/components/payment/
├── BankAccountForm.tsx        # 银行账户表单
├── IdCardUploader.tsx         # 身份证上传组件
├── QrcodeGenerator.tsx        # 二维码生成器
├── QrcodeDisplay.tsx          # 二维码展示组件
├── TransactionList.tsx        # 交易列表组件
└── PaymentStatusBadge.tsx     # 支付状态徽章
```

### 6.2 收款账户设置表单

```tsx
// components/payment/BankAccountForm.tsx
interface BankAccountFormData {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountType: 'savings' | 'current';
  branchName?: string;
  promptpayId?: string;
  promptpayType?: 'phone' | 'national_id';
}

// 泰国主要银行列表
const THAI_BANKS = [
  { code: 'BBL', name: 'Bangkok Bank', nameTh: 'ธนาคารกรุงเทพ' },
  { code: 'KBANK', name: 'Kasikorn Bank', nameTh: 'ธนาคารกสิกรไทย' },
  { code: 'KTB', name: 'Krung Thai Bank', nameTh: 'ธนาคารกรุงไทย' },
  { code: 'SCB', name: 'Siam Commercial Bank', nameTh: 'ธนาคารไทยพาณิชย์' },
  { code: 'BAY', name: 'Bank of Ayudhya', nameTh: 'ธนาคารกรุงศรีอยุธยา' },
  { code: 'TMB', name: 'TMB Bank', nameTh: 'ธนาคารทหารไทย' },
  { code: 'CIMB', name: 'CIMB Thai', nameTh: 'ธนาคาร ซีไอเอ็มบี ไทย' },
  { code: 'GSB', name: 'Government Savings Bank', nameTh: 'ธนาคารออมสิน' },
];
```

### 6.3 证件上传组件

```tsx
// components/payment/IdCardUploader.tsx
interface DocumentUploaderProps {
  label: string;
  description: string;
  accept: string;
  maxSize: number; // MB
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
}

// 需要上传的文件
const REQUIRED_DOCUMENTS = [
  { key: 'idCardFront', label: '身份证正面', description: '清晰拍摄身份证正面' },
  { key: 'idCardBack', label: '身份证背面', description: '清晰拍摄身份证背面' },
  { key: 'bankBook', label: '银行存折首页', description: '显示账号和户名的页面' },
  { key: 'businessLicense', label: '营业执照', description: '企业用户需提供（可选）' },
];
```

### 6.4 收款码展示组件

```tsx
// components/payment/QrcodeDisplay.tsx
interface QrcodeDisplayProps {
  qrCodeUrl: string;
  storeName: string;
  amount?: number;
  expiresAt?: Date;
  onDownload?: () => void;
  onShare?: () => void;
}

// 功能：
// 1. 大尺寸二维码展示
// 2. 显示店铺名称和金额
// 3. 倒计时（动态码）
// 4. 下载PNG/打印
// 5. 分享到社交媒体
```

---

## 7. 后端服务实现

### 7.1 Omise 支付服务

```typescript
// server/services/omise.ts
import Omise from 'omise';

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY,
});

export class OmisePaymentService {
  // 创建 PromptPay 支付源
  async createPromptPaySource(amount: number, orderId: string) {
    const source = await omise.sources.create({
      type: 'promptpay',
      amount: amount * 100, // 转换为 satang
      currency: 'thb',
    });
    return source;
  }

  // 创建支付
  async createCharge(sourceId: string, amount: number, metadata: object) {
    const charge = await omise.charges.create({
      amount: amount * 100,
      currency: 'thb',
      source: sourceId,
      metadata,
    });
    return charge;
  }

  // 查询支付状态
  async getCharge(chargeId: string) {
    return await omise.charges.retrieve(chargeId);
  }

  // 发起退款
  async createRefund(chargeId: string, amount?: number) {
    return await omise.charges.createRefund(chargeId, {
      amount: amount ? amount * 100 : undefined,
    });
  }

  // 验证 Webhook 签名
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // 使用 HMAC-SHA256 验证
    const expectedSig = crypto
      .createHmac('sha256', process.env.OMISE_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    return signature === expectedSig;
  }
}
```

### 7.2 支付 Webhook 处理

```typescript
// server/routes/webhooks.ts
router.post('/webhooks/omise', async (req, res) => {
  const signature = req.headers['omise-signature'] as string;
  const payload = JSON.stringify(req.body);
  
  // 验证签名
  if (!omiseService.verifyWebhookSignature(payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.body;
  
  switch (event.key) {
    case 'charge.complete':
      await handleChargeComplete(event.data);
      break;
    case 'charge.failed':
      await handleChargeFailed(event.data);
      break;
    case 'refund.complete':
      await handleRefundComplete(event.data);
      break;
  }
  
  res.json({ received: true });
});

async function handleChargeComplete(charge: any) {
  // 1. 更新交易状态
  await db.update(paymentTransactions)
    .set({ 
      status: 'successful',
      paidAt: new Date(),
      webhookData: charge,
    })
    .where(eq(paymentTransactions.pspChargeId, charge.id));
  
  // 2. 检查付款人是否已是会员，如未则自动注册
  await autoRegisterMember(charge);
  
  // 3. 发送支付成功通知
  await sendPaymentNotification(charge);
}
```

---

## 8. 安全考虑

### 8.1 数据安全
- 银行账号存储时部分脱敏（只显示后4位）
- 身份证信息加密存储
- API 密钥使用环境变量，不硬编码
- 所有支付相关请求使用 HTTPS

### 8.2 防欺诈措施
- Webhook 签名验证
- 交易金额上限设置
- 异常交易监控告警
- IP 地理位置检查

### 8.3 合规要求
- PCI DSS 合规（使用 PSP 的 tokenization）
- PDPA（泰国个人数据保护法）合规
- AML/KYC 商户审核流程

---

## 9. 多语言支持

```typescript
// 添加到 LanguageContext.tsx

// 中文
'payment.qrcode': '收款码',
'payment.qrcodeDesc': '支付即会员，顾客扫码支付自动成为会员',
'payment.comingSoon': '即将上线',
'payment.setupAccount': '设置收款账户',
'payment.bankInfo': '银行账户信息',
'payment.selectBank': '选择开户银行',
'payment.accountNumber': '银行账号',
'payment.accountName': '账户名称',
'payment.accountType': '账户类型',
'payment.savings': '储蓄账户',
'payment.current': '活期账户',
'payment.branchName': '开户支行',
'payment.promptpay': 'PromptPay',
'payment.promptpayId': 'PromptPay ID',
'payment.promptpayPhone': '手机号码',
'payment.promptpayNationalId': '身份证号',
'payment.uploadDocs': '上传资料',
'payment.idCardFront': '身份证正面',
'payment.idCardBack': '身份证背面',
'payment.bankBook': '银行存折首页',
'payment.businessLicense': '营业执照',
'payment.submitReview': '提交审核',
'payment.underReview': '审核中',
'payment.approved': '已通过',
'payment.rejected': '已拒绝',
'payment.generateQr': '生成收款码',
'payment.staticQr': '静态收款码',
'payment.dynamicQr': '动态收款码',
'payment.transactions': '交易记录',
'payment.settlements': '结算记录',
'payment.balance': '账户余额',
'payment.withdraw': '提现',
'payment.monthlyIncome': '本月收入',
'payment.monthlyExpense': '本月支出',

// 英文
'payment.qrcode': 'Payment QR',
'payment.qrcodeDesc': 'Customers become members automatically after payment',
// ... 其他英文翻译

// 泰文
'payment.qrcode': 'QR รับเงิน',
'payment.qrcodeDesc': 'ลูกค้าสแกนจ่ายเงินจะกลายเป็นสมาชิกโดยอัตโนมัติ',
// ... 其他泰文翻译
```

---

## 10. 开发步骤

### Phase 1: 基础设施 (1-2天)
1. [ ] 添加数据库表定义到 schema.ts
2. [ ] 运行 db:push 创建表
3. [ ] 配置 Omise SDK 和环境变量
4. [ ] 创建 Omise 支付服务类

### Phase 2: 商户入驻 (2-3天)
1. [ ] 实现收款账户设置页面
2. [ ] 实现银行账户表单组件
3. [ ] 实现证件上传组件（集成 OSS）
4. [ ] 实现账户审核 API
5. [ ] 运营后台添加审核界面

### Phase 3: 收款码功能 (2-3天)
1. [ ] 实现收款码生成 API
2. [ ] 实现二维码展示组件
3. [ ] 实现静态码和动态码生成
4. [ ] 在运营中心资产页面集成入口

### Phase 4: 支付处理 (2-3天)
1. [ ] 实现 PromptPay 支付流程
2. [ ] 实现 Webhook 处理
3. [ ] 实现交易状态查询
4. [ ] 实现自动会员注册

### Phase 5: 交易管理 (1-2天)
1. [ ] 实现交易记录列表页面
2. [ ] 实现退款功能
3. [ ] 实现结算记录页面
4. [ ] 添加交易统计图表

### Phase 6: 测试与优化 (1-2天)
1. [ ] 沙盒环境测试
2. [ ] Webhook 重试机制
3. [ ] 错误处理优化
4. [ ] 性能优化

---

## 11. 环境变量配置

```env
# Omise (主力 PSP)
OMISE_PUBLIC_KEY=pkey_test_xxxxx
OMISE_SECRET_KEY=skey_test_xxxxx
OMISE_WEBHOOK_SECRET=whsk_xxxxx

# 2C2P (备用 PSP)
C2P_MERCHANT_ID=xxxxx
C2P_SECRET_KEY=xxxxx
C2P_API_URL=https://sandbox-pgw.2c2p.com

# 支付配置
PAYMENT_FEE_RATE=0.016  # 1.6% 手续费
PAYMENT_MIN_AMOUNT=1    # 最小交易额
PAYMENT_MAX_AMOUNT=100000  # 最大交易额
```

---

## 12. 注意事项

1. **测试环境先行**：使用 Omise 沙盒环境完成开发测试
2. **Webhook 幂等性**：同一事件可能重复推送，需做幂等处理
3. **超时处理**：支付状态不确定时，主动查询 PSP 获取最终状态
4. **日志记录**：所有支付相关操作需详细记录日志
5. **监控告警**：设置支付成功率、异常交易等监控指标

---

*文档版本: 1.0*
*最后更新: 2024-12-04*
