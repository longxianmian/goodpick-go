import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Search,
  Trash2,
  BellOff,
  Pin,
  Image as ImageIcon,
  AlertTriangle,
  ChevronRight,
  Plus,
  Minus,
  QrCode,
  Users,
  Edit,
  Tag,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Share2,
  Crown,
  Shield
} from 'lucide-react';
import { t, getTranslatedUserName } from '@/lib/i18n';
import QRCodeLib from 'qrcode';

interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'owner' | 'admin' | 'member';
  nickname?: string;
  isFollowed: boolean;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  joinedAt: string;
}

interface GroupInfoPageProps {
  groupId: string;
  groupName?: string;
  groupAvatar?: string;
  currentUserId: string;
  onBack: () => void;
  onAddMembers?: () => void;
  onLeaveGroup?: () => void;
  onDeleteGroup?: () => void;
}

export function GroupInfoPage({ 
  groupId,
  groupName: propGroupName,
  groupAvatar: propGroupAvatar,
  currentUserId,
  onBack,
  onAddMembers,
  onLeaveGroup,
  onDeleteGroup
}: GroupInfoPageProps) {
  const { toast } = useToast();
  
  // State
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [pinChat, setPinChat] = useState(true);
  const [showMemberNicknames, setShowMemberNicknames] = useState(true);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [isEditingMyNickname, setIsEditingMyNickname] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAnnouncement, setEditedAnnouncement] = useState('');
  const [editedMyNickname, setEditedMyNickname] = useState('');
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showRemoveMembersDialog, setShowRemoveMembersDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showQRCodeDialog, setShowQRCodeDialog] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [showFollowedMembersDialog, setShowFollowedMembersDialog] = useState(false);

  // 获取群组详情
  const { data: groupData } = useQuery<{
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    ownerId: string;
    announcement?: string;
    memberCount: number;
  }>({
    queryKey: ['/api/groups', groupId],
    enabled: !!groupId,
  });

  // 获取群成员列表
  const { data: members = [] } = useQuery<GroupMember[]>({
    queryKey: ['/api/groups', groupId, 'members'],
    enabled: !!groupId,
  });

  // 获取好友列表
  const { data: friends = [] } = useQuery<any[]>({
    queryKey: ['/api/friends'],
    enabled: showAddMembersDialog,
  });

  // 过滤出不在群里的好友
  const memberUserIds = members.map(m => m.userId);
  const availableFriends = friends.filter(f => f.friendUser?.id && !memberUserIds.includes(f.friendUser.id));

  const groupName = groupData?.name || propGroupName || '群聊';
  const groupAvatar = groupData?.avatarUrl || propGroupAvatar;
  const announcement = groupData?.announcement || '';
  const memberCount = members.length || groupData?.memberCount || 0;

  // 获取当前用户的群成员信息
  const currentMember = members.find(m => m.userId === currentUserId);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin' || isOwner;
  const myNickname = currentMember?.nickname || '';

  // 显示的成员（前20个或全部）
  const displayedMembers = showAllMembers ? members : members.slice(0, 20);

  // 修改群名称
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest(`/api/groups/${groupId}`, {
        method: 'PATCH',
        body: { name },
      });
    },
    onSuccess: () => {
      toast({ title: '群名称已更新' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setIsEditingName(false);
    },
    onError: () => {
      toast({ title: '更新失败', variant: 'destructive' });
    },
  });

  // 修改群公告
  const updateAnnouncementMutation = useMutation({
    mutationFn: async (announcement: string) => {
      return apiRequest(`/api/groups/${groupId}`, {
        method: 'PATCH',
        body: { announcement },
      });
    },
    onSuccess: () => {
      toast({ title: '群公告已更新' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setIsEditingAnnouncement(false);
    },
    onError: () => {
      toast({ title: '更新失败', variant: 'destructive' });
    },
  });

  // 修改我的群昵称
  const updateMyNicknameMutation = useMutation({
    mutationFn: async (nickname: string) => {
      return apiRequest(`/api/groups/${groupId}/my-nickname`, {
        method: 'PATCH',
        body: { nickname },
      });
    },
    onSuccess: () => {
      toast({ title: '昵称已更新' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setIsEditingMyNickname(false);
    },
    onError: () => {
      toast({ title: '更新失败', variant: 'destructive' });
    },
  });

  // 退出群聊
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/groups/${groupId}/leave`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({ title: '已退出群聊' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      // 调用回调函数（如果提供了），否则返回上一页
      if (onLeaveGroup) {
        onLeaveGroup();
      } else {
        onBack();
      }
    },
    onError: (error: any) => {
      // 显示具体的错误信息
      const errorMessage = error?.message || '退出失败';
      
      // 如果是群主尝试退出，显示特殊提示
      if (error?.message?.includes('Owner cannot leave') || error?.message?.includes('Transfer ownership')) {
        toast({ 
          title: '群主无法退出', 
          description: '请先转让群主权限或解散群聊',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: '退出失败', 
          description: errorMessage,
          variant: 'destructive' 
        });
      }
    },
  });

  // 解散群聊（仅群主）
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: '群聊已解散' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      // 调用回调函数（如果提供了），否则返回上一页
      if (onDeleteGroup) {
        onDeleteGroup();
      } else {
        onBack();
      }
    },
    onError: () => {
      toast({ title: '解散失败', variant: 'destructive' });
    },
  });

  // 添加成员
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return apiRequest(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: { userIds },
      });
    },
    onSuccess: () => {
      toast({ title: `成功添加${selectedFriends.length}位成员` });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      setShowAddMembersDialog(false);
      setSelectedFriends([]);
    },
    onError: () => {
      toast({ title: '添加成员失败', variant: 'destructive' });
    },
  });

  // 移除成员
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: '成员已移除' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
    },
    onError: () => {
      toast({ title: '移除成员失败', variant: 'destructive' });
    },
  });

  const handleEditName = () => {
    setEditedName(groupName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateNameMutation.mutate(editedName.trim());
    }
  };

  const handleEditAnnouncement = () => {
    setEditedAnnouncement(announcement);
    setIsEditingAnnouncement(true);
  };

  const handleSaveAnnouncement = () => {
    updateAnnouncementMutation.mutate(editedAnnouncement.trim());
  };

  const handleEditMyNickname = () => {
    setEditedMyNickname(myNickname);
    setIsEditingMyNickname(true);
  };

  const handleSaveMyNickname = () => {
    updateMyNicknameMutation.mutate(editedMyNickname.trim());
  };

  const handleLeaveGroup = () => {
    if (confirm('确定要退出此群聊吗？')) {
      leaveGroupMutation.mutate();
    }
  };

  const handleDeleteGroup = () => {
    if (confirm('确定要解散此群聊吗？此操作无法撤销！')) {
      deleteGroupMutation.mutate();
    }
  };

  const handleOpenAddMembers = () => {
    setSelectedFriends([]);
    setShowAddMembersDialog(true);
  };

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddMembers = () => {
    if (selectedFriends.length > 0) {
      addMembersMutation.mutate(selectedFriends);
    }
  };

  const handleOpenRemoveMembers = () => {
    setSelectedMembers([]);
    setShowRemoveMembersDialog(true);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleRemoveMembers = async () => {
    if (selectedMembers.length > 0) {
      for (const memberId of selectedMembers) {
        await removeMemberMutation.mutateAsync(memberId);
      }
      setShowRemoveMembersDialog(false);
      setSelectedMembers([]);
    }
  };

  // 计算可移除的成员列表
  const removableMembers = members.filter(member => {
    // 不能移除自己
    if (member.userId === currentUserId) return false;
    // 不能移除群主
    if (member.role === 'owner') return false;
    // 如果当前用户是普通管理员，不能移除其他管理员
    if (currentMember?.role === 'admin' && member.role === 'admin') return false;
    return true;
  });

  // 生成二维码
  useEffect(() => {
    if (showQRCodeDialog && groupId) {
      const inviteUrl = `${window.location.origin}/join-group/${groupId}`;
      QRCodeLib.toDataURL(inviteUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(url => {
          setQrCodeDataURL(url);
        })
        .catch(err => {
          console.error('Generate QR code error:', err);
          toast({ title: '生成二维码失败', variant: 'destructive' });
        });
    }
  }, [showQRCodeDialog, groupId, toast]);

  const handleShowQRCode = () => {
    setShowQRCodeDialog(true);
  };

  const handleDownloadQRCode = () => {
    if (qrCodeDataURL) {
      const link = document.createElement('a');
      link.href = qrCodeDataURL;
      link.download = `${groupName}-qrcode.png`;
      link.click();
    }
  };

  const handleShareQRCode = () => {
    const inviteUrl = `${window.location.origin}/join-group/${groupId}`;
    const shareText = `加入我的群聊：${groupName}`;
    
    // 尝试使用原生分享API
    if (navigator.share) {
      navigator.share({
        title: shareText,
        text: shareText,
        url: inviteUrl,
      }).catch(() => {
        // 如果用户取消分享，不显示错误
      });
    } else {
      // 降级方案：复制链接到剪贴板
      navigator.clipboard.writeText(inviteUrl).then(() => {
        toast({ title: '链接已复制到剪贴板' });
      }).catch(() => {
        toast({ title: '复制失败', variant: 'destructive' });
      });
    }
  };

  const handleSearchHistory = () => {
    toast({ title: '搜索聊天记录功能开发中' });
  };

  const handleShowFollowedMembers = () => {
    setShowFollowedMembersDialog(true);
  };

  const handleToggleFollow = async (memberId: string) => {
    const member = members.find(m => m.userId === memberId);
    if (!member) return;

    try {
      await apiRequest(`/api/groups/${groupId}/members/${memberId}/follow`, {
        method: 'PATCH',
        body: { isFollowed: !member.isFollowed },
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'members'] });
      toast({ title: member.isFollowed ? '已取消关注' : '已关注' });
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleSetBackground = () => {
    toast({ title: '设置聊天背景功能开发中' });
  };

  const handleClearHistory = () => {
    setShowClearHistoryDialog(true);
  };

  const handleConfirmClearHistory = async () => {
    try {
      await apiRequest(`/api/groups/${groupId}/clear-messages`, {
        method: 'DELETE',
      });
      toast({ title: '聊天记录已清空' });
      setShowClearHistoryDialog(false);
    } catch (error) {
      toast({ title: '清空失败', variant: 'destructive' });
    }
  };

  const handleReport = () => {
    toast({ title: '投诉功能开发中' });
  };

  // 获取已关注的成员
  const followedMembers = members.filter(m => m.isFollowed);

  return (
    <div className="flex flex-col min-h-screen bg-background" data-testid="group-info-page">
      {/* Header */}
      <div className="flex items-center justify-center h-[62px] px-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-3"
          data-testid="button-back-group-info"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold" data-testid="group-info-title">
          群聊信息
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 群成员网格 */}
        <div className="bg-card rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-5 gap-3 mb-4">
            {displayedMembers.map((member) => (
              <div key={member.id} className="flex flex-col items-center" data-testid={`member-${member.userId}`}>
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.user.profileImageUrl} />
                    <AvatarFallback>
                      {member.user.firstName?.[0] || member.user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  {member.role === 'owner' && (
                    <div 
                      className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-950 rounded-full p-0.5"
                      aria-label="Group Owner"
                      title="Group Owner"
                    >
                      <Crown className="w-3 h-3" />
                    </div>
                  )}
                  {member.role === 'admin' && (
                    <div 
                      className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5"
                      aria-label="Group Admin"
                      title="Group Admin"
                    >
                      <Shield className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <span className="text-xs mt-1 text-center truncate w-full">
                  {showMemberNicknames && member.nickname 
                    ? member.nickname 
                    : member.user.firstName 
                    ? getTranslatedUserName(member.user.id, member.user.firstName)
                    : member.user.username}
                </span>
              </div>
            ))}

            {/* 添加成员按钮 */}
            <button
              onClick={handleOpenAddMembers}
              className="flex flex-col items-center"
              data-testid="button-add-members-grid"
            >
              <div className="w-12 h-12 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center hover:bg-accent">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs mt-1 text-muted-foreground">添加</span>
            </button>

            {/* 移除成员按钮（仅管理员） */}
            {isAdmin && (
              <button
                onClick={handleOpenRemoveMembers}
                className="flex flex-col items-center"
                data-testid="button-remove-members-grid"
              >
                <div className="w-12 h-12 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center hover:bg-accent">
                  <Minus className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs mt-1 text-muted-foreground">移除</span>
              </button>
            )}
          </div>

          {/* 展开/收起更多成员 */}
          {members.length > 20 && (
            <button
              onClick={() => setShowAllMembers(!showAllMembers)}
              className="w-full flex items-center justify-center py-2 text-sm text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-members"
            >
              {showAllMembers ? (
                <>
                  收起 <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  更多群成员 (共{memberCount}人) <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          )}
        </div>

        {/* 群聊名称 */}
        <div className="bg-card rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3 flex-1">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="输入群名称"
                      className="flex-1"
                      data-testid="input-group-name"
                    />
                    <Button size="sm" onClick={handleSaveName} data-testid="button-save-name">
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingName(false)}>
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">群聊名称</div>
                      <div className="font-medium" data-testid="group-name-display">{groupName}</div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditName}
                        data-testid="button-edit-name"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 群二维码 */}
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50"
            onClick={handleShowQRCode}
            data-testid="button-group-qrcode"
          >
            <div className="flex items-center space-x-3">
              <QrCode className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">群二维码</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* 群公告 */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">群公告</span>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditAnnouncement}
                  data-testid="button-edit-announcement"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
            {isEditingAnnouncement ? (
              <div className="space-y-2">
                <Textarea
                  value={editedAnnouncement}
                  onChange={(e) => setEditedAnnouncement(e.target.value)}
                  placeholder="输入群公告..."
                  className="min-h-[80px]"
                  data-testid="textarea-announcement"
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSaveAnnouncement} data-testid="button-save-announcement">
                    保存
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingAnnouncement(false)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground pl-7" data-testid="announcement-display">
                {announcement || '暂无公告'}
              </div>
            )}
          </div>
        </div>

        {/* 功能列表 - 第一组：常用功能 */}
        <div className="bg-card rounded-lg overflow-hidden shadow-sm">
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50"
            onClick={handleSearchHistory}
            data-testid="button-search-history"
          >
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">查找聊天记录</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <BellOff className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">消息免打扰</span>
            </div>
            <Switch 
              checked={muteNotifications} 
              onCheckedChange={setMuteNotifications}
              data-testid="switch-mute-notifications"
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Pin className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">置顶聊天</span>
            </div>
            <Switch 
              checked={pinChat} 
              onCheckedChange={setPinChat}
              data-testid="switch-pin-chat"
            />
          </div>
        </div>

        {/* 功能列表 - 第二组：群成员相关 */}
        <div className="bg-card rounded-lg overflow-hidden shadow-sm">
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50"
            onClick={handleShowFollowedMembers}
            data-testid="button-followed-members"
          >
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">关注的群成员</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3 flex-1">
              <Tag className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                {isEditingMyNickname ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editedMyNickname}
                      onChange={(e) => setEditedMyNickname(e.target.value)}
                      placeholder="输入昵称"
                      className="flex-1"
                      data-testid="input-my-nickname"
                    />
                    <Button size="sm" onClick={handleSaveMyNickname} data-testid="button-save-nickname">
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingMyNickname(false)}>
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">我在群里的昵称</div>
                      <div className="text-sm text-muted-foreground" data-testid="my-nickname-display">
                        {myNickname || '未设置'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditMyNickname}
                      data-testid="button-edit-nickname"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">显示群成员昵称</span>
            </div>
            <Switch 
              checked={showMemberNicknames} 
              onCheckedChange={setShowMemberNicknames}
              data-testid="switch-show-nicknames"
            />
          </div>
        </div>

        {/* 功能列表 - 第三组：个性化设置 */}
        <div className="bg-card rounded-lg overflow-hidden shadow-sm">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
            onClick={handleSetBackground}
            data-testid="button-set-background"
          >
            <div className="flex items-center space-x-3">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">设置当前聊天背景</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* 功能列表 - 第四组：高级功能 */}
        <div className="bg-card rounded-lg overflow-hidden shadow-sm">
          <div 
            className="flex items-center justify-between p-4 border-b border-border cursor-pointer hover:bg-muted/50"
            onClick={handleClearHistory}
            data-testid="button-clear-history"
          >
            <div className="flex items-center space-x-3">
              <Trash2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">清空聊天记录</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
            onClick={handleReport}
            data-testid="button-report"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">投诉</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* 危险操作区域 */}
        <div className="bg-card rounded-lg overflow-hidden shadow-sm">
          <button
            onClick={handleLeaveGroup}
            className="w-full p-4 text-destructive hover:bg-destructive/10 transition-colors text-center font-medium"
            data-testid="button-leave-group"
          >
            退出群聊
          </button>
          
          {isOwner && (
            <>
              <div className="border-t border-border" />
              <button
                onClick={handleDeleteGroup}
                className="w-full p-4 text-destructive hover:bg-destructive/10 transition-colors text-center font-medium"
                data-testid="button-delete-group"
              >
                解散群聊
              </button>
            </>
          )}
        </div>
      </div>

      {/* 添加成员对话框 */}
      <Dialog open={showAddMembersDialog} onOpenChange={setShowAddMembersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加群成员</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {availableFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无可添加的好友
              </div>
            ) : (
              <div className="space-y-2">
                {availableFriends.map((friend) => (
                  <div
                    key={friend.friendUser.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                    onClick={() => handleToggleFriend(friend.friendUser.id)}
                    data-testid={`friend-${friend.friendUser.id}`}
                  >
                    <Checkbox
                      checked={selectedFriends.includes(friend.friendUser.id)}
                      onCheckedChange={() => handleToggleFriend(friend.friendUser.id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.friendUser.profileImageUrl} />
                      <AvatarFallback>
                        {friend.friendUser.firstName?.[0] || friend.friendUser.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">
                        {friend.friendUser.firstName 
                          ? getTranslatedUserName(friend.friendUser.id, friend.friendUser.firstName)
                          : friend.friendUser.username}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddMembersDialog(false)}
              data-testid="button-cancel-add"
            >
              取消
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedFriends.length === 0 || addMembersMutation.isPending}
              data-testid="button-confirm-add"
            >
              添加 {selectedFriends.length > 0 && `(${selectedFriends.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除成员对话框 */}
      <Dialog open={showRemoveMembersDialog} onOpenChange={setShowRemoveMembersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>移除群成员</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {removableMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无可移除的成员
              </div>
            ) : (
              <div className="space-y-2">
                {removableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer"
                    onClick={() => handleToggleMember(member.userId)}
                    data-testid={`removable-member-${member.userId}`}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.userId)}
                      onCheckedChange={() => handleToggleMember(member.userId)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.user.profileImageUrl} />
                      <AvatarFallback>
                        {member.user.firstName?.[0] || member.user.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">
                        {showMemberNicknames && member.nickname 
                          ? member.nickname 
                          : member.user.firstName 
                          ? getTranslatedUserName(member.user.id, member.user.firstName)
                          : member.user.username}
                      </div>
                      {member.role === 'admin' && (
                        <div className="text-xs text-blue-500">管理员</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveMembersDialog(false)}
              data-testid="button-cancel-remove"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMembers}
              disabled={selectedMembers.length === 0 || removeMemberMutation.isPending}
              data-testid="button-confirm-remove"
            >
              移除 {selectedMembers.length > 0 && `(${selectedMembers.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 群二维码对话框 */}
      <Dialog open={showQRCodeDialog} onOpenChange={setShowQRCodeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>群二维码</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            {qrCodeDataURL ? (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <img src={qrCodeDataURL} alt="群二维码" className="w-64 h-64" />
                </div>
                <div className="text-center space-y-1">
                  <div className="font-medium">{groupName}</div>
                  <div className="text-sm text-muted-foreground">扫码加入群聊</div>
                </div>
              </>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                <div className="text-muted-foreground">生成中...</div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button
              variant="outline"
              onClick={handleShareQRCode}
              disabled={!qrCodeDataURL}
              data-testid="button-share-qrcode"
              className="w-full sm:w-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享邀请链接
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadQRCode}
              disabled={!qrCodeDataURL}
              data-testid="button-download-qrcode"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              下载二维码
            </Button>
            <Button
              onClick={() => setShowQRCodeDialog(false)}
              data-testid="button-close-qrcode"
              className="w-full sm:w-auto"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空聊天记录确认对话框 */}
      <Dialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>清空聊天记录</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground">
              确定要清空此群聊的所有聊天记录吗？此操作无法撤销！
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearHistoryDialog(false)}
              data-testid="button-cancel-clear"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClearHistory}
              data-testid="button-confirm-clear"
            >
              清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关注的群成员对话框 */}
      <Dialog open={showFollowedMembersDialog} onOpenChange={setShowFollowedMembersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>关注的群成员 ({followedMembers.length})</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {followedMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无关注的成员
              </div>
            ) : (
              <div className="space-y-2">
                {followedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg"
                    data-testid={`followed-member-${member.userId}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.user.profileImageUrl} />
                      <AvatarFallback>
                        {member.user.firstName?.[0] || member.user.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">
                        {showMemberNicknames && member.nickname 
                          ? member.nickname 
                          : member.user.firstName 
                          ? getTranslatedUserName(member.user.id, member.user.firstName)
                          : member.user.username}
                      </div>
                      {member.role === 'owner' && (
                        <div className="text-xs text-yellow-500">群主</div>
                      )}
                      {member.role === 'admin' && (
                        <div className="text-xs text-blue-500">管理员</div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFollow(member.userId)}
                      data-testid={`button-unfollow-${member.userId}`}
                    >
                      取消关注
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowFollowedMembersDialog(false)}
              data-testid="button-close-followed"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
