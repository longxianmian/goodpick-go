import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronLeft,
  Store,
  Tag,
  Ticket,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Percent,
  ArrowRight,
  Star
} from 'lucide-react';

export default function OpsDiscover() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  const stats = {
    totalStores: 256,
    activeStores: 198,
    pendingApproval: 3,
    totalCampaigns: 1842,
    activeCampaigns: 426,
    endingSoon: 15,
    totalCoupons: 45680,
    redeemedCoupons: 22840,
    redemptionRate: 50,
  };

  const pendingStores = [
    { id: 1, name: '泰香园餐厅', city: '曼谷', owner: 'Somchai', type: 'food', createdAt: '2小时前' },
    { id: 2, name: '金龙美食', city: '清迈', owner: 'Wang Wei', type: 'food', createdAt: '5小时前' },
    { id: 3, name: '星巴克 Central', city: '曼谷', owner: 'Starbucks TH', type: 'cafe', createdAt: '1天前' },
  ];

  const hotCampaigns = [
    { id: 1, name: '新店开业5折优惠', store: '金龙美食', discount: '50%', claimed: 856, total: 1000 },
    { id: 2, name: '买一送一活动', store: '星巴克 Central', discount: '买1送1', claimed: 2340, total: 5000 },
    { id: 3, name: '满100减30', store: '泰香园', discount: '满减', claimed: 1256, total: 2000 },
  ];

  const endingSoonCampaigns = [
    { id: 1, name: '周末特惠', store: 'Cafe Hopping', endsIn: '2天' },
    { id: 2, name: '会员专享折扣', store: '美食广场', endsIn: '3天' },
    { id: 3, name: '限时闪购', store: '新开业店铺', endsIn: '5天' },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/sysadmin')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-base font-semibold">发现运营</span>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/ops')}
            data-testid="button-ops-center"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card data-testid="card-stores">
            <CardContent className="pt-4 px-3">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Store className="w-3 h-3 text-purple-500" />
                <span className="text-[10px]">商户</span>
              </div>
              <div className="text-lg font-bold">{stats.totalStores}</div>
              <div className="text-[10px] text-muted-foreground">
                活跃: {stats.activeStores}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-campaigns">
            <CardContent className="pt-4 px-3">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Tag className="w-3 h-3 text-[#38B03B]" />
                <span className="text-[10px]">活动</span>
              </div>
              <div className="text-lg font-bold">{formatNumber(stats.totalCampaigns)}</div>
              <div className="text-[10px] text-muted-foreground">
                进行中: {stats.activeCampaigns}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-coupons">
            <CardContent className="pt-4 px-3">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Ticket className="w-3 h-3 text-amber-500" />
                <span className="text-[10px]">核销率</span>
              </div>
              <div className="text-lg font-bold text-[#38B03B]">{stats.redemptionRate}%</div>
              <div className="flex items-center gap-1 text-[10px] text-green-600">
                <TrendingUp className="w-2 h-2" />
                <span>+2.3%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                待审核商户
                <Badge variant="destructive" className="text-[10px] px-1.5">{stats.pendingApproval}</Badge>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setLocation('/ops')}
              >
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingStores.map((store) => (
              <div 
                key={store.id} 
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                data-testid={`pending-store-${store.id}`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-purple-100 text-purple-600 text-sm">
                    {store.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{store.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{store.city}</span>
                    <span>{store.createdAt}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#38B03B]" />
              热门活动
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hotCampaigns.map((campaign, index) => (
              <div 
                key={campaign.id} 
                className="flex items-center gap-3"
                data-testid={`hot-campaign-${campaign.id}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{campaign.name}</div>
                  <div className="text-xs text-muted-foreground">{campaign.store}</div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-[10px]">
                    {campaign.discount}
                  </Badge>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {campaign.claimed}/{campaign.total}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              即将结束
              <Badge variant="outline" className="text-[10px]">{stats.endingSoon}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {endingSoonCampaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20"
                data-testid={`ending-campaign-${campaign.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{campaign.name}</div>
                  <div className="text-xs text-muted-foreground">{campaign.store}</div>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <Calendar className="w-3 h-3 mr-1" />
                  {campaign.endsIn}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setLocation('/ops')}
              >
                <Store className="w-5 h-5 text-purple-500" />
                <span className="text-xs">商户管理</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setLocation('/ops')}
              >
                <Tag className="w-5 h-5 text-[#38B03B]" />
                <span className="text-xs">活动管理</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav />
    </div>
  );
}
