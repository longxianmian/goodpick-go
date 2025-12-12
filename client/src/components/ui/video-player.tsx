import { useState, useRef, useCallback, useEffect, type MouseEvent } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Maximize, 
  Minimize,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  hlsSrc?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  onError?: () => void;
}

export function VideoPlayer({
  src,
  hlsSrc,
  poster,
  className,
  autoPlay = false,
  loop = false,
  onEnded,
  onError
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [usingHls, setUsingHls] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideControlsWithDelay = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControlsWithDelay();
  }, [hideControlsWithDelay]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      hideControlsWithDelay();
    } else {
      setShowControls(true);
    }
  }, [isPlaying, hideControlsWithDelay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoSource = hlsSrc || src;
    const isHlsSource = videoSource.includes('.m3u8') || videoSource.includes('hls/sign');

    if (isHlsSource && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1,
      });

      hls.loadSource(videoSource);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setUsingHls(true);
        console.log('[HLS] Manifest parsed, ready to play');
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[HLS] Error:', data.type, data.details);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HLS] Fatal network error, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS] Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.log('[HLS] Fatal error, falling back to direct source');
              hls.destroy();
              video.src = src;
              setUsingHls(false);
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsLoading(false);
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (isHlsSource && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSource;
      setUsingHls(true);
      console.log('[HLS] Using native HLS support (Safari)');
    } else {
      video.src = src;
      setUsingHls(false);
    }
  }, [src, hlsSrc, autoPlay]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isEnded) {
      video.currentTime = 0;
      setIsEnded(false);
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [isPlaying, isEnded]);


  const toggleFullscreen = useCallback(async (e: MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setIsLoading(false);
  }, []);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    setBuffered((bufferedEnd / video.duration) * 100);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setIsEnded(true);
    setShowControls(true);
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    if (usingHls && hlsRef.current) {
      return;
    }
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError, usingHls]);

  const handleProgressClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    video.currentTime = clickPosition * video.duration;
  }, []);

  const handleReplay = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = 0;
    setIsEnded(false);
    video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {});
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className={cn("relative bg-black flex items-center justify-center", className)}>
        <div className="text-white text-center p-4">
          <p className="text-sm text-muted-foreground">视频加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black overflow-hidden group",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      onClick={togglePlay}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
    >
      {poster && isLoading && (
        <img 
          src={poster} 
          alt="Video poster"
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        muted={isMuted}
        loop={loop}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        data-testid="video-player"
      />

      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {(!isPlaying || showControls) && !isLoading && (
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {isEnded ? (
            <button
              onClick={handleReplay}
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
              data-testid="button-replay"
            >
              <RotateCcw className="w-8 h-8 text-white" />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
          )}
        </div>
      )}

      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          ref={progressRef}
          className="relative h-1 bg-white/30 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute h-full bg-white/50 rounded-full"
            style={{ width: `${buffered}%` }}
          />
          <div 
            className="absolute h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute w-3 h-3 bg-white rounded-full -top-1 transform -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white"
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <span className="text-white text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white"
            data-testid="button-fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
