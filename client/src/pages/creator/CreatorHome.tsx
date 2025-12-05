import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Play,
  Pencil,
  BarChart3,
  FolderOpen,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const { user, userToken, reloadAuth } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { shuaName?: string; shuaBio?: string }) => {
      const res = await apiRequest('PATCH', '/api/creator/profile', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('creatorHome.profileUpdated') });
      setEditDialogOpen(false);
      reloadAuth();
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('creatorHome.profileUpdateFailed'), variant: 'destructive' });
    },
  });

  const handleOpenEditDialog = () => {
    setEditName(user?.shuaName || user?.displayName || '');
    setEditBio(user?.shuaBio || '');
    setEditDialogOpen(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      shuaName: editName,
      shuaBio: editBio,
    });
  };

  const displayName = user?.shuaName || user?.displayName || t('creator.defaultName');
  const displayBio = user?.shuaBio || t('creatorHome.bio');

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
                <h2 className="text-xl font-bold">{displayName}</h2>
                <Badge className="bg-pink-500/20 text-pink-200 border-pink-400/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {t('creator.badge')}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 h-6 w-6"
                  onClick={handleOpenEditDialog}
                  data-testid="button-edit-profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-sm text-white/70 mt-1">
                ID: SH{String(user?.id || 10001).padStart(6, '0')}
              </p>
              <p className="text-sm text-white/80 mt-2">
                {displayBio}
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
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation('/creator/analytics')}
            data-testid="card-analytics"
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#38B03B]/10 flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-[#38B03B]" />
              </div>
              <span className="text-xs">{t('creatorHome.analytics')}</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation('/creator/create')}
            data-testid="card-studio"
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs">{t('creatorHome.contentManagement')}</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation('/creator/edit/new')}
            data-testid="card-create"
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-2">
                <Plus className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-xs">{t('creatorHome.createNew')}</span>
            </CardContent>
          </Card>
        </div>

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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('creatorHome.editProfile')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('creatorHome.shuaName')}</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('creatorHome.shuaNamePlaceholder')}
                data-testid="input-shua-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('creatorHome.shuaBio')}</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={t('creatorHome.shuaBioPlaceholder')}
                rows={3}
                data-testid="input-shua-bio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
