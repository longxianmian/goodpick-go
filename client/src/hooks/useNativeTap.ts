import { useEffect, useRef, useCallback, RefObject } from 'react';

/**
 * useNativeTap - 使用原生 DOM 事件监听处理触摸事件
 * 
 * 专门解决 LINE/Telegram/Viber WebView 中 React 合成事件无法正确触发的问题。
 * React 的合成事件在这些 WebView 中被当作 passive 监听器，导致 preventDefault 无效。
 * 
 * 此 hook 直接使用 addEventListener 绑定原生事件，确保：
 * 1. 事件以 { passive: false } 注册，允许 preventDefault
 * 2. 回调在用户手势上下文中执行，满足媒体 API 权限要求
 * 3. 避免双重触发
 */

interface NativeTapOptions {
  disabled?: boolean;
  debounceMs?: number;
}

export function useNativeTap<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
  options: NativeTapOptions = {}
): void {
  const { disabled = false, debounceMs = 300 } = options;
  
  const callbackRef = useRef(callback);
  const disabledRef = useRef(disabled);
  const lastTriggerTimeRef = useRef(0);
  const touchHandledRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    callbackRef.current = callback;
    disabledRef.current = disabled;
  }, [callback, disabled]);
  
  const triggerCallback = useCallback(() => {
    if (disabledRef.current) {
      console.log('[NativeTap] 已禁用，跳过回调');
      return;
    }
    
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < debounceMs) {
      console.log('[NativeTap] 防抖：忽略重复触发');
      return;
    }
    
    lastTriggerTimeRef.current = now;
    console.log('[NativeTap] 触发回调');
    
    try {
      callbackRef.current();
    } catch (error) {
      console.error('[NativeTap] 回调执行错误:', error);
    }
  }, [debounceMs]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      console.log('[NativeTap] touchstart 事件');
      
      const touch = e.touches[0];
      if (touch) {
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      console.log('[NativeTap] touchend 事件');
      
      if (disabledRef.current) {
        touchStartPosRef.current = null;
        return;
      }
      
      const touch = e.changedTouches[0];
      if (touch && touchStartPosRef.current) {
        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
        
        if (deltaX > 15 || deltaY > 15) {
          console.log('[NativeTap] 检测到滑动，忽略');
          touchStartPosRef.current = null;
          return;
        }
      }
      
      touchStartPosRef.current = null;
      
      e.preventDefault();
      
      touchHandledRef.current = true;
      
      console.log('[NativeTap] touchend - 触发回调');
      triggerCallback();
      
      setTimeout(() => {
        touchHandledRef.current = false;
      }, 100);
    };
    
    const handleClick = (e: MouseEvent) => {
      console.log('[NativeTap] click 事件');
      
      if (touchHandledRef.current) {
        console.log('[NativeTap] click - 已由 touch 处理，跳过');
        e.preventDefault();
        return;
      }
      
      if (disabledRef.current) {
        return;
      }
      
      console.log('[NativeTap] click - 触发回调');
      triggerCallback();
    };
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('click', handleClick, { passive: false });
    
    console.log('[NativeTap] 原生事件监听器已绑定');
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('click', handleClick);
      console.log('[NativeTap] 原生事件监听器已移除');
    };
  }, [ref, triggerCallback]);
}

/**
 * 检测当前是否在应用内 WebView 中
 */
export function isInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  
  const patterns = [
    /Line\/[\d.]+/i,
    /Telegram/i,
    /Viber/i,
    /FBAV/i,
    /FBAN/i,
    /Instagram/i,
    /WhatsApp/i,
    /WeChat|MicroMessenger/i,
    /\bwv\b/i,
  ];
  
  return patterns.some(pattern => pattern.test(ua));
}

/**
 * 获取当前 WebView 类型
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
