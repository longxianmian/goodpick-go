import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Upload, X, Package, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Product, ProductCategory } from '@shared/schema';

interface ProductResponse {
  success: boolean;
  data: Product;
}

interface CategoryListResponse {
  success: boolean;
  data: ProductCategory[];
}

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.string().refine(val => !val || (parseFloat(val) > 0), 'Price must be greater than 0'),
  originalPrice: z.string().optional(),
  unit: z.string().default('份'),
  sku: z.string().optional(),
  inventory: z.string().default('0'),
  lowStockThreshold: z.string().default('10'),
  categoryId: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive']).default('draft'),
  isRecommend: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isHot: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

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

  const [coverImage, setCoverImage] = useState<string>('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      unit: '份',
      sku: '',
      inventory: '0',
      lowStockThreshold: '10',
      categoryId: '',
      status: 'draft',
      isRecommend: false,
      isNew: false,
      isHot: false,
    },
  });

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
      form.reset({
        name: p.name || '',
        description: p.descriptionSource || '',
        price: p.price?.toString() || '',
        originalPrice: p.originalPrice?.toString() || '',
        unit: p.unit || '份',
        sku: p.sku || '',
        inventory: p.inventory?.toString() || '0',
        lowStockThreshold: p.lowStockThreshold?.toString() || '10',
        categoryId: p.categoryId?.toString() || '',
        status: (p.status as 'draft' | 'active' | 'inactive') || 'draft',
        isRecommend: p.isRecommend || false,
        isNew: p.isNew || false,
        isHot: p.isHot || false,
      });
      setCoverImage(p.coverImage || '');
      setGallery(p.gallery || []);
    }
  }, [productData, form]);

  const categories = categoriesData?.data || [];

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || '',
        price: values.price,
        originalPrice: values.originalPrice || null,
        unit: values.unit,
        sku: values.sku || null,
        inventory: parseInt(values.inventory) || 0,
        lowStockThreshold: parseInt(values.lowStockThreshold) || 10,
        categoryId: values.categoryId ? parseInt(values.categoryId) : null,
        status: values.status,
        isRecommend: values.isRecommend,
        isNew: values.isNew,
        isHot: values.isHot,
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
    onSuccess: () => {
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

  const onSubmit = (values: ProductFormValues) => {
    saveMutation.mutate(values);
  };

  if (!storeId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/merchant/operations">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{isNew ? t('merchant.addProduct') : t('merchant.editProduct')}</h1>
          </div>
        </header>
        <div className="p-4">
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <Store className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">{t('merchant.noStore')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('merchant.createStoreFirst')}</p>
              </div>
              <Button asChild>
                <Link href="/merchant/store-create">{t('merchant.createStore')}</Link>
              </Button>
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('merchant.productName')} *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder={t('merchant.productNamePlaceholder')}
                          data-testid="input-product-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('merchant.selectCategory')}</FormLabel>
                      <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder={t('merchant.noCategorySet')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('merchant.noCategorySet')}</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.nameZh || cat.nameSource}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('merchant.productDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t('merchant.productDescription')}
                          className="resize-none"
                          rows={3}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">{t('merchant.autoTranslateHint')}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.productPrice')} *</FormLabel>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              step="0.01"
                              className="pl-7"
                              placeholder="0.00"
                              data-testid="input-price"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.originalPrice')}</FormLabel>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              step="0.01"
                              className="pl-7"
                              placeholder="0.00"
                              data-testid="input-original-price"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.productUnit')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="份"
                            data-testid="input-unit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.productSku')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="SKU-001"
                            data-testid="input-sku"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inventory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.productInventory')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder="0"
                            data-testid="input-inventory"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('merchant.lowStock')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder="10"
                            data-testid="input-low-stock"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        type="button"
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
                          type="button"
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
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>{t('merchant.productStatus')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-32" data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">{t('merchant.statusDraft')}</SelectItem>
                          <SelectItem value="active">{t('merchant.statusActive')}</SelectItem>
                          <SelectItem value="inactive">{t('merchant.statusInactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRecommend"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between py-2">
                      <FormLabel className="font-normal">{t('merchant.isRecommend')}</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-recommend"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isNew"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between py-2">
                      <FormLabel className="font-normal">{t('merchant.isNew')}</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-new"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isHot"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between py-2">
                      <FormLabel className="font-normal">{t('merchant.isHot')}</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-hot"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </main>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
            <div className="max-w-lg mx-auto">
              <Button 
                type="submit"
                className="w-full" 
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isNew ? t('merchant.addProduct') : t('common.save')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
