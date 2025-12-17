import { useCallback, useRef } from 'react';

/**
 * useHybridTap - 通用移动端 WebView 触摸事件处理 Hook
 * 
 * 兼容以下应用内浏览器：
 * - LINE WebView
 * - Telegram WebView
 * - Viber WebView
 * - 普通移动浏览器（Chrome、Safari）
 * 
 * 问题背景：
 * 这些 WebView 经常抑制或延迟合成的 click 事件，而 touchstart 事件通常能正常触发。
 * 此 Hook 优先使用 touchstart（带 preventDefault），回退到 click，并防止重复触发。
 */

interface HybridTapOptions {
  /** 是否禁用（禁用时不会触发回调） */
  disabled?: boolean;
  /** 防抖时间（毫秒），防止短时间内重复触发 */
  debounceMs?: number;
}

interface HybridTapHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

export function useHybridTap(
  callback: () => void,
  options: HybridTapOptions = {}
): HybridTapHandlers {
  const { disabled = false, debounceMs = 300 } = options;
  
  // 标记触摸是否已处理，防止 click 重复触发
  const touchHandledRef = useRef(false);
  // 最后一次触发时间，用于防抖
  const lastTriggerTimeRef = useRef(0);
  // 触摸开始位置，用于检测是否为滑动
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const triggerCallback = useCallback(() => {
    if (disabled) return;
    
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < debounceMs) {
      console.log('[HybridTap] 防抖：忽略重复触发');
      return;
    }
    
    lastTriggerTimeRef.current = now;
    console.log('[HybridTap] 触发回调');
    callback();
  }, [callback, disabled, debounceMs]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    // 记录触摸开始位置
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
    
    console.log('[HybridTap] touchstart 事件');
  }, [disabled]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    // 检查是否为滑动（移动超过 10px 视为滑动，不触发点击）
    const touch = e.changedTouches[0];
    if (touch && touchStartRef.current) {
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        console.log('[HybridTap] 检测到滑动，忽略');
        touchStartRef.current = null;
        return;
      }
    }
    
    touchStartRef.current = null;
    
    // 阻止默认行为，防止 300ms 延迟和后续 click 事件
    e.preventDefault();
    
    // 标记触摸已处理
    touchHandledRef.current = true;
    
    console.log('[HybridTap] touchend 事件 - 触发回调');
    triggerCallback();
    
    // 在微任务后重置标记，允许下次点击
    queueMicrotask(() => {
      setTimeout(() => {
        touchHandledRef.current = false;
      }, 50);
    });
  }, [disabled, triggerCallback]);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    // 如果触摸已处理，跳过 click（防止重复触发）
    if (touchHandledRef.current) {
      console.log('[HybridTap] click 事件 - 已由 touch 处理，跳过');
      return;
    }
    
    console.log('[HybridTap] click 事件 - 触发回调');
    triggerCallback();
  }, [disabled, triggerCallback]);

  return {
    onTouchStart,
    onTouchEnd,
    onClick,
  };
}

/**
 * 检测当前是否在应用内 WebView 中
 */
export function isInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  
  // 检测常见的应用内浏览器
  const patterns = [
    /Line\/[\d.]+/i,           // LINE
    /Telegram/i,               // Telegram
    /Viber/i,                  // Viber
    /FBAV/i,                   // Facebook
    /FBAN/i,                   // Facebook
    /Instagram/i,              // Instagram
    /WhatsApp/i,               // WhatsApp
    /WeChat|MicroMessenger/i,  // WeChat
    /\bwv\b/i,                 // Generic WebView indicator
  ];
  
  return patterns.some(pattern => pattern.test(ua));
}

/**
 * 获取当前 WebView 类型（用于调试）
 */
export function getWebViewType(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  
  if (/Line\/[\d.]+/i.test(ua)) return 'LINE';
  if (/Telegram/i.test(ua)) return 'Telegram';
  if (/Viber/i.test(ua)) return 'Viber';
  if (/FBAV|FBAN/i.test(ua)) return 'Facebook';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/WeChat|MicroMessenger/i.test(ua)) return 'WeChat';
  if (/\bwv\b/i.test(ua)) return 'Generic WebView';
  
  return 'Browser';
}
