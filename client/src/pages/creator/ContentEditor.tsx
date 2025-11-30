import { useState, useEffect } from 'react';
import { useLocation, useRoute, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Eye,
  MousePointer,
  ShoppingBag,
  Ticket,
  Calendar,
  Plus,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

type ContentType = 'video' | 'article';
type BillingMode = 'cpc' | 'cpm' | 'cps';

interface PromotionItem {
  id: number;
  type: 'coupon' | 'campaign';
  title: string;
  merchantName: string;
  commission: number;
  billingMode: BillingMode;
  price: number;
}

export default function ContentEditor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/creator/edit/:id');
  const searchString = useSearch();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const isNewContent = !params?.id || params.id === 'new';
  const contentId = params?.id;

  const searchParams = new URLSearchParams(searchString);
  const initialType = searchParams.get('type') as ContentType | null;
  const openPromotionTab = searchParams.get('tab') === 'promotion';

  const mockDrafts: Record<string, { title: string; content: string; type: ContentType }> = {
    'd1': { title: '下周新店探访计划', content: '这是一篇关于新店探访的内容草稿...', type: 'video' },
    'd2': { title: '美食攻略草稿', content: '周末必去的美食打卡点...', type: 'article' },
    'p1': { title: '美食探店vlog', content: '今天带大家探访一家超棒的餐厅...', type: 'video' },
    'p2': { title: '周末好去处推荐', content: '周末不知道去哪里？看这里...', type: 'article' },
  };

  const existingDraft = contentId && mockDrafts[contentId];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('video');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionItem | null>(null);
  const [enablePromotion, setEnablePromotion] = useState(false);

  useEffect(() => {
    if (existingDraft) {
      setTitle(existingDraft.title);
      setContent(existingDraft.content);
      setContentType(existingDraft.type);
    } else if (initialType) {
      setContentType(initialType);
    }
    
    if (openPromotionTab) {
      setEnablePromotion(true);
      setShowPromotionDialog(true);
    }
  }, [contentId]);

  const mockAvailablePromotions: PromotionItem[] = [
    { 
      id: 1, 
      type: 'coupon', 
      title: '新店开业8折优惠券', 
      merchantName: '美味餐厅',
      commission: 15,
      billingMode: 'cpc',
      price: 0.5
    },
    { 
      id: 2, 
      type: 'coupon', 
      title: '满100减30优惠券', 
      merchantName: '火锅世家',
      commission: 20,
      billingMode: 'cps',
      price: 5
    },
    { 
      id: 3, 
      type: 'campaign', 
      title: '周年庆抽奖活动', 
      merchantName: '购物中心',
      commission: 10,
      billingMode: 'cpm',
      price: 8
    },
    { 
      id: 4, 
      type: 'campaign', 
      title: '新品试吃体验', 
      merchantName: '甜品屋',
      commission: 25,
      billingMode: 'cpc',
      price: 1.0
    },
  ];

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setLocation('/creator/create');
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsPublishing(false);
    setLocation('/creator/create');
  };

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
              <Label>{t('creator.editor.contentType')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={contentType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContentType('video')}
                  className={contentType === 'video' ? 'bg-[#38B03B]' : ''}
                  data-testid="button-type-video"
                >
                  <Video className="w-4 h-4 mr-1" />
                  {t('creator.videos')}
                </Button>
                <Button
                  variant={contentType === 'article' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContentType('article')}
                  className={contentType === 'article' ? 'bg-[#38B03B]' : ''}
                  data-testid="button-type-article"
                >
                  <Image className="w-4 h-4 mr-1" />
                  {t('creator.articles')}
                </Button>
              </div>
            </div>

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

            {contentType === 'video' && (
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('creator.editor.uploadVideo')}</p>
                <Button variant="outline" size="sm" className="mt-2" data-testid="button-upload-video">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('creator.editor.selectFile')}
                </Button>
              </div>
            )}

            {contentType === 'article' && (
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                <Image className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('creator.editor.uploadImages')}</p>
                <Button variant="outline" size="sm" className="mt-2" data-testid="button-upload-images">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('creator.editor.selectImages')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                        <div className="flex items-center gap-2 mt-1">
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
                      {mockAvailablePromotions.map((promo) => (
                        <div
                          key={promo.id}
                          className="border rounded-lg p-3 cursor-pointer hover-elevate"
                          onClick={() => handleSelectPromotion(promo)}
                          data-testid={`promotion-item-${promo.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                              <div className="flex items-center gap-2 mt-1">
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
                      ))}
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
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-800 dark:text-amber-200">{t('creator.editor.billingInfo')}</div>
                <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  <li>• CPC: {t('creator.editor.cpcDesc')}</li>
                  <li>• CPM: {t('creator.editor.cpmDesc')}</li>
                  <li>• CPS: {t('creator.editor.cpsDesc')}</li>
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
            disabled={isSaving || isPublishing}
            data-testid="button-save-draft"
          >
            {isSaving ? (
              <>{t('common.saving')}</>
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
            disabled={isSaving || isPublishing || !title.trim()}
            data-testid="button-publish"
          >
            {isPublishing ? (
              <>{t('common.loading')}</>
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
