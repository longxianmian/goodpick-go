import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Menu,
  ChevronRight,
  TrendingUp,
  Users,
  Eye,
  ShoppingBag,
  Target,
  Calendar,
  BarChart3
} from 'lucide-react';
import { SiLine } from 'react-icons/si';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function MeOperator() {
  const { t } = useLanguage();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // 获取运营人员关联的门店
  const operatorRoles = userRoles.filter(r => r.role === 'operator');
  const currentStore = operatorRoles[0];
  
  // TODO: 从后端API获取真实运营数据
  const operationStats = {
    todayViews: 1256,
    todayOrders: 48,
    todayRevenue: 12580,
    conversionRate: 3.8,
    weeklyGrowth: 12.5,
    activeUsers: 328,
  };
  
  const recentCampaigns = [
    { id: 1, name: '新用户专享9折', status: 'active', claimed: 156, quota: 200 },
    { id: 2, name: '周末满减活动', status: 'active', claimed: 89, quota: 100 },
    { id: 3, name: '会员日特惠', status: 'scheduled', claimed: 0, quota: 150 },
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
            {t('operator.myTitle')}
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
              <h2 className="text-lg font-bold mb-1" data-testid="text-user-name">
                {user?.displayName || 'User'}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 border-white/30 text-white">
                  {t('operator.role')}
                </Badge>
                {currentStore && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 border-white/30 text-white">
                    {currentStore.storeName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* 今日数据概览 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('operator.todayOverview')}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">{t('operator.views')}</span>
                </div>
                <div className="text-xl font-bold text-blue-600">{operationStats.todayViews.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">{t('operator.orders')}</span>
                </div>
                <div className="text-xl font-bold text-green-600">{operationStats.todayOrders}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">{t('operator.revenue')}</span>
                </div>
                <div className="text-xl font-bold text-amber-600">{t('common.currencySymbol')}{operationStats.todayRevenue.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">{t('operator.conversion')}</span>
                </div>
                <div className="text-xl font-bold text-purple-600">{operationStats.conversionRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 增长趋势 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('operator.weeklyGrowth')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${operationStats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {operationStats.weeklyGrowth >= 0 ? '+' : ''}{operationStats.weeklyGrowth}%
                </span>
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{operationStats.activeUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 活动管理 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('operator.campaigns')}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComingSoon}>
                {t('consumer.viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {recentCampaigns.map((campaign) => (
                <div 
                  key={campaign.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {campaign.claimed}/{campaign.quota} {t('operator.claimed')}
                    </div>
                  </div>
                  <Badge 
                    variant={campaign.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {campaign.status === 'active' ? t('operator.active') : t('operator.scheduled')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav forceRole="operator" />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
