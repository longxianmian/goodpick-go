import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Copy, 
  Forward, 
  Star, 
  Trash2, 
  Languages, 
  Reply,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, User } from '@/types';

interface MessageWithUser extends Message {
  fromUser: User;
}

interface MessageContextMenuProps {
  message: MessageWithUser;
  isOwn: boolean;
  onCopy: () => void;
  onForward: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onShowOriginal: () => void;
  onQuote: () => void;
  children: React.ReactNode;
}

interface MenuAction {
  id: string;
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  show?: boolean;
}

export function MessageContextMenu({
  message,
  isOwn,
  onCopy,
  onForward,
  onFavorite,
  onDelete,
  onShowOriginal,
  onQuote,
  children
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const isTextMessage = message.messageType === 'text' || !message.messageType;
  const isAudioMessage = message.messageType === 'audio';
  const isImageMessage = message.messageType === 'image';
  const isStickerMessage = message.messageType === 'sticker';
  
  // 复制：文本和语音消息可以复制内容
  const canCopy = isTextMessage || isAudioMessage;
  // 原文：对方发的文本/语音消息可以查看原文（多语言沟通核心功能）
  const canShowOriginal = !isOwn && (isTextMessage || isAudioMessage);
  // 引用：所有消息类型都可以引用
  const canQuote = true;

  const actions: MenuAction[] = [
    { id: 'copy', icon: Copy, label: '复制', onClick: onCopy, show: canCopy },
    { id: 'forward', icon: Forward, label: '转发', onClick: onForward, show: true },
    { id: 'favorite', icon: Star, label: '收藏', onClick: onFavorite, show: true },
    { id: 'delete', icon: Trash2, label: '删除', onClick: onDelete, show: true },
    { id: 'original', icon: Languages, label: '原文', onClick: onShowOriginal, show: canShowOriginal },
    { id: 'quote', icon: Reply, label: '引用', onClick: onQuote, show: canQuote },
  ].filter(action => action.show !== false);

  const handleLongPressStart = useCallback((clientX: number, clientY: number) => {
    touchStartPos.current = { x: clientX, y: clientY };
    
    longPressTimer.current = setTimeout(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 280;
      const menuHeight = 120;
      
      let x = clientX;
      let y = clientY - 80;
      
      if (x + menuWidth / 2 > viewportWidth) {
        x = viewportWidth - menuWidth / 2 - 10;
      }
      if (x - menuWidth / 2 < 0) {
        x = menuWidth / 2 + 10;
      }
      
      if (y < 10) {
        y = clientY + 20;
      }
      if (y + menuHeight > viewportHeight) {
        y = viewportHeight - menuHeight - 10;
      }
      
      setMenuPosition({ x, y });
      setIsOpen(true);
      
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    
    if (dx > 10 || dy > 10) {
      handleLongPressEnd();
    }
  }, [handleLongPressEnd]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleLongPressStart(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      handleLongPressStart(e.clientX, e.clientY);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 280;
    const menuHeight = 120;
    
    let x = e.clientX;
    let y = e.clientY - 80;
    
    if (x + menuWidth / 2 > viewportWidth) {
      x = viewportWidth - menuWidth / 2 - 10;
    }
    if (x - menuWidth / 2 < 0) {
      x = menuWidth / 2 + 10;
    }
    
    if (y < 10) {
      y = e.clientY + 20;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    setMenuPosition({ x, y });
    setIsOpen(true);
    
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const handleActionClick = (action: MenuAction) => {
    setIsOpen(false);
    action.onClick();
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          closeMenu();
        }
      };
      
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      };
    }
  }, [isOpen, closeMenu]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const menuContent = isOpen ? (
    <div className="fixed inset-0 z-[9999]" style={{ touchAction: 'none' }} data-testid="context-menu-overlay">
      <div className="absolute inset-0 bg-black/30" onClick={closeMenu} />
      
      <div
        ref={menuRef}
        className="absolute bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden z-[10000]"
        style={{
          left: menuPosition.x,
          top: menuPosition.y,
          transform: 'translateX(-50%)',
          minWidth: '260px',
        }}
        data-testid="message-context-menu"
      >
        <div className="grid grid-cols-4 gap-1 p-3">
          {actions.slice(0, 4).map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-700/50 active:bg-slate-600/50 transition-colors"
              data-testid={`menu-${action.id}`}
            >
              <action.icon className="h-5 w-5 text-slate-200 mb-1" />
              <span className="text-xs text-slate-300">{action.label}</span>
            </button>
          ))}
        </div>
        
        {actions.length > 4 && (
          <div className="grid grid-cols-4 gap-1 px-3 pb-3">
            {actions.slice(4).map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-700/50 active:bg-slate-600/50 transition-colors"
                data-testid={`menu-${action.id}`}
              >
                <action.icon className="h-5 w-5 text-slate-200 mb-1" />
                <span className="text-xs text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onContextMenu={handleContextMenu}
        className="select-none"
        data-testid="message-context-trigger"
      >
        {children}
      </div>

      {menuContent && createPortal(menuContent, document.body)}
    </>
  );
}

interface OriginalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  translatedText: string;
}

export function OriginalTextModal({ isOpen, onClose, originalText, translatedText }: OriginalTextModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden z-[10000]">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">查看原文</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <p className="text-xs text-slate-400 mb-2">原文</p>
            <p className="text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap">
              {originalText}
            </p>
          </div>
          
          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400 mb-2">译文</p>
            <p className="text-slate-300 text-[15px] leading-relaxed whitespace-pre-wrap">
              {translatedText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageWithUser;
  friends: Array<{ id: string; firstName?: string; username: string; profileImageUrl?: string }>;
  onForward: (friendIds: string[]) => void;
}

export function ForwardModal({ isOpen, onClose, message, friends, onForward }: ForwardModalProps) {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleForward = () => {
    if (selectedFriends.length > 0) {
      onForward(selectedFriends);
      setSelectedFriends([]);
      onClose();
    }
  };

  const getMessagePreview = () => {
    if (message.messageType === 'image') return '[图片]';
    if (message.messageType === 'audio') return '[语音]';
    if (message.messageType === 'file') return '[文件]';
    if (message.messageType === 'sticker') return message.content;
    return message.content.length > 50 ? message.content.slice(0, 50) + '...' : message.content;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-slate-800 rounded-t-xl shadow-2xl w-full max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom z-[10000]">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <button onClick={onClose} className="text-slate-400">取消</button>
          <h3 className="text-lg font-medium text-white">转发给</h3>
          <button 
            onClick={handleForward}
            disabled={selectedFriends.length === 0}
            className={cn(
              "font-medium",
              selectedFriends.length > 0 ? "text-green-500" : "text-slate-500"
            )}
          >
            发送{selectedFriends.length > 0 && `(${selectedFriends.length})`}
          </button>
        </div>
        
        <div className="p-3 border-b border-slate-700 bg-slate-900/50">
          <p className="text-sm text-slate-400 truncate">{getMessagePreview()}</p>
        </div>
        
        <div className="overflow-y-auto max-h-[50vh]">
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => toggleFriend(friend.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors",
                selectedFriends.includes(friend.id) && "bg-slate-700/30"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                selectedFriends.includes(friend.id) 
                  ? "bg-green-500 border-green-500" 
                  : "border-slate-500"
              )}>
                {selectedFriends.includes(friend.id) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden flex-shrink-0">
                {friend.profileImageUrl ? (
                  <img src={friend.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                    {(friend.firstName || friend.username)[0]}
                  </div>
                )}
              </div>
              
              <span className="text-slate-200">{friend.firstName || friend.username}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
