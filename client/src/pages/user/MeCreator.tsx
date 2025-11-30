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
  Video,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  TrendingUp,
  TrendingDown,
  Upload,
  Megaphone,
  DollarSign,
  Users,
  Star,
  Clock,
  BarChart3,
  Settings,
  FileText,
  Zap
} from 'lucide-react';

export default function MeCreator() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, logoutUser } = useAuth();
  
  const mockAccountStats = {
    followers: 12580,
    following: 256,
    totalViews: 1258600,
    totalLikes: 86400,
    totalComments: 12560,
    totalShares: 4280,
  };

  const mockContentStats = {
    totalVideos: 128,
    totalArticles: 56,
    avgViews: 9800,
    avgEngagement: 8.5,
  };

  const mockEarnings = {
    thisMonth: 12580,
    lastMonth: 10260,
    pending: 3680,
    total: 86500,
  };

  const mockRecentContent = [
    { id: 1, title: '美食探店vlog', views: 12500, likes: 860, type: 'video' },
    { id: 2, title: '周末好去处推荐', views: 8600, likes: 520, type: 'article' },
    { id: 3, title: '新店开业优惠', views: 15800, likes: 1200, type: 'video' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
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
          <span className="text-lg font-semibold">{t('creator.title')}</span>
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
                {user?.displayName?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{user?.displayName || t('creator.defaultName')}</h2>
                <Badge className="bg-pink-500/20 text-pink-200 border-pink-400/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {t('creator.badge')}
                </Badge>
              </div>
              <p className="text-sm text-white/70 mt-1">
                ID: SH{String(user?.id || 10001).padStart(6, '0')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-around mt-6 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="text-xl font-bold">{formatNumber(mockAccountStats.followers)}</div>
              <div className="text-xs text-white/70">{t('creator.followers')}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{mockAccountStats.following}</div>
              <div className="text-xs text-white/70">{t('creator.following')}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{formatNumber(mockAccountStats.totalLikes)}</div>
              <div className="text-xs text-white/70">{t('creator.totalLikes')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#ff6b6b]" />
              <span className="text-sm font-semibold">{t('creator.accountData')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30" data-testid="stat-total-views">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">{t('creator.totalViews')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-views">{formatNumber(mockAccountStats.totalViews)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+15.8%</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30" data-testid="stat-engagement-rate">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-xs text-muted-foreground">{t('creator.engagementRate')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-engagement-rate">{mockContentStats.avgEngagement}%</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+2.1%</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30" data-testid="stat-total-content">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">{t('creator.totalContent')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-total-content">{mockContentStats.totalVideos + mockContentStats.totalArticles}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{mockContentStats.totalVideos} {t('creator.videos')} / {mockContentStats.totalArticles} {t('creator.articles')}</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30" data-testid="stat-monthly-earnings">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">{t('creator.monthlyEarnings')}</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-monthly-earnings">{t('common.currencySymbol')}{formatNumber(mockEarnings.thisMonth)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+22.6%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ff6b6b]" />
                <span className="text-sm font-semibold">{t('creator.recentContent')}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/creator/studio')} data-testid="button-view-all-content">
                {t('creator.viewAll')}
              </Button>
            </div>
            
            <div className="space-y-3">
              {mockRecentContent.map((content) => (
                <div 
                  key={content.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`content-item-${content.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      content.type === 'video' ? 'bg-red-500/10' : 'bg-blue-500/10'
                    }`}>
                      {content.type === 'video' ? (
                        <Video className="w-5 h-5 text-red-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{content.title}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(content.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatNumber(content.likes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-[#ff6b6b]" />
              <span className="text-sm font-semibold">{t('creator.quickActions')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/creator')}
                data-testid="link-creator-home"
              >
                <Star className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <div className="text-sm font-medium">{t('creator.accountHome')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/creator/studio')}
                data-testid="link-creator-studio"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-sm font-medium">{t('creator.contentStudio')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/creator/ads')}
                data-testid="link-creator-ads"
              >
                <Megaphone className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <div className="text-sm font-medium">{t('creator.adPromotion')}</div>
              </div>
              <div 
                className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate"
                onClick={() => setLocation('/creator/earnings')}
                data-testid="link-creator-earnings"
              >
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-sm font-medium">{t('creator.earnings')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav />
    </div>
  );
}
