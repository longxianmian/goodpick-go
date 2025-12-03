import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Upload, X, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Product, ProductCategory } from '@shared/schema';

interface ProductResponse {
  success: boolean;
  data: Product;
}

interface CategoryListResponse {
  success: boolean;
  data: ProductCategory[];
}

export default function MerchantProductEdit() {
  const { t } = useLanguage();
  const { userToken, userRoles } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  
  const isNew = params.id === 'new';
  const productId = isNew ? null : parseInt(params.id || '0');
  const ownerRole = userRoles.find(r => r.role === 'owner' || r.role === 'operator');
  const storeId = ownerRole?.storeId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [unit, setUnit] = useState('份');
  const [sku, setSku] = useState('');
  const [inventory, setInventory] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<string>('draft');
  const [isRecommend, setIsRecommend] = useState(false);
  const [isNew_, setIsNew_] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [coverImage, setCoverImage] = useState<string>('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: productData, isLoading: productLoading } = useQuery<ProductResponse>({
    queryKey: ['/api/stores', storeId, 'products', productId],
    enabled: !!storeId && !!productId,
  });

  const { data: categoriesData } = useQuery<CategoryListResponse>({
    queryKey: ['/api/stores', storeId, 'product-categories'],
    enabled: !!storeId,
  });

  useEffect(() => {
    if (productData?.data) {
      const p = productData.data;
      setName(p.name || '');
      setDescription(p.descriptionSource || '');
      setPrice(p.price?.toString() || '');
      setOriginalPrice(p.originalPrice?.toString() || '');
      setUnit(p.unit || '份');
      setSku(p.sku || '');
      setInventory(p.inventory?.toString() || '0');
      setLowStockThreshold(p.lowStockThreshold?.toString() || '10');
      setCategoryId(p.categoryId?.toString() || '');
      setStatus(p.status || 'draft');
      setIsRecommend(p.isRecommend || false);
      setIsNew_(p.isNew || false);
      setIsHot(p.isHot || false);
      setCoverImage(p.coverImage || '');
      setGallery(p.gallery || []);
    }
  }, [productData]);

  const categories = categoriesData?.data || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        price,
        originalPrice: originalPrice || null,
        unit,
        sku: sku || null,
        inventory: parseInt(inventory) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        categoryId: categoryId ? parseInt(categoryId) : null,
        status,
        isRecommend,
        isNew: isNew_,
        isHot,
        coverImage: coverImage || null,
        gallery: gallery.length > 0 ? gallery : null,
      };

      if (isNew) {
        const response = await apiRequest('POST', `/api/stores/${storeId}/products`, payload);
        return response.json();
      } else {
        const response = await apiRequest('PATCH', `/api/stores/${storeId}/products/${productId}`, payload);
        return response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'products'] });
      toast({
        title: isNew ? t('merchant.productCreated') : t('merchant.productUpdated'),
      });
      navigate('/merchant/products');
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive',
      });
    },
  });

  const handleImageUpload = async (file: File, isGallery: boolean = false) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('merchant.onlyImagesAllowed'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('merchant.imageTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'products');
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.url) {
        if (isGallery) {
          setGallery(prev => [...prev, result.url]);
        } else {
          setCoverImage(result.url);
        }
        toast({
          title: t('merchant.imageUploadSuccess'),
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: t('merchant.imageUploadError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: t('merchant.productNamePlaceholder'),
        variant: 'destructive',
      });
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: t('merchant.productPrice') + ' required',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate();
  };

  if (!storeId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/merchant/products">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{isNew ? t('merchant.addProduct') : t('merchant.editProduct')}</h1>
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
      </div>
    );
  }

  if (!isNew && productLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/merchant/products">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Skeleton className="h-6 w-24" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Link href="/merchant/products">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold" data-testid="text-page-title">
              {isNew ? t('merchant.addProduct') : t('merchant.editProduct')}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">{t('merchant.productName')} *</Label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('merchant.productNamePlaceholder')}
                className="mt-1"
                data-testid="input-product-name"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">{t('merchant.selectCategory')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1" data-testid="select-category">
                  <SelectValue placeholder={t('merchant.noCategorySet')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('merchant.noCategorySet')}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.nameZh || cat.nameSource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('merchant.productDescription')}</Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('merchant.productDescription')}
                className="mt-1 resize-none"
                rows={3}
                data-testid="input-description"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('merchant.autoTranslateHint')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{t('merchant.productPrice')} *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                  <Input 
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    data-testid="input-price"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('merchant.originalPrice')}</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                  <Input 
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    data-testid="input-original-price"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{t('merchant.productUnit')}</Label>
                <Input 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1"
                  placeholder="份"
                  data-testid="input-unit"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('merchant.productSku')}</Label>
                <Input 
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1"
                  placeholder="SKU-001"
                  data-testid="input-sku"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{t('merchant.productInventory')}</Label>
                <Input 
                  type="number"
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  className="mt-1"
                  placeholder="0"
                  data-testid="input-inventory"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('merchant.lowStock')}</Label>
                <Input 
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="mt-1"
                  placeholder="10"
                  data-testid="input-low-stock"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('merchant.lowStockHint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('merchant.coverImage')}</Label>
              {coverImage ? (
                <div className="relative w-32 h-32 rounded-md overflow-hidden">
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="absolute top-1 right-1 w-6 h-6"
                    onClick={() => setCoverImage('')}
                    data-testid="button-remove-cover"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-muted rounded-md cursor-pointer hover-elevate">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    disabled={uploading}
                    data-testid="input-cover-upload"
                  />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">{t('merchant.upload')}</span>
                    </>
                  )}
                </label>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">{t('merchant.storeImages')}</Label>
              <div className="flex flex-wrap gap-2">
                {gallery.map((url, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden">
                    <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="absolute top-1 right-1 w-5 h-5"
                      onClick={() => handleRemoveGalleryImage(index)}
                      data-testid={`button-remove-gallery-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {gallery.length < 5 && (
                  <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-muted rounded-md cursor-pointer hover-elevate">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                      disabled={uploading}
                      data-testid="input-gallery-upload"
                    />
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    )}
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('merchant.productStatus')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-32" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('merchant.statusDraft')}</SelectItem>
                  <SelectItem value="active">{t('merchant.statusActive')}</SelectItem>
                  <SelectItem value="inactive">{t('merchant.statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-sm">{t('merchant.isRecommend')}</Label>
              <Switch 
                checked={isRecommend} 
                onCheckedChange={setIsRecommend}
                data-testid="switch-recommend"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-sm">{t('merchant.isNew')}</Label>
              <Switch 
                checked={isNew_} 
                onCheckedChange={setIsNew_}
                data-testid="switch-new"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-sm">{t('merchant.isHot')}</Label>
              <Switch 
                checked={isHot} 
                onCheckedChange={setIsHot}
                data-testid="switch-hot"
              />
            </div>
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-lg mx-auto">
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isNew ? t('merchant.addProduct') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
