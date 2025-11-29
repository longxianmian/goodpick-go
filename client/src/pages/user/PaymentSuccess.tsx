import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { CheckCircle, Star, Gift, Home, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PaymentSuccess() {
  const [, params] = useRoute('/pay/:id/success');
  const storeId = params?.id ? parseInt(params.id) : 0;
  const { t } = useLanguage();

  const tierConfig = {
    basic: { label: t('payment.tierBasic'), color: 'bg-gray-500', icon: Star },
    silver: { label: t('payment.tierSilver'), color: 'bg-gray-400', icon: Star },
    gold: { label: t('payment.tierGold'), color: 'bg-yellow-500', icon: Star },
    platinum: { label: t('payment.tierPlatinum'), color: 'bg-purple-500', icon: Star },
  };

  const urlParams = new URLSearchParams(window.location.search);
  const earnedPoints = urlParams.get('points') || '0';
  const tier = (urlParams.get('tier') || 'basic') as keyof typeof tierConfig;

  const { data: storeData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/stores', storeId, 'pay'],
    enabled: !!storeId,
  });

  const storeName = storeData?.data?.store?.name || '';
  const tierInfo = tierConfig[tier] || tierConfig.basic;
  const TierIcon = tierInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Card className="overflow-hidden">
          <div className="bg-green-500 text-white py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{t('payment.success')}</h1>
            <p className="text-green-100 mt-1">{t('payment.congratulations')}</p>
          </div>

          <CardContent className="py-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">{t('payment.yourMembership')}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/10">
                <TierIcon className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg">{storeName}</span>
                <Badge className={tierInfo.color}>{tierInfo.label}</Badge>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-sm">{t('payment.earnedPoints')}</span>
                </div>
                <span className="text-2xl font-bold text-primary">+{earnedPoints}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">{t('payment.memberBenefits')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t('payment.benefitCoupons')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t('payment.benefitRewards')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t('payment.benefitEvents')}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/">
            <Button variant="outline" className="w-full" data-testid="button-home">
              <Home className="w-4 h-4 mr-2" />
              {t('payment.continueExplore')}
            </Button>
          </Link>
          <Link href="/my-coupons">
            <Button className="w-full" data-testid="button-coupons">
              <Ticket className="w-4 h-4 mr-2" />
              {t('nav.myCoupons')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
