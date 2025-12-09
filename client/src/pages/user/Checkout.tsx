import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  MapPin,
  Plus,
  Package,
  Truck,
  CreditCard,
  ShoppingCart,
  Edit2,
  Check,
  Store,
} from 'lucide-react';

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    coverImage: string | null;
  };
}

interface CartData {
  id: number;
  storeId: number;
  store: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
  items: CartItem[];
}

interface DeliveryAddress {
  id: number;
  recipientName: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface DeliveryFee {
  baseFee: number;
  distanceFee: number;
  total: number;
  estimatedTime: string;
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const storeId = searchParams.get('storeId');

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [newAddress, setNewAddress] = useState({
    recipientName: '',
    phone: '',
    address: '',
    isDefault: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cart, isLoading: cartLoading } = useQuery<CartData>({
    queryKey: ['/api/cart', storeId],
    enabled: !!storeId && !!user,
  });

  const { data: addressesData, isLoading: addressesLoading } = useQuery<{ addresses: DeliveryAddress[] }>({
    queryKey: ['/api/delivery-addresses'],
    enabled: !!user,
  });

  const addresses = addressesData?.addresses || [];

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  const { data: feeData } = useQuery<DeliveryFee>({
    queryKey: ['/api/delivery/calculate-fee', storeId, selectedAddressId],
    queryFn: async () => {
      const res = await apiRequest('POST', '/api/delivery/calculate-fee', {
        storeId: Number(storeId),
        addressId: selectedAddressId,
      });
      return res.json().then(r => r.data);
    },
    enabled: !!storeId && !!selectedAddressId,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof newAddress) => {
      const res = await apiRequest('POST', '/api/delivery-addresses', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-addresses'] });
      setSelectedAddressId(data.data.id);
      setShowAddressDialog(false);
      setNewAddress({ recipientName: '', phone: '', address: '', isDefault: false });
      toast({ title: t('checkout.addressAdded') });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/delivery-orders', {
        storeId: Number(storeId),
        addressId: selectedAddressId,
        deliveryNote,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      navigate(`/order/${data.data.id}/success`);
    },
    onError: (error: Error) => {
      toast({
        title: t('checkout.orderFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('auth.loginRequired')}</h2>
        <p className="text-muted-foreground text-center mb-4">{t('auth.loginRequiredDesc')}</p>
        <Link href="/me">
          <Button>{t('common.login')}</Button>
        </Link>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('checkout.noItems')}</h2>
        <p className="text-muted-foreground text-center mb-4">{t('checkout.noItemsDesc')}</p>
        <Link href="/shop">
          <Button>{t('checkout.goShopping')}</Button>
        </Link>
      </div>
    );
  }

  if (cartLoading || addressesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center gap-3 p-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="flex-1 h-6" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('checkout.emptyCart')}</h2>
        <p className="text-muted-foreground text-center mb-4">{t('checkout.emptyCartDesc')}</p>
        <Link href="/shop">
          <Button>{t('checkout.goShopping')}</Button>
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = feeData?.total || 0;
  const total = subtotal + deliveryFee;
  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      toast({
        title: t('checkout.selectAddress'),
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createOrderMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('checkout.title')}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-medium">{t('checkout.deliveryAddress')}</span>
            </div>
            <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-add-address">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('checkout.addAddress')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('checkout.newAddress')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('checkout.recipientName')}</Label>
                    <Input
                      value={newAddress.recipientName}
                      onChange={(e) => setNewAddress(p => ({ ...p, recipientName: e.target.value }))}
                      placeholder={t('checkout.recipientNamePlaceholder')}
                      data-testid="input-recipient-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('checkout.phone')}</Label>
                    <Input
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress(p => ({ ...p, phone: e.target.value }))}
                      placeholder={t('checkout.phonePlaceholder')}
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('checkout.address')}</Label>
                    <Textarea
                      value={newAddress.address}
                      onChange={(e) => setNewAddress(p => ({ ...p, address: e.target.value }))}
                      placeholder={t('checkout.addressPlaceholder')}
                      data-testid="input-address"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createAddressMutation.mutate(newAddress)}
                    disabled={createAddressMutation.isPending || !newAddress.recipientName || !newAddress.phone || !newAddress.address}
                    data-testid="button-save-address"
                  >
                    {createAddressMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('checkout.noAddress')}</p>
            </div>
          ) : (
            <RadioGroup
              value={String(selectedAddressId)}
              onValueChange={(v) => setSelectedAddressId(Number(v))}
            >
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedAddressId(addr.id)}
                  data-testid={`address-${addr.id}`}
                >
                  <RadioGroupItem value={String(addr.id)} id={`addr-${addr.id}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{addr.recipientName}</span>
                      <span className="text-muted-foreground">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {t('checkout.default')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{addr.address}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-5 h-5 text-primary" />
            <span className="font-medium">{cart.store.name}</span>
          </div>
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3" data-testid={`cart-item-${item.id}`}>
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.product.coverImage ? (
                    <img
                      src={item.product.coverImage}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2">{item.product.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-primary font-semibold">
                      ฿{item.product.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-sm">x{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('checkout.delivery')}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('checkout.estimatedTime')}</span>
              <span>{feeData?.estimatedTime || '30-45 min'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Edit2 className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('checkout.orderNote')}</span>
          </div>
          <Textarea
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            placeholder={t('checkout.orderNotePlaceholder')}
            className="resize-none"
            rows={2}
            data-testid="input-note"
          />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('checkout.paymentSummary')}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('checkout.subtotal')}</span>
              <span>฿{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('checkout.deliveryFee')}</span>
              <span>฿{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>{t('checkout.total')}</span>
              <span className="text-primary">฿{total.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-bottom">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('checkout.total')}</p>
            <p className="text-xl font-bold text-primary">฿{total.toFixed(2)}</p>
          </div>
          <Button
            className="flex-1 max-w-[200px]"
            size="lg"
            onClick={handleSubmitOrder}
            disabled={isSubmitting || !selectedAddressId}
            data-testid="button-place-order"
          >
            {isSubmitting ? t('checkout.processing') : t('checkout.placeOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
}
