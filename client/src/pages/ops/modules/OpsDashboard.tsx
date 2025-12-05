import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Store, 
  FileText, 
  Video,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Ticket
} from 'lucide-react';

interface PlatformStats {
  users: {
    total: number;
    todayNew: number;
    weeklyGrowth: number;
  };
  stores: {
    total: number;
    active: number;
    pendingApproval: number;
  };
  campaigns: {
    total: number;
    active: number;
    endingSoon: number;
  };
  coupons: {
    totalIssued: number;
    totalRedeemed: number;
    redemptionRate: number;
  };
  content: {
    totalVideos: number;
    pendingReview: number;
    todayUploads: number;
  };
}

export function OpsDashboard() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/ops/stats'],
  });

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const mockStats: PlatformStats = stats || {
    users: { total: 12580, todayNew: 128, weeklyGrowth: 8.5 },
    stores: { total: 256, active: 198, pendingApproval: 3 },
    campaigns: { total: 1842, active: 426, endingSoon: 15 },
    coupons: { totalIssued: 45680, totalRedeemed: 22840, redemptionRate: 50.0 },
    content: { totalVideos: 3256, pendingReview: 12, todayUploads: 45 },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-users">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">总用户数</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(mockStats.users.total)}</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>今日 +{mockStats.users.todayNew}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stores">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Store className="w-4 h-4" />
              <span className="text-sm">总商户数</span>
            </div>
            <div className="text-2xl font-bold">{mockStats.stores.total}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>活跃: {mockStats.stores.active}</span>
              {mockStats.stores.pendingApproval > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0">
                  待审核 {mockStats.stores.pendingApproval}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-campaigns">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm">活动总数</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(mockStats.campaigns.total)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>进行中: {mockStats.campaigns.active}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-redemption">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Ticket className="w-4 h-4" />
              <span className="text-sm">核销率</span>
            </div>
            <div className="text-2xl font-bold">{mockStats.coupons.redemptionRate}%</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+2.3% 较上周</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#38B03B]" />
              待处理事项
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">商户入驻审核</div>
                  <div className="text-xs text-muted-foreground">有新商户等待审核</div>
                </div>
              </div>
              <Badge variant="destructive">{mockStats.stores.pendingApproval}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">内容审核</div>
                  <div className="text-xs text-muted-foreground">短视频待审核</div>
                </div>
              </div>
              <Badge variant="destructive">{mockStats.content.pendingReview}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">即将结束活动</div>
                  <div className="text-xs text-muted-foreground">活动即将到期</div>
                </div>
              </div>
              <Badge className="bg-amber-500">{mockStats.campaigns.endingSoon}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#38B03B]" />
              流量概览 (近7天)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#38B03B]/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#38B03B]" />
                </div>
                <div>
                  <div className="text-sm font-medium">刷刷播放量</div>
                  <div className="text-xs text-muted-foreground">短视频总播放</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">25.9万</div>
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +18.5%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">发现页浏览</div>
                  <div className="text-xs text-muted-foreground">活动发现页访问</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">18.6万</div>
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12.3%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">优惠券领取</div>
                  <div className="text-xs text-muted-foreground">用户领券数</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">8,560</div>
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  -3.2%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#38B03B]" />
            核销数据
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(mockStats.coupons.totalIssued)}</div>
              <div className="text-xs text-muted-foreground mt-1">总发放量</div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
              <div className="text-2xl font-bold text-green-600">{formatNumber(mockStats.coupons.totalRedeemed)}</div>
              <div className="text-xs text-muted-foreground mt-1">已核销</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
              <div className="text-2xl font-bold text-purple-600">{mockStats.coupons.redemptionRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">核销率</div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
              <div className="text-2xl font-bold text-amber-600">{formatNumber(mockStats.coupons.totalIssued - mockStats.coupons.totalRedeemed)}</div>
              <div className="text-xs text-muted-foreground mt-1">待使用</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
