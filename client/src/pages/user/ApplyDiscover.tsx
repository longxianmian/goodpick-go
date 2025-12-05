import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Store, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/ui/page-transition';

const STORE_CATEGORIES = [
  { value: 'dining', labelKey: 'category.dining' },
  { value: 'coffee', labelKey: 'category.coffee' },
  { value: 'dessert', labelKey: 'category.dessert' },
  { value: 'bbq', labelKey: 'category.bbq' },
  { value: 'beauty', labelKey: 'category.beauty' },
  { value: 'cosmetics', labelKey: 'category.cosmetics' },
  { value: 'fashion', labelKey: 'category.fashion' },
  { value: 'convenience', labelKey: 'category.convenience' },
  { value: 'grocery', labelKey: 'category.grocery' },
  { value: 'mother_baby', labelKey: 'category.motherBaby' },
  { value: 'home', labelKey: 'category.home' },
  { value: 'building', labelKey: 'category.building' },
  { value: 'ktv', labelKey: 'category.ktv' },
  { value: 'amusement', labelKey: 'category.amusement' },
  { value: 'hotel', labelKey: 'category.hotel' },
  { value: 'tourism', labelKey: 'category.tourism' },
  { value: 'rental', labelKey: 'category.rental' },
  { value: 'training', labelKey: 'category.training' },
  { value: 'education', labelKey: 'category.education' },
  { value: 'other', labelKey: 'category.other' },
];

const CITIES = [
  { value: 'Bangkok', labelKey: 'city.bangkok' },
  { value: 'Phuket', labelKey: 'city.phuket' },
  { value: 'Chiang Mai', labelKey: 'city.chiangMai' },
  { value: 'Pattaya', labelKey: 'city.pattaya' },
  { value: 'Krabi', labelKey: 'city.krabi' },
  { value: 'Other', labelKey: 'city.other' },
];

const formSchema = z.object({
  storeName: z.string().min(2, { message: '店铺名称至少2个字符' }),
  storeCategory: z.string().min(1, { message: '请选择店铺类目' }),
  storeCity: z.string().min(1, { message: '请选择所在城市' }),
  storeAddress: z.string().min(5, { message: '请输入详细地址' }),
  contactName: z.string().min(2, { message: '请输入联系人姓名' }),
  contactPhone: z.string().min(8, { message: '请输入有效电话号码' }),
  brandName: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ApplicationStatus {
  discover: {
    hasApplied: boolean;
    status: 'pending' | 'approved' | 'rejected' | null;
    isMerchant: boolean;
    application: any;
  };
  shuashua: {
    hasApplied: boolean;
    status: 'pending' | 'approved' | 'rejected' | null;
    isCreator: boolean;
    application: any;
  };
}

export default function ApplyDiscover() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: statusResponse, isLoading: statusLoading } = useQuery<{ success: boolean; data: ApplicationStatus }>({
    queryKey: ['/api/me/application-status'],
    enabled: !!user,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: '',
      storeCategory: '',
      storeCity: 'Bangkok',
      storeAddress: '',
      contactName: user?.displayName || '',
      contactPhone: '',
      brandName: '',
      description: '',
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest('POST', '/api/applications/discover', values);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('application.submitSuccess'),
          description: t('application.waitForReview'),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/me/application-status'] });
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('common.operationFailed'),
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    submitMutation.mutate(values);
  };

  const status = statusResponse?.data?.discover;

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>{t('application.loginRequired')}</CardTitle>
              <CardDescription>{t('application.loginToApply')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLocation('/me')}>
                {t('common.login')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (statusLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  if (status?.isMerchant) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background border-b">
            <div className="flex items-center gap-3 p-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/me')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">{t('application.discoverTitle')}</h1>
            </div>
          </header>
          <div className="p-4 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <CardTitle>{t('application.alreadyMerchant')}</CardTitle>
                <CardDescription>{t('application.goToMerchantCenter')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setLocation('/merchant')}>
                  {t('application.enterMerchantCenter')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (status?.hasApplied && status?.status === 'pending') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background border-b">
            <div className="flex items-center gap-3 p-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/me')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">{t('application.discoverTitle')}</h1>
            </div>
          </header>
          <div className="p-4 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                <CardTitle>{t('application.pending')}</CardTitle>
                <CardDescription>{t('application.pendingDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('application.storeName')}</span>
                    <span>{status.application?.storeName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('application.submittedAt')}</span>
                    <span>{new Date(status.application?.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="w-full justify-center py-2">
                  <Clock className="w-4 h-4 mr-2" />
                  {t('application.statusPending')}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (status?.hasApplied && status?.status === 'rejected') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background border-b">
            <div className="flex items-center gap-3 p-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/me')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">{t('application.discoverTitle')}</h1>
            </div>
          </header>
          <div className="p-4 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <CardTitle>{t('application.rejected')}</CardTitle>
                <CardDescription>{t('application.rejectedDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {status.application?.reviewNote && (
                  <div className="bg-destructive/10 rounded-lg p-4">
                    <p className="text-sm text-destructive">{status.application.reviewNote}</p>
                  </div>
                )}
                <Button className="w-full" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/me/application-status'] })}>
                  {t('application.reapply')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/me')} data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('application.discoverTitle')}</h1>
          </div>
        </header>

        <div className="p-4 pb-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                {t('application.merchantBenefits')}
              </CardTitle>
              <CardDescription>{t('application.merchantBenefitsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t('application.benefit1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t('application.benefit2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t('application.benefit3')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('application.storeInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.storeName')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('application.storeNamePlaceholder')} {...field} data-testid="input-store-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.brandName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('application.brandNamePlaceholder')} {...field} data-testid="input-brand-name" />
                        </FormControl>
                        <FormDescription>{t('application.brandNameHint')}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.storeCategory')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder={t('application.selectCategory')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STORE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {t(cat.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.storeCity')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-city">
                              <SelectValue placeholder={t('application.selectCity')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CITIES.map((city) => (
                              <SelectItem key={city.value} value={city.value}>
                                {t(city.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.storeAddress')} *</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t('application.storeAddressPlaceholder')} {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('application.contactInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.contactName')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('application.contactNamePlaceholder')} {...field} data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.contactPhone')} *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={t('application.contactPhonePlaceholder')} {...field} data-testid="input-contact-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('application.additionalInfo')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.description')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t('application.descriptionPlaceholder')} 
                            className="min-h-[100px]"
                            {...field} 
                            data-testid="input-description" 
                          />
                        </FormControl>
                        <FormDescription>{t('application.descriptionHint')}</FormDescription>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common.submitting')}
                    </>
                  ) : (
                    t('application.submitApplication')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </PageTransition>
  );
}
