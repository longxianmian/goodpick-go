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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Sparkles, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/ui/page-transition';

const CONTENT_TYPES = [
  { value: 'food', labelKey: 'contentType.food' },
  { value: 'travel', labelKey: 'contentType.travel' },
  { value: 'lifestyle', labelKey: 'contentType.lifestyle' },
  { value: 'beauty', labelKey: 'contentType.beauty' },
  { value: 'fashion', labelKey: 'contentType.fashion' },
  { value: 'fitness', labelKey: 'contentType.fitness' },
  { value: 'tech', labelKey: 'contentType.tech' },
  { value: 'entertainment', labelKey: 'contentType.entertainment' },
  { value: 'education', labelKey: 'contentType.education' },
  { value: 'other', labelKey: 'contentType.other' },
];

const FOLLOWER_COUNTS = [
  { value: 'under_1k', labelKey: 'followerCount.under1k' },
  { value: '1k_10k', labelKey: 'followerCount.1k10k' },
  { value: '10k_100k', labelKey: 'followerCount.10k100k' },
  { value: '100k_1m', labelKey: 'followerCount.100k1m' },
  { value: 'over_1m', labelKey: 'followerCount.over1m' },
];

const formSchema = z.object({
  shuaName: z.string()
    .min(2, { message: '刷刷号至少2个字符' })
    .max(20, { message: '刷刷号最多20个字符' })
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, { message: '刷刷号只能包含字母、数字、下划线和中文' }),
  displayName: z.string().min(2, { message: '昵称至少2个字符' }),
  bio: z.string().max(200, { message: '简介最多200个字符' }).optional(),
  contentType: z.string().min(1, { message: '请选择内容类型' }),
  followerCount: z.string().optional(),
  socialLinks: z.string().optional(),
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

export default function ApplyShuashua() {
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
      shuaName: '',
      displayName: user?.displayName || '',
      bio: '',
      contentType: '',
      followerCount: '',
      socialLinks: '',
      description: '',
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest('POST', '/api/applications/shuashua', values);
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

  const status = statusResponse?.data?.shuashua;

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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

  if (status?.isCreator) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background border-b">
            <div className="flex items-center gap-3 p-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/me')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">{t('application.shuashuaTitle')}</h1>
            </div>
          </header>
          <div className="p-4 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <CardTitle>{t('application.alreadyCreator')}</CardTitle>
                <CardDescription>{t('application.goToCreatorCenter')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setLocation('/creator')}>
                  {t('application.enterCreatorCenter')}
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
              <h1 className="text-lg font-semibold">{t('application.shuashuaTitle')}</h1>
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
                    <span className="text-muted-foreground">{t('application.shuaName')}</span>
                    <span>@{status.application?.shuaName}</span>
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
              <h1 className="text-lg font-semibold">{t('application.shuashuaTitle')}</h1>
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
            <h1 className="text-lg font-semibold">{t('application.shuashuaTitle')}</h1>
          </div>
        </header>

        <div className="p-4 pb-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('application.creatorBenefits')}
              </CardTitle>
              <CardDescription>{t('application.creatorBenefitsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t('application.creatorBenefit1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t('application.creatorBenefit2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t('application.creatorBenefit3')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('application.accountInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shuaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.shuaName')} *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                            <Input 
                              className="pl-8" 
                              placeholder={t('application.shuaNamePlaceholder')} 
                              {...field} 
                              data-testid="input-shua-name" 
                            />
                          </div>
                        </FormControl>
                        <FormDescription>{t('application.shuaNameHint')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.displayName')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('application.displayNamePlaceholder')} {...field} data-testid="input-display-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.bio')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t('application.bioPlaceholder')} 
                            className="min-h-[80px]"
                            {...field} 
                            data-testid="input-bio" 
                          />
                        </FormControl>
                        <FormDescription>{t('application.bioHint')}</FormDescription>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('application.contentInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.contentType')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-content-type">
                              <SelectValue placeholder={t('application.selectContentType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {t(type.labelKey)}
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
                    name="followerCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.followerCount')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-follower-count">
                              <SelectValue placeholder={t('application.selectFollowerCount')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FOLLOWER_COUNTS.map((count) => (
                              <SelectItem key={count.value} value={count.value}>
                                {t(count.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('application.followerCountHint')}</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('application.socialLinks')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t('application.socialLinksPlaceholder')} 
                            className="min-h-[80px]"
                            {...field} 
                            data-testid="input-social-links" 
                          />
                        </FormControl>
                        <FormDescription>{t('application.socialLinksHint')}</FormDescription>
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
                            placeholder={t('application.creatorDescPlaceholder')} 
                            className="min-h-[100px]"
                            {...field} 
                            data-testid="input-description" 
                          />
                        </FormControl>
                        <FormDescription>{t('application.creatorDescHint')}</FormDescription>
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
