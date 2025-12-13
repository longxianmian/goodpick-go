import { useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';

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
}

interface TTFFMetric {
  videoId: number;
  ttff: number;
  source: 'hls' | 'mp4' | 'native-hls';
  preloaded: boolean;
}

const DEBUG_KEY = 'debugVideo';

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
  const debugMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get(DEBUG_KEY) === '1';
  const isMobileDevice = isMobile();
  const ttffMetricsRef = useRef<TTFFMetric[]>([]);

  const log = useCallback((...args: any[]) => {
    if (debugMode) {
      console.log('[VideoPool]', ...args);
    }
  }, [debugMode]);

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
    };
  }, []);

  const loadVideo = useCallback((pooled: PooledVideo, video: VideoInfo, isPreload: boolean = false): void => {
    const { element } = pooled;
    
    if (pooled.hls) {
      pooled.hls.destroy();
      pooled.hls = null;
    }
    
    pooled.videoId = video.id;
    pooled.isReady = false;
    pooled.loadStartTime = performance.now();
    
    const hlsSource = video.hlsUrl;
    const isHlsSource = hlsSource && (hlsSource.includes('.m3u8') || hlsSource.includes('hls/sign'));
    
    if (isMobileDevice) {
      element.src = video.videoUrl;
      element.addEventListener('loadeddata', () => {
        pooled.isReady = true;
        const ttff = performance.now() - pooled.loadStartTime;
        log(`Video ${video.id} ready in ${ttff.toFixed(0)}ms (mobile MP4, preload: ${isPreload})`);
        ttffMetricsRef.current.push({
          videoId: video.id,
          ttff,
          source: 'mp4',
          preloaded: isPreload,
        });
      }, { once: true });
    } else if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG);
      hls.loadSource(hlsSource);
      hls.attachMedia(element);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        pooled.isReady = true;
        const ttff = performance.now() - pooled.loadStartTime;
        log(`Video ${video.id} HLS ready in ${ttff.toFixed(0)}ms (preload: ${isPreload})`);
        ttffMetricsRef.current.push({
          videoId: video.id,
          ttff,
          source: 'hls',
          preloaded: isPreload,
        });
      });
      
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          log(`Video ${video.id} HLS error, falling back to MP4`);
          hls.destroy();
          pooled.hls = null;
          element.src = video.videoUrl;
          element.addEventListener('loadeddata', () => {
            pooled.isReady = true;
            const ttff = performance.now() - pooled.loadStartTime;
            log(`Video ${video.id} MP4 fallback ready in ${ttff.toFixed(0)}ms (preload: ${isPreload})`);
            ttffMetricsRef.current.push({
              videoId: video.id,
              ttff,
              source: 'mp4',
              preloaded: isPreload,
            });
          }, { once: true });
        }
      });
      
      pooled.hls = hls;
    } else if (isHlsSource && element.canPlayType('application/vnd.apple.mpegurl')) {
      element.src = hlsSource;
      element.addEventListener('loadeddata', () => {
        pooled.isReady = true;
        const ttff = performance.now() - pooled.loadStartTime;
        log(`Video ${video.id} native HLS ready in ${ttff.toFixed(0)}ms (preload: ${isPreload})`);
        ttffMetricsRef.current.push({
          videoId: video.id,
          ttff,
          source: 'native-hls',
          preloaded: isPreload,
        });
      }, { once: true });
    } else {
      element.src = video.videoUrl;
      element.addEventListener('loadeddata', () => {
        pooled.isReady = true;
        const ttff = performance.now() - pooled.loadStartTime;
        log(`Video ${video.id} MP4 ready in ${ttff.toFixed(0)}ms (preload: ${isPreload})`);
        ttffMetricsRef.current.push({
          videoId: video.id,
          ttff,
          source: 'mp4',
          preloaded: isPreload,
        });
      }, { once: true });
    }
  }, [isMobileDevice, log]);

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
      } : null,
      next: nextVideoRef.current ? {
        videoId: nextVideoRef.current.videoId,
        isReady: nextVideoRef.current.isReady,
        hasHls: !!nextVideoRef.current.hls,
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
