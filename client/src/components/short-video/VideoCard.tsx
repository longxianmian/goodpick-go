import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Heart, MessageCircle, Share2, Music2, UserCircle, Bookmark, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { videoPreloader } from '@/lib/videoPreloader';
import { recordVideoMetrics, getVideoConfig, VideoMetrics } from '@/lib/videoConfig';

export interface ShortVideoData {
  id: number;
  videoUrl: string;
  hlsUrl?: string | null;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  title?: string | null;
  description?: string | null;
  hashtags?: string[] | null;
  locationName?: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount?: number;
  createdAt: string;
  creatorUserId: number;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  storeId?: number | null;
  campaignId?: number | null;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface VideoCardProps {
  video: ShortVideoData;
  isActive: boolean;
  shouldAttemptUnmute?: boolean;
  onLike?: (videoId: number) => void;
  onComment?: (videoId: number) => void;
  onShare?: (videoId: number) => void;
  onBookmark?: (videoId: number) => void;
  onUserClick?: (userId: number) => void;
  onProgress?: (videoId: number, progress: number) => void;
  onFirstFrame?: (videoId: number, ttff: number) => void;
}

export function VideoCard({ 
  video, 
  isActive, 
  shouldAttemptUnmute = false,
  onLike, 
  onComment, 
  onShare,
  onBookmark,
  onUserClick,
  onProgress,
  onFirstFrame,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadStartTimeRef = useRef<number>(0);
  const canplayTimeRef = useRef<number>(0);
  const waitingCountRef = useRef<number>(0);
  const firstFrameTriggeredRef = useRef<boolean>(false);
  const metricsRecordedRef = useRef<boolean>(false);
  const progressTriggeredRef = useRef<Set<number>>(new Set());
  const sourceTypeRef = useRef<'hls' | 'mp4' | 'native-hls'>('mp4');
  const preloadedRef = useRef<boolean>(false);
  const config = getVideoConfig();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [liked, setLiked] = useState(video.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(video.likeCount);
  const [bookmarked, setBookmarked] = useState(video.isBookmarked ?? false);
  const [bookmarkCount, setBookmarkCount] = useState(video.bookmarkCount ?? 0);
  const [usingHls, setUsingHls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    loadStartTimeRef.current = performance.now();
    canplayTimeRef.current = 0;
    waitingCountRef.current = 0;
    firstFrameTriggeredRef.current = false;
    metricsRecordedRef.current = false;
    progressTriggeredRef.current.clear();
    preloadedRef.current = false;

    const preloaded = videoPreloader.transferToElement(video.id, videoEl);
    
    if (preloaded) {
      preloadedRef.current = true;
      if (preloaded.hls) {
        hlsRef.current = preloaded.hls;
        setUsingHls(true);
        setVideoLoaded(true);
        sourceTypeRef.current = 'hls';
        if (config.debugMode) {
          console.log(`[VideoCard] Video ${video.id}: Using preloaded HLS, first frame in ${preloaded.firstFrameTime.toFixed(0)}ms`);
        }
      } else {
        setUsingHls(video.hlsUrl ? true : false);
        setVideoLoaded(true);
        sourceTypeRef.current = video.hlsUrl ? 'native-hls' : 'mp4';
        if (config.debugMode) {
          console.log(`[VideoCard] Video ${video.id}: Using preloaded source, first frame in ${preloaded.firstFrameTime.toFixed(0)}ms`);
        }
      }
      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    const hlsSource = video.hlsUrl;
    const isHlsSource = hlsSource && (hlsSource.includes('.m3u8') || hlsSource.includes('hls/sign'));

    if (isHlsSource && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 15,
        maxMaxBufferLength: 60,
        startLevel: -1,
      });

      hls.loadSource(hlsSource);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setVideoLoaded(true);
        setUsingHls(true);
        sourceTypeRef.current = 'hls';
        if (config.debugMode) {
          console.log(`[HLS] Video ${video.id}: Manifest parsed, ready to play`);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn(`[HLS] Video ${video.id} Error:`, data.type, data.details);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log(`[HLS] Video ${video.id}: Network error, trying to recover`);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log(`[HLS] Video ${video.id}: Media error, trying to recover`);
              hls.recoverMediaError();
              break;
            default:
              console.log(`[HLS] Video ${video.id}: Fatal error, falling back to MP4`);
              hls.destroy();
              hlsRef.current = null;
              videoEl.src = video.videoUrl;
              setUsingHls(false);
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setVideoLoaded(true);
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (isHlsSource && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = hlsSource;
      setUsingHls(true);
      console.log(`[HLS] Video ${video.id}: Using native HLS support (Safari)`);
    } else {
      videoEl.src = video.videoUrl;
      setUsingHls(false);
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.hlsUrl, video.videoUrl, video.id]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isActive) {
      const attemptUnmute = shouldAttemptUnmute;
      videoEl.muted = !attemptUnmute;
      setIsMuted(!attemptUnmute);
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(() => {
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().then(() => {
            setIsPlaying(true);
          }).catch(() => {
            setIsPlaying(false);
          });
        });
      }
    } else {
      videoEl.pause();
      videoEl.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, shouldAttemptUnmute]);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoError(false);
  }, []);

  const handleCanplay = useCallback(() => {
    if (canplayTimeRef.current === 0) {
      canplayTimeRef.current = performance.now();
    }
  }, []);

  const handleWaiting = useCallback(() => {
    waitingCountRef.current++;
    if (config.debugMode) {
      console.log(`[VideoCard] Video ${video.id}: waiting event (count: ${waitingCountRef.current})`);
    }
  }, [video.id, config.debugMode]);

