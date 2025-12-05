/**
 * 刷刷平台 - 测试账号配置
 * 
 * 刷刷平台7种账号类型：
 * 1. 个人号 (consumer) - 普通消费者
 * 2. 刷刷号 (creator) - 内容创作者/自媒体
 * 3. 发现号/商户号 (owner) - 商户老板
 * 4. 核销号 (verifier) - 核销员
 * 5. 运营号 (operator) - 运营人员
 * 6. 商户会员号 (member) - 商户会员
 * 7. 系统运营管理账号 (sysadmin) - 系统管理员
 * 
 * 测试账号可以访问所有角色和页面
 */

export type ShuaShuaAccountType = 
  | 'consumer'   // 个人号
  | 'creator'    // 刷刷号
  | 'owner'      // 发现号/商户号
  | 'verifier'   // 核销号
  | 'operator'   // 运营号
  | 'member'     // 商户会员号
  | 'sysadmin';  // 系统运营管理账号

export const ALL_ACCOUNT_TYPES: ShuaShuaAccountType[] = [
  'consumer',
  'creator', 
  'owner',
  'verifier',
  'operator',
  'member',
  'sysadmin',
];

export interface TestAccount {
  lineUserId: string;
  displayName: string;
  description: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  {
    lineUserId: 'U36ca390160a7674f51442fa6df2290f0',
    displayName: '宝宝龙',
    description: '系统测试账号 - 拥有所有角色权限',
  },
];

export function isTestAccount(lineUserId: string): boolean {
  return TEST_ACCOUNTS.some(account => account.lineUserId === lineUserId);
}

export function getTestAccountInfo(lineUserId: string): TestAccount | undefined {
  return TEST_ACCOUNTS.find(account => account.lineUserId === lineUserId);
}
