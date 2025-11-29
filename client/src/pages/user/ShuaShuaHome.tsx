import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ChevronRight, MapPin, Clock, Ticket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: Store[];
}

function CampaignCard({ campaign }: { campaign: CampaignWithStores }) {
  const { language, t } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };
  
  const getDescription = () => {
    if (language === 'zh-cn') return campaign.descriptionZh || campaign.descriptionSource;
    if (language === 'en-us') return campaign.descriptionEn || campaign.descriptionSource;
    return campaign.descriptionTh || campaign.descriptionSource;
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
    if (days === 1) return language === 'th-th' ? 'เหลือวันสุดท้าย' : (language === 'en-us' ? 'Last day' : '最后一天');
    return language === 'th-th' ? `เหลือ ${days} วัน` : (language === 'en-us' ? `${days} days left` : `还剩${days}天`);
  };

  const remaining = daysRemaining();

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-campaign-${campaign.id}`}>
        <div className="relative aspect-[16/9] overflow-hidden">
          {campaign.bannerImageUrl ? (
            <img 
              src={campaign.bannerImageUrl} 
              alt={getTitle()} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Ticket className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-primary text-primary-foreground font-bold">
              {formatValue()}
            </Badge>
          </div>
          {remaining && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {remaining}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm line-clamp-1 mb-1" data-testid={`text-campaign-title-${campaign.id}`}>
            {getTitle()}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {getDescription()}
          </p>
          {campaign.stores && campaign.stores.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {campaign.stores[0].name}
                {campaign.stores.length > 1 && ` +${campaign.stores.length - 1}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function CampaignSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  );
}

export default function ShuaShuaHome() {
  const { t } = useLanguage();
  
  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const campaigns = campaignsData?.data || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('shuashua.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">{t('shuashua.forYou')}</h2>
            <Link href="/shop" className="flex items-center text-xs text-muted-foreground hover:text-foreground">
              {t('shuashua.viewAll')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid gap-4">
              <CampaignSkeleton />
              <CampaignSkeleton />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="p-8 text-center">
              <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('shuashua.noActivities')}</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </section>
      </main>

      <UserBottomNav />
    </div>
  );
}
