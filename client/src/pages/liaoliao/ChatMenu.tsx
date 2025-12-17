import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, Plus, Search, ChevronRight, Bell, Pin, Clock, Image, Trash2, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMenuProps {
  friendName?: string;
  friendAvatar?: string;
}

interface Message {
  fromUserId: number;
  fromUser: {
    id: number;
    displayName: string;
    avatarUrl?: string;
  };
}

interface ChatData {
  messages: Message[];
}

export default function ChatMenu() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/liaoliao/chat/:friendId/menu');
  const friendId = params?.friendId ? parseInt(params.friendId) : 0;
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 获取聊天消息以提取好友信息
  const { data: chatData } = useQuery<ChatData>({
    queryKey: ['/api/liaoliao/messages', friendId],
    enabled: !!friendId,
  });

  const messages = chatData?.messages || [];
  const friendInfo = messages.find(m => m.fromUserId === friendId)?.fromUser || {
    id: friendId,
    displayName: t('liaoliao.unknownUser') || '未知用户',
    avatarUrl: undefined,
  };

  // 状态
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // 清空聊天记录
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/liaoliao/messages/${friendId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/messages', friendId] });
      toast({ title: t('liaoliao.historyCleared') || '聊天记录已清空' });
      setShowClearConfirm(false);
      navigate(`/liaoliao/chat/${friendId}`);
    },
    onError: () => {
      toast({ title: t('liaoliao.clearFailed') || '清空失败', variant: 'destructive' });
    },
  });

  // 提交投诉
  const reportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/liaoliao/report', {
        targetId: friendId,
        targetType: 'user',
        reason: reportReason,
      });
    },
    onSuccess: () => {
      toast({ title: t('liaoliao.reportSubmitted') || '投诉已提交' });
      setShowReportDialog(false);
      setReportReason('');
    },
    onError: () => {
      toast({ title: t('liaoliao.reportFailed') || '投诉失败', variant: 'destructive' });
    },
  });

  const handleClose = () => {
    navigate(`/liaoliao/chat/${friendId}`);
  };

  const handleAddFriends = () => {
    navigate(`/liaoliao/chat/${friendId}/select-contacts`);
  };

  const handleSearch = () => {
    toast({ title: t('liaoliao.searchOpened') || '搜索功能' });
  };

  const handleSetBackground = () => {
    toast({ title: t('liaoliao.comingSoon') || '即将上线' });
  };

  const menuItems = [
    {
      icon: Search,
      label: t('liaoliao.searchChatContent') || '查找聊天内容',
      onClick: handleSearch,
      showArrow: true,
    },
    {
      icon: Bell,
      label: t('liaoliao.muteNotifications') || '消息免打扰',
      toggle: true,
      checked: isMuted,
      onToggle: setIsMuted,
    },
    {
      icon: Pin,
      label: t('liaoliao.pinChat') || '置顶聊天',
      toggle: true,
      checked: isPinned,
      onToggle: setIsPinned,
    },
    {
      icon: Clock,
      label: t('liaoliao.reminder') || '提醒',
      toggle: true,
      checked: hasReminder,
      onToggle: setHasReminder,
    },
    {
      icon: Image,
      label: t('liaoliao.setChatBg') || '设置聊天背景',
      onClick: handleSetBackground,
      showArrow: true,
    },
    {
      icon: Trash2,
      label: t('liaoliao.clearChatHistory') || '清空聊天记录',
      onClick: () => setShowClearConfirm(true),
      showArrow: true,
      danger: false,
    },
    {
      icon: Flag,
      label: t('liaoliao.report') || '投诉',
      onClick: () => setShowReportDialog(true),
      showArrow: true,
      danger: true,
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航 */}
      <header className="flex items-center justify-end px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          data-testid="button-close-menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* 头像区域 */}
      <div className="flex items-center justify-center gap-4 py-6">
        <Avatar className="h-14 w-14">
          <AvatarImage src={friendInfo.avatarUrl} />
          <AvatarFallback>{friendInfo.displayName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={handleAddFriends}
          data-testid="button-add-friends"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* 菜单列表 */}
      <div className="flex-1 overflow-y-auto">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between px-4 py-4 hover-elevate ${
              item.onClick ? 'cursor-pointer' : ''
            }`}
            onClick={item.onClick}
            data-testid={`menu-item-${index}`}
          >
            <span className={item.danger ? 'text-destructive' : ''}>
              {item.label}
            </span>
            {item.toggle ? (
              <Switch
                checked={item.checked}
                onCheckedChange={item.onToggle}
                data-testid={`switch-${index}`}
              />
            ) : item.showArrow ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            ) : null}
          </div>
        ))}
      </div>

      {/* 清空确认对话框 */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('liaoliao.confirmClear') || '确认清空'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('liaoliao.clearWarning') || '此操作将删除所有聊天记录，且无法恢复。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || '取消'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearHistoryMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
            >
              {t('common.confirm') || '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 投诉对话框 */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('liaoliao.reportUser') || '投诉用户'}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t('liaoliao.reportReasonPlaceholder') || '请输入投诉原因...'}
            rows={4}
            data-testid="input-report-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              {t('common.cancel') || '取消'}
            </Button>
            <Button
              onClick={() => reportMutation.mutate()}
              disabled={!reportReason.trim() || reportMutation.isPending}
            >
              {t('common.submit') || '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
