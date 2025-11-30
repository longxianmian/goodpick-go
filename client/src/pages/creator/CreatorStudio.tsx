import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CreatorStudio() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const mockDrafts = [
    { id: 'd1', title: '下周新店探访计划', type: 'video', updatedAt: '2小时前', progress: 60 },
    { id: 'd2', title: '美食攻略草稿', type: 'article', updatedAt: '昨天', progress: 30 },
  ];

  const mockPublished = [
    { id: 'p1', title: '美食探店vlog', views: 12500, likes: 860, type: 'video', status: 'active', publishedAt: '3天前' },
    { id: 'p2', title: '周末好去处推荐', views: 8600, likes: 520, type: 'article', status: 'active', publishedAt: '5天前' },
    { id: 'p3', title: '新店开业优惠', views: 15800, likes: 1200, type: 'video', status: 'active', publishedAt: '1周前' },
    { id: 'p4', title: '隐藏菜单大公开', views: 9200, likes: 680, type: 'video', status: 'reviewing', publishedAt: '2周前' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
              <div className="text-2xl font-bold">{mockPublished.length}</div>
              <div className="text-xs text-white/70">{t('creatorStudio.publishedCount')}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center" data-testid="stat-drafts">
              <div className="text-2xl font-bold">{mockDrafts.length}</div>
              <div className="text-xs text-white/70">{t('creatorStudio.draftsCount')}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center" data-testid="stat-total-views">
              <div className="text-2xl font-bold">{formatNumber(mockPublished.reduce((sum, p) => sum + p.views, 0))}</div>
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
              onClick={() => {}}
              data-testid="button-create-new"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('creatorStudio.createNew')}
            </Button>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button variant="outline" data-testid="button-upload-video">
                <Video className="w-4 h-4 mr-2" />
                {t('creatorStudio.uploadVideo')}
              </Button>
              <Button variant="outline" data-testid="button-write-article">
                <FileText className="w-4 h-4 mr-2" />
                {t('creatorStudio.writeArticle')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="published" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="published" data-testid="tab-published">
              {t('creatorStudio.tabPublished')} ({mockPublished.length})
            </TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">
              {t('creatorStudio.tabDrafts')} ({mockDrafts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="mt-4 space-y-3">
            {mockPublished.map((content) => (
              <Card key={content.id} data-testid={`published-item-${content.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        content.type === 'video' ? 'bg-red-500/10' : 'bg-blue-500/10'
                      }`}>
                        {content.type === 'video' ? (
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
                            {formatNumber(content.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {formatNumber(content.likes)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(content.status)}
                          <span className="text-xs text-muted-foreground">{content.publishedAt}</span>
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
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          {t('creatorStudio.promote')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="drafts" className="mt-4 space-y-3">
            {mockDrafts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('creatorStudio.noDrafts')}</p>
              </div>
            ) : (
              mockDrafts.map((draft) => (
                <Card key={draft.id} data-testid={`draft-item-${draft.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          draft.type === 'video' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        }`}>
                          {draft.type === 'video' ? (
                            <Video className="w-6 h-6 text-red-500" />
                          ) : (
                            <FileText className="w-6 h-6 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{draft.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('creatorStudio.lastEdited')}: {draft.updatedAt}
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{t('creatorStudio.progress')}</span>
                              <span>{draft.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#38B03B] rounded-full"
                                style={{ width: `${draft.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" data-testid={`edit-draft-${draft.id}`}>
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
