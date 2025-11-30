import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Menu, 
  Video,
  Heart,
  Eye,
  FileText,
  Grid3X3,
  List,
  Zap,
  Play
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface CreatorContent {
  id: number;
  title: string;
  contentType: 'video' | 'article' | 'image';
  mediaUrls: string[];
  coverImageUrl?: string;
  viewCount: number;
  likeCount: number;
  status: string;
}

export default function CreatorHome() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, token: userToken } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { data: contentsResponse, isLoading } = useQuery<{ success: boolean; data: CreatorContent[] }>({
    queryKey: ['/api/creator/contents'],
    enabled: !!userToken,
  });

  const { data: statsResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/creator/stats'],
    enabled: !!userToken,
  });
  
  const contents = contentsResponse?.data || [];
  const publishedContents = contents.filter(c => c.status === 'published');
  const stats = statsResponse?.data || {};

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
          <span className="text-lg font-semibold">{t('creatorHome.title')}</span>
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
            <Avatar className="w-20 h-20 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-2xl">
                {user?.displayName?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{user?.displayName || t('creator.defaultName')}</h2>
                <Badge className="bg-pink-500/20 text-pink-200 border-pink-400/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {t('creator.badge')}
                </Badge>
              </div>
              <p className="text-sm text-white/70 mt-1">
                ID: SH{String(user?.id || 10001).padStart(6, '0')}
              </p>
              <p className="text-sm text-white/80 mt-2">
                {t('creatorHome.bio')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-around mt-6 pt-4 border-t border-white/20">
            <div className="text-center" data-testid="stat-followers">
              <div className="text-2xl font-bold">{formatNumber(stats.totalViews || 0)}</div>
              <div className="text-xs text-white/70">{t('creator.totalViews')}</div>
            </div>
            <div className="text-center" data-testid="stat-following">
              <div className="text-2xl font-bold">{stats.publishedContents || 0}</div>
              <div className="text-xs text-white/70">{t('creator.publishedWorks')}</div>
            </div>
            <div className="text-center" data-testid="stat-likes">
              <div className="text-2xl font-bold">{formatNumber(stats.totalLikes || 0)}</div>
              <div className="text-xs text-white/70">{t('creator.totalLikes')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{t('creatorHome.myWorks')}</span>
            <Badge variant="secondary" className="text-xs">{publishedContents.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">{t('common.loading')}</div>
          </div>
        ) : publishedContents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Video className="w-12 h-12 mb-2 opacity-50" />
            <p>{t('creatorHome.noWorks')}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation('/creator/create')}
            >
              {t('creatorHome.createFirst')}
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-1">
            {publishedContents.map((content) => (
              <div 
                key={content.id}
                className="aspect-[3/4] bg-muted rounded-md relative overflow-hidden group cursor-pointer"
                data-testid={`content-grid-${content.id}`}
                onClick={() => setLocation(`/creator/edit/${content.id}`)}
              >
                {content.mediaUrls?.[0] && (
                  <img 
                    src={content.mediaUrls[0]} 
                    alt={content.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {content.contentType === 'video' && (
                  <div className="absolute top-2 left-2">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="text-white text-xs font-medium line-clamp-2">{content.title}</div>
                  <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-3 h-3" />
                      {formatNumber(content.viewCount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {publishedContents.map((content) => (
              <div 
                key={content.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg cursor-pointer"
                data-testid={`content-list-${content.id}`}
                onClick={() => setLocation(`/creator/edit/${content.id}`)}
              >
                <div className="w-24 h-16 bg-muted rounded-md relative overflow-hidden flex-shrink-0">
                  {content.mediaUrls?.[0] && (
                    <img 
                      src={content.mediaUrls[0]} 
                      alt={content.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {content.contentType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{content.title}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(content.viewCount || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(content.likeCount || 0)}
                    </span>
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {content.contentType === 'video' ? (
                      <><Video className="w-3 h-3 mr-1" />{t('creator.videos')}</>
                    ) : (
                      <><FileText className="w-3 h-3 mr-1" />{t('creator.articles')}</>
                    )}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/creator/create')}
            data-testid="button-manage-content"
          >
            {t('creatorHome.manageInStudio')}
          </Button>
        </div>
      </main>

      <RoleAwareBottomNav forceRole="creator" />
    </div>
  );
}
