import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  Heart, 
  Share2, 
  MapPin,
  Store,
  Phone,
  ShoppingCart,
  MessageCircle,
  Flame,
  Sparkles,
  Package
} from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@shared/schema';

interface ProductWithStore extends Product {
  store: {
    id: number;
    name: string;
    imageUrl: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
  } | null;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [isFavorited, setIsFavorited] = useState(false);

  const { data: product, isLoading, error } = useQuery<ProductWithStore>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  const getDescription = (product: ProductWithStore) => {
    if (language === 'zh-cn') return product.descriptionZh || product.descriptionSource || '';
    if (language === 'en-us') return product.descriptionEn || product.descriptionSource || '';
    return product.descriptionTh || product.descriptionSource || '';
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || '',
          text: getDescription(product!),
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </div>
        <Skeleton className="w-full aspect-square" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('common.error')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('product.notFound') || '商品不存在或已下架'}
        </p>
        <Link href="/shop">
          <Button variant="outline">{t('common.back')}</Button>
        </Link>
      </div>
    );
  }

  const hasDiscount = product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price);
  const discountPercent = hasDiscount 
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice!)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-50 flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm border-b">
        <Link href="/shop">
          <Button size="icon" variant="ghost" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex gap-1">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setIsFavorited(!isFavorited)}
            data-testid="button-favorite"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleShare}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="w-full aspect-square bg-muted relative overflow-hidden">
        {product.coverImage ? (
          <img 
            src={product.coverImage} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Package className="w-20 h-20 text-muted-foreground" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.isNew && (
            <Badge className="bg-blue-500 text-white border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              {t('discover.newProduct')}
            </Badge>
          )}
          {product.isHot && (
            <Badge className="bg-orange-500 text-white border-0">
              <Flame className="w-3 h-3 mr-1" />
              {t('discover.hotSale')}
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-red-500 text-white border-0">
              -{discountPercent}%
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-red-500">
              {t('common.currencySymbol')}{product.price}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {t('common.currencySymbol')}{product.originalPrice}
              </span>
            )}
            {product.unit && (
              <span className="text-sm text-muted-foreground">/{product.unit}</span>
            )}
          </div>
          <h1 className="text-lg font-semibold" data-testid="text-product-name">
            {product.name}
          </h1>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {product.salesCount !== null && product.salesCount > 0 && (
            <span>{t('product.sales') || '已售'} {product.salesCount}</span>
          )}
          {product.inventory !== null && (
            <span>{t('product.stock') || '库存'} {product.inventory}</span>
          )}
        </div>

        {getDescription(product) && (
          <div className="bg-muted/50 rounded-lg p-3">
            <h3 className="font-medium mb-2">{t('product.description') || '商品描述'}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {getDescription(product)}
            </p>
          </div>
        )}

        {product.store && (
          <Link href={`/store/${product.store.id}`}>
            <div className="bg-card rounded-lg p-3 border hover-elevate cursor-pointer">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={product.store.imageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10">
                    <Store className="w-5 h-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{product.store.name}</h3>
                  {product.store.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{product.store.city}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline">
                  {t('store.enter') || '进店'}
                </Button>
              </div>
            </div>
          </Link>
        )}

        {product.specInfo && Object.keys(product.specInfo).length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <h3 className="font-medium mb-2">{t('product.specs') || '规格参数'}</h3>
            <div className="space-y-1">
              {Object.entries(product.specInfo as Record<string, string>).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex items-center gap-3 z-40">
        {product.store && (
          <Link href={`/store/${product.store.id}`}>
            <Button size="icon" variant="outline" data-testid="button-store">
              <Store className="w-5 h-5" />
            </Button>
          </Link>
        )}
        <Button size="icon" variant="outline" data-testid="button-chat">
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="outline" data-testid="button-cart">
          <ShoppingCart className="w-5 h-5" />
        </Button>
        <Button className="flex-1" data-testid="button-buy">
          {t('product.buyNow') || '立即购买'}
        </Button>
      </div>
    </div>
  );
}
