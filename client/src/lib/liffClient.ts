/**
 * LIFF 客户端管理模块
 * 集中管理 LIFF SDK 的加载和初始化，避免多个组件重复初始化导致的问题
 */

declare global {
  interface Window {
    liff: any;
  }
}

interface LiffClientState {
  liff: any | null;
  liffId: string;
  isInClient: boolean;
  isLoggedIn: boolean;
}

let initPromise: Promise<LiffClientState> | null = null;
let cachedState: LiffClientState | null = null;

/**
 * 加载 LIFF SDK 脚本
 */
function loadLiffScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.liff) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="line-scdn.net/liff"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * 从服务器获取 LIFF ID
 */
async function fetchLiffId(): Promise<string> {
  const response = await fetch('/api/config');
  const data = await response.json();
  const liffId = data.data?.liffId;
  
  if (!liffId) {
    throw new Error('LIFF ID not configured on server');
  }
  
  return liffId;
}

/**
 * 确保 LIFF 已初始化并返回状态
 * 这是主要的公共 API，所有 LIFF 操作前都应调用此方法
 */
export async function ensureLiffReady(): Promise<LiffClientState> {
  // 如果已经初始化，直接返回缓存状态
  if (cachedState) {
    return cachedState;
  }

  // 如果正在初始化，等待现有 Promise
  if (initPromise) {
    return initPromise;
  }

  // 开始初始化
  initPromise = (async () => {
    try {
      // 1. 获取 LIFF ID
      const liffId = await fetchLiffId();
      console.log('[LiffClient] Got liffId:', liffId);

      // 2. 加载 SDK
      await loadLiffScript();
      console.log('[LiffClient] SDK loaded');

      // 3. 初始化 LIFF
      try {
        await window.liff.init({ liffId });
        console.log('[LiffClient] Initialized successfully');
      } catch (e: any) {
        // 如果已经初始化，忽略错误
        if (e?.code === 'INIT_FAILED' && e?.message?.includes('already initialized')) {
          console.log('[LiffClient] Already initialized');
        } else {
          throw e;
        }
      }

      // 4. 缓存状态
      cachedState = {
        liff: window.liff,
        liffId,
        isInClient: window.liff.isInClient(),
        isLoggedIn: window.liff.isLoggedIn(),
      };

      // [三进制诊断 Q1] LIFF 初始化后状态日志
      console.log('[LIFF] after init', {
        href: window.location.href,
        isLoggedIn: typeof window.liff.isLoggedIn === 'function'
          ? window.liff.isLoggedIn()
          : undefined,
        idToken: typeof window.liff.getIDToken === 'function'
          ? String(window.liff.getIDToken() || '').slice(0, 16)
          : undefined,
        accessToken: typeof window.liff.getAccessToken === 'function'
          ? String(window.liff.getAccessToken() || '').slice(0, 16)
          : undefined,
      });

      return cachedState;
    } catch (error) {
      // 初始化失败，清除 Promise 以便重试
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * 获取 LIFF 实例（如果已初始化）
 */
export function getLiff(): any | null {
  return cachedState?.liff || window.liff || null;
}

/**
 * 获取缓存的 LIFF ID
 */
export function getLiffId(): string | null {
  return cachedState?.liffId || null;
}

/**
 * 检查是否在 LINE 应用内
 */
export function isInLiffClient(): boolean {
  return cachedState?.isInClient || false;
}

/**
 * 检查 LIFF 是否已登录
 */
export function isLiffLoggedIn(): boolean {
  if (!cachedState?.liff) return false;
  try {
    return cachedState.liff.isLoggedIn();
  } catch {
    return false;
  }
}

/**
 * 重置状态（用于登出后）
 */
export function resetLiffState(): void {
  cachedState = null;
  initPromise = null;
}

/**
 * 检查 shareTargetPicker 是否可用
 */
export async function isShareTargetPickerAvailable(): Promise<boolean> {
  try {
    const state = await ensureLiffReady();
    return state.liff?.isApiAvailable?.('shareTargetPicker') ?? false;
  } catch {
    return false;
  }
}

/**
 * 使用 shareTargetPicker 发送邀请消息给LINE好友
 */
export async function shareInviteToLineFriends(inviteUrl: string, inviterName: string): Promise<boolean> {
  try {
    const state = await ensureLiffReady();
    
    if (!state.liff?.isApiAvailable?.('shareTargetPicker')) {
      console.log('[LiffClient] shareTargetPicker not available');
      return false;
    }

    const result = await state.liff.shareTargetPicker([
      {
        type: 'flex',
        altText: `${inviterName} 邀请你加入刷刷`,
        contents: {
          type: 'bubble',
          hero: {
            type: 'image',
            url: 'https://prodee-h5-assets.oss-ap-southeast-1.aliyuncs.com/app/shuashua-invite-banner.png',
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '刷刷邀请',
                weight: 'bold',
                size: 'xl',
                color: '#38B03B'
              },
              {
                type: 'text',
                text: `${inviterName} 邀请你一起玩刷刷！`,
                size: 'sm',
                color: '#666666',
                margin: 'md',
                wrap: true
              },
              {
                type: 'text',
                text: '发现本地好店、领取优惠券、看短视频',
                size: 'xs',
                color: '#999999',
                margin: 'sm',
                wrap: true
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '立即加入',
                  uri: inviteUrl
                },
                style: 'primary',
                color: '#38B03B'
              }
            ]
          }
        }
      }
    ]);

    return result?.status === 'success' || !!result;
  } catch (error) {
    console.error('[LiffClient] shareTargetPicker error:', error);
    return false;
  }
}
