/**
 * LIFF 客户端管理模块（生产可用的“干净版本”）
 * 目标：
 * 1) LINE 环境：可初始化 LIFF + 判断登录态 + 支持 shareTargetPicker
 * 2) 非 LINE 环境：不强依赖 LIFF，不允许 init 报错把页面炸掉；由业务层走 OAuth 跳转
 */

export function isInLineApp(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Line\/[\d.]+/i.test(ua);
}

export interface LineAuthParams {
  redirectPath?: string;
  fromChannel?: string;
  returnTo?: string;
}

export function getCampaignFromQuery(): string {
  if (typeof window === 'undefined') return 'direct';
  const params = new URLSearchParams(window.location.search);
  return params.get('from') || params.get('utm_source') || params.get('channel') || 'direct';
}

export function buildLineAuthorizeUrl(params: LineAuthParams = {}): string {
  const base = 'https://access.line.me/oauth2/v2.1/authorize';

  const urlParams = new URLSearchParams(window.location.search);
  const fromChannel = params.fromChannel || urlParams.get('from') || urlParams.get('utm_source') || 'direct';
  const redirectPath = params.redirectPath || params.returnTo || window.location.pathname || '/';

  const statePayload = {
    redirectPath,
    fromChannel,
    timestamp: Date.now(),
  };

  const stateJson = JSON.stringify(statePayload);
  const stateBase64 = btoa(stateJson)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const redirectUri = `${window.location.origin}/api/auth/line/callback`;

  const query = new URLSearchParams({
    response_type: 'code',
    client_id: import.meta.env.VITE_LINE_CHANNEL_ID || '2008410104',
    redirect_uri: redirectUri,
    scope: 'openid profile',
    state: stateBase64,
  });

  return `${base}?${query.toString()}`;
}

export function redirectToLineLogin(params: LineAuthParams = {}): void {
  const url = buildLineAuthorizeUrl(params);
  console.log('[LINE OAuth] Redirecting to:', url);
  window.location.href = url;
}

declare global {
  interface Window {
    liff: any;
  }
}

export interface LiffClientState {
  liff: any | null;
  liffId: string;
  isInClient: boolean;
  isLoggedIn: boolean;
}

let initPromise: Promise<LiffClientState> | null = null;
let cachedState: LiffClientState | null = null;

function loadLiffScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve();

    const existingScript = document.querySelector('script[src*="line-scdn.net/liff"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('LIFF script load error')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('LIFF script load error'));
    document.body.appendChild(script);
  });
}

async function fetchLiffId(): Promise<string> {
  const resp = await fetch('/api/config', { credentials: 'same-origin' });
  const json = await resp.json();
  const liffId = json?.data?.liffId;
  if (!liffId) throw new Error('LIFF ID not configured on server');
  return String(liffId);
}

/**
 * 核心：永远不要让 LIFF 初始化失败把整个页面炸死
 * - 成功：返回可用 liff
 * - 失败：返回 liff=null（业务层可继续走 OAuth）
 */
export async function ensureLiffReady(): Promise<LiffClientState> {
  if (cachedState) return cachedState;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let liffId = '';
    try {
      liffId = await fetchLiffId();
      console.log('[LiffClient] Got liffId:', liffId);

      await loadLiffScript();
      console.log('[LiffClient] SDK loaded');

      // 只有 liffId 存在才 init
      if (liffId) {
        try {
          await window.liff.init({ liffId });
          console.log('[LiffClient] Initialized successfully');
        } catch (e: any) {
          // 兼容：重复 init
          const msg = String(e?.message || '');
          if (msg.includes('already initialized')) {
            console.log('[LiffClient] Already initialized');
          } else {
            console.warn('[LiffClient] init failed:', e);
          }
        }
      }

      cachedState = {
        liff: window.liff || null,
        liffId,
        isInClient: !!window.liff?.isInClient?.(),
        isLoggedIn: !!window.liff?.isLoggedIn?.(),
      };

      console.log('[LIFF] after init', {
        href: window.location.href,
        liffId,
        isLoggedIn: cachedState.isLoggedIn,
        isInClient: cachedState.isInClient,
      });

      return cachedState;
    } catch (err) {
      console.warn('[LiffClient] ensureLiffReady failed (safe fallback):', err);
      cachedState = {
        liff: null,
        liffId,
        isInClient: false,
        isLoggedIn: false,
      };
      return cachedState;
    } finally {
      // 允许后续重试
      initPromise = null;
    }
  })();

  return initPromise;
}

export function getLiff(): any | null {
  if (typeof window === 'undefined') return null;
  return window.liff || null;
}

export function isLiffLoggedIn(): boolean {
  try {
    return !!window.liff?.isLoggedIn?.();
  } catch {
    return false;
  }
}

/**
 * 麦克风权限：网页侧兜底（LINE 内部浏览器也适用）
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    if (!navigator?.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * shareTargetPicker 能力检测/分享
 */
export async function isShareTargetPickerAvailable(): Promise<boolean> {
  const st = await ensureLiffReady();
  const liff = st.liff;
  try {
    return !!liff?.isApiAvailable?.('shareTargetPicker');
  } catch {
    return false;
  }
}

export async function shareInviteToLineFriends(message: any): Promise<void> {
  const st = await ensureLiffReady();
  const liff = st.liff;
  if (!liff) throw new Error('LIFF not ready');
  if (!liff.isApiAvailable?.('shareTargetPicker')) throw new Error('shareTargetPicker not available');
  await liff.shareTargetPicker([message]);
}
