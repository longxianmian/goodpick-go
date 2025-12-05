import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video, 
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Heart,
  MessageCircle,
  User
} from 'lucide-react';

type ContentType = 'video' | 'campaign';
type ContentStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface PendingContent {
  id: number;
  type: ContentType;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  storeName?: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  likeCount?: number;
  commentCount?: number;
  category?: string;
}

export function OpsContent() {
  const [contentType, setContentType] = useState<ContentType>('video');
  const [statusFilter, setStatusFilter] = useState<ContentStatus>('pending');
  const [selectedContent, setSelectedContent] = useState<PendingContent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const mockPendingVideos: PendingContent[] = [
    {
      id: 1001,
      type: 'video',
      title: '超好吃的泰式冬阴功！',
      description: '今天分享一家超级好吃的泰餐厅，他们的冬阴功真的太绝了！汤底酸辣适中，虾很新鲜...',
      thumbnailUrl: null,
      creatorName: '美食探店王',
      creatorAvatar: null,
      storeName: '泰香园餐厅',
      createdAt: new Date(),
      status: 'pending',
      likeCount: 0,
      commentCount: 0,
      category: 'food',
    },
    {
      id: 1002,
      type: 'video',
      title: '清迈夜市美食攻略',
      description: '带你逛清迈最大的夜市！这里有超多美食...',
      thumbnailUrl: null,
      creatorName: '旅行达人小李',
      creatorAvatar: null,
      createdAt: new Date(),
      status: 'pending',
      likeCount: 0,
      commentCount: 0,
      category: 'daily',
    },
    {
      id: 1003,
      type: 'video',
      title: '曼谷必打卡咖啡店',
      description: '发现一家超级有氛围的咖啡店，拍照绝了！',
      thumbnailUrl: null,
      creatorName: '咖啡控小美',
      creatorAvatar: null,
      storeName: 'Cafe Hopping BKK',
      createdAt: new Date(),
      status: 'pending',
      likeCount: 0,
      commentCount: 0,
      category: 'daily',
    },
  ];

  const mockPendingCampaigns: PendingContent[] = [
    {
      id: 2001,
      type: 'campaign',
      title: '新店开业5折优惠',
      description: '新店开业，全场菜品5折优惠，限时3天！',
      thumbnailUrl: null,
      creatorName: '金龙美食',
      creatorAvatar: null,
      storeName: '金龙美食',
      createdAt: new Date(),
      status: 'pending',
    },
    {
      id: 2002,
      type: 'campaign',
      title: '买一送一活动',
      description: '指定饮品买一送一，每人限领1张',
      thumbnailUrl: null,
      creatorName: '星巴克 Central',
      creatorAvatar: null,
      storeName: '星巴克 Central',
      createdAt: new Date(),
      status: 'pending',
    },
  ];

  const allContent = contentType === 'video' ? mockPendingVideos : mockPendingCampaigns;

  const filteredContent = allContent.filter(content => {
    if (statusFilter === 'all') return true;
    return content.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500">待审核</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected':
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category?: string) => {
    const categoryMap: Record<string, string> = {
      'food': '美食',
      'daily': '日常',
      'funny': '搞笑',
      'beauty': '美妆',
      'musicDance': '音乐舞蹈',
      'drama': '剧情',
      'healing': '治愈',
      'games': '游戏',
    };
    return category ? categoryMap[category] || category : '-';
  };

  const handleViewDetail = (content: PendingContent) => {
    setSelectedContent(content);
    setRejectReason('');
    setDetailDialogOpen(true);
  };

  const handleApprove = (contentId: number) => {
    console.log('Approve content:', contentId);
    setDetailDialogOpen(false);
  };

  const handleReject = (contentId: number) => {
    console.log('Reject content:', contentId, 'Reason:', rejectReason);
    setDetailDialogOpen(false);
    setRejectReason('');
  };

  const pendingVideoCount = mockPendingVideos.filter(c => c.status === 'pending').length;
  const pendingCampaignCount = mockPendingCampaigns.filter(c => c.status === 'pending').length;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all ${contentType === 'video' ? 'ring-2 ring-[#38B03B]' : ''}`}
          onClick={() => setContentType('video')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Video className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="font-semibold">短视频审核</div>
              <div className="text-sm text-muted-foreground">
                待审核: <span className="text-amber-600 font-medium">{pendingVideoCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${contentType === 'campaign' ? 'ring-2 ring-[#38B03B]' : ''}`}
          onClick={() => setContentType('campaign')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">活动审核</div>
              <div className="text-sm text-muted-foreground">
                待审核: <span className="text-amber-600 font-medium">{pendingCampaignCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContentStatus)}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            待审核
            {(contentType === 'video' ? pendingVideoCount : pendingCampaignCount) > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                {contentType === 'video' ? pendingVideoCount : pendingCampaignCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">已拒绝</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <div className="space-y-3">
            {filteredContent.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {contentType === 'video' ? (
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  ) : (
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  )}
                  <p>没有{statusFilter === 'pending' ? '待审核' : ''}内容</p>
                </CardContent>
              </Card>
            ) : (
              filteredContent.map((content) => (
                <Card key={content.id} className="hover-elevate cursor-pointer" onClick={() => handleViewDetail(content)}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {content.thumbnailUrl ? (
                          <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          content.type === 'video' ? (
                            <Play className="w-8 h-8 text-muted-foreground" />
                          ) : (
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          )
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{content.title}</h3>
                          {getStatusBadge(content.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {content.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{content.creatorName}</span>
                          </div>
                          {content.storeName && (
                            <div className="flex items-center gap-1">
                              <span>@{content.storeName}</span>
                            </div>
                          )}
                          {content.category && (
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(content.category)}
                            </Badge>
                          )}
                        </div>

                        {content.type === 'video' && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{content.likeCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              <span>{content.commentCount}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedContent?.type === 'video' ? (
                <Video className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              {selectedContent?.type === 'video' ? '视频详情' : '活动详情'}
            </DialogTitle>
            <DialogDescription>
              审核内容并进行操作
            </DialogDescription>
          </DialogHeader>

          {selectedContent && (
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
                {selectedContent.thumbnailUrl ? (
                  <img src={selectedContent.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Play className="w-12 h-12 text-muted-foreground" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{selectedContent.title}</h3>
                  {getStatusBadge(selectedContent.status)}
                </div>
                <p className="text-sm text-muted-foreground">{selectedContent.description}</p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedContent.creatorAvatar || undefined} />
                  <AvatarFallback>
                    {selectedContent.creatorName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{selectedContent.creatorName}</div>
                  {selectedContent.storeName && (
                    <div className="text-xs text-muted-foreground">@{selectedContent.storeName}</div>
                  )}
                </div>
              </div>

              {selectedContent.status === 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">拒绝原因（可选）</label>
                  <Textarea
                    placeholder="如需拒绝，请填写原因..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {selectedContent?.status === 'pending' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => handleReject(selectedContent.id)}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                拒绝
              </Button>
              <Button 
                onClick={() => handleApprove(selectedContent.id)}
                className="bg-[#38B03B] hover:bg-[#2d8a2f]"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                通过审核
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
