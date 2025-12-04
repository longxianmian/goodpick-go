import { useLocation, useRoute } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Play,
  Eye,
  Heart,
  Grid3X3,
  List,
  FileText,
  Video
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UserProfileData {
  id: number;
  displayName: string;
  shuaName: string | null;
  shuaBio: string | null;
  avatarUrl: string | null;
}

interface UserContent {
  id: number;
  title: string;
  contentType: 'video' | 'article' | 'image';
  mediaUrls: string[];
  coverImageUrl?: string;
  viewCount: number;
  likeCount: number;
}

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/user/:id');
  const userId = params?.id;
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: profileResponse, isLoading: profileLoading } = useQuery<{ success: boolean; data: UserProfileData }>({
    queryKey: ['/api/users', userId, 'profile'],
    enabled: !!userId,
  });

  const { data: contentsResponse, isLoading: contentsLoading } = useQuery<{ success: boolean; data: UserContent[] }>({
    queryKey: ['/api/users', userId, 'contents'],
    enabled: !!userId,
  });

  const profile = profileResponse?.data;
  const contents = contentsResponse?.data || [];
  const isLoading = profileLoading || contentsLoading;

  const displayName = profile?.shuaName || profile?.displayName || t('creator.defaultName');
  const displayBio = profile?.shuaBio || t('creatorHome.bio');

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  const handleContentClick = (content: UserContent) => {
    if (content.contentType === 'video') {
      setLocation(`/videos/${content.id}`);
    } else {
      setLocation(`/articles/${content.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">{t('common.notFound')}</div>
        <Button variant="outline" onClick={() => setLocation('/')}>
          {t('common.backToHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-4">
      <div className="bg-gradient-to-b from-[#38B03B] to-[#2d8f30] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('userProfile.title')}</span>
          <div className="w-9" />
        </header>

        <div className="flex flex-col items-center py-6 px-4">
          <Avatar className="w-20 h-20 border-2 border-white/30">
            <AvatarImage src={profile.avatarUrl || ''} />
            <AvatarFallback className="text-xl bg-white/20 text-white">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-lg font-bold mt-3">{displayName}</h2>
          <p className="text-sm text-white/80 mt-1 text-center max-w-[200px]">{displayBio}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 px-8 py-4 text-center">
          <div>
            <div className="text-2xl font-bold">{contents.length}</div>
            <div className="text-xs text-white/80">{t('userProfile.works')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {formatNumber(contents.reduce((sum, c) => sum + (c.likeCount || 0), 0))}
            </div>
            <div className="text-xs text-white/80">{t('userProfile.likes')}</div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t('userProfile.works')}</span>
            <span className="text-muted-foreground text-sm">{contents.length}</span>
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

        {contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Video className="w-12 h-12 mb-2 opacity-50" />
            <p>{t('userProfile.noWorks')}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-1">
            {contents.map((content) => (
              <div 
                key={content.id}
                className="aspect-[3/4] bg-muted rounded-md relative overflow-hidden group cursor-pointer"
                data-testid={`content-grid-${content.id}`}
                onClick={() => handleContentClick(content)}
              >
                {(content.coverImageUrl || (content.contentType !== 'video' && content.mediaUrls?.[0])) && (
                  <img 
                    src={content.coverImageUrl || content.mediaUrls?.[0]} 
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
                {content.contentType === 'article' && (
                  <div className="absolute top-2 left-2">
                    <FileText className="w-4 h-4 text-white" />
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
            {contents.map((content) => (
              <div 
                key={content.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg cursor-pointer"
                data-testid={`content-list-${content.id}`}
                onClick={() => handleContentClick(content)}
              >
                <div className="w-24 h-16 bg-muted rounded-md relative overflow-hidden flex-shrink-0">
                  {(content.coverImageUrl || (content.contentType !== 'video' && content.mediaUrls?.[0])) && (
                    <img 
                      src={content.coverImageUrl || content.mediaUrls?.[0]} 
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
