import Hls from 'hls.js';

interface PreloadedVideo {
  videoElement: HTMLVideoElement;
  hls: Hls | null;
  videoUrl: string;
  hlsUrl: string | null;
  isReady: boolean;
  bufferedSeconds: number;
  loadStartTime: number;
}

interface VideoInfo {
  id: number;
  videoUrl: string;
  hlsUrl?: string | null;
}

const DEBUG_KEY = 'debugVideo';

class VideoPreloader {
  private cache = new Map<number, PreloadedVideo>();
  private maxCacheSize = 3;
  private debugMode = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      this.debugMode = params.get(DEBUG_KEY) === '1';
    }
  }

  private log(...args: any[]) {
    if (this.debugMode) {
      console.log('[VideoPreloader]', ...args);
    }
  }

  preload(video: VideoInfo): void {
    if (this.cache.has(video.id)) {
      this.log(`Video ${video.id} already preloading/cached`);
      return;
    }

    this.log(`Starting preload for video ${video.id}`);
    const loadStartTime = performance.now();

    const videoEl = document.createElement('video');
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';
    videoEl.style.position = 'absolute';
    videoEl.style.left = '-9999px';
    videoEl.style.width = '1px';
    videoEl.style.height = '1px';
    document.body.appendChild(videoEl);

    const preloaded: PreloadedVideo = {
      videoElement: videoEl,
      hls: null,
      videoUrl: video.videoUrl,
      hlsUrl: video.hlsUrl || null,
      isReady: false,
      bufferedSeconds: 0,
      loadStartTime,
    };

    const hlsSource = video.hlsUrl;
    const isHlsSource = hlsSource && (hlsSource.includes('.m3u8') || hlsSource.includes('hls/sign'));

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 5,
        maxMaxBufferLength: 10,
        startLevel: 0,
      });

      hls.loadSource(hlsSource);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        preloaded.isReady = true;
        this.log(`Video ${video.id} HLS manifest parsed in ${(performance.now() - loadStartTime).toFixed(0)}ms`);
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (videoEl.buffered.length > 0) {
          preloaded.bufferedSeconds = videoEl.buffered.end(0);
          this.log(`Video ${video.id} buffered ${preloaded.bufferedSeconds.toFixed(1)}s`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          this.log(`Video ${video.id} HLS error, falling back to MP4`);
          hls.destroy();
          preloaded.hls = null;
          videoEl.src = video.videoUrl;
        }
      });

      preloaded.hls = hls;
    } else if (isHlsSource && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = hlsSource;
      videoEl.addEventListener('loadeddata', () => {
        preloaded.isReady = true;
        this.log(`Video ${video.id} native HLS ready in ${(performance.now() - loadStartTime).toFixed(0)}ms`);
      }, { once: true });
    } else {
      videoEl.src = video.videoUrl;
      videoEl.addEventListener('loadeddata', () => {
        preloaded.isReady = true;
        this.log(`Video ${video.id} MP4 ready in ${(performance.now() - loadStartTime).toFixed(0)}ms`);
      }, { once: true });
    }

    videoEl.addEventListener('progress', () => {
      if (videoEl.buffered.length > 0) {
        preloaded.bufferedSeconds = videoEl.buffered.end(videoEl.buffered.length - 1);
      }
    });

    this.cache.set(video.id, preloaded);
    this.cleanup();
  }

  getPreloaded(videoId: number): PreloadedVideo | null {
    return this.cache.get(videoId) || null;
  }

  transferToElement(videoId: number, targetVideoEl: HTMLVideoElement): { hls: Hls | null; firstFrameTime: number } | null {
    const preloaded = this.cache.get(videoId);
    if (!preloaded) return null;

    const firstFrameTime = performance.now() - preloaded.loadStartTime;
    this.log(`Transferring video ${videoId} to player, preload time: ${firstFrameTime.toFixed(0)}ms`);

    if (preloaded.hls) {
      preloaded.hls.detachMedia();
      preloaded.hls.attachMedia(targetVideoEl);
      
      const hls = preloaded.hls;
      preloaded.hls = null;
      
      this.removeFromCache(videoId, false);
      
      return { hls, firstFrameTime };
    } else {
      const src = preloaded.hlsUrl || preloaded.videoUrl;
      targetVideoEl.src = src;
      
      this.removeFromCache(videoId, true);
      
      return { hls: null, firstFrameTime };
    }
  }

  private removeFromCache(videoId: number, destroy: boolean) {
    const preloaded = this.cache.get(videoId);
    if (!preloaded) return;

    if (destroy) {
      if (preloaded.hls) {
        preloaded.hls.destroy();
      }
      preloaded.videoElement.src = '';
      preloaded.videoElement.load();
      preloaded.videoElement.remove();
    } else {
      preloaded.videoElement.remove();
    }

    this.cache.delete(videoId);
  }

  private cleanup() {
    if (this.cache.size <= this.maxCacheSize) return;

    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    
    for (const [id] of toRemove) {
      this.log(`Cleaning up old preload: video ${id}`);
      this.removeFromCache(id, true);
    }
  }

  releaseExcept(keepIds: number[]) {
    const idsToRemove: number[] = [];
    
    this.cache.forEach((_, id) => {
      if (!keepIds.includes(id)) {
        idsToRemove.push(id);
      }
    });

    for (const id of idsToRemove) {
      this.log(`Releasing video ${id}`);
      this.removeFromCache(id, true);
    }
  }

  getDebugInfo(): { id: number; isReady: boolean; bufferedSeconds: number }[] {
    const info: { id: number; isReady: boolean; bufferedSeconds: number }[] = [];
    this.cache.forEach((preloaded, id) => {
      info.push({
        id,
        isReady: preloaded.isReady,
        bufferedSeconds: preloaded.bufferedSeconds,
      });
    });
    return info;
  }

  destroy() {
    this.cache.forEach((_, id) => {
      this.removeFromCache(id, true);
    });
  }
}

export const videoPreloader = new VideoPreloader();
export type { VideoInfo, PreloadedVideo };
