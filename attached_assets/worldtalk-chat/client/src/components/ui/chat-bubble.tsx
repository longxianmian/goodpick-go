import { useState, useCallback, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatTime, getTranslatedUserName, t } from '@/lib/i18n';
import { Message, User } from '@/types';
import { AudioPlayer } from '@/components/ui/audio-player';
import { ImageViewerModal } from '@/components/ui/image-viewer-modal';
import { MessageContextMenu, OriginalTextModal } from '@/components/ui/message-context-menu';
import { CallRecordCard, parseCallRecordContent } from '@/components/ui/call-record-card';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MessageWithUser extends Message {
  fromUser: User;
}

interface ChatBubbleProps {
  message: MessageWithUser;
  isOwn: boolean;
  showAvatar?: boolean;
  isGroupChat?: boolean;
  className?: string;
  autoPlayAudio?: boolean; // 是否自动播放语音消息
  onAutoPlayComplete?: () => void; // 自动播放完成回调
  onQuote?: (message: MessageWithUser) => void;
  onForward?: (message: MessageWithUser) => void;
  onFavorite?: (message: MessageWithUser) => void;
  onDelete?: (message: MessageWithUser) => void;
  onCallClick?: (callType: 'voice' | 'video') => void;
  onCardClick?: (contactId: string) => void;
}