  const recordFinalMetrics = useCallback(() => {
    if (metricsRecordedRef.current) return;
    metricsRecordedRef.current = true;
    
    const videoEl = videoRef.current;
    let droppedFrames = 0;
    if (videoEl && (videoEl as any).getVideoPlaybackQuality) {
      const quality = (videoEl as any).getVideoPlaybackQuality();
      droppedFrames = quality.droppedVideoFrames || 0;
    }
    
    const firstFrameMs = performance.now() - loadStartTimeRef.current;
    const canplayMs = canplayTimeRef.current > 0 
      ? canplayTimeRef.current - loadStartTimeRef.current 
      : firstFrameMs;
    
    const metrics: VideoMetrics = {
      videoId: video.id,
      firstFrameMs,
      canplayMs,
      waitingCount: waitingCountRef.current,
      droppedFrames,
      source: sourceTypeRef.current,
      preloaded: preloadedRef.current,
      timestamp: Date.now(),
    };
    
    recordVideoMetrics(metrics);
  }, [video.id]);

  const handleVideoError = useCallback(() => {
    if (usingHls && hlsRef.current) {
      return;
    }
    setVideoError(true);
  }, [usingHls]);

  const handleVideoAreaTap = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isMuted && isPlaying) {
      videoEl.muted = false;
      setIsMuted(false);
      return;
    }

    if (isPlaying) {
      videoEl.pause();
      setIsPlaying(false);
    } else {
      videoEl.muted = false;
      setIsMuted(false);
      videoEl.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        videoEl.muted = true;
        setIsMuted(true);
        videoEl.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      });
    }
  }, [isPlaying, isMuted]);

  const handleTimeUpdate = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.duration) return;
    const currentProgress = (videoEl.currentTime / videoEl.duration) * 100;
    setProgress(currentProgress);
    
    if (!firstFrameTriggeredRef.current && videoEl.currentTime > 0) {
      firstFrameTriggeredRef.current = true;
      const ttff = performance.now() - loadStartTimeRef.current;
      if (config.debugMode) {
        console.log(`[VideoCard] Video ${video.id}: First frame in ${ttff.toFixed(0)}ms`);
      }
      onFirstFrame?.(video.id, ttff);
      recordFinalMetrics();
    }
    
    const thresholds = [25, 50, 75];
    for (const threshold of thresholds) {
      if (currentProgress >= threshold && !progressTriggeredRef.current.has(threshold)) {
        progressTriggeredRef.current.add(threshold);
        onProgress?.(video.id, threshold);
      }
    }
  }, [video.id, onProgress, onFirstFrame, config.debugMode, recordFinalMetrics]);

  const handleLike = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(video.id);
  }, [liked, video.id, onLike]);

  const handleBookmark = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    setBookmarkCount(prev => bookmarked ? prev - 1 : prev + 1);
    onBookmark?.(video.id);
  }, [bookmarked, video.id, onBookmark]);

  const formatCount = (count: number): string => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + 'w';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <div 
      className="relative h-full w-full bg-black"
      onPointerUp={handleVideoAreaTap}
    >
      {video.coverImageUrl && (
        <img
          src={video.coverImageUrl}
          alt={video.title || 'Video cover'}
          className={`absolute inset-0 h-full w-full object-cover z-0 transition-opacity duration-300 ${
            videoLoaded && isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      
      <video
        ref={videoRef}
        poster={video.coverImageUrl || undefined}
        className={`absolute inset-0 h-full w-full object-cover z-10 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={handleVideoLoaded}
        onCanPlay={handleCanplay}
        onWaiting={handleWaiting}
        onError={handleVideoError}
        data-testid={`video-player-${video.id}`}
      />

      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}


      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-30">
        <div 
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div 
        className="absolute left-4 right-16 text-white z-30"
        style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div 
          className="flex items-center gap-3 mb-3"
          onPointerUp={(e) => {
            e.stopPropagation();
            onUserClick?.(video.creatorUserId);
          }}
        >
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={video.creatorAvatar || undefined} />
            <AvatarFallback>
              <UserCircle className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm drop-shadow-lg">
            @{video.creatorName || 'Anonymous'}
          </span>
        </div>

        {video.description && (
          <p className="text-sm mb-2 drop-shadow-lg line-clamp-2">
            {video.description}
          </p>
        )}

        {video.hashtags && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {video.hashtags.slice(0, 3).map((tag, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="bg-white/20 text-white text-xs"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {video.locationName && (
          <div className="flex items-center gap-1 text-xs text-white/80 mb-2">
            <Music2 className="w-3 h-3" />
            <span className="truncate">{video.locationName}</span>
          </div>
        )}
      </div>

      <div 
        className="absolute right-3 flex flex-col items-center gap-5 z-30"
        style={{ bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', paddingRight: 'env(safe-area-inset-right, 0px)' }}
      >
        <button
          className="flex flex-col items-center gap-1"
          onPointerUp={handleLike}
          data-testid={`button-like-${video.id}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liked ? 'bg-red-500' : 'bg-white/20'} backdrop-blur`}>
            <Heart className={`w-5 h-5 ${liked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(likeCount)}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onPointerUp={(e) => { e.stopPropagation(); onComment?.(video.id); }}
          data-testid={`button-comment-${video.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(video.commentCount)}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onPointerUp={handleBookmark}
          data-testid={`button-bookmark-${video.id}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bookmarked ? 'bg-yellow-500' : 'bg-white/20'} backdrop-blur`}>
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(bookmarkCount)}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onPointerUp={(e) => { e.stopPropagation(); onShare?.(video.id); }}
          data-testid={`button-share-${video.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(video.shareCount)}
          </span>
        </button>
      </div>
    </div>
  );
}
