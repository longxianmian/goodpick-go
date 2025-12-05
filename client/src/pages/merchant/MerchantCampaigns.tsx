import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Plus, Search, MoreVertical, Megaphone, Filter, Calendar, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

interface Campaign {
  id: number;
  titleSource: string;
  titleZh?: string;
  titleEn?: string;
  titleTh?: string;
  descriptionSource: string;
  descriptionZh?: string;
  bannerImageUrl?: string;
  couponValue: string;
  discountType: string;
  originalPrice?: string;
  startAt: string;
  endAt: string;
  maxTotal?: number;
  currentClaimed: number;
  isActive: boolean;
  status: string;
  createdAt: string;
}

interface CampaignListResponse {
  success: boolean;
  data: Campaign[];
}

function CampaignCard({ campaign, storeId, onToggleActive }: { 
  campaign: Campaign; 
  storeId: number;
  onToggleActive: (id: number, isActive: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();

  const getTitle = () => {
    if (language === 'zh-cn' && campaign.titleZh) return campaign.titleZh;
    if (language === 'en-us' && campaign.titleEn) return campaign.titleEn;
    if (language === 'th-th' && campaign.titleTh) return campaign.titleTh;
    return campaign.titleSource;
  };

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'active':
        return <Badge className="bg-[#38B03B] text-[10px]">{t('opsCenter.inProgress')}</Badge>;
      case 'scheduled':
        return <Badge className="bg-amber-500 text-[10px]">{t('opsCenter.scheduled')}</Badge>;
      case 'ended':
        return <Badge variant="secondary" className="text-[10px]">{t('merchant.ended')}</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-[10px]">{t('merchant.statusInactive')}</Badge>;
      default:
        return null;
    }
  };

  const progress = campaign.maxTotal 
    ? Math.min((campaign.currentClaimed / campaign.maxTotal) * 100, 100) 
    : 0;

  const remaining = campaign.maxTotal 
    ? campaign.maxTotal - campaign.currentClaimed 
    : null;

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div 
            className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/merchant/campaigns/${campaign.id}`)}
          >
            {campaign.bannerImageUrl ? (
              <img 
                src={campaign.bannerImageUrl} 
                alt={getTitle()}
                className="w-full h-full object-cover"
                data-testid={`img-campaign-${campaign.id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/merchant/campaigns/${campaign.id}`)}
              >
                <h3 className="font-medium text-sm line-clamp-1" data-testid={`text-campaign-name-${campaign.id}`}>
                  {getTitle()}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {getStatusBadge()}
                  <Badge variant="outline" className="text-[10px]">
                    {campaign.discountType === 'fixed' ? (
                      <><DollarSign className="w-3 h-3 mr-0.5" />฿{campaign.couponValue}</>
                    ) : (
                      <><Percent className="w-3 h-3 mr-0.5" />{campaign.couponValue}%</>
                    )}
                  </Badge>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid={`button-campaign-menu-${campaign.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/merchant/campaigns/${campaign.id}`)} data-testid={`menu-edit-campaign-${campaign.id}`}>
                    {t('merchant.editCampaign')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onToggleActive(campaign.id, !campaign.isActive)}
                    data-testid={`menu-toggle-campaign-${campaign.id}`}
                  >
                    {campaign.isActive ? t('merchant.pauseCampaign') : t('merchant.resumeCampaign')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(campaign.startAt), 'MM/dd')} - {format(new Date(campaign.endAt), 'MM/dd')}</span>
            </div>

            {campaign.maxTotal && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{t('opsCenter.remaining')}: {remaining}/{campaign.maxTotal}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantCampaigns() {
  const { t } = useLanguage();
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;
  const storeName = ownerRole?.storeName;

  const { data: campaignsData, isLoading } = useQuery<CampaignListResponse>({
    queryKey: ['/api/stores', storeId, 'campaigns'],
    enabled: !!storeId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ campaignId, isActive }: { campaignId: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/stores/${storeId}/campaigns/${campaignId}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'campaigns'] });
      toast({ title: t('common.success') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: String(error), variant: 'destructive' });
    },
  });

  const campaigns = campaignsData?.data || [];

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = !searchQuery || 
      c.titleSource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleZh?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/merchant')} data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-base">{t('merchant.campaignManagement')}</h1>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
          <Button size="sm" onClick={() => navigate('/merchant/campaigns/new')} data-testid="button-add-campaign">
            <Plus className="w-4 h-4 mr-1" />
            {t('merchant.addCampaign')}
          </Button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('merchant.searchCampaigns')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-campaigns"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28" data-testid="select-status-filter">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('merchant.allStatus')}</SelectItem>
              <SelectItem value="active">{t('opsCenter.inProgress')}</SelectItem>
              <SelectItem value="scheduled">{t('opsCenter.scheduled')}</SelectItem>
              <SelectItem value="ended">{t('merchant.ended')}</SelectItem>
              <SelectItem value="inactive">{t('merchant.statusInactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="p-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-20 h-20 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">{t('merchant.noCampaigns')}</p>
              <Button onClick={() => navigate('/merchant/campaigns/new')} data-testid="button-create-first-campaign">
                <Plus className="w-4 h-4 mr-2" />
                {t('merchant.createFirstCampaign')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            {filteredCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                storeId={storeId}
                onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ campaignId: id, isActive })}
              />
            ))}
          </div>
        )}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
