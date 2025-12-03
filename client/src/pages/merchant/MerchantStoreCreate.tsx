import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, Store, MapPin, Phone, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

type IndustryType = 'food' | 'retail' | 'service' | 'entertainment';

interface CreateStoreData {
  name: string;
  brand?: string;
  city: string;
  address: string;
  phone?: string;
  descriptionZh?: string;
  industryType?: IndustryType;
}

export default function MerchantStoreCreate() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CreateStoreData>({
    name: '',
    brand: '',
    city: '',
    address: '',
    phone: '',
    descriptionZh: '',
    industryType: 'food',
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: CreateStoreData) => {
      const response = await apiRequest('POST', '/api/stores', data);
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast({
          title: t('common.success'),
          description: t('merchant.storeCreated'),
        });
        
        await queryClient.invalidateQueries({ queryKey: ['/api/user/roles'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
        
        navigate(`/merchant/store-edit/${data.data.id}`);
      } else {
        toast({
          title: t('common.error'),
          description: data.message || t('merchant.storeCreateFailed'),
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Create store error:', error);
      toast({
        title: t('common.error'),
        description: t('merchant.storeCreateFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = formData.name.trim();
    const city = formData.city.trim();
    const address = formData.address.trim();
    
    if (!name) {
      toast({
        title: t('common.error'),
        description: t('merchant.storeNameRequired'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!city) {
      toast({
        title: t('common.error'),
        description: t('merchant.cityRequired'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!address) {
      toast({
        title: t('common.error'),
        description: t('merchant.addressRequired'),
        variant: 'destructive',
      });
      return;
    }
    
    const cleanedData: CreateStoreData = {
      name,
      city,
      address,
      brand: formData.brand?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      descriptionZh: formData.descriptionZh?.trim() || undefined,
      industryType: formData.industryType,
    };
    
    createStoreMutation.mutate(cleanedData);
  };

  const handleInputChange = (field: keyof CreateStoreData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/merchant/store-settings">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('merchant.createStore')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Store className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('merchant.basicInfo')}</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('merchant.storeName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t('merchant.storeNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  data-testid="input-store-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">{t('merchant.brand')}</Label>
                <Input
                  id="brand"
                  placeholder={t('merchant.brandPlaceholder')}
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  data-testid="input-brand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industryType">{t('merchant.industryType')}</Label>
                <Select
                  value={formData.industryType}
                  onValueChange={(value) => handleInputChange('industryType', value)}
                >
                  <SelectTrigger data-testid="select-industry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">{t('merchant.industryFood')}</SelectItem>
                    <SelectItem value="retail">{t('merchant.industryRetail')}</SelectItem>
                    <SelectItem value="service">{t('merchant.industryService')}</SelectItem>
                    <SelectItem value="entertainment">{t('merchant.industryEntertainment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('merchant.locationInfo')}</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">
                  {t('merchant.city')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder={t('merchant.cityPlaceholder')}
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  data-testid="input-city"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">
                  {t('merchant.address')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder={t('merchant.addressPlaceholder')}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="min-h-[80px]"
                  data-testid="input-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Phone className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('merchant.contactInfo')}</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">{t('merchant.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('merchant.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  data-testid="input-phone"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="font-medium">{t('merchant.storeDescription')}</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('merchant.descriptionZh')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('merchant.descriptionPlaceholder')}
                  value={formData.descriptionZh}
                  onChange={(e) => handleInputChange('descriptionZh', e.target.value)}
                  className="min-h-[100px]"
                  data-testid="input-description"
                />
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full"
              disabled={createStoreMutation.isPending}
              data-testid="button-submit"
            >
              {createStoreMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('merchant.createStore')
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('merchant.createStoreTip')}
          </p>
        </form>
      </main>
    </div>
  );
}
