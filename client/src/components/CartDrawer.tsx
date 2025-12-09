import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ShoppingCart, Plus, Minus, Trash2, X, ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  options: string | null;
  note: string | null;
  product: {
    id: number;
    name: string;
    coverImage: string | null;
    price: string;
    originalPrice: string | null;
    status: string;
  } | null;
}

interface Cart {
  id: number;
  userId: number;
  storeId: number;
  status: string;
  orderType: string;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  items: CartItem[];
}

interface CartDrawerProps {
  storeId: number;
  storeName?: string;
}

export function CartDrawer({ storeId, storeName }: CartDrawerProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: cartData, isLoading } = useQuery<{ success: boolean; data: Cart | null }>({
    queryKey: ['/api/cart', storeId],
    queryFn: async () => {
      const res = await fetch(`/api/cart?storeId=${storeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      return res.json();
    },
    enabled: !!storeId,
    refetchInterval: isOpen ? 5000 : false,
  });

  const cart = cartData?.data;
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      return apiRequest('PATCH', `/api/cart/items/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', storeId] });
    },
    onError: () => {
      toast({
        title: t('cart.updateFailed'),
        variant: 'destructive',
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest('DELETE', `/api/cart/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', storeId] });
      toast({
        title: t('cart.itemRemoved'),
      });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/cart?storeId=${storeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', storeId] });
      toast({
        title: t('cart.cleared'),
      });
    },
  });

  const handleQuantityChange = (itemId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItemMutation.mutate(itemId);
    } else {
      updateItemMutation.mutate({ itemId, quantity: newQty });
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            data-testid="button-cart"
            size="lg"
            className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0">
          <SheetHeader className="px-4 py-3 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">
                {t('cart.title')} {storeName && `- ${storeName}`}
              </SheetTitle>
              {cart && cart.items.length > 0 && (
                <Button
                  data-testid="button-clear-cart"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCartMutation.mutate()}
                  disabled={clearCartMutation.isPending}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('cart.clear')}
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-4 py-3 pb-32">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !cart || cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg">{t('cart.empty')}</p>
                <p className="text-sm mt-1">{t('cart.emptyHint')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`cart-item-${item.id}`}
                    className="flex gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.product?.coverImage ? (
                        <img
                          src={item.product.coverImage}
                          alt={item.product?.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product?.name || t('cart.unknownProduct')}
                      </p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground truncate">{item.note}</p>
                      )}
                      <p className="text-primary font-semibold mt-1">
                        {'\u0E3F'}{parseFloat(item.unitPrice).toFixed(0)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        data-testid={`button-decrease-${item.id}`}
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                        disabled={updateItemMutation.isPending}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button
                        data-testid={`button-increase-${item.id}`}
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                        disabled={updateItemMutation.isPending}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart && cart.items.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-muted-foreground text-sm">{t('cart.subtotal')}</span>
                  <p className="text-xl font-bold text-primary">
                    {'\u0E3F'}{parseFloat(cart.total).toFixed(0)}
                  </p>
                </div>
                <Link href={`/checkout?storeId=${storeId}`}>
                  <Button
                    data-testid="button-checkout"
                    size="lg"
                    className="px-8"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('cart.checkout')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function useAddToCart(storeId: number) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1, options, note }: {
      productId: number;
      quantity?: number;
      options?: any;
      note?: string;
    }) => {
      return apiRequest('POST', '/api/cart/items', {
        storeId,
        productId,
        quantity,
        options,
        note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', storeId] });
      toast({
        title: t('cart.addedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: error.message || t('cart.addFailed'),
        variant: 'destructive',
      });
    },
  });

  return addMutation;
}
