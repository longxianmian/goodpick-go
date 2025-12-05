import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft,
  Eye,
  Heart,
  Users,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Video,
  FileText,
  Play,
  BarChart3,
  Calendar
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    totalContents: number;
    totalFollowers: number;
    totalFollowing: number;
    newFollowers7d: number;
  };
  earnings: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  trend: Array<{
    date: string;
    views: number;
    likes: number;
    followers: number;
  }>;
  categoryStats: Record<string, { count: number; views: number; likes: number }>;
  topContents: Array<{
    id: number;
    title: string;
    contentType: string;
    coverImageUrl: string | null;
    viewCount: number;
    likeCount: number;
    shareCount: number;
  }>;
}

const CATEGORY_COLORS = [
  '#38B03B', '#ff6b6b', '#4dabf7', '#ffd43b', '#845ef7', '#20c997', '#ff922b'
];

export default function CreatorAnalytics() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { userToken } = useAuth();
  
  const { data: analyticsResponse, isLoading } = useQuery<{ success: boolean; data: AnalyticsData }>({
    queryKey: ['/api/creator/analytics'],
    enabled: !!userToken,
  });

  const analytics = analyticsResponse?.data;

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return '฿' + num.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      funny: t('feed.catFunny'),
      musicDance: t('feed.catMusicDance'),
      drama: t('feed.catDrama'),
      daily: t('feed.catDaily'),
      healing: t('feed.catHealing'),
      food: t('feed.catFood'),
      beauty: t('feed.catBeauty'),
      games: t('feed.catMore'),
      other: t('creatorAnalytics.catOther'),
    };
    return labels[category] || category;
  };

  const categoryData = analytics?.categoryStats 
    ? Object.entries(analytics.categoryStats).map(([key, value], index) => ({
        name: getCategoryLabel(key),
        value: value.count,
        views: value.views,
        likes: value.likes,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
    : [];

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#38B03B] to-[#2d9031] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/creator')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('creatorAnalytics.title')}</span>
          <div className="w-9" />
        </header>

        {isLoading ? (
          <div className="px-4 py-6">
            <Skeleton className="h-24 bg-white/20" />
          </div>
        ) : (
          <div className="px-4 py-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div data-testid="stat-views">
                <div className="text-xl font-bold">{formatNumber(analytics?.overview.totalViews || 0)}</div>
                <div className="text-xs text-white/70">{t('creatorAnalytics.totalViews')}</div>
              </div>
              <div data-testid="stat-followers">
                <div className="text-xl font-bold">{formatNumber(analytics?.overview.totalFollowers || 0)}</div>
                <div className="text-xs text-white/70">{t('creatorAnalytics.followers')}</div>
              </div>
              <div data-testid="stat-likes">
                <div className="text-xl font-bold">{formatNumber(analytics?.overview.totalLikes || 0)}</div>
                <div className="text-xs text-white/70">{t('creatorAnalytics.likes')}</div>
              </div>
              <div data-testid="stat-contents">
                <div className="text-xl font-bold">{analytics?.overview.totalContents || 0}</div>
                <div className="text-xs text-white/70">{t('creatorAnalytics.works')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#38B03B]" />
              {t('creatorAnalytics.overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {t('creatorAnalytics.comments')}
                  </div>
                  <div className="text-lg font-semibold">{formatNumber(analytics?.overview.totalComments || 0)}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Share2 className="w-3.5 h-3.5" />
                    {t('creatorAnalytics.shares')}
                  </div>
                  <div className="text-lg font-semibold">{formatNumber(analytics?.overview.totalShares || 0)}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    {t('creatorAnalytics.newFollowers7d')}
                  </div>
                  <div className="text-lg font-semibold flex items-center gap-1">
                    +{analytics?.overview.newFollowers7d || 0}
                    {(analytics?.overview.newFollowers7d || 0) > 0 && (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {t('creatorAnalytics.earnings30d')}
                  </div>
                  <div className="text-lg font-semibold text-[#38B03B]">
                    {formatCurrency(analytics?.earnings.last30Days || 0)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#38B03B]" />
              {t('creatorAnalytics.trend7d')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.trend || []}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38B03B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38B03B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDateLabel}
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickFormatter={(val) => formatNumber(val)}
                    />
                    <Tooltip 
                      labelFormatter={(label) => formatDateLabel(label as string)}
                      formatter={(value: number) => [formatNumber(value), '']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#38B03B" 
                      fillOpacity={1} 
                      fill="url(#colorViews)"
                      name={t('creatorAnalytics.views')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="likes" 
                      stroke="#ff6b6b" 
                      fillOpacity={1} 
                      fill="url(#colorLikes)"
                      name={t('creatorAnalytics.likesChart')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#38B03B]" />
                {t('creatorAnalytics.views')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff6b6b]" />
                {t('creatorAnalytics.likesChart')}
              </span>
            </div>
          </CardContent>
        </Card>

        {categoryData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="w-4 h-4 text-[#38B03B]" />
                {t('creatorAnalytics.categoryDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {categoryData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: item.fill }}
                        />
                        {item.name}
                      </span>
                      <span className="text-muted-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#38B03B]" />
              {t('creatorAnalytics.earningsOverview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#38B03B]/10 to-[#38B03B]/5 rounded-lg">
                  <span className="text-sm">{t('creatorAnalytics.totalEarnings')}</span>
                  <span className="text-xl font-bold text-[#38B03B]">
                    {formatCurrency(analytics?.earnings.total || 0)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{t('creatorAnalytics.earnings7d')}</div>
                    <div className="font-semibold">{formatCurrency(analytics?.earnings.last7Days || 0)}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{t('creatorAnalytics.earnings30d')}</div>
                    <div className="font-semibold">{formatCurrency(analytics?.earnings.last30Days || 0)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(analytics?.topContents?.length || 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#38B03B]" />
                {t('creatorAnalytics.topContents')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics?.topContents.map((content, index) => (
                <div 
                  key={content.id}
                  className="flex items-center gap-3 cursor-pointer hover-elevate rounded-lg p-2 -mx-2"
                  onClick={() => setLocation(`/creator/edit/${content.id}`)}
                  data-testid={`top-content-${content.id}`}
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                    {content.coverImageUrl && (
                      <img 
                        src={content.coverImageUrl} 
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {content.contentType === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{content.title}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        {formatNumber(content.viewCount)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" />
                        {formatNumber(content.likeCount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <RoleAwareBottomNav />
    </div>
  );
}
