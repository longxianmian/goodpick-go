/**
 * 归因追踪工具模块 - Attribution Tracking Utility
 * 
 * 功能：
 * 1. 从 URL 解析 trace_id/src/bind_id
 * 2. 生成并持久化 trace_id 到 localStorage
 * 3. 提供获取归因数据的方法
 * 4. 提供 URL 追加归因参数的方法
 */

import { nanoid } from 'nanoid';

// localStorage keys
const STORAGE_KEYS = {
  TRACE_ID: 'gp_trace_id',
  SRC: 'gp_src',
  BIND_ID: 'gp_bind_id',
} as const;

// 来源渠道类型
export type AttributionSource = 
  | 'tiktok' 
  | 'fb' 
  | 'ig' 
  | 'line' 
  | 'offline_qr' 
  | 'referral' 
  | 'unknown';

// 归因数据接口
export interface AttributionData {
  traceId: string;
  src: AttributionSource;
  bindId: string | null;
}

/**
 * 从当前 URL 解析归因参数并存储到 localStorage
 * 在 SPA 初始化时调用一次
 */
export function initAttributionFromLocation(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    
    // 解析 URL 参数
    const urlTraceId = params.get('trace_id') || params.get('traceId');
    const urlSrc = params.get('src') || params.get('source') || params.get('utm_source');
    const urlBindId = params.get('bind_id') || params.get('bindId') || params.get('ref');
    
    // 如果 URL 有 trace_id，优先使用；否则检查 localStorage 或生成新的
    let traceId = urlTraceId;
    if (!traceId) {
      traceId = localStorage.getItem(STORAGE_KEYS.TRACE_ID);
      if (!traceId) {
        traceId = nanoid(21); // 生成新的 trace_id
      }
    }
    localStorage.setItem(STORAGE_KEYS.TRACE_ID, traceId);
    
    // 如果 URL 有 src，使用 URL 的值覆盖
    if (urlSrc) {
      const normalizedSrc = normalizeSource(urlSrc);
      localStorage.setItem(STORAGE_KEYS.SRC, normalizedSrc);
    } else if (!localStorage.getItem(STORAGE_KEYS.SRC)) {
      localStorage.setItem(STORAGE_KEYS.SRC, 'unknown');
    }
    
    // 如果 URL 有 bind_id，使用 URL 的值覆盖
    if (urlBindId) {
      localStorage.setItem(STORAGE_KEYS.BIND_ID, urlBindId);
    }
    
    // 调试日志（生产环境可移除）
    if (import.meta.env.DEV) {
      console.log('[Attribution] Initialized:', getAttribution());
    }
  } catch (error) {
    console.warn('[Attribution] Failed to initialize:', error);
  }
}

/**
 * 标准化来源渠道名称
 */
function normalizeSource(raw: string): AttributionSource {
  const normalized = raw.toLowerCase().trim();
  
  const sourceMap: Record<string, AttributionSource> = {
    'tiktok': 'tiktok',
    'douyin': 'tiktok',
    'fb': 'fb',
    'facebook': 'fb',
    'ig': 'ig',
    'instagram': 'ig',
    'line': 'line',
    'offline_qr': 'offline_qr',
    'qr': 'offline_qr',
    'referral': 'referral',
    'ref': 'referral',
  };
  
  return sourceMap[normalized] || 'unknown';
}

/**
 * 获取当前归因数据
 */
export function getAttribution(): AttributionData {
  let traceId = localStorage.getItem(STORAGE_KEYS.TRACE_ID);
  
  // 如果没有 trace_id，生成一个
  if (!traceId) {
    traceId = nanoid(21);
    localStorage.setItem(STORAGE_KEYS.TRACE_ID, traceId);
  }
  
  const src = (localStorage.getItem(STORAGE_KEYS.SRC) as AttributionSource) || 'unknown';
  const bindId = localStorage.getItem(STORAGE_KEYS.BIND_ID);
  
  return {
    traceId,
    src,
    bindId,
  };
}

/**
 * 获取归因 HTTP Headers（用于 API 请求）
 */
export function getAttributionHeaders(): Record<string, string> {
  const { traceId, src, bindId } = getAttribution();
  
  const headers: Record<string, string> = {
    'x-trace-id': traceId,
    'x-src': src,
  };
  
  if (bindId) {
    headers['x-bind-id'] = bindId;
  }
  
  return headers;
}

/**
 * 追加归因参数到 URL
 * 用于跳转外部平台或内链时保持参数
 */
export function appendAttributionToUrl(url: string): string {
  try {
    const { traceId, src, bindId } = getAttribution();
    const urlObj = new URL(url, window.location.origin);
    
    urlObj.searchParams.set('trace_id', traceId);
    urlObj.searchParams.set('src', src);
    
    if (bindId) {
      urlObj.searchParams.set('bind_id', bindId);
    }
    
    return urlObj.toString();
  } catch (error) {
    console.warn('[Attribution] Failed to append params to URL:', error);
    return url;
  }
}

/**
 * 手动设置归因来源（用于特殊场景）
 */
export function setAttributionSource(src: AttributionSource, bindId?: string): void {
  localStorage.setItem(STORAGE_KEYS.SRC, src);
  if (bindId) {
    localStorage.setItem(STORAGE_KEYS.BIND_ID, bindId);
  }
}

/**
 * 清除归因数据（用于测试或登出场景）
 */
export function clearAttribution(): void {
  localStorage.removeItem(STORAGE_KEYS.TRACE_ID);
  localStorage.removeItem(STORAGE_KEYS.SRC);
  localStorage.removeItem(STORAGE_KEYS.BIND_ID);
}
