import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, Store, Users, Ticket, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StoreRole {
  storeId: number;
  storeName: string;
  storeImageUrl: string | null;
  role: 'owner' | 'operator' | 'verifier';
}

interface RolesResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      displayName: string | null;
      avatarUrl: string | null;
    };
    roles: StoreRole[];
  };
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend 
}: { 
  icon: typeof Users; 
  label: string; 
  value: string | number; 
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <Badge variant="secondary" className="text-xs">
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StoreCard({ store, onClick }: { store: StoreRole; onClick: () => void }) {
  const { t } = useLanguage();
  
  const roleLabel = {
    owner: t('userCenter.roleOwner'),
    operator: t('userCenter.roleOperator'),
    verifier: t('userCenter.roleVerifier'),
  }[store.role];

  return (
    <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={store.storeImageUrl || undefined} />
            <AvatarFallback>
              <Store className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{store.storeName}</h3>
            <Badge variant="outline" className="text-xs mt-1">
              {roleLabel}
            </Badge>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantHome() {
  const { t } = useLanguage();
  const { user, userToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const isLoggedIn = !!userToken && !!user;
  
  const { data: rolesData, isLoading } = useQuery<RolesResponse>({
    queryKey: ['/api/me/roles'],
    enabled: isLoggedIn,
  });

  const roles = rolesData?.data?.roles || [];
  const merchantRoles = roles.filter(r => r.role === 'owner' || r.role === 'operator');

  const handleStoreClick = (storeId: number) => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const handleQuickAction = (action: 'campaigns' | 'staff') => {
    if (action === 'campaigns') {
      navigate('/admin/campaigns');
    } else if (action === 'staff') {
      navigate('/admin/staff-presets');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/me">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{t('merchant.home')}</h1>
          </div>
        </header>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t('merchant.loginRequired')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('merchant.loginRequiredDesc')}</p>
          <Link href="/">
            <Button>{t('userCenter.login')}</Button>
          </Link>
        </main>
        <MerchantBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('merchant.home')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : merchantRoles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">{t('merchant.noStores')}</h3>
              <p className="text-sm text-muted-foreground">{t('merchant.noStoresDesc')}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard 
                icon={Users} 
                label={t('merchant.totalCustomers')} 
                value="--" 
              />
              <StatCard 
                icon={Ticket} 
                label={t('merchant.totalRedemptions')} 
                value="--" 
              />
            </div>

            <div className="mb-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {t('merchant.myStores')}
              </h2>
              <div className="space-y-3">
                {merchantRoles.map((role) => (
                  <StoreCard 
                    key={`${role.storeId}-${role.role}`} 
                    store={role} 
                    onClick={() => handleStoreClick(role.storeId)}
                  />
                ))}
              </div>
            </div>

            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t('merchant.quickActions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    size="sm"
                    onClick={() => handleQuickAction('campaigns')}
                    data-testid="button-view-campaigns"
                  >
                    <Ticket className="w-4 h-4 mr-2" />
                    {t('merchant.viewCampaigns')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    size="sm"
                    onClick={() => handleQuickAction('staff')}
                    data-testid="button-manage-staff"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t('merchant.manageStaff')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
