import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Box, Search, Clock, Truck, Check, Package, MapPin, Phone, Calendar, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

interface PackageItem {
  id: number;
  trackingNo?: string;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  items: {
    name: string;
    quantity: number;
    imageUrl?: string;
  }[];
  orderNo: string;
}

interface PackagesResponse {
  success: boolean;
  data: PackageItem[];
}

function PackageCard({ pkg, onShip }: { pkg: PackageItem; onShip: (id: number) => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const getStatusBadge = () => {
    switch (pkg.status) {
      case 'pending':
        return <Badge className="bg-amber-500 text-[10px]"><Clock className="w-3 h-3 mr-0.5" />{t('package.pending')}</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-500 text-[10px]"><Truck className="w-3 h-3 mr-0.5" />{t('package.shipped')}</Badge>;
      case 'delivered':
        return <Badge className="bg-[#38B03B] text-[10px]"><Check className="w-3 h-3 mr-0.5" />{t('package.delivered')}</Badge>;
      default:
        return null;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: `${label} ${t('common.copied')}`,
    });
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground" data-testid={`text-order-no-${pkg.id}`}>
                #{pkg.orderNo}
              </span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(pkg.createdAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
          {pkg.status === 'pending' && (
            <Button 
              size="sm" 
              onClick={() => onShip(pkg.id)}
              data-testid={`button-ship-${pkg.id}`}
            >
              <Truck className="w-4 h-4 mr-1" />
              {t('package.ship')}
            </Button>
          )}
        </div>

        {pkg.trackingNo && (
          <div 
            className="flex items-center gap-2 py-2 border-t border-b mb-2 cursor-pointer hover-elevate"
            onClick={() => copyToClipboard(pkg.trackingNo!, t('package.trackingNo'))}
          >
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm">{pkg.trackingNo}</span>
            <Copy className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
        )}

        <div className="space-y-2 py-2 border-b mb-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{pkg.recipientName}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(pkg.recipientPhone, t('package.phone'))}
                >
                  <Phone className="w-3 h-3 mr-1" />
                  <span className="text-xs">{pkg.recipientPhone}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.recipientAddress}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {pkg.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-10 h-10 bg-muted rounded flex-shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Box className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm line-clamp-1">{item.name}</span>
                <span className="text-xs text-muted-foreground">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PackageSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantPackages() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all');

  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;

  const { data: packagesData, isLoading } = useQuery<PackagesResponse>({
    queryKey: ['/api/merchant/stores', storeId, 'packages'],
    enabled: !!storeId,
  });

  const shipMutation = useMutation({
    mutationFn: async (packageId: number) => {
      return apiRequest('POST', `/api/merchant/packages/${packageId}/ship`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/stores', storeId, 'packages'] });
      toast({
        title: t('package.shipSuccess'),
        description: t('package.shipSuccessDesc'),
      });
    },
  });

  const packages = packagesData?.data || [];

  const filteredPackages = packages.filter(p => {
    const matchesSearch = p.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.trackingNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: packages.length,
    pending: packages.filter(p => p.status === 'pending').length,
    shipped: packages.filter(p => p.status === 'shipped').length,
    delivered: packages.filter(p => p.status === 'delivered').length,
  };

  const handleShip = (packageId: number) => {
    toast({
      title: t('common.comingSoon'),
      description: t('package.shipComingSoon'),
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/merchant')}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">{t('package.pageTitle')}</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-foreground" data-testid="text-total-count">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">{t('package.total')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-amber-500" data-testid="text-pending-count">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground">{t('package.pending')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-blue-500" data-testid="text-shipped-count">{stats.shipped}</div>
            <div className="text-[10px] text-muted-foreground">{t('package.shipped')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-[#38B03B]" data-testid="text-delivered-count">{stats.delivered}</div>
            <div className="text-[10px] text-muted-foreground">{t('package.delivered')}</div>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('package.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">{t('package.pending')}</TabsTrigger>
            <TabsTrigger value="shipped" data-testid="tab-shipped">{t('package.shipped')}</TabsTrigger>
            <TabsTrigger value="delivered" data-testid="tab-delivered">{t('package.delivered')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <PackageSkeleton key={i} />)}
          </div>
        ) : filteredPackages.length > 0 ? (
          <div className="space-y-3">
            {filteredPackages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} onShip={handleShip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Box className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('package.noPackages')}</p>
          </div>
        )}
      </div>

      <MerchantBottomNav />
    </div>
  );
}
