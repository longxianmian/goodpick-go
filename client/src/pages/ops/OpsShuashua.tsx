import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronLeft,
  Eye,
  Video,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Heart,
  MessageCircle,
  Share2,
  ArrowRight
} from 'lucide-react';

export default function OpsShuashua() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  const stats = {
    totalVideos: 3256,
    todayUploads: 45,
    pendingReview: 12,
    totalViews: 2586000,
    viewsGrowth: 18.5,
    totalCreators: 856,
    activeCreators: 234,
    avgEngagement: 8.6,
  };

  const pendingVideos = [
    { id: 1, title: '超好吃的泰式冬阴功！', creator: '美食探店王', duration: '2:35', createdAt: '10分钟前' },
    { id: 2, title: '清迈夜市美食攻略', creator: '旅行达人小李', duration: '5:12', createdAt: '25分钟前' },
    { id: 3, title: '曼谷必打卡咖啡店', creator: '咖啡控小美', duration: '3:45', createdAt: '1小时前' },
  ];

  const topVideos = [
    { id: 1, title: '周末探店｜隐藏在巷子里的神仙泰餐', views: 125600, likes: 8560, creator: '小红书吃货' },
    { id: 2, title: '清迈古城最美咖啡店合集', views: 98400, likes: 6230, creator: '旅行vlog' },
    { id: 3, title: '曼谷夜市必吃TOP10', views: 86200, likes: 5890, creator: '美食探店王' },
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
          <span className="text-base font-semibold">刷刷运营</span>
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
        <div className="grid grid-cols-2 gap-3">
          <Card data-testid="card-total-videos">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Video className="w-4 h-4 text-[#38B03B]" />
                <span className="text-xs">视频总数</span>
              </div>
              <div className="text-xl font-bold">{formatNumber(stats.totalVideos)}</div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>今日 +{stats.todayUploads}</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-views">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs">总播放量</span>
              </div>
              <div className="text-xl font-bold">{formatNumber(stats.totalViews)}</div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>+{stats.viewsGrowth}%</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-creators">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs">创作者</span>
              </div>
              <div className="text-xl font-bold">{stats.totalCreators}</div>
              <div className="text-xs text-muted-foreground mt-1">
                活跃: {stats.activeCreators}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-review">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs">待审核</span>
              </div>
              <div className="text-xl font-bold text-amber-600">{stats.pendingReview}</div>
              <div className="text-xs text-muted-foreground mt-1">
                需要处理
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                待审核视频
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
            {pendingVideos.map((video) => (
              <div 
                key={video.id} 
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                data-testid={`pending-video-${video.id}`}
              >
                <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                  <Play className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{video.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{video.creator}</span>
                    <span>{video.duration}</span>
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
              热门视频 TOP3
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topVideos.map((video, index) => (
              <div 
                key={video.id} 
                className="flex items-center gap-3"
                data-testid={`top-video-${video.id}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{video.title}</div>
                  <div className="text-xs text-muted-foreground">{video.creator}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs">
                    <Eye className="w-3 h-3" />
                    <span>{formatNumber(video.views)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <Heart className="w-3 h-3" />
                    <span>{formatNumber(video.likes)}</span>
                  </div>
                </div>
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
                <Video className="w-5 h-5 text-[#38B03B]" />
                <span className="text-xs">内容审核</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setLocation('/ops')}
              >
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-xs">创作者管理</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav />
    </div>
  );
}
