import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Plus, Search, MoreVertical, Package, AlertTriangle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Product, ProductCategory } from '@shared/schema';

interface ProductListResponse {
  success: boolean;
  data: Product[];
}

interface CategoryListResponse {
  success: boolean;
  data: ProductCategory[];
}

function ProductCard({ product, storeId, onStatusChange }: { 
  product: Product; 
  storeId: number;
  onStatusChange: (id: number, status: string) => void;
}) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const isActive = product.status === 'active';
  const isLowStock = (product.inventory ?? 0) <= (product.lowStockThreshold ?? 10);

  const getStatusBadge = () => {
    switch (product.status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('merchant.statusActive')}</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t('merchant.statusInactive')}</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('merchant.statusDraft')}</Badge>;
      case 'soldout':
        return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('merchant.statusSoldout')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div 
            className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/merchant/products/${product.id}`)}
          >
            {product.coverImage ? (
              <img 
                src={product.coverImage} 
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid={`img-product-${product.id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/merchant/products/${product.id}`)}
              >
                <h3 className="font-medium text-sm line-clamp-1" data-testid={`text-product-name-${product.id}`}>
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {getStatusBadge()}
                  {product.isRecommend && <Badge variant="outline" className="text-xs">{t('merchant.isRecommend')}</Badge>}
                  {product.isNew && <Badge variant="outline" className="text-xs">{t('merchant.isNew')}</Badge>}
                  {product.isHot && <Badge variant="outline" className="text-xs">{t('merchant.isHot')}</Badge>}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid={`button-product-menu-${product.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/merchant/products/${product.id}`)} data-testid={`menu-edit-${product.id}`}>
                    {t('merchant.editProduct')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onStatusChange(product.id, isActive ? 'inactive' : 'active')}
                    data-testid={`menu-toggle-${product.id}`}
                  >
                    {isActive ? t('merchant.takeOffShelf') : t('merchant.putOnShelf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-end justify-between mt-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-primary" data-testid={`text-product-price-${product.id}`}>
                    ฿{product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      ฿{product.originalPrice}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{t('merchant.productInventory')}: {product.inventory ?? 0}</span>
                  {isLowStock && (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      {t('merchant.lowStock')}
                    </span>
                  )}
                </div>
              </div>
              
              <Switch 
                checked={isActive}
                onCheckedChange={(checked) => onStatusChange(product.id, checked ? 'active' : 'inactive')}
                data-testid={`switch-product-status-${product.id}`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MerchantProducts() {
  const { t } = useLanguage();
  const { userToken, userRoles, activeRole } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;

  const { data: productsData, isLoading: productsLoading } = useQuery<ProductListResponse>({
    queryKey: ['/api/stores', storeId, 'products'],
    enabled: !!storeId,
  });

  const { data: categoriesData } = useQuery<CategoryListResponse>({
    queryKey: ['/api/stores', storeId, 'product-categories'],
    enabled: !!storeId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/stores/${storeId}/products/${productId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'products'] });
      toast({
        title: t('merchant.productUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (productId: number, status: string) => {
    updateStatusMutation.mutate({ productId, status });
  };

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || 
      (categoryFilter === 'none' && !product.categoryId) ||
      product.categoryId?.toString() === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const activeCount = products.filter(p => p.status === 'active').length;
  const inactiveCount = products.filter(p => p.status === 'inactive' || p.status === 'draft').length;
  const lowStockCount = products.filter(p => (p.inventory ?? 0) <= (p.lowStockThreshold ?? 10)).length;

  if (!storeId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/merchant/operations">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{t('merchant.productList')}</h1>
          </div>
        </header>
        <div className="p-4">
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('merchant.noStore')}</p>
            </CardContent>
          </Card>
        </div>
        <MerchantBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Link href="/merchant/operations">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold" data-testid="text-page-title">{t('merchant.productList')}</h1>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/merchant/products/new')}
            data-testid="button-add-product"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('merchant.addProduct')}
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="text-active-count">{activeCount}</div>
              <div className="text-xs text-muted-foreground">{t('merchant.statusActive')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-gray-600" data-testid="text-inactive-count">{inactiveCount}</div>
              <div className="text-xs text-muted-foreground">{t('merchant.statusInactive')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-600" data-testid="text-low-stock-count">{lowStockCount}</div>
              <div className="text-xs text-muted-foreground">{t('merchant.lowStock')}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t('merchant.searchProduct')}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1" data-testid="select-status-filter">
                <SelectValue placeholder={t('merchant.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('merchant.allStatus')}</SelectItem>
                <SelectItem value="active">{t('merchant.statusActive')}</SelectItem>
                <SelectItem value="inactive">{t('merchant.statusInactive')}</SelectItem>
                <SelectItem value="draft">{t('merchant.statusDraft')}</SelectItem>
                <SelectItem value="soldout">{t('merchant.statusSoldout')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1" data-testid="select-category-filter">
                <SelectValue placeholder={t('merchant.filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('merchant.allCategories')}</SelectItem>
                <SelectItem value="none">{t('merchant.noCategorySet')}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.nameZh || cat.nameSource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {productsLoading ? (
          <>
            <ProductSkeleton />
            <ProductSkeleton />
            <ProductSkeleton />
          </>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">{t('merchant.noProducts')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('merchant.noProductsDesc')}</p>
              <Button onClick={() => navigate('/merchant/products/new')} data-testid="button-add-first-product">
                <Plus className="w-4 h-4 mr-1" />
                {t('merchant.addProduct')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              storeId={storeId}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
