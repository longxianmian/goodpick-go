/**
 * useVideoPool - 视频播放器池 Hook
 * 
 * ⚠️ EXPERIMENTAL - 默认禁用
 * 
 * 此 Hook 实现了视频播放器池管理，使用固定数量的 video 元素复用，
 * 避免 DOM 频繁创建销毁，理论上可以提升视频切换流畅度。
 * 
 * ## 当前状态
 * - 默认使用 videoPreloader 方案（稳定）
 * - useVideoPool 作为实验性备选方案
 * 
 * ## 启用方式
 * 1. URL 参数: 添加 ?videoStrategy=pool
 * 2. 控制台: 执行 setVideoStrategy('pool') 然后刷新页面
 * 3. localStorage: localStorage.setItem('videoStrategy', 'pool') 然后刷新
 * 
 * ## 切换回默认方案
 * 1. URL 参数: 添加 ?videoStrategy=preloader 或移除参数
 * 2. 控制台: 执行 setVideoStrategy('preloader') 然后刷新页面
 * 
 * ## 调试模式
 * 添加 ?debugVideo=1 可查看详细日志和性能指标面板
 * 
 * ## 适用场景
 * - 低端设备出现卡顿时可尝试开启
 * - 需要对比两种方案性能时使用
 */

import { useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { recordVideoMetrics, getVideoConfig, VideoMetrics } from '@/lib/videoConfig';

interface VideoInfo {
  id: number;
  videoUrl: string;
  hlsUrl?: string | null;
}

interface PooledVideo {
  element: HTMLVideoElement;
  hls: Hls | null;
  videoId: number | null;
  isReady: boolean;
  loadStartTime: number;
  canplayTime: number;
  waitingCount: number;
}

interface TTFFMetric {
  videoId: number;
  ttff: number;
  source: 'hls' | 'mp4' | 'native-hls';
  preloaded: boolean;
}

const HLS_CONFIG = {
  enableWorker: true,
  startLevel: -1,
  maxBufferLength: 6,
  maxMaxBufferLength: 12,
  backBufferLength: 6,
  lowLatencyMode: false,
};

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export function useVideoPool() {
  const currentVideoRef = useRef<PooledVideo | null>(null);
  const nextVideoRef = useRef<PooledVideo | null>(null);
  const config = getVideoConfig();
  const isMobileDevice = isMobile();
  const ttffMetricsRef = useRef<TTFFMetric[]>([]);

  const log = useCallback((...args: any[]) => {
    if (config.debugMode) {
      console.log('[VideoPool]', ...args);
    }
  }, [config.debugMode]);

  const createPooledVideo = useCallback((container: HTMLElement): PooledVideo => {
    const element = document.createElement('video');
    element.muted = true;
    element.playsInline = true;
    element.loop = true;
    element.preload = 'auto';
    element.style.position = 'absolute';
    element.style.inset = '0';
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'contain';
    element.style.zIndex = '10';
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.15s ease-out';
    container.appendChild(element);
    
    return {
      element,
      hls: null,
      videoId: null,
      isReady: false,
      loadStartTime: 0,
      canplayTime: 0,
      waitingCount: 0,
    };
  }, []);

  const recordMetrics = useCallback((
    pooled: PooledVideo, 
    source: 'hls' | 'mp4' | 'native-hls', 
    isPreload: boolean
  ) => {
    const firstFrameMs = performance.now() - pooled.loadStartTime;
    
    // 尝试获取 droppedFrames
    let droppedFrames = 0;
    const videoEl = pooled.element as any;
    if (videoEl.getVideoPlaybackQuality) {
      const quality = videoEl.getVideoPlaybackQuality();
      droppedFrames = quality.droppedVideoFrames || 0;
    }
    
    const metrics: VideoMetrics = {
      videoId: pooled.videoId!,
      firstFrameMs,
      canplayMs: pooled.canplayTime > 0 ? pooled.canplayTime - pooled.loadStartTime : firstFrameMs,
      waitingCount: pooled.waitingCount,
      droppedFrames,
      source,
      preloaded: isPreload,
      timestamp: Date.now(),
    };
    
    recordVideoMetrics(metrics);
    
    ttffMetricsRef.current.push({
      videoId: pooled.videoId!,
      ttff: firstFrameMs,
      source,
      preloaded: isPreload,
    });
  }, []);

  const setupEventListeners = useCallback((pooled: PooledVideo) => {
    const { element } = pooled;
    
    const handleCanplay = () => {
      pooled.canplayTime = performance.now();
    };
    
    const handleWaiting = () => {
      pooled.waitingCount++;
      log(`Video ${pooled.videoId} waiting event (count: ${pooled.waitingCount})`);
    };
    
    element.addEventListener('canplay', handleCanplay);
    element.addEventListener('waiting', handleWaiting);
    
    return () => {
      element.removeEventListener('canplay', handleCanplay);
      element.removeEventListener('waiting', handleWaiting);
    };
  }, [log]);

  const loadVideo = useCallback((pooled: PooledVideo, video: VideoInfo, isPreload: boolean = false): void => {
    const { element } = pooled;
    
    if (pooled.hls) {
      pooled.hls.destroy();
      pooled.hls = null;
    }
    
    pooled.videoId = video.id;
    pooled.isReady = false;
    pooled.loadStartTime = performance.now();
    pooled.canplayTime = 0;
    pooled.waitingCount = 0;
    
    setupEventListeners(pooled);
    
    const hlsSource = video.hlsUrl;
    const isHlsSource = hlsSource && (hlsSource.includes('.m3u8') || hlsSource.includes('hls/sign'));
    
    if (isMobileDevice) {
      element.src = video.videoUrl;
      element.addEventListener('loadeddata', () => {
        pooled.isReady = true;
        recordMetrics(pooled, 'mp4', isPreload);
        log(`Video ${video.id} ready (mobile MP4, preload: ${isPreload})`);
      }, { once: true });
    } else if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG);
      hls.loadSource(hlsSource);
      hls.attachMedia(element);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        pooled.isReady = true;
        recordMetrics(pooled, 'hls', isPreload);
        log(`Video ${video.id} HLS ready (preload: ${isPreload})`);
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          log(`Video ${video.id} HLS error, falling back to MP4`);
          hls.destroy();
          pooled.hls = null;
          element.src = video.videoUrl;
          element.addEventListener('loadeddata', () => {
            pooled.isReady = true;
            recordMetrics(pooled, 'mp4', isPreload);
          }, { once: true });
        }
      });
      
      pooled.hls = hls;
    } else if (isHlsSource && element.canPlayType('application/vnd.apple.mpegurl')) {
      element.src = hlsSource;
      element.addEventListener('loadeddata', () => {
        pooled.isReady = true;
        recordMetrics(pooled, 'native-hls', isPreload);
        log(`Video ${video.id} native HLS ready (preload: ${isPreload})`);
      }, { once: true });
    } else {
      element.src = video.videoUrl;
      element.addEventListener('loadeddata', () => {
        pooled.isReady = true;
        recordMetrics(pooled, 'mp4', isPreload);
        log(`Video ${video.id} MP4 ready (preload: ${isPreload})`);
      }, { once: true });
    }
  }, [isMobileDevice, log, recordMetrics, setupEventListeners]);

  const initPool = useCallback((container: HTMLElement): void => {
    if (!currentVideoRef.current) {
      currentVideoRef.current = createPooledVideo(container);
      log('Created current video element');
    }
    if (!nextVideoRef.current) {
      nextVideoRef.current = createPooledVideo(container);
      log('Created next video element');
    }
  }, [createPooledVideo, log]);

  const preloadNext = useCallback((video: VideoInfo): void => {
    if (!nextVideoRef.current) return;
    
    if (nextVideoRef.current.videoId === video.id) {
      log(`Video ${video.id} already preloading`);
      return;
    }
    
    log(`Preloading next video: ${video.id}`);
    loadVideo(nextVideoRef.current, video, true);
  }, [loadVideo, log]);

  const playCurrent = useCallback((video: VideoInfo, onFirstFrame?: () => void): HTMLVideoElement | null => {
    if (!currentVideoRef.current) return null;
    
    const pooled = currentVideoRef.current;
    
    if (pooled.videoId !== video.id) {
      loadVideo(pooled, video, false);
    }
    
    pooled.element.style.opacity = '1';
    pooled.element.muted = true;
    
    const playVideo = () => {
      pooled.element.play().then(() => {
        onFirstFrame?.();
      }).catch(() => {
        pooled.element.muted = true;
        pooled.element.play().catch(() => {});
      });
    };
    
    if (pooled.isReady) {
      playVideo();
    } else {
      const onReady = () => {
        playVideo();
      };
      pooled.element.addEventListener('loadeddata', onReady, { once: true });
      pooled.element.addEventListener('canplay', onReady, { once: true });
    }
    
    return pooled.element;
  }, [loadVideo]);

  const swap = useCallback((nextVideo: VideoInfo): HTMLVideoElement | null => {
    log('Swapping video elements');
    
    if (currentVideoRef.current) {
      currentVideoRef.current.element.pause();
      currentVideoRef.current.element.style.opacity = '0';
      currentVideoRef.current.element.currentTime = 0;
    }
    
    const temp = currentVideoRef.current;
    currentVideoRef.current = nextVideoRef.current;
    nextVideoRef.current = temp;
    
    if (currentVideoRef.current) {
      currentVideoRef.current.element.style.opacity = '1';
      currentVideoRef.current.element.muted = true;
      currentVideoRef.current.element.play().catch(() => {
        currentVideoRef.current!.element.muted = true;
        currentVideoRef.current!.element.play().catch(() => {});
      });
      
      return currentVideoRef.current.element;
    }
    
    return null;
  }, [log]);

  const pauseCurrent = useCallback(() => {
    if (currentVideoRef.current) {
      currentVideoRef.current.element.pause();
    }
  }, []);

  const getCurrentElement = useCallback((): HTMLVideoElement | null => {
    return currentVideoRef.current?.element || null;
  }, []);

  const getNextElement = useCallback((): HTMLVideoElement | null => {
    return nextVideoRef.current?.element || null;
  }, []);

  const isNextReady = useCallback((videoId: number): boolean => {
    return nextVideoRef.current?.videoId === videoId && nextVideoRef.current?.isReady === true;
  }, []);

  const getTTFFMetrics = useCallback((): TTFFMetric[] => {
    return [...ttffMetricsRef.current];
  }, []);

  const getAverageTTFF = useCallback((): number => {
    const metrics = ttffMetricsRef.current;
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.ttff, 0);
    return sum / metrics.length;
  }, []);

  const destroy = useCallback(() => {
    if (currentVideoRef.current) {
      if (currentVideoRef.current.hls) {
        currentVideoRef.current.hls.destroy();
      }
      currentVideoRef.current.element.remove();
      currentVideoRef.current = null;
    }
    if (nextVideoRef.current) {
      if (nextVideoRef.current.hls) {
        nextVideoRef.current.hls.destroy();
      }
      nextVideoRef.current.element.remove();
      nextVideoRef.current = null;
    }
    log('Pool destroyed');
  }, [log]);

  const getDebugInfo = useCallback(() => {
    return {
      current: currentVideoRef.current ? {
        videoId: currentVideoRef.current.videoId,
        isReady: currentVideoRef.current.isReady,
        hasHls: !!currentVideoRef.current.hls,
        waitingCount: currentVideoRef.current.waitingCount,
      } : null,
      next: nextVideoRef.current ? {
        videoId: nextVideoRef.current.videoId,
        isReady: nextVideoRef.current.isReady,
        hasHls: !!nextVideoRef.current.hls,
        waitingCount: nextVideoRef.current.waitingCount,
      } : null,
      avgTTFF: getAverageTTFF(),
      metricsCount: ttffMetricsRef.current.length,
    };
  }, [getAverageTTFF]);

  return {
    initPool,
    preloadNext,
    playCurrent,
    swap,
    pauseCurrent,
    getCurrentElement,
    getNextElement,
    isNextReady,
    getTTFFMetrics,
    getAverageTTFF,
    destroy,
    getDebugInfo,
  };
}

export type { VideoInfo, TTFFMetric };
