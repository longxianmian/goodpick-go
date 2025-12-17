import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Search, Plus, Minus, ChevronRight, QrCode, Loader2, Bot, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// AI助理的固定用户ID
const AI_ASSISTANT_USER_ID = 4;

interface GroupMember {
  id: number;
  userId: number;
  displayName: string;
  avatarUrl?: string;
  role: string;
}

interface GroupInfo {
  id: number;
  name: string;
  avatarUrl?: string;
  ownerId: number;
  memberCount: number;
  members?: GroupMember[];
}

export default function GroupSettings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ groupId: string }>();
  const groupId = parseInt(params.groupId || '0');

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [myNickname, setMyNickname] = useState('');

  const [muteNotifications, setMuteNotifications] = useState(false);
  const [pinChat, setPinChat] = useState(false);
  const [saveToContacts, setSaveToContacts] = useState(false);
  const [showMemberNames, setShowMemberNames] = useState(true);

  const { data: groupInfo, isLoading } = useQuery<GroupInfo>({
    queryKey: ['/api/liaoliao/groups', groupId, 'details'],
    enabled: !!groupId,
  });

  const isOwner = groupInfo?.ownerId === user?.id;

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest('PATCH', `/api/liaoliao/groups/${groupId}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/groups'] });
      setShowRenameDialog(false);
      toast({ title: t('common.success') || '修改成功' });
    },
  });

  const quitGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/liaoliao/groups/${groupId}/members/me`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/groups'] });
      navigate('/liaoliao');
      toast({ title: t('liaoliao.leftGroup') || '已退出群聊' });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/liaoliao/groups/${groupId}/messages`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/groups', groupId, 'messages'] });
      setShowClearDialog(false);
      toast({ title: t('liaoliao.chatCleared') || '聊天记录已清空' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const members = groupInfo?.members || [];

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-3 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/liaoliao/group/${groupId}`)}
          data-testid="button-back-group-settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 font-semibold text-center">
          {t('liaoliao.chatInfo') || '聊天信息'} ({groupInfo?.memberCount || 0})
        </h1>
        <Button variant="ghost" size="icon" data-testid="button-search-group">
          <Search className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* 成员头像区域 */}
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-3">
            {members.slice(0, 8).map((member) => (
              <div key={member.userId} className="flex flex-col items-center w-14">
                {member.userId === AI_ASSISTANT_USER_ID ? (
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-amber-900" />
                    </div>
                  </div>
                ) : (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <span className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                  {member.displayName}
                </span>
              </div>
            ))}
            {/* 添加成员按钮 */}
            <div className="flex flex-col items-center w-14">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-md"
                onClick={() => navigate(`/liaoliao/group/${groupId}/add-members`)}
                data-testid="button-add-member"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            {/* 移除成员按钮（仅群主可见） */}
            {isOwner && (
              <div className="flex flex-col items-center w-14">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-md"
                  onClick={() => navigate(`/liaoliao/group/${groupId}/remove-members`)}
                  data-testid="button-remove-member"
                >
                  <Minus className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 设置项列表 */}
        <div className="divide-y">
          {/* 群聊名称 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            onClick={() => {
              setNewGroupName(groupInfo?.name || '');
              setShowRenameDialog(true);
            }}
            data-testid="setting-group-name"
          >
            <span>{t('liaoliao.groupName') || '群聊名称'}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">{groupInfo?.name}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* 群二维码 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            data-testid="setting-group-qrcode"
          >
            <span>{t('liaoliao.groupQrCode') || '群二维码'}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* 群公告 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            data-testid="setting-group-announcement"
          >
            <span>{t('liaoliao.groupAnnouncement') || '群公告'}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">{t('liaoliao.notSet') || '未设置'}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* 群管理 - 仅群主可见 */}
          {isOwner && (
            <div
              className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
              data-testid="setting-group-manage"
            >
              <span>{t('liaoliao.groupManagement') || '群管理'}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* 备注 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            data-testid="setting-group-remark"
          >
            <span>{t('liaoliao.remark') || '备注'}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="h-2 bg-muted/30" />

        {/* 查找聊天内容 */}
        <div className="divide-y">
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            data-testid="setting-search-chat"
          >
            <span>{t('liaoliao.searchChatContent') || '查找聊天内容'}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="h-2 bg-muted/30" />

        {/* 开关设置 */}
        <div className="divide-y">
          {/* 消息免打扰 */}
          <div className="flex items-center justify-between px-4 py-4">
            <span>{t('liaoliao.muteNotifications') || '消息免打扰'}</span>
            <Switch
              checked={muteNotifications}
              onCheckedChange={setMuteNotifications}
              data-testid="switch-mute"
            />
          </div>

          {/* 置顶聊天 */}
          <div className="flex items-center justify-between px-4 py-4">
            <span>{t('liaoliao.pinChat') || '置顶聊天'}</span>
            <Switch
              checked={pinChat}
              onCheckedChange={setPinChat}
              data-testid="switch-pin"
            />
          </div>

          {/* 保存到通讯录 */}
          <div className="flex items-center justify-between px-4 py-4">
            <span>{t('liaoliao.saveToContacts') || '保存到通讯录'}</span>
            <Switch
              checked={saveToContacts}
              onCheckedChange={setSaveToContacts}
              data-testid="switch-save-contacts"
            />
          </div>
        </div>

        <div className="h-2 bg-muted/30" />

        {/* 昵称设置 */}
        <div className="divide-y">
          {/* 我在本群的昵称 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            onClick={() => setShowNicknameDialog(true)}
            data-testid="setting-my-nickname"
          >
            <span>{t('liaoliao.myNicknameInGroup') || '我在本群的昵称'}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">{myNickname || user?.displayName}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* 显示群成员昵称 */}
          <div className="flex items-center justify-between px-4 py-4">
            <span>{t('liaoliao.showMemberNicknames') || '显示群成员昵称'}</span>
            <Switch
              checked={showMemberNames}
              onCheckedChange={setShowMemberNames}
              data-testid="switch-show-names"
            />
          </div>
        </div>

        <div className="h-2 bg-muted/30" />

        {/* 其他设置 */}
        <div className="divide-y">
          {/* 设置当前聊天背景 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            data-testid="setting-chat-background"
          >
            <span>{t('liaoliao.setChatBackground') || '设置当前聊天背景'}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* 清空聊天记录 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            onClick={() => setShowClearDialog(true)}
            data-testid="setting-clear-history"
          >
            <span>{t('liaoliao.clearChatHistory') || '清空聊天记录'}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* 投诉 */}
          <div
            className="flex items-center justify-between px-4 py-4 hover-elevate cursor-pointer"
            data-testid="setting-report"
          >
            <span>{t('liaoliao.report') || '投诉'}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="h-4" />

        {/* 退出群聊按钮 */}
        <div className="px-4 pb-8">
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive hover:bg-destructive/10"
            onClick={() => setShowQuitDialog(true)}
            data-testid="button-quit-group"
          >
            {t('liaoliao.quitGroup') || '退出群聊'}
          </Button>
        </div>
      </div>

      {/* 修改群名对话框 */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('liaoliao.editGroupName') || '修改群聊名称'}</DialogTitle>
          </DialogHeader>
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t('liaoliao.enterGroupName') || '请输入群名称'}
            data-testid="input-group-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              {t('common.cancel') || '取消'}
            </Button>
            <Button
              onClick={() => renameMutation.mutate(newGroupName)}
              disabled={!newGroupName.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t('common.confirm') || '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改昵称对话框 */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('liaoliao.editNickname') || '修改群昵称'}</DialogTitle>
          </DialogHeader>
          <Input
            value={myNickname}
            onChange={(e) => setMyNickname(e.target.value)}
            placeholder={t('liaoliao.enterNickname') || '请输入昵称'}
            data-testid="input-nickname"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNicknameDialog(false)}>
              {t('common.cancel') || '取消'}
            </Button>
            <Button onClick={() => setShowNicknameDialog(false)}>
              {t('common.confirm') || '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 退出群聊确认对话框 */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('liaoliao.quitGroup') || '退出群聊'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('liaoliao.quitGroupConfirm') || '确定要退出该群聊吗？退出后将不再接收群消息。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || '取消'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => quitGroupMutation.mutate()}
              disabled={quitGroupMutation.isPending}
            >
              {quitGroupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t('common.confirm') || '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清空记录确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('liaoliao.clearChatHistory') || '清空聊天记录'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('liaoliao.clearHistoryConfirm') || '确定要清空聊天记录吗？此操作不可恢复。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || '取消'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending}
            >
              {clearHistoryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t('common.confirm') || '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
