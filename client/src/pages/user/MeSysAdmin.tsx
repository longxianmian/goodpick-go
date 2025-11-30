import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Menu, 
  Shield, 
  Eye, 
  Star,
  Users,
  Store,
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
  const { user, logoutUser } = useAuth();
  
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{user?.displayName || t('sysadmin.admin')}</h2>
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
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.totalUsers')}</span>
                </div>
                <div className="text-xl font-bold">{formatNumber(mockOverviewData.totalUsers)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{mockOverviewData.todayNewUsers} {t('sysadmin.today')}</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.totalStores')}</span>
                </div>
                <div className="text-xl font-bold">{mockOverviewData.totalStores}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{t('sysadmin.activeStores')}: 198</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.totalCampaigns')}</span>
                </div>
                <div className="text-xl font-bold">{formatNumber(mockOverviewData.totalCampaigns)}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{t('sysadmin.activeCampaigns')}: 426</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">{t('sysadmin.conversionRate')}</span>
                </div>
                <div className="text-xl font-bold">{mockOverviewData.conversionRate}%</div>
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
                  <div className="text-lg font-bold">{formatNumber(mockPreviewStats.feedViews)}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18.5%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
                  <div className="text-lg font-bold">{formatNumber(mockPreviewStats.discoverViews)}</div>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12.3%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
                  <div className="text-lg font-bold">{formatNumber(mockPreviewStats.couponClaims)}</div>
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <TrendingDown className="w-3 h-3" />
                    <span>-3.2%</span>
                  </div>
                </div>
              </div>
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
                onClick={() => setLocation('/admin/shuashua-ops')}
                data-testid="link-shuashua-ops"
              >
                <Eye className="w-8 h-8 mx-auto mb-2 text-[#38B03B]" />
                <div className="text-sm font-medium">{t('sysadmin.shuashuaOps')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/admin/discover-ops')}
                data-testid="link-discover-ops"
              >
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <div className="text-sm font-medium">{t('sysadmin.discoverOps')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/admin/dashboard')}
                data-testid="link-dashboard"
              >
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-sm font-medium">{t('sysadmin.dashboard')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/admin/notifications')}
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
