import { useRef, useEffect, useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Music2, UserCircle, Bookmark, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  createdAt: string;
  creatorUserId: number;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  storeId?: number | null;
  campaignId?: number | null;
  isLiked?: boolean;
}

interface VideoCardProps {
  video: ShortVideoData;
  isActive: boolean;
  onLike?: (videoId: number) => void;
  onComment?: (videoId: number) => void;
  onShare?: (videoId: number) => void;
  onUserClick?: (userId: number) => void;
}

export function VideoCard({ 
  video, 
  isActive, 
  onLike, 
  onComment, 
  onShare,
  onUserClick 
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [liked, setLiked] = useState(video.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(video.likeCount);
  
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isActive) {
      videoEl.play().then(() => {
        setIsPlaying(true);
        setShowPlayButton(false);
      }).catch(() => {
        setIsPlaying(false);
        setShowPlayButton(true);
      });
    } else {
      videoEl.pause();
      videoEl.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive]);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoError(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
    setShowPlayButton(true);
  }, []);

  const togglePlay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
      setIsPlaying(false);
      setShowPlayButton(true);
    } else {
      videoEl.play().then(() => {
        setIsPlaying(true);
        setShowPlayButton(false);
      }).catch(() => {});
    }
  }, [isPlaying]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    videoEl.muted = !videoEl.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleTimeUpdate = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.duration) return;
    setProgress((videoEl.currentTime / videoEl.duration) * 100);
  }, []);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(video.id);
  }, [liked, video.id, onLike]);

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
    <div className="relative h-full w-full bg-black" onClick={togglePlay}>
      {video.coverImageUrl && (
        <img
          src={video.coverImageUrl}
          alt={video.title || 'Video cover'}
          className={`absolute inset-0 h-full w-full object-contain z-0 transition-opacity duration-300 ${
            videoLoaded && isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.coverImageUrl || undefined}
        className={`absolute inset-0 h-full w-full object-contain z-10 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        data-testid={`video-player-${video.id}`}
      />

      {(showPlayButton && !isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      )}

      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
          <div 
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="absolute bottom-20 left-4 right-16 text-white z-30">
        <div 
          className="flex items-center gap-3 mb-3"
          onClick={(e) => {
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

      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-30">
        <button
          className="flex flex-col items-center gap-1"
          onClick={handleLike}
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
          onClick={(e) => { e.stopPropagation(); onComment?.(video.id); }}
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
          onClick={(e) => { e.stopPropagation(); }}
          data-testid={`button-bookmark-${video.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(Math.floor(video.shareCount / 2))}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onClick={(e) => { e.stopPropagation(); onShare?.(video.id); }}
          data-testid={`button-share-${video.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(video.shareCount)}
          </span>
        </button>

        <button
          className="mt-2"
          onClick={toggleMute}
          data-testid={`button-mute-${video.id}`}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
