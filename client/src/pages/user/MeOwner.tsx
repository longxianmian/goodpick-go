import { useState } from 'react';
import { Link, useLocation } from 'wouter';
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
  Copy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
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

export default function MeOwner() {
  const { t } = useLanguage();
  const { user, userRoles, userToken, setActiveRole, activeRole, hasRole } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  
  const isTestAccount = user?.isTestAccount === true;
  
  // 获取商户老板关联的门店
  const ownerRoles = userRoles.filter(r => r.role === 'owner');
  
  // 角色选项定义
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
  
  // TODO: 从后端API获取真实员工数据
  const staffStats = {
    operators: 3,
    verifiers: 8,
    totalStaff: 11,
  };
  
  const staffList = [
    { id: 1, name: '张三', role: 'operator', avatar: null, status: 'active' },
    { id: 2, name: '李四', role: 'verifier', avatar: null, status: 'active' },
    { id: 3, name: '王五', role: 'verifier', avatar: null, status: 'active' },
    { id: 4, name: '赵六', role: 'verifier', avatar: null, status: 'pending' },
  ];

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* 顶部用户卡片区域 */}
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
          <div className="w-9" />
        </header>
        
        <div className="px-4 py-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-xl font-bold bg-white/20 text-white">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold" data-testid="text-user-name">
                  {user?.displayName || 'User'}
                </h2>
                {isTestAccount && availableRoleOptions.length > 1 && (
                  <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 bg-white/20 hover:bg-white/30 text-white"
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
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/20 border-amber-300/50 text-white">
                  <Crown className="w-3 h-3" />
                  {t('owner.role')}
                </Badge>
                {isTestAccount && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-white/20 border-white/30 text-white">
                    <Shield className="w-3 h-3" />
                    {t('roles.testAccount')}
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs gap-1 text-white/80 hover:text-white hover:bg-white/20" 
              onClick={handleCopyToken}
              data-testid="button-copy-token"
            >
              <Copy className="w-3 h-3" />
              复制Token
            </Button>
          </div>
        </div>
        
        {/* 门店列表 */}
        {ownerRoles.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {ownerRoles.map((store) => (
                <Badge 
                  key={store.storeId} 
                  variant="outline" 
                  className="text-[11px] gap-1 bg-white/10 border-white/30 text-white"
                >
                  <Store className="w-3 h-3" />
                  {store.storeName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* 员工统计 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('owner.staffOverview')}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <div className="text-2xl font-bold text-blue-600">{staffStats.operators}</div>
                <div className="text-xs text-muted-foreground">{t('owner.operators')}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                <div className="text-2xl font-bold text-green-600">{staffStats.verifiers}</div>
                <div className="text-xs text-muted-foreground">{t('owner.verifiers')}</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                <div className="text-2xl font-bold text-purple-600">{staffStats.totalStaff}</div>
                <div className="text-xs text-muted-foreground">{t('owner.totalStaff')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 添加员工入口 */}
        <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
          <CardContent className="p-0">
            <div 
              className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2"
              onClick={handleComingSoon}
              data-testid="button-add-staff"
            >
              <div className="w-12 h-12 rounded-xl bg-[#38B03B] flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{t('owner.addStaff')}</div>
                <div className="text-xs text-muted-foreground">{t('owner.addStaffDesc')}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* 员工管理列表 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('owner.staffManagement')}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComingSoon}>
                {t('consumer.viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {staffList.map((staff) => (
                <div 
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={staff.avatar || undefined} />
                      <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{staff.name}</div>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] mt-0.5"
                      >
                        {staff.role === 'operator' ? t('owner.operator') : t('owner.verifier')}
                      </Badge>
                    </div>
                  </div>
                  <Badge 
                    variant={staff.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {staff.status === 'active' ? t('owner.active') : t('owner.pending')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('owner.quickActions')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Link href="/merchant">
                <div className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate">
                  <Store className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-sm font-medium">{t('owner.storeHome')}</div>
                </div>
              </Link>
              <Link href="/merchant/operations">
                <div className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-sm font-medium">{t('owner.viewData')}</div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <MerchantBottomNav />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
