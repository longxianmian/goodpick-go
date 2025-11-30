import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  Menu, 
  Video,
  Heart,
  Eye,
  FileText,
  Upload,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CreatorContent {
  id: number;
  title: string;
  description: string | null;
  contentType: 'video' | 'article';
  status: 'draft' | 'published' | 'reviewing' | 'rejected';
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export default function CreatorStudio() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, userToken } = useAuth();
  
  const { data: contentsResponse, isLoading } = useQuery<{ success: boolean; data: CreatorContent[] }>({
    queryKey: ['/api/creator/contents'],
    enabled: !!userToken,
  });

  const allContents = contentsResponse?.data || [];
  const publishedContents = allContents.filter(c => c.status === 'published' || c.status === 'reviewing' || c.status === 'rejected');
  const draftContents = allContents.filter(c => c.status === 'draft');
  const totalViews = allContents.reduce((sum, c) => sum + (c.views || 0), 0);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    
    if (diffMins < 60) return `${diffMins}${t('common.minutesAgo') || '分钟前'}`;
    if (diffHours < 24) return `${diffHours}${t('common.hoursAgo') || '小时前'}`;
    if (diffDays < 7) return `${diffDays}${t('common.daysAgo') || '天前'}`;
    return `${diffWeeks}${t('common.weeksAgo') || '周前'}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />{t('creatorStudio.statusActive')}</Badge>;
      case 'reviewing':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />{t('creatorStudio.statusReviewing')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><AlertCircle className="w-3 h-3 mr-1" />{t('creatorStudio.statusRejected')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
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
          <span className="text-lg font-semibold">{t('creatorStudio.title')}</span>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            data-testid="button-menu"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-lg p-3 text-center" data-testid="stat-published">
              <div className="text-2xl font-bold">{isLoading ? '-' : publishedContents.length}</div>
              <div className="text-xs text-white/70">{t('creatorStudio.publishedCount')}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center" data-testid="stat-drafts">
              <div className="text-2xl font-bold">{isLoading ? '-' : draftContents.length}</div>
              <div className="text-xs text-white/70">{t('creatorStudio.draftsCount')}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center" data-testid="stat-total-views">
              <div className="text-2xl font-bold">{isLoading ? '-' : formatNumber(totalViews)}</div>
              <div className="text-xs text-white/70">{t('creatorStudio.totalViews')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4">
        <Card className="mb-4">
          <CardContent className="p-4">
            <Button 
              className="w-full bg-[#38B03B] hover:bg-[#2d8f30]"
              onClick={() => setLocation('/creator/edit/new')}
              data-testid="button-create-new"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('creatorStudio.createNew')}
            </Button>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/creator/edit/new?type=video')}
                data-testid="button-upload-video"
              >
                <Video className="w-4 h-4 mr-2" />
                {t('creatorStudio.uploadVideo')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/creator/edit/new?type=article')}
                data-testid="button-write-article"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('creatorStudio.writeArticle')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="published" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="published" data-testid="tab-published">
              {t('creatorStudio.tabPublished')} ({publishedContents.length})
            </TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">
              {t('creatorStudio.tabDrafts')} ({draftContents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : publishedContents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('creatorStudio.noPublished')}</p>
              </div>
            ) : (
              publishedContents.map((content) => (
                <Card key={content.id} data-testid={`published-item-${content.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          content.contentType === 'video' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        }`}>
                          {content.contentType === 'video' ? (
                            <Video className="w-6 h-6 text-red-500" />
                          ) : (
                            <FileText className="w-6 h-6 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{content.title}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatNumber(content.views || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {formatNumber(content.likes || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(content.status)}
                            <span className="text-xs text-muted-foreground">{formatRelativeTime(content.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`menu-${content.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/creator/edit/${content.id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('creatorStudio.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/creator/edit/${content.id}?tab=promotion`)}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            {t('creatorStudio.promote')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('creatorStudio.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="drafts" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : draftContents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('creatorStudio.noDrafts')}</p>
              </div>
            ) : (
              draftContents.map((draft) => (
                <Card key={draft.id} data-testid={`draft-item-${draft.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          draft.contentType === 'video' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        }`}>
                          {draft.contentType === 'video' ? (
                            <Video className="w-6 h-6 text-red-500" />
                          ) : (
                            <FileText className="w-6 h-6 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{draft.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('creatorStudio.lastEdited')}: {formatRelativeTime(draft.updatedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setLocation(`/creator/edit/${draft.id}`)}
                          data-testid={`edit-draft-${draft.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" data-testid={`delete-draft-${draft.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <RoleAwareBottomNav forceRole="creator" />
    </div>
  );
}
