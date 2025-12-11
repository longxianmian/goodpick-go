import { useParams, Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { useAddToCart } from '@/components/CartDrawer';
import { 
  ChevronLeft, 
  Heart, 
  Share2, 
  ChevronRight,
  MapPin,
  Shield,
  Star,
  Store,
  ShoppingCart,
  Package,
  MessageCircle,
  Truck,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';

const TABS = ['product', 'reviews', 'details', 'recommend'] as const;
type TabType = typeof TABS[number];

type DeliveryMode = 'delivery' | 'express' | 'pickup';

interface ProductData {
  id: number;
  storeId: number;
  categoryId: number | null;
  name: string;
  sku: string | null;
  descriptionSource: string | null;
  descriptionZh: string | null;
  descriptionEn: string | null;
  descriptionTh: string | null;
  price: string;
  originalPrice: string | null;
  unit: string | null;
  inventory: number | null;
  lowStockThreshold: number | null;
  coverImage: string | null;
  gallery: string[] | null;
  status: string;
  isRecommend: boolean | null;
  isNew: boolean | null;
  isHot: boolean | null;
  minPurchaseQty: number | null;
  maxPurchaseQty: number | null;
  dailyLimit: number | null;
  isAvailableForDelivery: boolean | null;
  isAvailableForPickup: boolean | null;
  prepTimeMinutes: number | null;
  sortOrder: number | null;
  salesCount: number | null;
  viewCount: number | null;
  store: {
    id: number;
    name: string;
    imageUrl: string | null;
    city: string;
    address: string | null;
    phone: string | null;
  } | null;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { authPhase, user, userToken } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('product');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isFavorited, setIsFavorited] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery');
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  
  const storeId = product?.storeId ?? 0;
  const addToCart = useAddToCart(storeId);

  useEffect(() => {
    if (!carouselApi) return;
    
    carouselApi.on('select', () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  useEffect(() => {
    if (!product) return;
    
    if (product.isAvailableForDelivery) {
      setDeliveryMode('delivery');
    } else if (product.isAvailableForPickup) {
      setDeliveryMode('pickup');
    }
  }, [product]);

  useEffect(() => {
    if (!id) return;
    if (authPhase === 'booting') return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const headers: Record<string, string> = {
          'Accept-Language': language,
        };
        
        if (userToken) {
          headers['Authorization'] = `Bearer ${userToken}`;
        }
        
        const res = await fetch(`/api/products/${id}`, { headers });
        
        if (!res.ok) throw new Error('Failed to load product');
        const data = await res.json();
        
        if (!cancelled) {
          setProduct(data.data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(t('product.loadFailed'));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id, language, authPhase, userToken]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name || '',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: t('common.success'),
          description: t('common.linkCopied'),
        });
      }
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  const getDescription = () => {
    if (!product) return '';
    if (language === 'zh-cn' && product.descriptionZh) return product.descriptionZh;
    if (language === 'en-us' && product.descriptionEn) return product.descriptionEn;
    if (language === 'th-th' && product.descriptionTh) return product.descriptionTh;
    return product.descriptionSource || product.descriptionZh || product.descriptionEn || '';
  };

  const mediaUrls = product ? [
    ...(product.coverImage ? [product.coverImage] : []),
    ...(product.gallery || [])
  ].filter(Boolean) : [];

  const storeName = product?.store?.name || t('product.unknownStore');
  const hasDiscount = product?.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price);
  const discountPercent = hasDiscount 
    ? Math.round((1 - parseFloat(product!.price) / parseFloat(product!.originalPrice!)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background animate-in fade-in duration-150">
        <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 flex items-center justify-between">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-background/60 backdrop-blur-sm rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </header>
        <Skeleton className="w-full" style={{ aspectRatio: '1/1' }} />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
          <Skeleton className="h-12 w-12" />
          <Skeleton className="h-12 w-12" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('product.notFound')}</h2>
        <p className="text-muted-foreground text-center mb-4">{error || t('product.notFoundDesc')}</p>
        <Link href="/">
          <Button>{t('common.back')}</Button>
        </Link>
      </div>
    );
  }

  const inStock = (product.inventory ?? 0) > 0;

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: t('auth.loginRequired'),
        description: t('auth.loginRequiredDesc'),
        variant: 'destructive'
      });
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity },
      {
        onSuccess: () => {
          toast({
            title: t('cart.addedSuccess'),
          });
        }
      }
    );
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: t('auth.loginRequired'),
        description: t('auth.loginRequiredDesc'),
        variant: 'destructive'
      });
      return;
    }
    setIsBuyingNow(true);
    addToCart.mutate(
      { productId: product.id, quantity },
      {
        onSuccess: () => {
          navigate(`/checkout?storeId=${storeId}`);
        },
        onError: () => {
          setIsBuyingNow(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[120px]">
      <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 flex items-center justify-between">
        <Link href="/">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-background/60 backdrop-blur-sm rounded-full"
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-background/60 backdrop-blur-sm rounded-full"
            onClick={() => setIsFavorited(!isFavorited)}
            data-testid="button-favorite"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-background/60 backdrop-blur-sm rounded-full"
            onClick={handleShare}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="relative">
          {mediaUrls.length > 0 ? (
            <Carousel 
              className="w-full" 
              setApi={setCarouselApi}
              opts={{ loop: true }}
              data-testid="product-carousel"
            >
              <CarouselContent>
                {mediaUrls.map((url: string, index: number) => (
                  <CarouselItem key={index}>
                    <div className="bg-muted relative" style={{ aspectRatio: '1/1' }}>
                      <img
                        src={url}
                        alt={`${product.name} - ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <div className="bg-muted flex items-center justify-center" style={{ aspectRatio: '1/1' }}>
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
          {mediaUrls.length > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                {currentImageIndex + 1}/{mediaUrls.length}
              </span>
            </div>
          )}
        </div>

        {mediaUrls.length > 1 && (
          <div className="flex items-center px-4 py-3 gap-2 bg-card border-b">
            <div className="flex gap-2 overflow-x-auto flex-1">
              {mediaUrls.slice(0, 5).map((url: string, index: number) => (
                <button
                  key={index}
                  onClick={() => carouselApi?.scrollTo(index)}
                  className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 ${
                    currentImageIndex === index ? 'border-primary' : 'border-transparent'
                  }`}
                  data-testid={`thumbnail-${index}`}
                >
                  <img 
                    src={url} 
                    alt={`Thumbnail ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            {mediaUrls.length > 5 && (
              <button className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                <span>{t('product.totalImages', { count: String(mediaUrls.length) })}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="px-4 py-4 bg-card">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-destructive">
              {t('common.currencySymbol')}{parseFloat(product.price).toFixed(0)}
            </span>
            {hasDiscount && (
              <>
                <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                  {t('product.finalPrice')} {t('common.currencySymbol')}{parseFloat(product.price).toFixed(0)}
                </Badge>
                <span className="text-sm text-muted-foreground line-through">
                  {t('common.currencySymbol')}{parseFloat(product.originalPrice!).toFixed(0)}
                </span>
              </>
            )}
          </div>
          
          {hasDiscount && (
            <div className="mt-2">
              <Badge className="bg-[#38B03B] text-white text-xs">
                {t('product.limitedDiscount')} -{discountPercent}%
              </Badge>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('product.sold')} {product.salesCount || 0}+</span>
            {product.isNew && (
              <Badge variant="outline" className="text-[#38B03B] border-[#38B03B] text-xs">
                {t('discover.newProduct')}
              </Badge>
            )}
            {product.isHot && (
              <Badge variant="outline" className="text-destructive border-destructive text-xs">
                {t('discover.hotSale')}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 py-3 bg-card border-t">
          <h1 className="text-base font-medium leading-tight" data-testid="product-title">
            {product.name}
          </h1>
        </div>

        <div className="px-4 py-3 bg-card border-t">
          <div className="flex gap-2 mb-3">
            <Button
              variant={deliveryMode === 'delivery' ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${deliveryMode === 'delivery' ? 'bg-[#38B03B] hover:bg-[#38B03B]/90' : ''}`}
              onClick={() => setDeliveryMode('delivery')}
              disabled={!product.isAvailableForDelivery}
              data-testid="mode-delivery"
            >
              <Truck className="w-4 h-4 mr-1" />
              {t('product.modeDelivery')}
            </Button>
            <Button
              variant={deliveryMode === 'express' ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${deliveryMode === 'express' ? 'bg-[#38B03B] hover:bg-[#38B03B]/90' : ''}`}
              onClick={() => setDeliveryMode('express')}
              disabled={!product.isAvailableForDelivery}
              data-testid="mode-express"
            >
              <Package className="w-4 h-4 mr-1" />
              {t('product.modeExpress')}
            </Button>
            <Button
              variant={deliveryMode === 'pickup' ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${deliveryMode === 'pickup' ? 'bg-[#38B03B] hover:bg-[#38B03B]/90' : ''}`}
              onClick={() => setDeliveryMode('pickup')}
              disabled={!product.isAvailableForPickup}
              data-testid="mode-pickup"
            >
              <MapPin className="w-4 h-4 mr-1" />
              {t('product.modePickup')}
            </Button>
          </div>
          
          <div className="space-y-2.5">
            {deliveryMode === 'delivery' && (
              <>
                <div className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{t('product.deliveryFee')}</span>
                    <span className="text-muted-foreground ml-2">{t('common.currencySymbol')}0 {t('product.freeDelivery')}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{t('product.deliveryTime')}</span>
                    <span className="text-muted-foreground ml-2">~{(product.prepTimeMinutes || 15) + 30} {t('common.minutes')}</span>
                  </div>
                </div>
              </>
            )}
            
            {deliveryMode === 'express' && (
              <>
                <div className="flex items-start gap-3">
                  <Package className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{t('product.expressShipping')}</span>
                    <span className="text-muted-foreground ml-2">{t('product.expressDesc')}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{t('product.expressTime')}</span>
                    <span className="text-muted-foreground ml-2">1-3 {t('product.days')}</span>
                  </div>
                </div>
              </>
            )}
            
            {deliveryMode === 'pickup' && (
              <>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{t('product.pickupAddress')}</span>
                    <span className="text-muted-foreground ml-2">{product.store?.address || product.store?.city}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{t('product.pickupTime')}</span>
                    <span className="text-[#38B03B] ml-2">~{product.prepTimeMinutes || 15} {t('common.minutes')}</span>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex items-start gap-3">
              <Package className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">{t('product.stock')}</span>
                <span className={`ml-2 ${inStock ? 'text-[#38B03B]' : 'text-destructive'}`}>
                  {inStock ? t('product.inStock', { count: String(product.inventory) }) : t('product.outOfStock')}
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
              <span className="text-sm">{t('product.guarantee')}</span>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-40 bg-card border-y flex px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`py-3 px-4 text-sm relative ${
                activeTab === tab 
                  ? 'text-[#38B03B] font-medium' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
            >
              {t(`productDetail.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#38B03B] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'product' && (
            <>
              <div className="bg-card rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Link href={product.store?.id ? `/store/${product.store.id}` : '/shop'}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={product.store?.imageUrl || undefined} />
                      <AvatarFallback className="bg-[#38B03B]/10 text-[#38B03B]">
                        {storeName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{storeName}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span>4.7</span>
                      </div>
                      <span>|</span>
                      <span>{t('product.sold')} {product.salesCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {product.store?.id ? (
                      <Link href={`/store/${product.store.id}`}>
                        <Button size="sm" className="h-7 text-xs">
                          {t('productDetail.enterStore')}
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" className="h-7 text-xs" disabled>
                        {t('productDetail.enterStore')}
                      </Button>
                    )}
                  </div>
                </div>
                
                {product.store?.address && (
                  <div className="mt-3 pt-3 border-t flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{product.store.address}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-card rounded-lg p-4">
                <h4 className="font-medium mb-2">{t('product.description')}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {getDescription() || t('productDetail.noDetails')}
                </p>
              </div>
            </>
          )}
          
          {activeTab === 'reviews' && (
            <div className="text-center py-8 text-muted-foreground">
              {t('productDetail.noReviews')}
            </div>
          )}
          
          {activeTab === 'details' && (
            <div className="bg-card rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.sku')}</span>
                  <span>{product.sku || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.unit')}</span>
                  <span>{product.unit || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.minOrder')}</span>
                  <span>{product.minPurchaseQty || 1}</span>
                </div>
                {product.maxPurchaseQty && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('product.maxOrder')}</span>
                    <span>{product.maxPurchaseQty}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'recommend' && (
            <div className="text-center py-8 text-muted-foreground">
              {t('productDetail.noRecommend')}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex items-center px-3 py-2 gap-2">
          <Link href={product.store?.id ? `/store/${product.store.id}` : '/shop'}>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1 px-3">
              <Store className="w-5 h-5" />
              <span className="text-[10px]">{t('product.store')}</span>
            </Button>
          </Link>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-0.5 h-auto py-1 px-3"
            onClick={() => {
              toast({
                title: t('common.comingSoon'),
                description: t('product.chatComingSoon'),
              });
            }}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">{t('product.chat')}</span>
          </Button>
          
          <div className="flex-1" />
          
          <Button 
            variant="outline"
            className="flex-1 max-w-[120px] border-[#38B03B] text-[#38B03B]"
            disabled={!inStock || addToCart.isPending}
            onClick={handleAddToCart}
            data-testid="button-add-cart"
          >
            {addToCart.isPending && !isBuyingNow ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4 mr-1" />
            )}
            {t('product.addToCart')}
          </Button>
          
          <Button 
            className="flex-1 max-w-[120px] bg-[#38B03B] hover:bg-[#38B03B]/90 text-white"
            disabled={!inStock || isBuyingNow}
            onClick={handleBuyNow}
            data-testid="button-buy-now"
          >
            {isBuyingNow ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : null}
            {inStock ? t('product.buyNow') : t('product.outOfStock')}
          </Button>
        </div>
      </div>
    </div>
  );
}
