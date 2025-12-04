import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronLeft, 
  ChevronDown,
  Menu, 
  Shield, 
  Eye, 
  Star,
  Users,
  User,
  Zap,
  Store,
  Cog,
  BadgeCheck,
  Crown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Settings,
  Bell
} from 'lucide-react';

export default function MeSysAdmin() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, logoutUser, userRoles, setActiveRole, activeRole, hasRole } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  
  const isTestAccount = user?.isTestAccount === true;
  
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
    setLocation(path);
  };
  
  const mockOverviewData = {
    totalUsers: 12580,
    totalStores: 256,
    totalCampaigns: 1842,
    activeUsers: 3256,
    todayNewUsers: 128,
    todayOrders: 856,
    todayRevenue: 125680,
    conversionRate: 12.5,
  };

  const mockPreviewStats = {
    feedViews: 258600,
    discoverViews: 186400,
    couponClaims: 8560,
    couponRedemptions: 4280,
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('sysadmin.title')}</span>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            data-testid="button-menu"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <div className="px-4 py-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-xl">
                {user?.displayName?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-base font-bold truncate" data-testid="text-user-name">
                  {user?.displayName || t('sysadmin.admin')}
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
                        <span>{allRoleOptions.find(r => r.role === activeRole)?.label || t('roles.sysadmin')}</span>
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
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  {t('sysadmin.badge')}
                </Badge>
              </div>
              <p className="text-sm text-white/70 mt-1">
                {t('sysadmin.welcomeMessage')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-semibold">{t('sysadmin.platformOverview')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30" data-testid="stat-total-users">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.totalUsers')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-users">{formatNumber(mockOverviewData.totalUsers)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{mockOverviewData.todayNewUsers} {t('sysadmin.today')}</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30" data-testid="stat-total-stores">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.totalStores')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-stores">{mockOverviewData.totalStores}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{t('sysadmin.activeStores')}: 198</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30" data-testid="stat-total-campaigns">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.totalCampaigns')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-campaigns">{formatNumber(mockOverviewData.totalCampaigns)}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{t('sysadmin.activeCampaigns')}: 426</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30" data-testid="stat-conversion-rate">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.conversionRate')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-conversion-rate">{mockOverviewData.conversionRate}%</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+2.3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('sysadmin.previewStats')}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid="stat-feed-views">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#38B03B]/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[#38B03B]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('sysadmin.feedViews')}</div>
                    <div className="text-xs text-muted-foreground">{t('sysadmin.last7Days')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" data-testid="text-feed-views">{formatNumber(mockPreviewStats.feedViews)}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18.5%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid="stat-discover-views">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('sysadmin.discoverViews')}</div>
                    <div className="text-xs text-muted-foreground">{t('sysadmin.last7Days')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" data-testid="text-discover-views">{formatNumber(mockPreviewStats.discoverViews)}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12.3%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid="stat-coupon-claims">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('sysadmin.couponClaims')}</div>
                    <div className="text-xs text-muted-foreground">{t('sysadmin.last7Days')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" data-testid="text-coupon-claims">{formatNumber(mockPreviewStats.couponClaims)}</div>
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <TrendingDown className="w-3 h-3" />
                    <span>-3.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-[#38B03B]/10 to-[#38B03B]/5 border-[#38B03B]/20">
          <CardContent className="pt-4">
            <div 
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => setLocation('/ops')}
              data-testid="link-ops-center"
            >
              <div className="w-14 h-14 rounded-xl bg-[#38B03B] flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">进入运营中心</div>
                <div className="text-sm text-muted-foreground">全方位管理平台数据、商户、内容</div>
              </div>
              <div className="text-[#38B03B]">→</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('sysadmin.quickActions')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/ops')}
                data-testid="link-shuashua-ops"
              >
                <Eye className="w-8 h-8 mx-auto mb-2 text-[#38B03B]" />
                <div className="text-sm font-medium">{t('sysadmin.shuashuaOps')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/ops')}
                data-testid="link-discover-ops"
              >
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <div className="text-sm font-medium">{t('sysadmin.discoverOps')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/ops')}
                data-testid="link-dashboard"
              >
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-sm font-medium">{t('sysadmin.dashboard')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/ops')}
                data-testid="link-notifications"
              >
                <Bell className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <div className="text-sm font-medium">{t('sysadmin.notifications')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav />
    </div>
  );
}
