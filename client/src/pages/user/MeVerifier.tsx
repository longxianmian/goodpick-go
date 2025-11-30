import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Menu,
  ChevronRight,
  ScanLine,
  CheckCircle,
  Clock,
  Calendar,
  Award,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function MeVerifier() {
  const { t } = useLanguage();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // 获取核销员关联的门店
  const verifierRoles = userRoles.filter(r => r.role === 'verifier');
  const currentStore = verifierRoles[0];
  
  // TODO: 从后端API获取真实核销数据
  const verifyStats = {
    todayCount: 23,
    weekCount: 156,
    monthCount: 489,
    totalCount: 1256,
    avgPerDay: 16.3,
    ranking: 2,
  };
  
  const recentRedemptions = [
    { id: 1, code: '12345678', campaignName: '新用户专享9折', time: '10:25', status: 'success' },
    { id: 2, code: '87654321', campaignName: '周末满减活动', time: '09:48', status: 'success' },
    { id: 3, code: '11223344', campaignName: '会员日特惠', time: '09:15', status: 'success' },
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
            {t('verifier.myTitle')}
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
                  <ScanLine className="w-3 h-3" />
                  {t('verifier.role')}
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
        
        {/* 核销统计栏 */}
        <div className="flex items-center justify-around py-4 bg-white/10">
          <div className="text-center">
            <div className="text-xl font-bold">{verifyStats.todayCount}</div>
            <div className="text-xs opacity-90">{t('verifier.today')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{verifyStats.weekCount}</div>
            <div className="text-xs opacity-90">{t('verifier.thisWeek')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{verifyStats.monthCount}</div>
            <div className="text-xs opacity-90">{t('verifier.thisMonth')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{verifyStats.totalCount}</div>
            <div className="text-xs opacity-90">{t('verifier.total')}</div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* 业绩概览 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('verifier.performance')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                <Award className="w-8 h-8 mx-auto mb-1 text-amber-500" />
                <div className="text-2xl font-bold text-amber-600">#{verifyStats.ranking}</div>
                <div className="text-xs text-muted-foreground">{t('verifier.ranking')}</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">{verifyStats.avgPerDay}</div>
                <div className="text-xs text-muted-foreground">{t('verifier.avgPerDay')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快速核销入口 */}
        <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
          <CardContent className="p-0">
            <Link href="/staff/redeem">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2" data-testid="link-quick-redeem">
                <div className="w-14 h-14 rounded-xl bg-[#38B03B] flex items-center justify-center">
                  <ScanLine className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{t('verifier.quickRedeem')}</div>
                  <div className="text-sm text-muted-foreground">{t('verifier.scanToRedeem')}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* 最近核销记录 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('verifier.recentRedemptions')}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComingSoon}>
                {t('consumer.viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {recentRedemptions.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-sm font-medium">{item.campaignName}</div>
                      <div className="text-xs text-muted-foreground">{t('verifier.code')}: {item.code}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav forceRole="verifier" />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
