import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  ChevronLeft, 
  ChevronRight, 
  Store, 
  MapPin, 
  Clock, 
  Phone,
  Building2,
  Plus,
  Settings,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StoreInfo {
  id: number;
  name: string;
  address: string;
  phone: string;
  businessHours: string;
  status: 'open' | 'closed' | 'busy';
  coverImage?: string;
}

export default function MerchantStoreSettings() {
  const { t } = useLanguage();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [isChainMode, setIsChainMode] = useState(false);
  
  const ownerRoles = userRoles.filter(r => r.role === 'owner');
  const hasStore = ownerRoles.length > 0;
  const currentStoreId = ownerRoles[0]?.storeId || 1;
  
  const mockStore: StoreInfo = hasStore ? {
    id: ownerRoles[0].storeId || 1,
    name: ownerRoles[0].storeName || t('merchant.myStore'),
    address: '广州市天河区体育西路123号',
    phone: '020-12345678',
    businessHours: '10:00 - 22:00',
    status: 'open',
  } : {
    id: 0,
    name: '',
    address: '',
    phone: '',
    businessHours: '',
    status: 'closed',
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const handleChainModeToggle = (checked: boolean) => {
    setIsChainMode(checked);
    toast({
      title: checked ? t('merchant.chainModeEnabled') : t('merchant.singleStoreMode'),
      description: checked ? t('merchant.chainModeDesc') : t('merchant.singleStoreModeDesc'),
    });
  };

  const getStatusBadge = (status: StoreInfo['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t('merchant.storeOpen')}</Badge>;
      case 'closed':
        return <Badge variant="secondary">{t('merchant.storeClosed')}</Badge>;
      case 'busy':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">{t('merchant.storeBusy')}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/merchant/operations">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('merchant.storeSettings')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="chain-mode" className="font-medium">{t('merchant.businessMode')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {isChainMode ? t('merchant.chainStoreLabel') : t('merchant.singleStoreLabel')}
                  </p>
                </div>
              </div>
              <Switch 
                id="chain-mode"
                checked={isChainMode}
                onCheckedChange={handleChainModeToggle}
                data-testid="switch-chain-mode"
              />
            </div>
          </CardContent>
        </Card>

        {!hasStore ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">{t('merchant.noStore')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('merchant.noStoreDesc')}</p>
              <Button onClick={handleComingSoon} data-testid="button-create-store">
                <Plus className="w-4 h-4 mr-2" />
                {t('merchant.createStore')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    {isChainMode ? t('merchant.storeList') : t('merchant.myStore')}
                  </CardTitle>
                  {isChainMode && (
                    <Button size="sm" variant="outline" onClick={handleComingSoon} data-testid="button-add-store">
                      <Plus className="w-4 h-4 mr-1" />
                      {t('merchant.addStore')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div 
                  className="p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => navigate(`/merchant/store-edit/${currentStoreId}`)}
                  data-testid="card-store-info"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center">
                        {mockStore.coverImage ? (
                          <img src={mockStore.coverImage} alt="" className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{mockStore.name}</h3>
                        {getStatusBadge(mockStore.status)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{mockStore.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{mockStore.businessHours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{mockStore.phone}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t('merchant.quickSettings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div 
                    className="flex items-center justify-between py-4 px-4 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/merchant/store-edit/${currentStoreId}`)}
                    data-testid="menu-basic-info"
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('merchant.basicInfo')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between py-4 px-4 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/merchant/store-edit/${currentStoreId}`)}
                    data-testid="menu-business-hours"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('merchant.businessHours')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between py-4 px-4 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/merchant/store-edit/${currentStoreId}`)}
                    data-testid="menu-store-images"
                  >
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('merchant.storeImages')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between py-4 px-4 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/merchant/store-edit/${currentStoreId}`)}
                    data-testid="menu-location"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('merchant.storeLocation')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div 
                    className="flex items-center justify-between py-4 px-4 hover-elevate cursor-pointer"
                    onClick={() => window.open(`/store/${currentStoreId}`, '_blank')}
                    data-testid="menu-preview"
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('merchant.preview')}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
