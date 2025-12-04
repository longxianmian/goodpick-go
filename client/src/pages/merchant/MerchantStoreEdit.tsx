import { useState, useEffect } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  Store, 
  MapPin, 
  Clock, 
  Image as ImageIcon,
  Save,
  Eye,
  FileCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { StoreImageUploader, LicenseUploader, AvatarUploader } from '@/components/StoreImageUploader';
import type { Store as StoreType } from '@shared/schema';

interface BusinessHours {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

interface StoreFormData {
  name: string;
  brand: string;
  city: string;
  address: string;
  phone: string;
  description: string;
  industryType: 'food' | 'retail' | 'service' | 'entertainment';
  businessStatus: 'open' | 'closed' | 'temporarily_closed';
  businessHours: BusinessHours;
  coverImages: string[];
  deliveryTime: number;
  pickupTime: number;
  businessLicenseUrl: string | null;
  foodLicenseUrl: string | null;
  imageUrl: string | null;
}

const defaultBusinessHours: BusinessHours = {
  mon: '09:00-22:00',
  tue: '09:00-22:00',
  wed: '09:00-22:00',
  thu: '09:00-22:00',
  fri: '09:00-22:00',
  sat: '10:00-22:00',
  sun: '10:00-22:00',
};

export default function MerchantStoreEdit() {
  const { t } = useLanguage();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/merchant/store-edit/:id');
  const storeId = params?.id;

  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    brand: '',
    city: '',
    address: '',
    phone: '',
    description: '',
    industryType: 'food',
    businessStatus: 'open',
    businessHours: defaultBusinessHours,
    coverImages: [],
    deliveryTime: 30,
    pickupTime: 10,
    businessLicenseUrl: null,
    foodLicenseUrl: null,
    imageUrl: null,
  });

  const { data: storeData, isLoading } = useQuery<{ success: boolean; data: StoreType }>({
    queryKey: ['/api/stores', storeId],
    enabled: !!storeId,
  });

  useEffect(() => {
    if (storeData?.data) {
      const store = storeData.data;
      let parsedBusinessHours = defaultBusinessHours;
      try {
        if (store.businessHours) {
          parsedBusinessHours = JSON.parse(store.businessHours);
        }
      } catch (e) {
        console.error('Failed to parse business hours');
      }

      setFormData({
        name: store.name || '',
        brand: store.brand || '',
        city: store.city || '',
        address: store.address || '',
        phone: store.phone || '',
        description: store.descriptionZh || store.descriptionEn || '',
        industryType: (store.industryType as StoreFormData['industryType']) || 'food',
        businessStatus: (store.businessStatus as StoreFormData['businessStatus']) || 'open',
        businessHours: parsedBusinessHours,
        coverImages: store.coverImages || [],
        deliveryTime: store.deliveryTime || 30,
        pickupTime: store.pickupTime || 10,
        businessLicenseUrl: store.businessLicenseUrl || null,
        foodLicenseUrl: store.foodLicenseUrl || null,
        imageUrl: store.imageUrl || null,
      });
    }
  }, [storeData]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<StoreFormData>) => {
      const payload = {
        ...data,
        businessHours: JSON.stringify(data.businessHours),
      };
      return apiRequest('PATCH', `/api/stores/${storeId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId] });
      toast({
        title: t('common.success'),
        description: t('merchant.storeUpdateSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('merchant.storeUpdateError'),
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handlePreview = () => {
    if (storeId) {
      window.open(`/store/${storeId}`, '_blank');
    }
  };

  const handleInputChange = (field: keyof StoreFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBusinessHoursChange = (day: keyof BusinessHours, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessHours: { ...prev.businessHours, [day]: value }
    }));
  };

  const handleCoverImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, coverImages: images }));
  };

  const handleLicenseChange = (field: 'businessLicenseUrl' | 'foodLicenseUrl', url: string | null) => {
    setFormData(prev => ({ ...prev, [field]: url }));
  };

  const dayLabels: Record<keyof BusinessHours, string> = {
    mon: t('storeFront.dayMon'),
    tue: t('storeFront.dayTue'),
    wed: t('storeFront.dayWed'),
    thu: t('storeFront.dayThu'),
    fri: t('storeFront.dayFri'),
    sat: t('storeFront.daySat'),
    sun: t('storeFront.daySun'),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-12 px-4 gap-2">
          <div className="flex items-center gap-2">
            <Link href="/merchant/store-settings">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold" data-testid="text-page-title">{t('merchant.editStore')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreview}
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-1" />
              {t('merchant.preview')}
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="basic">{t('merchant.basicInfo')}</TabsTrigger>
            <TabsTrigger value="hours">{t('merchant.businessHours')}</TabsTrigger>
            <TabsTrigger value="images">{t('merchant.storeImages')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  {t('merchant.storeInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('merchant.storeAvatar')}</Label>
                  <AvatarUploader
                    imageUrl={formData.imageUrl}
                    onChange={(url) => handleInputChange('imageUrl', url)}
                    size={80}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t('merchant.storeName')}</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('merchant.storeNamePlaceholder')}
                    data-testid="input-store-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">{t('merchant.brand')}</Label>
                  <Input 
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder={t('merchant.brandPlaceholder')}
                    data-testid="input-brand"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industryType">{t('merchant.industryType')}</Label>
                  <Select 
                    value={formData.industryType} 
                    onValueChange={(v) => handleInputChange('industryType', v)}
                  >
                    <SelectTrigger data-testid="select-industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">{t('storeFront.industryFood')}</SelectItem>
                      <SelectItem value="retail">{t('storeFront.industryRetail')}</SelectItem>
                      <SelectItem value="service">{t('storeFront.industryService')}</SelectItem>
                      <SelectItem value="entertainment">{t('storeFront.industryEntertainment')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessStatus">{t('merchant.businessStatus')}</Label>
                  <Select 
                    value={formData.businessStatus} 
                    onValueChange={(v) => handleInputChange('businessStatus', v)}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t('storeFront.statusOpen')}</SelectItem>
                      <SelectItem value="closed">{t('storeFront.statusClosed')}</SelectItem>
                      <SelectItem value="temporarily_closed">{t('storeFront.statusTemporarilyClosed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {t('merchant.locationInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t('merchant.city')}</Label>
                  <Input 
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={t('merchant.cityPlaceholder')}
                    data-testid="input-city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">{t('merchant.address')}</Label>
                  <Textarea 
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder={t('merchant.addressPlaceholder')}
                    rows={2}
                    data-testid="input-address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('merchant.phone')}</Label>
                  <Input 
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder={t('merchant.phonePlaceholder')}
                    data-testid="input-phone"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('merchant.deliverySettings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTime">{t('merchant.deliveryTime')}</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="deliveryTime"
                        type="number"
                        value={formData.deliveryTime}
                        onChange={(e) => handleInputChange('deliveryTime', parseInt(e.target.value) || 0)}
                        data-testid="input-delivery-time"
                      />
                      <span className="text-sm text-muted-foreground">{t('common.minutes')}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pickupTime">{t('merchant.pickupTime')}</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="pickupTime"
                        type="number"
                        value={formData.pickupTime}
                        onChange={(e) => handleInputChange('pickupTime', parseInt(e.target.value) || 0)}
                        data-testid="input-pickup-time"
                      />
                      <span className="text-sm text-muted-foreground">{t('common.minutes')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('merchant.storeDescription')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea 
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder={t('merchant.descriptionPlaceholder')}
                    rows={4}
                    data-testid="input-description"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('merchant.autoTranslateHint')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('merchant.businessHours')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(Object.keys(formData.businessHours) as Array<keyof BusinessHours>).map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-16 text-sm font-medium">{dayLabels[day]}</span>
                    <Input 
                      value={formData.businessHours[day]}
                      onChange={(e) => handleBusinessHoursChange(day, e.target.value)}
                      placeholder="09:00-22:00"
                      className="flex-1"
                      data-testid={`input-hours-${day}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  {t('merchant.coverImages')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StoreImageUploader
                  images={formData.coverImages}
                  onChange={handleCoverImagesChange}
                  maxImages={5}
                  hint={t('merchant.coverImagesHint')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  {t('merchant.qualifications')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LicenseUploader
                  label={t('storeFront.licenseBusiness')}
                  imageUrl={formData.businessLicenseUrl}
                  onChange={(url) => handleLicenseChange('businessLicenseUrl', url)}
                />
                <LicenseUploader
                  label={t('storeFront.licenseFood')}
                  imageUrl={formData.foodLicenseUrl}
                  onChange={(url) => handleLicenseChange('foodLicenseUrl', url)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
