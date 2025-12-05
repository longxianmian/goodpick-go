import { useState, useEffect, useMemo } from 'react';
import { useLocation, useRoute, useSearch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  Save,
  Send,
  Image,
  Video,
  Link2,
  Tag,
  DollarSign,
  Ticket,
  Calendar,
  Plus,
  X,
  AlertCircle,
  Loader2,
  Upload,
  GripVertical,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

type BillingMode = 'cpc' | 'cpm' | 'cps';

interface MediaFile {
  type: 'image' | 'video';
  url: string;
}

interface PromotionItem {
  id: number;
  type: 'coupon' | 'campaign';
  title: string;
  merchantName: string;
  commission: number;
  billingMode: BillingMode;
  price: number;
}

interface MediaDropzoneProps {
  contentType: 'video' | 'article';
  onFilesUpload: (files: File[]) => void;
  uploading: boolean;
  t: (key: string) => string;
}

function MediaDropzone({ contentType, onFilesUpload, uploading, t }: MediaDropzoneProps) {
  const dropzoneAccept = contentType === 'video' 
    ? { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }
    : { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFilesUpload,
    accept: dropzoneAccept,
    multiple: contentType === 'article',
    maxFiles: contentType === 'article' ? 9 : 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive 
          ? 'border-[#38B03B] bg-green-50 dark:bg-green-950/20' 
          : 'border-muted-foreground/30 hover:border-muted-foreground/50'
      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-testid="dropzone"
    >
      <input {...getInputProps()} />
      {contentType === 'video' ? (
        <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
      ) : (
        <Image className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
      )}
      <p className="text-sm text-muted-foreground">
        {contentType === 'video' ? t('creator.editor.uploadVideo') : t('creator.editor.uploadImages')}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{t('creator.editor.dragOrClick')}</p>
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2" 
        disabled={uploading}
        data-testid="button-upload"
      >
        <Plus className="w-4 h-4 mr-1" />
        {contentType === 'video' ? t('creator.editor.selectFile') : t('creator.editor.selectImages')}
      </Button>
    </div>
  );
}

export default function ContentEditor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/creator/edit/:id');
  const searchString = useSearch();
  const { t } = useLanguage();
  const { user, userToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNewContent = !params?.id || params.id === 'new';
  const contentId = params?.id;
  const numericContentId = contentId && contentId !== 'new' ? parseInt(contentId) : null;

  const searchParams = new URLSearchParams(searchString);
  const openPromotionTab = searchParams.get('tab') === 'promotion';
  const urlType = searchParams.get('type') as 'video' | 'article' | null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('');
  const [existingContentType, setExistingContentType] = useState<'video' | 'article' | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  
  // 计算内容类型：优先使用编辑时的现有类型，其次使用URL参数，最后默认为视频
  const contentType = useMemo(() => {
    if (existingContentType) {
      return existingContentType;
    }
    if (urlType) {
      return urlType;
    }
    return 'video';
  }, [existingContentType, urlType]);
  
  // 视频分类选项
  const categoryOptions = [
    { value: 'funny', label: t('categories.funny') },
    { value: 'musicDance', label: t('categories.musicDance') },
    { value: 'drama', label: t('categories.drama') },
    { value: 'daily', label: t('categories.daily') },
    { value: 'healing', label: t('categories.healing') },
    { value: 'food', label: t('categories.food') },
    { value: 'beauty', label: t('categories.beauty') },
    { value: 'games', label: t('categories.games') },
  ];
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionItem | null>(null);
  const [enablePromotion, setEnablePromotion] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCover, setUploadingCover] = useState(false);

  const { data: existingContent, isLoading: isLoadingContent } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/creator/contents', numericContentId],
    enabled: !!numericContentId && !!userToken,
  });

  const { data: availablePromotions, isLoading: isLoadingPromotions } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/creator/available-promotions'],
    enabled: !!userToken,
  });

  const mockPromotions: PromotionItem[] = [
    { id: 1, type: 'coupon', title: '新店开业8折优惠券', merchantName: '美味餐厅', commission: 15, billingMode: 'cpc', price: 0.5 },
    { id: 2, type: 'coupon', title: '满100减30优惠券', merchantName: '火锅世家', commission: 20, billingMode: 'cps', price: 5 },
    { id: 3, type: 'campaign', title: '周年庆抽奖活动', merchantName: '购物中心', commission: 10, billingMode: 'cpm', price: 8 },
  ];

  const promotionsList: PromotionItem[] = (availablePromotions?.data && availablePromotions.data.length > 0)
    ? availablePromotions.data.map((p: any) => ({
        id: p.id,
        type: p.type || 'campaign',
        title: p.title,
        merchantName: p.merchantName,
        commission: 15,
        billingMode: p.billingMode || 'cpc',
        price: p.price || 0.5,
      }))
    : mockPromotions;

  const uploadFile = async (file: File): Promise<MediaFile | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/user/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        return {
          type: result.fileType as 'image' | 'video',
          url: result.fileUrl,
        };
      }
      return null;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const currentMode = contentType === 'video' ? 'video' : 'image';
    const maxFiles = currentMode === 'video' ? 1 : 9;
    
    if (mediaFiles.length + files.length > maxFiles) {
      toast({
        title: t('common.error'),
        description: currentMode === 'video' 
          ? t('creator.editor.maxOneVideo') 
          : t('creator.editor.maxNineImages'),
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const uploadedFiles: MediaFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      
      if (currentMode === 'video' && !isVideo) {
        toast({
          title: t('common.error'),
          description: t('creator.editor.pleaseSelectVideo'),
          variant: 'destructive',
        });
        continue;
      }
      if (currentMode === 'image' && isVideo) {
        toast({
          title: t('common.error'),
          description: t('creator.editor.pleaseSelectImage'),
          variant: 'destructive',
        });
        continue;
      }

      const uploaded = await uploadFile(file);
      if (uploaded) {
        uploadedFiles.push(uploaded);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setMediaFiles([...mediaFiles, ...uploadedFiles]);
    setUploading(false);
    setUploadProgress(0);

    if (uploadedFiles.length > 0) {
      toast({
        title: t('common.success'),
        description: t('creator.editor.uploadSuccess'),
      });
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handleCoverUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: t('creator.editor.pleaseSelectImage'),
        variant: 'destructive',
      });
      return;
    }

    setUploadingCover(true);
    const uploaded = await uploadFile(file);
    setUploadingCover(false);

    if (uploaded) {
      setCoverImageUrl(uploaded.url);
      toast({
        title: t('common.success'),
        description: t('creator.editor.coverUploaded'),
      });
    }
  };

  const removeCover = () => {
    setCoverImageUrl('');
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/creator/contents', data);
      const result = await res.json();
      return { ...result, requestedStatus: data.status };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/creator/contents'] });
      const isPublished = result.requestedStatus === 'published';
      toast({ 
        title: isPublished ? t('creator.editor.publishSuccess') : t('creator.editor.saveSuccess'), 
        description: isPublished ? t('creator.editor.contentPublished') : t('creator.editor.draftSaved') 
      });
      if (result?.data?.id) {
        setLocation(`/creator/edit/${result.data.id}`);
      }
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('creator.editor.saveFailed'), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', `/api/creator/contents/${numericContentId}`, data);
      const result = await res.json();
      return { ...result, requestedStatus: data.status };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/creator/contents'] });
      const isPublished = result.requestedStatus === 'published';
      toast({ 
        title: isPublished ? t('creator.editor.publishSuccess') : t('creator.editor.saveSuccess'), 
        description: isPublished ? t('creator.editor.contentPublished') : t('creator.editor.draftSaved') 
      });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('creator.editor.saveFailed'), variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (existingContent?.data) {
      const existingType = existingContent.data.contentType as 'video' | 'article';
      if (existingType) {
        setExistingContentType(existingType);
      }
      setTitle(existingContent.data.title || '');
      setContent(existingContent.data.description || '');
      setCategory(existingContent.data.category || '');
      setCoverImageUrl(existingContent.data.coverImageUrl || '');
      if (existingContent.data.mediaUrls && Array.isArray(existingContent.data.mediaUrls)) {
        const urls = existingContent.data.mediaUrls;
        const mediaType = existingType === 'article' ? 'image' : 'video';
        setMediaFiles(urls.map((url: string) => ({ type: mediaType as 'image' | 'video', url })));
      }
      if (existingContent.data.promotionId) {
        setEnablePromotion(true);
      }
    }
    
    if (openPromotionTab) {
      setEnablePromotion(true);
      setShowPromotionDialog(true);
    }
  }, [existingContent, openPromotionTab]);

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast({ title: t('common.error'), description: t('creator.editor.titleRequired'), variant: 'destructive' });
      return;
    }
    
    const data = {
      contentType,
      category: category || null,
      title: title.trim(),
      description: content,
      status: 'draft',
      mediaUrls: mediaFiles.map(f => f.url),
      coverImageUrl: coverImageUrl || null,
      promotionId: selectedPromotion?.id || null,
    };
    
    if (numericContentId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast({ title: t('common.error'), description: t('creator.editor.titleRequired'), variant: 'destructive' });
      return;
    }
    if (mediaFiles.length === 0) {
      toast({ title: t('common.error'), description: t('creator.editor.mediaRequired'), variant: 'destructive' });
      return;
    }
    if (contentType === 'video' && !coverImageUrl) {
      toast({ title: t('common.error'), description: t('creator.editor.coverRequired'), variant: 'destructive' });
      return;
    }
    
    const data = {
      contentType,
      category: category || null,
      title: title.trim(),
      description: content,
      status: 'published',
      mediaUrls: mediaFiles.map(f => f.url),
      coverImageUrl: coverImageUrl || null,
      promotionId: selectedPromotion?.id || null,
    };
    
    if (numericContentId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPublishing = createMutation.isPending || updateMutation.isPending;

  const handleSelectPromotion = (promotion: PromotionItem) => {
    setSelectedPromotion(promotion);
    setEnablePromotion(true);
    setShowPromotionDialog(false);
  };

  const handleRemovePromotion = () => {
    setSelectedPromotion(null);
    setEnablePromotion(false);
  };

  const getBillingModeLabel = (mode: BillingMode) => {
    switch (mode) {
      case 'cpc': return t('creator.billing.cpc');
      case 'cpm': return t('creator.billing.cpm');
      case 'cps': return t('creator.billing.cps');
    }
  };

  const getBillingModeDesc = (mode: BillingMode, price: number) => {
    switch (mode) {
      case 'cpc': return `${t('common.currencySymbol')}${price}/${t('creator.billing.perClick')}`;
      case 'cpm': return `${t('common.currencySymbol')}${price}/${t('creator.billing.per1000Views')}`;
      case 'cps': return `${price}%${t('creator.billing.perSale')}`;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-6">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/creator/create')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">
            {isNewContent ? t('creator.editor.newContent') : t('creator.editor.editContent')}
          </span>
          <div className="w-9" />
        </header>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('creator.editor.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('creator.editor.title')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('creator.editor.titlePlaceholder')}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#38B03B]" />
                {t('creator.editor.category')}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder={t('creator.editor.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`category-option-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">{t('creator.editor.content')}</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('creator.editor.contentPlaceholder')}
                className="min-h-[120px]"
                data-testid="input-content"
              />
            </div>

            <div className="space-y-3">
              {mediaFiles.length > 0 && (
                <div className={`grid gap-2 ${contentType === 'video' ? '' : 'grid-cols-3'}`}>
                  {mediaFiles.map((file, index) => (
                    <div 
                      key={file.url} 
                      className="relative group aspect-video bg-muted rounded-lg overflow-hidden"
                      data-testid={`media-item-${index}`}
                    >
                      {file.type === 'video' ? (
                        <video
                          src={file.url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <img
                          src={file.url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute bottom-2 right-2 h-6 w-6 bg-black/60 text-white"
                        onClick={() => removeMedia(index)}
                        data-testid={`button-remove-media-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          {file.type === 'video' ? (
                            <><Video className="h-3 w-3 mr-1" />{t('creator.videos')}</>
                          ) : (
                            <><Image className="h-3 w-3 mr-1" />{t('creator.articles')}</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('creator.editor.uploading')}
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {(contentType === 'video' ? mediaFiles.length < 1 : mediaFiles.length < 9) && (
                <MediaDropzone 
                  key={contentType}
                  contentType={contentType} 
                  onFilesUpload={handleFilesUpload} 
                  uploading={uploading}
                  t={t}
                />
              )}
            </div>

            {contentType === 'video' && (
              <div className="space-y-2 mt-4 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-[#38B03B]" />
                  {t('creator.editor.coverImage')}
                  <span className="text-xs text-red-500">*</span>
                </Label>
                
                {coverImageUrl ? (
                  <div className="relative group aspect-video bg-muted rounded-lg overflow-hidden max-w-[200px]">
                    <img
                      src={coverImageUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeCover}
                      data-testid="button-remove-cover"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                      <Image className="h-3 w-3 mr-1" />
                      {t('creator.editor.cover')}
                    </Badge>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors max-w-[200px] ${
                      uploadingCover ? 'opacity-50 cursor-not-allowed' : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                    }`}
                    onClick={() => {
                      if (!uploadingCover) {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files) handleCoverUpload(Array.from(files));
                        };
                        input.click();
                      }
                    }}
                    data-testid="dropzone-cover"
                  >
                    {uploadingCover ? (
                      <Loader2 className="w-8 h-8 mx-auto text-muted-foreground/50 animate-spin" />
                    ) : (
                      <>
                        <Image className="w-8 h-8 mx-auto text-muted-foreground/50 mb-1" />
                        <p className="text-xs text-muted-foreground">{t('creator.editor.uploadCover')}</p>
                      </>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('creator.editor.coverHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#38B03B]" />
                {t('creator.editor.promotion')}
              </CardTitle>
              <Switch
                checked={enablePromotion}
                onCheckedChange={(checked) => {
                  setEnablePromotion(checked);
                  if (checked && !selectedPromotion) {
                    setShowPromotionDialog(true);
                  }
                }}
                data-testid="switch-promotion"
              />
            </div>
          </CardHeader>
          <CardContent>
            {enablePromotion ? (
              selectedPromotion ? (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        selectedPromotion.type === 'coupon' 
                          ? 'bg-orange-100 dark:bg-orange-900/30' 
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {selectedPromotion.type === 'coupon' ? (
                          <Ticket className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Calendar className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{selectedPromotion.title}</div>
                        <div className="text-xs text-muted-foreground">{selectedPromotion.merchantName}</div>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getBillingModeLabel(selectedPromotion.billingMode)}
                          </Badge>
                          <span className="text-xs text-green-600">
                            {getBillingModeDesc(selectedPromotion.billingMode, selectedPromotion.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemovePromotion}
                      data-testid="button-remove-promotion"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        {t('creator.editor.expectedEarnings')}: 
                        <span className="text-green-600 font-medium ml-1">
                          {selectedPromotion.billingMode === 'cps' 
                            ? `${(selectedPromotion.price * 0.7).toFixed(1)}%`
                            : `${t('common.currencySymbol')}${(selectedPromotion.price * 0.7).toFixed(2)}`}
                          /{selectedPromotion.billingMode === 'cpm' ? t('creator.billing.per1000Views') : 
                            selectedPromotion.billingMode === 'cps' ? t('creator.billing.perSale') : 
                            t('creator.billing.perClick')}
                        </span>
                      </div>
                      <div className="text-amber-600">
                        {t('creator.editor.platformFee')}: 30%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed"
                      data-testid="button-add-promotion"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('creator.editor.selectPromotion')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('creator.editor.availablePromotions')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {isLoadingPromotions ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : promotionsList.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {t('creator.editor.noAvailablePromotions')}
                        </div>
                      ) : (
                        promotionsList.map((promo) => (
                          <div
                            key={promo.id}
                            className="border rounded-lg p-3 cursor-pointer hover-elevate"
                            onClick={() => handleSelectPromotion(promo)}
                            data-testid={`promotion-item-${promo.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                promo.type === 'coupon' 
                                  ? 'bg-orange-100 dark:bg-orange-900/30' 
                                  : 'bg-blue-100 dark:bg-blue-900/30'
                              }`}>
                                {promo.type === 'coupon' ? (
                                  <Ticket className="w-5 h-5 text-orange-500" />
                                ) : (
                                  <Calendar className="w-5 h-5 text-blue-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{promo.title}</div>
                                <div className="text-xs text-muted-foreground">{promo.merchantName}</div>
                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {getBillingModeLabel(promo.billingMode)}
                                  </Badge>
                                  <span className="text-xs text-green-600">
                                    {getBillingModeDesc(promo.billingMode, promo.price)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )
            ) : (
              <div className="text-center py-4">
                <Link2 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('creator.editor.noPromotion')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('creator.editor.promotionHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-amber-800 dark:text-amber-200">{t('creator.editor.billingInfo')}</div>
                <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  <li>CPC: {t('creator.editor.cpcDesc')}</li>
                  <li>CPM: {t('creator.editor.cpmDesc')}</li>
                  <li>CPS: {t('creator.editor.cpsDesc')}</li>
                </ul>
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {t('creator.editor.platformFeeNote')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing || uploading}
            data-testid="button-save-draft"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.saving')}</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('creator.editor.saveDraft')}
              </>
            )}
          </Button>
          <Button
            className="flex-1 bg-[#38B03B]"
            onClick={handlePublish}
            disabled={isSaving || isPublishing || uploading || !title.trim()}
            data-testid="button-publish"
          >
            {isPublishing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('creator.editor.publish')}
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
