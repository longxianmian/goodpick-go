import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Upload, X, Megaphone, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

interface Campaign {
  id: number;
  titleSource: string;
  descriptionSource: string;
  bannerImageUrl?: string;
  mediaUrls?: string[];
  couponValue: string;
  discountType: string;
  originalPrice?: string;
  startAt: string;
  endAt: string;
  maxPerUser: number;
  maxTotal?: number;
  currentClaimed: number;
  isActive: boolean;
}

interface CampaignResponse {
  success: boolean;
  data: Campaign;
}

const campaignFormSchema = z.object({
  titleSource: z.string().min(1, '请输入活动标题'),
  descriptionSource: z.string().min(1, '请输入活动描述'),
  couponValue: z.string().min(1, '请输入优惠金额'),
  discountType: z.enum(['fixed', 'percentage']),
  originalPrice: z.string().optional(),
  startAt: z.string().min(1, '请选择开始时间'),
  endAt: z.string().min(1, '请选择结束时间'),
  maxPerUser: z.string().default('1'),
  maxTotal: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export default function MerchantCampaignEdit() {
  const { t } = useLanguage();
  const { userToken, userRoles } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  
  const isNew = params.id === 'new';
  const campaignId = isNew ? null : parseInt(params.id || '0');
  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;

  const [bannerImage, setBannerImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      titleSource: '',
      descriptionSource: '',
      couponValue: '',
      discountType: 'fixed',
      originalPrice: '',
      startAt: '',
      endAt: '',
      maxPerUser: '1',
      maxTotal: '',
      isActive: true,
    },
  });

  const { data: campaignData, isLoading: campaignLoading } = useQuery<CampaignResponse>({
    queryKey: ['/api/stores', storeId, 'campaigns', campaignId],
    enabled: !!storeId && !!campaignId,
  });

  useEffect(() => {
    if (campaignData?.data) {
      const c = campaignData.data;
      form.reset({
        titleSource: c.titleSource || '',
        descriptionSource: c.descriptionSource || '',
        couponValue: c.couponValue?.toString() || '',
        discountType: (c.discountType as 'fixed' | 'percentage') || 'fixed',
        originalPrice: c.originalPrice?.toString() || '',
        startAt: c.startAt ? format(new Date(c.startAt), "yyyy-MM-dd'T'HH:mm") : '',
        endAt: c.endAt ? format(new Date(c.endAt), "yyyy-MM-dd'T'HH:mm") : '',
        maxPerUser: c.maxPerUser?.toString() || '1',
        maxTotal: c.maxTotal?.toString() || '',
        isActive: c.isActive ?? true,
      });
      setBannerImage(c.bannerImageUrl || '');
    }
  }, [campaignData, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      const payload = {
        titleSource: values.titleSource,
        descriptionSource: values.descriptionSource,
        couponValue: values.couponValue,
        discountType: values.discountType,
        originalPrice: values.originalPrice || null,
        startAt: values.startAt,
        endAt: values.endAt,
        maxPerUser: parseInt(values.maxPerUser) || 1,
        maxTotal: values.maxTotal ? parseInt(values.maxTotal) : null,
        bannerImageUrl: bannerImage || null,
        isActive: values.isActive,
      };

      if (isNew) {
        const response = await apiRequest('POST', `/api/stores/${storeId}/campaigns`, payload);
        return response.json();
      } else {
        const response = await apiRequest('PATCH', `/api/stores/${storeId}/campaigns/${campaignId}`, payload);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'campaigns'] });
      toast({
        title: isNew ? t('merchant.campaignCreated') : t('merchant.campaignUpdated'),
      });
      navigate('/merchant/campaigns');
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive',
      });
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('merchant.onlyImagesAllowed'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('merchant.imageTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'campaigns');
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.url) {
        setBannerImage(result.url);
        toast({
          title: t('merchant.imageUploadSuccess'),
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: t('merchant.imageUploadError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (values: CampaignFormValues) => {
    saveMutation.mutate(values);
  };

  if (!storeId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('merchant.noStoreAccess')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isNew && campaignLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-md" />
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <main className="p-4 space-y-4">
          <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/campaigns')} data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold flex-1">
            {isNew ? t('merchant.addCampaign') : t('merchant.editCampaign')}
          </h1>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="mb-2 block">{t('merchant.campaignBanner')}</Label>
                  <div className="relative">
                    {bannerImage ? (
                      <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                        <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => setBannerImage('')}
                          data-testid="button-remove-banner"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-video rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                          disabled={uploading}
                          data-testid="input-banner-upload"
                        />
                        {uploading ? (
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">{t('merchant.uploadBanner')}</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="titleSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('merchant.campaignTitle')} *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder={t('merchant.campaignTitlePlaceholder')}
                          data-testid="input-campaign-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descriptionSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('merchant.campaignDescription')} *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t('merchant.campaignDescPlaceholder')}
                          className="resize-none"
                          rows={3}
                          data-testid="input-campaign-description"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">{t('merchant.autoTranslateHint')}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-medium text-sm">{t('merchant.couponSettings')}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.discountType')} *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-discount-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">{t('merchant.fixedAmount')}</SelectItem>
                            <SelectItem value="percentage">{t('merchant.percentage')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="couponValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.discountValue')} *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder={form.watch('discountType') === 'fixed' ? '50' : '10'}
                            data-testid="input-coupon-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('merchant.originalPrice')}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          placeholder="100"
                          data-testid="input-original-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-medium text-sm">{t('merchant.campaignTime')}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.startTime')} *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="datetime-local"
                            data-testid="input-start-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.endTime')} *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="datetime-local"
                            data-testid="input-end-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-medium text-sm">{t('merchant.limitSettings')}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxPerUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.maxPerUser')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder="1"
                            data-testid="input-max-per-user"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.maxTotal')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder={t('merchant.unlimited')}
                            data-testid="input-max-total"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>{t('merchant.campaignActive')}</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-campaign-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full bg-[#38B03B]"
              disabled={saveMutation.isPending}
              data-testid="button-save-campaign"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isNew ? t('merchant.createCampaign') : t('merchant.saveCampaign')}
            </Button>
          </main>
        </form>
      </Form>
    </div>
  );
}
