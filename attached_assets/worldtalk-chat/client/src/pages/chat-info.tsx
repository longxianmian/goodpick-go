import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Search,
  Trash2,
  BellOff,
  Pin,
  Bell,
  Image,
  AlertTriangle,
  ChevronRight,
  Plus,
  BookOpen
} from 'lucide-react';
import { t } from '@/lib/i18n';
import { Friend, Group } from '@/types';

interface ChatInfoPageProps {
  chatTargetName?: string;
  chatTargetAvatar?: string;
  chatTargetType?: 'friend' | 'group';
  chatTargetId?: string;
  onBack: () => void;
  onAddMembers?: (params: { id: string; type: 'friend' | 'group'; name: string; avatar?: string }) => void;
  onOpenKnowledgeBase?: (digitalHumanId: string) => void;
}

export function ChatInfoPage({ 
  chatTargetName: propName, 
  chatTargetAvatar: propAvatar, 
  chatTargetType: propType,
  chatTargetId: propId,
  onBack,
  onAddMembers,
  onOpenKnowledgeBase
}: ChatInfoPageProps) {
  // 判断是否是数字人（ID以dh-开头）
  const isDigitalHuman = propId?.startsWith('dh-') || false;
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [pinChat, setPinChat] = useState(true);
  const [reminders, setReminders] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const urlType = searchParams.get('type') as 'friend' | 'group' | null;
  const urlId = searchParams.get('id');
  
  const chatTargetType = propType || urlType || 'friend';
  const chatTargetId = propId || urlId || '';
  
  const { data: friendsData } = useQuery<Friend[]>({ 
    queryKey: ['/api/friends'],
    enabled: chatTargetType === 'friend' && !propName
  });
  
  const { data: groupsData } = useQuery<Group[]>({ 
    queryKey: ['/api/groups'],
    enabled: chatTargetType === 'group' && !propName
  });
  
  let chatTargetName = propName;
  let chatTargetAvatar = propAvatar;
  
  if (!propName && chatTargetId) {
    if (chatTargetType === 'friend' && friendsData) {
      const friend = friendsData.find(f => f.id === chatTargetId);
      if (friend) {
        chatTargetName = friend.username;
        chatTargetAvatar = friend.profileImageUrl || undefined;
      }
    } else if (chatTargetType === 'group' && groupsData) {
      const group = groupsData.find(g => g.id === chatTargetId);
      if (group) {
        chatTargetName = group.name;
        chatTargetAvatar = group.avatarUrl || undefined;
      }
    }
  }
  
  const displayName = chatTargetName || (chatTargetType === 'group' ? t('groups') : t('friends')) || '未知';

  const handleSearchChatHistory = () => {
  };

  const handleClearChatHistory = () => {
  };

  const handleSetChatBackground = () => {
  };

  const handleReport = () => {
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950" data-testid="chat-info-page">

      <div className="h-14 bg-slate-900 flex items-center px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 hover:bg-slate-800"
          data-testid="button-back-chat-info"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-white" data-testid="chat-info-title">
          {t('chatInfo')}
        </h1>
        <div className="w-8" />
      </div>

      {/* 黑色分隔线 */}
      <div className="h-2 bg-black" />

      <div className="p-4 space-y-6 bg-slate-950">
        {/* Contact Info Section */}
        <div className="flex items-center space-x-4 bg-slate-900 p-6 rounded-lg" data-testid="contact-info-section">
          {/* Main Avatar */}
          <div className="relative">
            {chatTargetAvatar ? (
              <img 
                src={chatTargetAvatar} 
                alt={displayName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center text-white font-semibold">
                {displayName && displayName.length > 0 ? displayName.charAt(0) : '?'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded text-white text-xs flex items-center justify-center">
              {chatTargetType === 'group' ? t('groups') : t('friends')}
            </div>
          </div>

          {/* Add Contact Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              if (onAddMembers && chatTargetId && chatTargetType && displayName) {
                onAddMembers({
                  id: chatTargetId,
                  type: chatTargetType,
                  name: displayName,
                  avatar: chatTargetAvatar
                });
              }
            }}
            disabled={!chatTargetId || !chatTargetType || !onAddMembers}
            data-testid="button-add-members"
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
          </Button>
        </div>

        {/* Function List */}
        <div className="space-y-0 bg-card rounded-lg overflow-hidden">
          {/* 查找聊天记录 */}
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleSearchChatHistory}
            data-testid="button-search-history"
          >
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('searchChatHistory')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* 清空聊天记录 - 按要求放在查找聊天记录下面 */}
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleClearChatHistory}
            data-testid="button-clear-history"
          >
            <div className="flex items-center space-x-3">
              <Trash2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('clearChatHistory')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* 数字人知识库 - 仅对数字人显示 */}
          {isDigitalHuman && (
            <div 
              className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => propId && onOpenKnowledgeBase?.(propId)}
              data-testid="button-knowledge-base"
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">数字人知识库</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {/* 消息免打扰 */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <BellOff className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('muteNotifications')}</span>
            </div>
            <Switch 
              checked={muteNotifications} 
              onCheckedChange={setMuteNotifications}
              data-testid="switch-mute-notifications"
            />
          </div>

          {/* 置顶聊天 */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <Pin className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('pinChat')}</span>
            </div>
            <Switch 
              checked={pinChat} 
              onCheckedChange={setPinChat}
              data-testid="switch-pin-chat"
            />
          </div>

          {/* 提醒 */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('reminders')}</span>
            </div>
            <Switch 
              checked={reminders} 
              onCheckedChange={setReminders}
              data-testid="switch-reminders"
            />
          </div>

          {/* 设置当前聊天背景 */}
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleSetChatBackground}
            data-testid="button-set-background"
          >
            <div className="flex items-center space-x-3">
              <Image className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('setChatBackground')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* 投诉 */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleReport}
            data-testid="button-report"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">{t('report')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}