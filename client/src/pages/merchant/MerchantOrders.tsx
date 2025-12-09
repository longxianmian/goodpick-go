import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ClipboardList, Search, Clock, Check, X, Package, CreditCard, Calendar } from 'lucide-react';
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

interface OrderItem {
  id: number;
  orderNo: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  totalAmount: string;
  createdAt: string;
  paidAt?: string;
  userName?: string;
  userAvatar?: string;
  items: {
    name: string;
    quantity: number;
    price: string;
  }[];
  paymentMethod?: string;
}

interface OrdersResponse {
  success: boolean;
  data: OrderItem[];
}

function OrderCard({ order }: { order: OrderItem }) {
  const { t } = useLanguage();

  const getStatusBadge = () => {
    switch (order.status) {
      case 'pending':
        return <Badge className="bg-amber-500 text-[10px]"><Clock className="w-3 h-3 mr-0.5" />{t('order.pending')}</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500 text-[10px]"><CreditCard className="w-3 h-3 mr-0.5" />{t('order.paid')}</Badge>;
      case 'completed':
        return <Badge className="bg-[#38B03B] text-[10px]"><Check className="w-3 h-3 mr-0.5" />{t('order.completed')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-[10px] text-muted-foreground"><X className="w-3 h-3 mr-0.5" />{t('order.cancelled')}</Badge>;
      case 'refunded':
        return <Badge variant="secondary" className="text-[10px]">{t('order.refunded')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground" data-testid={`text-order-no-${order.id}`}>
                #{order.orderNo}
              </span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#38B03B]" data-testid={`text-order-amount-${order.id}`}>
              ฿{order.totalAmount}
            </div>
          </div>
        </div>

        {order.userName && (
          <div className="flex items-center gap-2 py-2 border-t border-b mb-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              {order.userAvatar ? (
                <img src={order.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs">{order.userName.charAt(0)}</span>
              )}
            </div>
            <span className="text-sm">{order.userName}</span>
          </div>
        )}

        <div className="space-y-1">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
              <span>฿{item.price}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{order.items.length - 3} {t('order.moreItems')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantOrders() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { user, userRoles } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'completed'>('all');

  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;

  const { data: ordersData, isLoading } = useQuery<OrdersResponse>({
    queryKey: ['/api/merchant/stores', storeId, 'orders'],
    enabled: !!storeId,
  });

  const orders = ordersData?.data || [];

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.status === 'paid')
    .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

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
            <h1 className="text-lg font-semibold" data-testid="text-page-title">{t('order.pageTitle')}</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#38B03B]" data-testid="text-total-revenue">
              ฿{totalRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">{t('order.totalRevenue')}</div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-2">
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-foreground" data-testid="text-total-count">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">{t('order.total')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-amber-500" data-testid="text-pending-count">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground">{t('order.pending')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-blue-500" data-testid="text-paid-count">{stats.paid}</div>
            <div className="text-[10px] text-muted-foreground">{t('order.paid')}</div>
          </Card>
          <Card className="text-center p-2">
            <div className="text-lg font-bold text-[#38B03B]" data-testid="text-completed-count">{stats.completed}</div>
            <div className="text-[10px] text-muted-foreground">{t('order.completed')}</div>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('order.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">{t('order.pending')}</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">{t('order.paid')}</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">{t('order.completed')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <OrderSkeleton key={i} />)}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('order.noOrders')}</p>
          </div>
        )}
      </div>

      <MerchantBottomNav />
    </div>
  );
}
