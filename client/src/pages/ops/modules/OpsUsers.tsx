import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Search, 
  Users, 
  User,
  Shield,
  Store,
  Video,
  Eye,
  CheckCircle,
  Clock,
  Crown,
  Briefcase,
  Ticket
} from 'lucide-react';
import type { User as UserType } from '@shared/schema';

type UserFilter = 'all' | 'consumer' | 'creator' | 'merchant' | 'sysadmin';

interface ExtendedUser extends UserType {
  roles?: string[];
  storeCount?: number;
  videoCount?: number;
  couponCount?: number;
}

export function OpsUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ['/api/ops/users'],
  });

  const mockUsers: ExtendedUser[] = [
    {
      id: 1,
      lineUserId: 'U1234567890',
      displayName: '美食探店王',
      avatarUrl: null,
      phone: '081-234-5678',
      language: 'zh-cn',
      preferredLanguage: 'zh',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
      roles: ['consumer', 'creator'],
      storeCount: 0,
      videoCount: 25,
      couponCount: 12,
    },
    {
      id: 2,
      lineUserId: 'U2345678901',
      displayName: 'Somchai',
      avatarUrl: null,
      phone: '089-876-5432',
      language: 'th-th',
      preferredLanguage: 'th',
      createdAt: new Date('2024-02-20'),
      updatedAt: new Date(),
      roles: ['consumer', 'owner'],
      storeCount: 2,
      videoCount: 0,
      couponCount: 5,
    },
    {
      id: 3,
      lineUserId: 'U3456789012',
      displayName: '小明',
      avatarUrl: null,
      phone: null,
      language: 'zh-cn',
      preferredLanguage: 'zh',
      createdAt: new Date('2024-03-10'),
      updatedAt: new Date(),
      roles: ['consumer'],
      storeCount: 0,
      videoCount: 0,
      couponCount: 8,
    },
    {
      id: 4,
      lineUserId: 'U4567890123',
      displayName: 'Admin',
      avatarUrl: null,
      phone: '02-999-8888',
      language: 'en-us',
      preferredLanguage: 'en',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      roles: ['sysadmin'],
      storeCount: 0,
      videoCount: 0,
      couponCount: 0,
    },
    {
      id: 5,
      lineUserId: 'U5678901234',
      displayName: '咖啡控小美',
      avatarUrl: null,
      phone: '086-123-4567',
      language: 'zh-cn',
      preferredLanguage: 'zh',
      createdAt: new Date('2024-04-05'),
      updatedAt: new Date(),
      roles: ['consumer', 'creator'],
      storeCount: 0,
      videoCount: 42,
      couponCount: 15,
    },
  ];

  const allUsers = users?.map(u => ({
    ...u,
    roles: ['consumer'],
    storeCount: 0,
    videoCount: 0,
    couponCount: 0,
  })) || mockUsers;

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.phone?.includes(searchQuery);
    
    if (userFilter === 'all') return matchesSearch;
    if (userFilter === 'consumer') return matchesSearch && user.roles?.includes('consumer');
    if (userFilter === 'creator') return matchesSearch && user.roles?.includes('creator');
    if (userFilter === 'merchant') return matchesSearch && (user.roles?.includes('owner') || user.roles?.includes('operator'));
    if (userFilter === 'sysadmin') return matchesSearch && user.roles?.includes('sysadmin');
    
    return matchesSearch;
  });

  const getRoleBadges = (roles?: string[]) => {
    if (!roles || roles.length === 0) return null;
    
    const roleConfig: Record<string, { label: string; className: string; icon: typeof User }> = {
      'consumer': { label: '消费者', className: 'bg-blue-500', icon: User },
      'creator': { label: '创作者', className: 'bg-purple-500', icon: Video },
      'owner': { label: '商户老板', className: 'bg-amber-500', icon: Crown },
      'operator': { label: '运营者', className: 'bg-green-500', icon: Briefcase },
      'verifier': { label: '核销员', className: 'bg-teal-500', icon: CheckCircle },
      'sysadmin': { label: '系统管理员', className: 'bg-red-500', icon: Shield },
    };

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map(role => {
          const config = roleConfig[role];
          if (!config) return null;
          return (
            <Badge key={role} className={`${config.className} text-xs`}>
              {config.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  const handleViewDetail = (user: ExtendedUser) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  const getLanguageLabel = (lang?: string | null) => {
    const langMap: Record<string, string> = {
      'zh': '中文',
      'en': 'English',
      'th': 'ไทย',
    };
    return lang ? langMap[lang] || lang : '-';
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: allUsers.length,
    consumers: allUsers.filter(u => u.roles?.includes('consumer')).length,
    creators: allUsers.filter(u => u.roles?.includes('creator')).length,
    merchants: allUsers.filter(u => u.roles?.includes('owner') || u.roles?.includes('operator')).length,
    admins: allUsers.filter(u => u.roles?.includes('sysadmin')).length,
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">总用户</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.consumers}</div>
            <div className="text-xs text-muted-foreground">消费者</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.creators}</div>
            <div className="text-xs text-muted-foreground">创作者</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.merchants}</div>
            <div className="text-xs text-muted-foreground">商户</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
            <div className="text-xs text-muted-foreground">管理员</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名或手机号..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-users"
          />
        </div>
      </div>

      <Tabs value={userFilter} onValueChange={(v) => setUserFilter(v as UserFilter)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="consumer">消费者</TabsTrigger>
          <TabsTrigger value="creator">创作者</TabsTrigger>
          <TabsTrigger value="merchant">商户</TabsTrigger>
          <TabsTrigger value="sysadmin">管理员</TabsTrigger>
        </TabsList>

        <TabsContent value={userFilter} className="mt-4">
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到符合条件的用户</p>
                </CardContent>
              </Card>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="hover-elevate cursor-pointer" onClick={() => handleViewDetail(user)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-[#38B03B]/10 text-[#38B03B]">
                          {user.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{user.displayName || '未命名用户'}</h3>
                          {getRoleBadges(user.roles)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {user.phone && <span>{user.phone}</span>}
                          <span>语言: {getLanguageLabel(user.preferredLanguage)}</span>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-6 text-center">
                        {user.roles?.includes('creator') && (
                          <div>
                            <div className="text-lg font-bold text-purple-600">{user.videoCount}</div>
                            <div className="text-xs text-muted-foreground">视频</div>
                          </div>
                        )}
                        {user.roles?.includes('owner') && (
                          <div>
                            <div className="text-lg font-bold text-amber-600">{user.storeCount}</div>
                            <div className="text-xs text-muted-foreground">门店</div>
                          </div>
                        )}
                        <div>
                          <div className="text-lg font-bold text-blue-600">{user.couponCount}</div>
                          <div className="text-xs text-muted-foreground">优惠券</div>
                        </div>
                      </div>

                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              用户详情
            </DialogTitle>
            <DialogDescription>
              查看用户信息和角色
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatarUrl || undefined} />
                  <AvatarFallback className="bg-[#38B03B]/10 text-[#38B03B] text-xl">
                    {selectedUser.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser.displayName || '未命名用户'}</h3>
                  <div className="mt-1">
                    {getRoleBadges(selectedUser.roles)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">LINE ID</div>
                  <div className="font-medium font-mono text-xs">{selectedUser.lineUserId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">手机号</div>
                  <div className="font-medium">{selectedUser.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">语言偏好</div>
                  <div className="font-medium">{getLanguageLabel(selectedUser.preferredLanguage)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">注册时间</div>
                  <div className="font-medium">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {selectedUser.roles?.includes('creator') && (
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
                    <Video className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-xl font-bold text-purple-600">{selectedUser.videoCount}</div>
                    <div className="text-xs text-muted-foreground">发布视频</div>
                  </div>
                )}
                {selectedUser.roles?.includes('owner') && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
                    <Store className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                    <div className="text-xl font-bold text-amber-600">{selectedUser.storeCount}</div>
                    <div className="text-xs text-muted-foreground">管理门店</div>
                  </div>
                )}
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                  <Ticket className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-xl font-bold text-blue-600">{selectedUser.couponCount}</div>
                  <div className="text-xs text-muted-foreground">持有优惠券</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
