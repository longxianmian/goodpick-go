import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { MapPin, Clock, Ticket, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: Store[];
}

function CampaignListItem({ campaign }: { campaign: CampaignWithStores }) {
  const { language } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };
  
  const formatValue = () => {
    if (campaign.discountType === 'percentage_off') {
      return `${campaign.couponValue}% OFF`;
    }
    return `฿${campaign.couponValue}`;
  };

  const daysRemaining = () => {
    if (!campaign.endAt) return null;
    const now = new Date();
    const end = new Date(campaign.endAt);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return null;
    if (days <= 3) return language === 'th-th' ? `เหลือ ${days} วัน` : (language === 'en-us' ? `${days}d left` : `${days}天`);
    return null;
  };

  const remaining = daysRemaining();

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-campaign-${campaign.id}`}>
        <div className="flex">
          <div className="relative w-28 h-28 flex-shrink-0">
            {campaign.bannerImageUrl ? (
              <img 
                src={campaign.bannerImageUrl} 
                alt={getTitle()} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Ticket className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <CardContent className="flex-1 p-3 flex flex-col justify-between">
            <div>
              <h3 className="font-medium text-sm line-clamp-2 mb-1" data-testid={`text-campaign-title-${campaign.id}`}>
                {getTitle()}
              </h3>
              {campaign.stores && campaign.stores.length > 0 && (
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {campaign.stores[0].name}
                    {campaign.stores.length > 1 && ` +${campaign.stores.length - 1}`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-sm">
                {formatValue()}
              </Badge>
              {remaining && (
                <div className="flex items-center text-xs text-orange-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {remaining}
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

function CampaignListSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <Skeleton className="w-28 h-28 rounded-none" />
        <CardContent className="flex-1 p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="pt-2">
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function ShopHome() {
  const { t } = useLanguage();
  
  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const campaigns = campaignsData?.data || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-12 px-4">
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('shop.title')}</h1>
          <Button variant="ghost" size="icon" data-testid="button-filter">
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">{t('shop.allDeals')}</h2>
            <span className="text-xs text-muted-foreground">
              {campaigns.length} {t('nav.activities').toLowerCase()}
            </span>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              <CampaignListSkeleton />
              <CampaignListSkeleton />
              <CampaignListSkeleton />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="p-8 text-center">
              <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('shuashua.noActivities')}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <CampaignListItem key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </section>
      </main>

      <UserBottomNav />
    </div>
  );
}