export function ChatBubble({ 
  message, 
  isOwn, 
  showAvatar = true, 
  isGroupChat = false, 
  className,
  autoPlayAudio = false,
  onAutoPlayComplete,
  onQuote,
  onForward,
  onFavorite,
  onDelete,
  onCallClick,
  onCardClick
}: ChatBubbleProps) {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      // ✅ v1.1策略：复制我看到的文本（原文或翻译）
      let textToCopy = '';
      if (message.messageType === 'audio') {
        textToCopy = isOwn ? message.transcript || '' : (message.translatedTranscript || message.transcript || '');
      } else {
        textToCopy = isOwn ? message.content : (message.translatedText || message.content);
      }
      
      if (!textToCopy) {
        toast({ title: '无法复制', description: '没有可复制的文本', variant: 'destructive' });
        return;
      }
      
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: '已复制到剪贴板' });
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast({ title: '复制失败', variant: 'destructive' });
    }
  }, [message, isOwn, toast]);

  const handleShowOriginal = useCallback(() => {
    setShowOriginalModal(true);
  }, []);

  const handleQuote = useCallback(() => {
    onQuote?.(message);
  }, [message, onQuote]);

  const handleForward = useCallback(() => {
    onForward?.(message);
  }, [message, onForward]);

  const handleFavorite = useCallback(() => {
    onFavorite?.(message);
  }, [message, onFavorite]);

  const handleDelete = useCallback(() => {
    onDelete?.(message);
  }, [message, onDelete]);

  return (
    <div
      className={cn(
        "flex items-start gap-2 message-enter px-1",
        isOwn && "flex-row-reverse",
        className
      )}
      data-testid={`message-${message.id}`}
    >
      {showAvatar && message.fromUser && (
        isOwn ? (
          // 右侧头像（我的消息）- 长按显示信息
          <Popover>
            <PopoverTrigger asChild>
              <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5 cursor-pointer">
                <AvatarImage src={message.fromUser.profileImageUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {message.fromUser.firstName?.[0] || message.fromUser.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent side="left" className="w-auto p-2 text-xs">
              <div className="text-muted-foreground">
                我 · {message.fromUser.languagePreference || 'zh'} · {formatTime(new Date(message.createdAt))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          // 左侧头像（好友消息）- 普通显示
          <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
            <AvatarImage src={message.fromUser.profileImageUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {message.fromUser.firstName?.[0] || message.fromUser.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
        )
      )}

      <div className={cn("flex flex-col", isOwn && "items-end")}>
        {/* 群聊中显示发送者昵称（在头像右边） */}
        {isGroupChat && showAvatar && message.fromUser && !isOwn && (
          <div className="text-xs text-muted-foreground mb-1">
            {message.fromUser.firstName 
              ? getTranslatedUserName(message.fromUser.id, message.fromUser.firstName)
              : message.fromUser.username}
          </div>
        )}

        {/* 所有消息类型都包裹 MessageContextMenu 支持长按菜单 */}
        <MessageContextMenu
          message={message}
          isOwn={isOwn}
          onCopy={handleCopy}
          onForward={handleForward}
          onFavorite={handleFavorite}
          onDelete={handleDelete}
          onShowOriginal={handleShowOriginal}
          onQuote={handleQuote}
        >
          {message.messageType === 'audio' ? (
            // 语音消息 - 支持长按菜单
            <div className={cn(
              "relative",
              isOwn ? "max-w-[calc(100vw-52px)]" : "max-w-[calc(100vw-52px)]"
            )}>
              <div
                className={cn(
                  "rounded-md p-2.5 shadow-sm relative",
                  isOwn
                    ? "message-bubble-self bubble-arrow-right"
                    : "message-bubble-other bubble-arrow-left"
                )}
                data-testid={`audio-${message.id}`}
              >
                <AudioPlayer 
                  audioUrl={message.mediaUrl || ''} 
                  isOwn={isOwn}
                  translatedAudioUrl={message.ttsAudioUrl}
                  initialDuration={message.mediaDuration}
                  autoPlay={autoPlayAudio}
                  onPlayEnd={onAutoPlayComplete}
                />
              </div>
            </div>
          ) : message.messageType === 'sticker' ? (
            // 表情包消息 - 无背景，保持原样
            <div 
              className="w-20 h-20 flex items-center justify-center text-4xl"
              data-testid={`sticker-${message.id}`}
            >
              {message.content}
            </div>
          ) : message.messageType === 'image' ? (
            // 图片消息 - 显示缩略图，点击查看全尺寸
            <div className={cn(
              "relative rounded-lg overflow-hidden",
              "max-w-[280px]"
            )}>
              <img
                src={message.mediaMetadata?.thumbnailUrl || message.metadata?.thumbnailUrl || message.content}
                alt="Shared image"
                className="w-full h-auto max-h-[400px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setShowImageViewer(true)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage failed%3C/text%3E%3C/svg%3E';
                }}
                loading="lazy"
                data-testid={`image-${message.id}`}
              />
            </div>
          ) : message.messageType === 'video' ? (
            // 视频消息 - 显示视频播放器
            <div className={cn(
              "relative rounded-lg overflow-hidden",
              "max-w-[280px]"
            )}>
              <video
                src={message.mediaUrl || message.content}
                controls
                className="w-full h-auto max-h-[400px] object-contain"
                preload="metadata"
                data-testid={`video-${message.id}`}
              >
                您的浏览器不支持视频播放
              </video>
            </div>
          ) : message.messageType === 'file' ? (
          // 文件消息 - 显示文件卡片
          (() => {
            const meta = message.mediaMetadata || message.metadata || {};
            const fileName = (meta as any).fileName || message.content?.replace('[文件] ', '') || '未知文件';
            const fileSize = (meta as any).fileSize;
            const fileType = (meta as any).fileType || fileName.split('.').pop()?.toLowerCase() || '';
            const fileTypeName = (meta as any).fileTypeName || `${fileType.toUpperCase()}文件`;
            const fileUrl = message.mediaUrl || (meta as any).fileUrl;
            
            // 文件图标颜色
            const getFileColor = (ext: string) => {
              const colors: Record<string, string> = {
                'pdf': 'text-red-500',
                'doc': 'text-blue-500', 'docx': 'text-blue-500',
                'xls': 'text-green-500', 'xlsx': 'text-green-500',
                'ppt': 'text-orange-500', 'pptx': 'text-orange-500',
                'zip': 'text-yellow-500', 'rar': 'text-yellow-500', '7z': 'text-yellow-500',
                'mp3': 'text-purple-500', 'wav': 'text-purple-500', 'm4a': 'text-purple-500',
                'mp4': 'text-pink-500', 'mov': 'text-pink-500', 'avi': 'text-pink-500',
                'txt': 'text-gray-500', 'md': 'text-gray-500',
              };
              return colors[ext] || 'text-slate-400';
            };
            
            // 格式化文件大小
            const formatSize = (bytes: number) => {
              if (!bytes) return '';
              if (bytes < 1024) return `${bytes}B`;
              if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
              return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
            };
            
            return (
              <div className={cn(
                "relative",
                isOwn ? "max-w-[calc(100vw-52px)]" : "max-w-[calc(100vw-52px)]"
              )}>
                <div
                  className={cn(
                    "rounded-md p-3 shadow-sm relative",
                    isOwn
                      ? "message-bubble-self bubble-arrow-right"
                      : "message-bubble-other bubble-arrow-left"
                  )}
                  data-testid={`file-${message.id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* 文件图标 */}
                    <div className={cn("w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0", getFileColor(fileType))}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{fileName}</p>
                      <p className="text-xs opacity-60">
                        {fileTypeName}
                        {fileSize ? ` · ${formatSize(fileSize)}` : ''}
                      </p>
                    </div>
                  </div>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1 text-xs py-1.5 px-3 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      data-testid={`file-download-${message.id}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      下载文件
                    </a>
                  )}
                </div>
              </div>
            );
          })()
        ) : message.messageType === 'call' ? (
          // 通话记录消息 - 显示通话卡片
          (() => {
            const callData = parseCallRecordContent(message.content);
            if (!callData) return null;
            return (
              <div className="max-w-[280px]">
                <CallRecordCard 
                  data={callData}
                  timestamp={new Date(message.createdAt)}
                  isFromMe={isOwn}
                  onCallClick={onCallClick}
                />
              </div>
            );
          })()
        ) : message.messageType === 'location' ? (
          // 位置消息 - LINE/微信标准地图卡片样式
          <LocationMapCard message={message} isOwn={isOwn} />
        ) : message.messageType === 'card' ? (
          // 名片消息 - 展示联系人卡片
          (() => {
            const cardMeta = message.metadata;
            let contactInfo;
            
            // 尝试从 metadata 解析名片信息
            if (cardMeta?.contactId) {
              contactInfo = {
                id: cardMeta.contactId,
                username: cardMeta.contactUsername || '',
                name: cardMeta.contactName || cardMeta.contactUsername || '',
                avatar: cardMeta.contactAvatar
              };
            } else {
              // 尝试从 content 解析 JSON 格式
              try {
                const parsed = JSON.parse(message.content);
                contactInfo = {
                  id: parsed.contactId || '',
                  username: parsed.contactUsername || '',
                  name: parsed.contactName || parsed.contactUsername || '',
                  avatar: parsed.contactAvatar
                };
              } catch {
                // 旧格式：纯文本名片
                contactInfo = { id: '', username: '', name: message.content, avatar: null };
              }
            }
            
            return (
              <div 
                className={cn(
                  "rounded-lg overflow-hidden w-[240px] cursor-pointer hover:opacity-90 transition-opacity",
                  isOwn ? "message-bubble-self" : "message-bubble-other"
                )}
                onClick={() => contactInfo.id && onCardClick?.(contactInfo.id)}
              >
                {/* 名片头部 */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/20 flex items-center justify-center overflow-hidden">
                      {contactInfo.avatar ? (
                        <img src={contactInfo.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-lg font-medium">
                          {contactInfo.name?.[0] || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-lg">{contactInfo.name}</div>
                      {contactInfo.username && (
                        <div className="text-white/70 text-sm">@{contactInfo.username}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 名片底部 */}
                <div className="bg-slate-700/50 px-4 py-2">
                  <span className="text-xs text-slate-400">{t('businessCard')}</span>
                </div>
              </div>
            );
          })()
        ) : (
          // 文本消息 - 微信风格带尖头的气泡
          <div className={cn(
            "relative",
            isOwn ? "max-w-[calc(100vw-52px)]" : "max-w-[calc(100vw-52px)]"
          )}>
            <div
              className={cn(
                "rounded-md p-3 shadow-sm relative",
                isOwn
                  ? "message-bubble-self bubble-arrow-right"
                  : "message-bubble-other bubble-arrow-left"
              )}
            >
              {/* ✅ v1.1策略：我看原文，对方看翻译
                  - 如果是我发送的消息（isOwn=true），显示原文content
                  - 如果是别人发送的（isOwn=false），显示翻译translatedText
              */}
              <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere">
                {isOwn ? message.content : (message.translatedText || message.content)}
              </p>

              {/* 引用回复的消息 - 放在新消息内容下方显示 */}
              {message.replyToMessage && (
                <div className="mt-2 px-2 py-1.5 bg-black/20 rounded border-l-2 border-primary/60">
                  <p className="text-xs text-primary/80 mb-0.5">
                    {message.replyToMessage.fromUser?.firstName || 
                     message.replyToMessage.fromUser?.username || 
                     ''}
                  </p>
                  <p className="text-xs opacity-70 line-clamp-2">
                    {message.replyToMessage.messageType === 'image' ? '[图片]' :
                     message.replyToMessage.messageType === 'video' ? '[视频]' :
                     message.replyToMessage.messageType === 'audio' ? '[语音]' :
                     message.replyToMessage.messageType === 'file' ? '[文件]' :
                     message.replyToMessage.messageType === 'location' ? '[位置]' :
                     message.replyToMessage.messageType === 'card' ? '[名片]' :
                     message.replyToMessage.messageType === 'sticker' ? '[表情]' :
                     message.replyToMessage.content || ''}
                  </p>
                </div>
              )}

              {/* 翻译错误提示 */}
              {message.translationError && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <p className="text-xs opacity-70 italic">
                    Translation unavailable
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        </MessageContextMenu>

        {/* 时间戳 - 右侧（我的消息）默认不显示，只有左侧（好友）显示 */}
        {!isOwn && (
          <div className="text-[11px] text-muted-foreground mt-1 px-1 text-left">
            {formatTime(new Date(message.createdAt))}
          </div>
        )}
      </div>

      {/* 图片查看器 */}
      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        thumbnailUrl={message.mediaMetadata?.thumbnailUrl || message.metadata?.thumbnailUrl || message.content}
        fullUrl={message.mediaMetadata?.fullUrl || message.metadata?.fullUrl || message.content}
        alt="Shared image"
      />

      {/* 原文查看弹窗 - 区分文本消息和语音消息 */}
      <OriginalTextModal
        isOpen={showOriginalModal}
        onClose={() => setShowOriginalModal(false)}
        originalText={message.messageType === 'audio' ? (message.transcript || '') : (message.originalText || message.content)}
        translatedText={message.messageType === 'audio' ? (message.translatedTranscript || '') : (message.translatedText || message.content)}
      />
    </div>
  );
}

function LocationMapCard({ message, isOwn }: { message: MessageWithUser; isOwn: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const locationMeta = message.mediaMetadata || message.metadata;
  let lat = (locationMeta as any)?.latitude;
  let lng = (locationMeta as any)?.longitude;
  let title = (locationMeta as any)?.title || (locationMeta as any)?.address || '位置';
  
  if ((!lat || !lng) && message.content) {
    const latMatch = message.content.match(/纬度[：:]\s*([\d.-]+)/);
    const lngMatch = message.content.match(/经度[：:]\s*([\d.-]+)/);
    if (latMatch && lngMatch) {
      lat = parseFloat(latMatch[1]);
      lng = parseFloat(lngMatch[1]);
    }
  }
  
  const googleMapsUrl = lat && lng 
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;
  
  const coordsDisplay = lat && lng ? `${lat}, ${lng}` : null;
  
  useEffect(() => {
    if (!mapContainerRef.current || !lat || !lng || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    
    L.marker([lat, lng], { icon: redIcon }).addTo(map);
    
    mapRef.current = map;
    setMapReady(true);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);
  
  return (
    <div 
      className="relative cursor-pointer max-w-[280px]"
      onClick={() => googleMapsUrl && window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}
      data-testid={`location-${message.id}`}
    >
      <div className={cn(
        "rounded-lg overflow-hidden shadow-sm",
        isOwn ? "message-bubble-self" : "message-bubble-other"
      )}>
        <div className="relative w-[280px] h-[150px] bg-gradient-to-br from-blue-100 to-green-100 dark:from-slate-700 dark:to-slate-600">
          {lat && lng ? (
            <>
              <div 
                ref={mapContainerRef} 
                className="w-full h-full"
                style={{ zIndex: 0 }}
              />
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100 dark:from-slate-700 dark:to-slate-600">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-red-500 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-500 mt-1">加载中...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-10 h-10 text-red-500 drop-shadow-lg" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-slate-800/90 rounded-full p-2 shadow z-10">
            <Navigation className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>
        </div>
        
        <div className="p-3 bg-white dark:bg-slate-800">
          <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
            {title}
          </p>
          {coordsDisplay && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {coordsDisplay}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-emerald-600 dark:text-emerald-400">
            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <MapPin className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs">{t('clickToOpenMaps')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
