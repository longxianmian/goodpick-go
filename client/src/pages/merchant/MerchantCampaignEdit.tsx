import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Upload, X, Megaphone, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, setHours, setMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Campaign {
  id: number;
  titleSource: string;
  descriptionSource: string;
  bannerImageUrl?: string;
  mediaUrls?: string[];
  couponValue: string;
  discountType: string;
  originalPrice?: string;
  currency: string;
  startAt: string;
  endAt: string;
  maxPerUser: number;
  maxTotal?: number;
  currentClaimed: number;
  isActive: boolean;
}

// 支持的货币列表
const CURRENCY_OPTIONS = [
  { value: 'THB', label: '฿ THB', symbol: '฿' },
  { value: 'TWD', label: 'NT$ TWD', symbol: 'NT$' },
  { value: 'CNY', label: '¥ CNY', symbol: '¥' },
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'IDR', label: 'Rp IDR', symbol: 'Rp' },
  { value: 'VND', label: '₫ VND', symbol: '₫' },
  { value: 'MMK', label: 'K MMK', symbol: 'K' },
];

interface CampaignResponse {
  success: boolean;
  data: Campaign;
}

const campaignFormSchema = z.object({
  titleSource: z.string().min(1, '请输入活动标题'),
  descriptionSource: z.string().min(1, '请输入活动描述'),
  couponValue: z.string().min(1, '请输入优惠金额'),
  discountType: z.enum(['final_price', 'percentage_off', 'cash_voucher']),
  currency: z.string().min(1, '请选择货币单位'),
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
      discountType: 'cash_voucher',
      currency: 'THB',
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
        discountType: (c.discountType as 'final_price' | 'percentage_off' | 'cash_voucher') || 'cash_voucher',
        currency: c.currency || 'THB',
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
        currency: values.currency,
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
                            <SelectItem value="cash_voucher">{t('merchant.cashVoucher')}</SelectItem>
                            <SelectItem value="percentage_off">{t('merchant.percentageOff')}</SelectItem>
                            <SelectItem value="final_price">{t('merchant.finalPrice')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.currency')} *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="couponValue"
                  render={({ field }) => {
                    const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === form.watch('currency'))?.symbol || '฿';
                    const isPercentage = form.watch('discountType') === 'percentage_off';
                    return (
                      <FormItem>
                        <FormLabel>{t('merchant.discountValue')} *</FormLabel>
                        <div className="flex items-center gap-2">
                          {!isPercentage && (
                            <span className="text-sm text-muted-foreground min-w-[2rem]">{currencySymbol}</span>
                          )}
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              placeholder={isPercentage ? '10' : '50'}
                              data-testid="input-coupon-value"
                            />
                          </FormControl>
                          {isPercentage && (
                            <span className="text-sm text-muted-foreground">%</span>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => {
                    const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === form.watch('currency'))?.symbol || '฿';
                    return (
                      <FormItem>
                        <FormLabel>{t('merchant.originalPrice')}</FormLabel>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[2rem]">{currencySymbol}</span>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              placeholder="100"
                              data-testid="input-original-price"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                    render={({ field }) => {
                      const selectedDate = field.value ? new Date(field.value) : undefined;
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('merchant.startTime')} *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal justify-start",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="input-start-time"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(new Date(field.value), "yyyy/MM/dd HH:mm", { locale: zhCN })
                                  ) : (
                                    <span>{t('merchant.selectStartTime')}</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  if (date) {
                                    const hours = selectedDate?.getHours() || 0;
                                    const minutes = selectedDate?.getMinutes() || 0;
                                    const newDate = setMinutes(setHours(date, hours), minutes);
                                    field.onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
                                  }
                                }}
                                locale={zhCN}
                                initialFocus
                              />
                              <div className="p-3 border-t flex items-center gap-2">
                                <Select
                                  value={selectedDate ? selectedDate.getHours().toString().padStart(2, '0') : "00"}
                                  onValueChange={(hour) => {
                                    const base = selectedDate || new Date();
                                    const newDate = setHours(base, parseInt(hour));
                                    field.onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
                                  }}
                                >
                                  <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="时" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                        {i.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span>:</span>
                                <Select
                                  value={selectedDate ? selectedDate.getMinutes().toString().padStart(2, '0') : "00"}
                                  onValueChange={(minute) => {
                                    const base = selectedDate || new Date();
                                    const newDate = setMinutes(base, parseInt(minute));
                                    field.onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
                                  }}
                                >
                                  <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="分" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    {Array.from({ length: 60 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                        {i.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => {
                      const selectedDate = field.value ? new Date(field.value) : undefined;
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t('merchant.endTime')} *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal justify-start",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="input-end-time"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(new Date(field.value), "yyyy/MM/dd HH:mm", { locale: zhCN })
                                  ) : (
                                    <span>{t('merchant.selectEndTime')}</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  if (date) {
                                    const hours = selectedDate?.getHours() || 23;
                                    const minutes = selectedDate?.getMinutes() || 59;
                                    const newDate = setMinutes(setHours(date, hours), minutes);
                                    field.onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
                                  }
                                }}
                                locale={zhCN}
                                initialFocus
                              />
                              <div className="p-3 border-t flex items-center gap-2">
                                <Select
                                  value={selectedDate ? selectedDate.getHours().toString().padStart(2, '0') : "23"}
                                  onValueChange={(hour) => {
                                    const base = selectedDate || new Date();
                                    const newDate = setHours(base, parseInt(hour));
                                    field.onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
                                  }}
                                >
                                  <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="时" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                        {i.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span>:</span>
                                <Select
                                  value={selectedDate ? selectedDate.getMinutes().toString().padStart(2, '0') : "59"}
                                  onValueChange={(minute) => {
                                    const base = selectedDate || new Date();
                                    const newDate = setMinutes(base, parseInt(minute));
                                    field.onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
                                  }}
                                >
                                  <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="分" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    {Array.from({ length: 60 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                        {i.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
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
