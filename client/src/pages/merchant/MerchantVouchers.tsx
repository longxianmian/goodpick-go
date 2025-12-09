import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, QrCode, Search, Filter, Check, Clock, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface VoucherItem {
  id: number;
  code: string;
  status: 'unused' | 'used' | 'expired';
  issuedAt: string;
  usedAt?: string;
  expiredAt: string;
  userName?: string;
  userAvatar?: string;
  campaignTitle: string;
  couponValue: string;
  discountType: 'fixed' | 'percent';
}

interface VouchersResponse {
  success: boolean;
  data: VoucherItem[];
}

function VoucherCard({ voucher }: { voucher: VoucherItem }) {
  const { t } = useLanguage();

  const getStatusBadge = () => {
    switch (voucher.status) {
      case 'unused':
        return <Badge className="bg-[#38B03B] text-[10px]"><Clock className="w-3 h-3 mr-0.5" />{t('voucher.unused')}</Badge>;
      case 'used':
        return <Badge variant="secondary" className="text-[10px]"><Check className="w-3 h-3 mr-0.5" />{t('voucher.used')}</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-[10px] text-muted-foreground"><X className="w-3 h-3 mr-0.5" />{t('voucher.expired')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950 rounded-md flex items-center justify-center flex-shrink-0">
            <QrCode className="w-8 h-8 text-orange-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-1" data-testid={`text-voucher-title-${voucher.id}`}>
                  {voucher.campaignTitle}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {getStatusBadge()}
                  <Badge variant="outline" className="text-[10px]">
                    {voucher.discountType === 'fixed' ? `฿${voucher.couponValue}` : `${voucher.couponValue}%`}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>{t('voucher.code')}:</span>
                <span className="font-mono font-medium">{voucher.code}</span>
              </div>
              {voucher.userName && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{t('voucher.claimedBy')}:</span>
                  <span>{voucher.userName}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{t('voucher.expiry')}: {format(new Date(voucher.expiredAt), 'yyyy-MM-dd')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VoucherSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-16 h-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantVouchers() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { user, userRoles } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all');

  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;

  const { data: vouchersData, isLoading } = useQuery<VouchersResponse>({
    queryKey: ['/api/merchant/stores', storeId, 'vouchers'],
    enabled: !!storeId,
  });

  const vouchers = vouchersData?.data || [];

  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vouchers.length,
    unused: vouchers.filter(v => v.status === 'unused').length,
    used: vouchers.filter(v => v.status === 'used').length,
    expired: vouchers.filter(v => v.status === 'expired').length,
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
            <h1 className="text-lg font-semibold" data-testid="text-page-title">{t('voucher.pageTitle')}</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-foreground" data-testid="text-total-count">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">{t('voucher.total')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-[#38B03B]" data-testid="text-unused-count">{stats.unused}</div>
            <div className="text-[10px] text-muted-foreground">{t('voucher.unused')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-blue-500" data-testid="text-used-count">{stats.used}</div>
            <div className="text-[10px] text-muted-foreground">{t('voucher.used')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-muted-foreground" data-testid="text-expired-count">{stats.expired}</div>
            <div className="text-[10px] text-muted-foreground">{t('voucher.expired')}</div>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('voucher.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="unused" data-testid="tab-unused">{t('voucher.unused')}</TabsTrigger>
            <TabsTrigger value="used" data-testid="tab-used">{t('voucher.used')}</TabsTrigger>
            <TabsTrigger value="expired" data-testid="tab-expired">{t('voucher.expired')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <VoucherSkeleton key={i} />)}
          </div>
        ) : filteredVouchers.length > 0 ? (
          <div className="space-y-3">
            {filteredVouchers.map(voucher => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('voucher.noVouchers')}</p>
          </div>
        )}
      </div>

      <MerchantBottomNav />
    </div>
  );
}
