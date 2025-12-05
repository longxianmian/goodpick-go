import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Menu,
  ChevronRight,
  ChevronDown,
  Users,
  UserPlus,
  Shield,
  Store,
  Settings,
  BarChart3,
  Crown,
  User,
  Zap,
  Cog,
  BadgeCheck,
  Copy,
  Bell,
  Package,
  Wallet,
  ClipboardList,
  TrendingUp,
  Calendar,
  ShoppingBag,
  CircleDollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { MerchantChatFloatingButton } from '@/components/MerchantChatFloatingButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

type ModuleType = 'staff' | 'operations' | 'assets';

export default function MeOwner() {
  const { t } = useLanguage();
  const { user, userRoles, userToken, setActiveRole, activeRole, hasRole } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleType>('staff');
  
  const isTestAccount = user?.isTestAccount === true;
  
  const ownerRoles = userRoles.filter(r => r.role === 'owner');
  
  const { data: myStoresData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/stores/my'],
    enabled: !!user,
  });
  
  const myStores = myStoresData?.data || [];
  const primaryStore = myStores[0];
  
  const allRoleOptions = [
    { role: 'consumer', label: t('roles.consumer'), icon: User, path: '/me', color: 'text-blue-500' },
    { role: 'creator', label: t('roles.creator'), icon: Zap, path: '/creator/me', color: 'text-pink-500' },
    { role: 'owner', label: t('roles.owner'), icon: Store, path: '/merchant/me', color: 'text-orange-500' },
    { role: 'operator', label: t('roles.operator'), icon: Cog, path: '/merchant', color: 'text-purple-500' },
    { role: 'verifier', label: t('roles.verifier'), icon: BadgeCheck, path: '/verifier', color: 'text-green-500' },
    { role: 'member', label: t('roles.member'), icon: Crown, path: '/me', color: 'text-yellow-500' },
    { role: 'sysadmin', label: t('roles.sysadmin'), icon: Shield, path: '/sysadmin', color: 'text-red-500' },
  ];
  
  const availableRoleOptions = allRoleOptions.filter(option => 
    hasRole(option.role as any)
  );

  const handleSwitchRole = (role: string, path: string) => {
    setActiveRole(role as any);
    setRoleMenuOpen(false);
    navigate(path);
  };

  const handleCopyToken = async () => {
    if (!userToken) {
      toast({
        title: t('common.error'),
        description: '请先登录',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(userToken);
      toast({
        title: '已复制 Token',
        description: '在 Replit 预览窗口登录页面点击"粘贴Token登录"即可同步',
      });
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = userToken;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: '已复制 Token',
        description: '在 Replit 预览窗口登录页面点击"粘贴Token登录"即可同步',
      });
    }
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };
  
  const todaySummary = {
    revenue: 1280,
    pendingTasks: 3,
    verifiedOrders: 12,
    onlineStaff: 2,
  };
  
  const staffData = {
    operators: 3,
    verifiers: 8,
    totalStaff: 11,
    pendingActivation: 1,
    staffList: [
      { id: 1, name: '张三', role: 'operator', status: 'active' },
      { id: 2, name: '李四', role: 'verifier', status: 'active' },
      { id: 3, name: '王五', role: 'verifier', status: 'active' },
      { id: 4, name: '赵六', role: 'verifier', status: 'pending' },
    ],
  };
  
  const operationsData = {
    todayOrders: 28,
    pendingVerify: 5,
    activeCampaigns: 3,
    upcomingEvents: 2,
  };
  
  const assetsData = {
    totalProducts: 45,
    activeCampaigns: 8,
    accountBalance: 12680,
    monthlyRevenue: 38500,
  };
  
  const notifications = [
    { id: 1, type: 'order', message: '新订单待处理', time: '2分钟前' },
    { id: 2, type: 'staff', message: '赵六申请激活员工权限', time: '10分钟前' },
    { id: 3, type: 'alert', message: '库存预警：商品A库存不足', time: '1小时前' },
  ];

  const moduleButtons = [
    { key: 'staff' as ModuleType, label: '员工', icon: Users, color: 'bg-blue-500' },
    { key: 'operations' as ModuleType, label: '运营', icon: ClipboardList, color: 'bg-green-500' },
    { key: 'assets' as ModuleType, label: '资产', icon: Package, color: 'bg-orange-500' },
  ];

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'staff':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <div className="text-xl font-bold text-blue-600">{staffData.operators}</div>
                <div className="text-[10px] text-muted-foreground">运营人员</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                <div className="text-xl font-bold text-green-600">{staffData.verifiers}</div>
                <div className="text-[10px] text-muted-foreground">核销员</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                <div className="text-xl font-bold text-purple-600">{staffData.totalStaff}</div>
                <div className="text-[10px] text-muted-foreground">总人数</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                <div className="text-xl font-bold text-amber-600">{staffData.pendingActivation}</div>
                <div className="text-[10px] text-muted-foreground">待激活</div>
              </div>
            </div>
            
            <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
              <CardContent className="p-0">
                <div 
                  className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2"
                  onClick={handleComingSoon}
                  data-testid="button-add-staff"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38B03B] flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">添加员工</div>
                    <div className="text-xs text-muted-foreground">邀请新员工加入团队</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">员工列表</span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={() => navigate('/merchant/operations?tab=staff')}>
                  查看全部 <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
              {staffData.staffList.slice(0, 3).map((staff) => (
                <div 
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-sm">{staff.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{staff.name}</div>
                      <Badge variant="outline" className="text-[10px]">
                        {staff.role === 'operator' ? '运营' : '核销'}
                      </Badge>
                    </div>
                  </div>
                  <Badge 
                    variant={staff.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {staff.status === 'active' ? '已激活' : '待激活'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'operations':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <div className="text-xl font-bold text-blue-600">{operationsData.todayOrders}</div>
                <div className="text-[10px] text-muted-foreground">今日订单</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                <div className="text-xl font-bold text-amber-600">{operationsData.pendingVerify}</div>
                <div className="text-[10px] text-muted-foreground">待核销</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                <div className="text-xl font-bold text-green-600">{operationsData.activeCampaigns}</div>
                <div className="text-[10px] text-muted-foreground">进行中活动</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                <div className="text-xl font-bold text-purple-600">{operationsData.upcomingEvents}</div>
                <div className="text-[10px] text-muted-foreground">待上线</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">订单管理</span>
                  <span className="text-xs text-muted-foreground">查看处理订单</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <BadgeCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">核销记录</span>
                  <span className="text-xs text-muted-foreground">查看核销历史</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium">活动日历</span>
                  <span className="text-xs text-muted-foreground">排期与计划</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium">营业设置</span>
                  <span className="text-xs text-muted-foreground">营业状态管理</span>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      case 'assets':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-xs opacity-80">商品库</span>
                </div>
                <div className="text-2xl font-bold">{assetsData.totalProducts}</div>
                <div className="text-xs opacity-70">在售商品</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs opacity-80">活动库</span>
                </div>
                <div className="text-2xl font-bold">{assetsData.activeCampaigns}</div>
                <div className="text-xs opacity-70">活跃活动</div>
              </div>
            </div>
            
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm font-medium">账户余额</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-white/80 hover:text-white hover:bg-white/20 h-auto p-1"
                    onClick={() => navigate('/merchant/operations?tab=assets')}
                  >
                    详情 <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-3xl font-bold mb-1">¥{assetsData.accountBalance.toLocaleString()}</div>
                <div className="text-xs opacity-70">本月收入 ¥{assetsData.monthlyRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">商品管理</span>
                  <span className="text-xs text-muted-foreground">管理在售商品</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium">活动管理</span>
                  <span className="text-xs text-muted-foreground">创建编辑活动</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CircleDollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">收支明细</span>
                  <span className="text-xs text-muted-foreground">查看资金流水</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium">提现结算</span>
                  <span className="text-xs text-muted-foreground">余额提现</span>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#38B03B] to-[#2d8c2f] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => setDrawerOpen(true)}
            data-testid="button-drawer-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold" data-testid="text-page-title">
            {t('owner.myTitle')}
          </h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 relative"
            onClick={handleComingSoon}
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
        </header>
        
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-lg font-bold bg-white/20 text-white">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-base font-bold truncate" data-testid="text-user-name">
                  {user?.displayName || 'User'}
                </h2>
                {isTestAccount && availableRoleOptions.length > 1 && (
                  <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] gap-0.5 bg-white/20 hover:bg-white/30 text-white"
                        data-testid="button-switch-role"
                      >
                        <span>{allRoleOptions.find(r => r.role === activeRole)?.label || t('roles.owner')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('common.switchRole')}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableRoleOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.role}
                            onClick={() => handleSwitchRole(option.role, option.path)}
                            className={`gap-2 cursor-pointer ${activeRole === option.role ? 'bg-accent' : ''}`}
                            data-testid={`menu-role-${option.role}`}
                          >
                            <IconComponent className={`w-4 h-4 ${option.color}`} />
                            <span>{option.label}</span>
                            {activeRole === option.role && (
                              <Badge variant="outline" className="ml-auto text-[10px]">{t('common.current')}</Badge>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px] gap-0.5 bg-amber-500/20 border-amber-300/50 text-white">
                  <Crown className="w-2.5 h-2.5" />
                  {t('owner.role')}
                </Badge>
                {isTestAccount && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 bg-white/20 border-white/30 text-white">
                    <Shield className="w-2.5 h-2.5" />
                    测试
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] gap-1 text-white/80 hover:text-white hover:bg-white/20 h-7 px-2" 
              onClick={handleCopyToken}
              data-testid="button-copy-token"
            >
              <Copy className="w-3 h-3" />
              Token
            </Button>
          </div>
        </div>
        
        {ownerRoles.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {ownerRoles.map((store) => (
                <Badge 
                  key={store.storeId} 
                  variant="outline" 
                  className="text-[10px] gap-1 bg-white/10 border-white/30 text-white"
                >
                  <Store className="w-2.5 h-2.5" />
                  {store.storeName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">今日概览</span>
              <span className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-[#38B03B]">¥{todaySummary.revenue}</div>
                <div className="text-[10px] text-muted-foreground">今日收入</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-500">{todaySummary.pendingTasks}</div>
                <div className="text-[10px] text-muted-foreground">待处理</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">{todaySummary.verifiedOrders}</div>
                <div className="text-[10px] text-muted-foreground">已核销</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-500">{todaySummary.onlineStaff}</div>
                <div className="text-[10px] text-muted-foreground">在线员工</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {moduleButtons.map((btn) => {
            const IconComponent = btn.icon;
            const isActive = activeModule === btn.key;
            return (
              <Button
                key={btn.key}
                variant={isActive ? 'default' : 'outline'}
                className={`h-auto py-3 flex flex-col gap-1.5 ${isActive ? btn.color + ' text-white border-0' : ''}`}
                onClick={() => setActiveModule(btn.key)}
                data-testid={`button-module-${btn.key}`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-xs font-medium">{btn.label}</span>
              </Button>
            );
          })}
        </div>

        {renderModuleContent()}

        {notifications.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#38B03B]" />
                  <span className="text-sm font-semibold">最新通知</span>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
                  全部 <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notif) => (
                  <div 
                    key={notif.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                    onClick={handleComingSoon}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      notif.type === 'order' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      notif.type === 'staff' ? 'bg-green-100 dark:bg-green-900/30' :
                      'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      {notif.type === 'order' ? <ClipboardList className="w-4 h-4 text-blue-600" /> :
                       notif.type === 'staff' ? <Users className="w-4 h-4 text-green-600" /> :
                       <AlertCircle className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{notif.message}</div>
                      <div className="text-[10px] text-muted-foreground">{notif.time}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <MerchantBottomNav />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      {primaryStore && <MerchantChatFloatingButton storeId={primaryStore.id} />}
    </div>
  );
}
