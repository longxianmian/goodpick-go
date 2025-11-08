import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2, Store as StoreIcon, MapPin, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MediaUploader } from '@/components/MediaUploader';
import type { Campaign, Store as StoreType } from '@shared/schema';
import { format } from 'date-fns';

interface MediaFile {
  type: 'image' | 'video';
  url: string;
}

type CampaignFormData = {
  title: string;
  description: string;
  couponValue: string;
  originalPrice: string;
  discountType: 'final_price' | 'gift_card' | 'cash_voucher' | 'full_reduction' | 'percentage_off';
  startAt: string;
  endAt: string;
  maxPerUser: string;
  maxTotal: string;
  isActive: boolean;
  mediaFiles: MediaFile[];
  storeIds: number[];
};

// Normalize language code to backend-supported format
function normalizeLanguageCode(lang: string): 'zh-cn' | 'en-us' | 'th-th' {
  const normalized = lang.toLowerCase().trim();
  if (normalized.startsWith('zh')) return 'zh-cn';
  if (normalized.startsWith('th')) return 'th-th';
  return 'en-us';
}

export default function AdminCampaigns() {
  const { adminToken, logoutAdmin } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    couponValue: '',
    originalPrice: '',
    discountType: 'cash_voucher',
    startAt: '',
    endAt: '',
    maxPerUser: '1',
    maxTotal: '',
    isActive: true,
    mediaFiles: [],
    storeIds: [],
  });

  // 员工指导对话框状态
  const [isStaffGuideDialogOpen, setIsStaffGuideDialogOpen] = useState(false);
  const [selectedCampaignForGuide, setSelectedCampaignForGuide] = useState<Campaign | null>(null);
  const [staffGuideData, setStaffGuideData] = useState({
    staffInstructions: '',
    staffTraining: '',
    trainingMediaFiles: [] as MediaFile[],
  });

  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ['/api/admin/campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/admin/campaigns', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        logoutAdmin();
        throw new Error('Unauthorized');
      }
      return res.json();
    },
    enabled: !!adminToken,
  });

  const { data: storesData } = useQuery<{ success: boolean; data: StoreType[] }>({
    queryKey: ['/api/admin/stores'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stores', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      return res.json();
    },
    enabled: !!adminToken,
  });

  const { data: campaignStoresData } = useQuery<{ success: boolean; data: StoreType[] }>({
    queryKey: ['/api/admin/campaigns', selectedCampaignId, 'stores'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/campaigns/${selectedCampaignId}/stores`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      return res.json();
    },
    enabled: !!adminToken && selectedCampaignId !== null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const normalizedLang = normalizeLanguageCode(language);
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          titleSourceLang: normalizedLang,
          titleSource: data.title,
          descriptionSourceLang: normalizedLang,
          descriptionSource: data.description,
          couponValue: data.couponValue,
          originalPrice: data.originalPrice || null,
          discountType: data.discountType,
          maxPerUser: parseInt(data.maxPerUser) || 1,
          maxTotal: data.maxTotal ? parseInt(data.maxTotal) : null,
          startAt: new Date(data.startAt),
          endAt: new Date(data.endAt),
          storeIds: data.storeIds,
          mediaUrls: data.mediaFiles.map(f => f.url),
          bannerImageUrl: data.mediaFiles.find(f => f.type === 'image')?.url || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({ title: t('common.success'), description: t('campaigns.createSuccess') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message || t('campaigns.createError'), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CampaignFormData> }) => {
      const normalizedLang = normalizeLanguageCode(language);
      const payload: any = {};
      
      if (data.title) {
        payload.titleSourceLang = normalizedLang;
        payload.titleSource = data.title;
      }
      if (data.description) {
        payload.descriptionSourceLang = normalizedLang;
        payload.descriptionSource = data.description;
      }
      if (data.couponValue) payload.couponValue = data.couponValue;
      if (data.originalPrice !== undefined) payload.originalPrice = data.originalPrice || null;
      if (data.discountType) payload.discountType = data.discountType;
      if (data.maxPerUser) payload.maxPerUser = parseInt(data.maxPerUser);
      if (data.maxTotal !== undefined) payload.maxTotal = data.maxTotal ? parseInt(data.maxTotal) : null;
      if (data.startAt) payload.startAt = new Date(data.startAt);
      if (data.endAt) payload.endAt = new Date(data.endAt);
      if (data.storeIds !== undefined) payload.storeIds = data.storeIds;
      if (data.mediaFiles !== undefined) {
        payload.mediaUrls = data.mediaFiles.map(f => f.url);
        payload.bannerImageUrl = data.mediaFiles.find(f => f.type === 'image')?.url || null;
      }
      if (data.isActive !== undefined) payload.isActive = data.isActive;

      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({ title: t('common.success'), description: t('campaigns.updateSuccess') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message || t('campaigns.updateError'), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({ title: t('common.success'), description: t('campaigns.deleteSuccess') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('campaigns.deleteError'), variant: 'destructive' });
    },
  });

  const updateStaffGuideMutation = useMutation({
    mutationFn: async ({ campaignId, staffInstructions, staffTraining, trainingMediaFiles }: { campaignId: number; staffInstructions: string; staffTraining: string; trainingMediaFiles: MediaFile[] }) => {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          staffInstructions: staffInstructions || null,
          staffTraining: staffTraining || null,
          staffTrainingMediaUrls: trainingMediaFiles.map(f => f.url),
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to update staff guide');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({ title: '保存成功', description: '员工指导内容已更新' });
      setIsStaffGuideDialogOpen(false);
    },
    onError: () => {
      toast({ title: '保存失败', description: '无法更新员工指导内容', variant: 'destructive' });
    },
  });

  const updateStoresMutation = useMutation({
    mutationFn: async ({ campaignId, storeIds }: { campaignId: number; storeIds: number[] }) => {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ storeIds }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns', selectedCampaignId, 'stores'] });
      toast({ title: t('common.success'), description: t('campaigns.storesUpdateSuccess') });
      setIsStoreDialogOpen(false);
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('campaigns.storesUpdateError'), variant: 'destructive' });
    },
  });

  // 城市筛选逻辑
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    const stores = storesData?.data || [];
    stores.forEach((store) => {
      if (store.city) {
        cities.add(store.city);
      }
    });
    return Array.from(cities).sort();
  }, [storesData]);

  const filteredStoresByCity = useMemo(() => {
    if (selectedCities.length === 0) {
      return [];
    }
    const stores = storesData?.data || [];
    return stores
      .filter((store) => selectedCities.includes(store.city || ''))
      .sort((a, b) => {
        if (a.city !== b.city) {
          return (a.city || '').localeCompare(b.city || '');
        }
        return a.name.localeCompare(b.name);
      });
  }, [storesData, selectedCities]);

  const allCitiesSelected = useMemo(() => {
    return availableCities.length > 0 && selectedCities.length === availableCities.length;
  }, [availableCities, selectedCities]);

  const allFilteredStoresSelected = useMemo(() => {
    if (filteredStoresByCity.length === 0) return false;
    const filteredStoreIds = filteredStoresByCity.map((s) => s.id);
    return filteredStoreIds.every((id) => formData.storeIds.includes(id));
  }, [filteredStoresByCity, formData.storeIds]);

  const toggleAllCities = () => {
    if (allCitiesSelected) {
      setSelectedCities([]);
    } else {
      setSelectedCities([...availableCities]);
    }
  };

  const toggleAllStores = () => {
    const filteredStoreIds = filteredStoresByCity.map((s) => s.id);
    if (allFilteredStoresSelected) {
      setFormData({
        ...formData,
        storeIds: formData.storeIds.filter((id) => !filteredStoreIds.includes(id)),
      });
    } else {
      const newIds = filteredStoreIds.filter((id) => !formData.storeIds.includes(id));
      setFormData({
        ...formData,
        storeIds: [...formData.storeIds, ...newIds],
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      couponValue: '',
      originalPrice: '',
      discountType: 'cash_voucher',
      startAt: '',
      endAt: '',
      maxPerUser: '1',
      maxTotal: '',
      isActive: true,
      mediaFiles: [],
      storeIds: [],
    });
    setEditingCampaign(null);
    setSelectedCities([]);
  };

  const handleCreate = () => {
    setEditingCampaign(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = async (campaign: Campaign) => {
    setEditingCampaign(campaign);
    
    // Parse mediaUrls from campaign
    const mediaFiles: MediaFile[] = (campaign.mediaUrls || []).map(url => {
      const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
      return {
        type: isVideo ? 'video' : 'image',
        url: url
      };
    });
    
    // Fetch campaign stores
    let storeIds: number[] = [];
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/stores`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        storeIds = data.data.map((store: StoreType) => store.id);
        
        // Extract unique cities from the stores
        const cities = Array.from(new Set(data.data.map((s: StoreType) => s.city))) as string[];
        setSelectedCities(cities);
      }
    } catch (error) {
      console.error('Failed to fetch campaign stores:', error);
    }
    
    setFormData({
      title: campaign.titleSource,
      description: campaign.descriptionSource,
      couponValue: campaign.couponValue,
      originalPrice: campaign.originalPrice || '',
      discountType: campaign.discountType,
      startAt: campaign.startAt ? format(new Date(campaign.startAt), "yyyy-MM-dd'T'HH:mm") : '',
      endAt: campaign.endAt ? format(new Date(campaign.endAt), "yyyy-MM-dd'T'HH:mm") : '',
      maxPerUser: campaign.maxPerUser.toString(),
      maxTotal: campaign.maxTotal?.toString() || '',
      isActive: campaign.isActive,
      mediaFiles,
      storeIds,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t('campaigns.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleManageStores = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
    setSelectedStoreIds(campaignStoresData?.data?.map(s => s.id) || []);
    setIsStoreDialogOpen(true);
  };

  const handleStoreToggle = (storeId: number) => {
    setSelectedStoreIds(prev =>
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };

  const handleStaffGuide = (campaign: Campaign) => {
    setSelectedCampaignForGuide(campaign);
    
    // Parse training media URLs
    const trainingMediaFiles: MediaFile[] = (campaign.staffTrainingMediaUrls || []).map(url => {
      const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
      return {
        type: isVideo ? 'video' : 'image',
        url: url
      };
    });
    
    setStaffGuideData({
      staffInstructions: campaign.staffInstructions || '',
      staffTraining: campaign.staffTraining || '',
      trainingMediaFiles,
    });
    setIsStaffGuideDialogOpen(true);
  };

  const handleSaveStaffGuide = () => {
    if (!selectedCampaignForGuide) return;
    updateStaffGuideMutation.mutate({
      campaignId: selectedCampaignForGuide.id,
      staffInstructions: staffGuideData.staffInstructions,
      staffTraining: staffGuideData.staffTraining,
      trainingMediaFiles: staffGuideData.trainingMediaFiles,
    });
  };

  const handleSaveStores = () => {
    if (selectedCampaignId) {
      updateStoresMutation.mutate({ campaignId: selectedCampaignId, storeIds: selectedStoreIds });
    }
  };

  const getDiscountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      final_price: t('campaigns.finalPrice'),
      gift_card: t('campaigns.giftCard'),
      cash_voucher: t('campaigns.cashVoucher'),
      full_reduction: t('campaigns.fullReduction'),
      percentage_off: t('campaigns.percentageOff'),
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle data-testid="text-page-title">{t('campaigns.title')}</CardTitle>
          <Button onClick={handleCreate} data-testid="button-create-campaign">
            <Plus className="w-4 h-4 mr-2" />
            {t('campaigns.createNew')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('campaigns.campaignTitle')}</TableHead>
                  <TableHead>{t('campaigns.couponType')}</TableHead>
                  <TableHead>{t('campaigns.couponValue')}</TableHead>
                  <TableHead>{t('campaigns.startDate')}</TableHead>
                  <TableHead>{t('campaigns.endDate')}</TableHead>
                  <TableHead>{t('campaigns.status')}</TableHead>
                  <TableHead className="text-right">{t('campaigns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaignsData?.data || []).map((campaign) => (
                  <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                    <TableCell data-testid={`text-title-${campaign.id}`}>
                      {campaign.titleSource}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getDiscountTypeLabel(campaign.discountType)}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-value-${campaign.id}`}>
                      {campaign.couponValue}
                    </TableCell>
                    <TableCell>
                      {campaign.startAt ? format(new Date(campaign.startAt), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell>
                      {campaign.endAt ? format(new Date(campaign.endAt), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                        {campaign.isActive ? t('campaigns.active') : t('campaigns.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleManageStores(campaign)}
                          data-testid={`button-stores-${campaign.id}`}
                        >
                          <StoreIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStaffGuide(campaign)}
                          data-testid={`button-staff-guide-${campaign.id}`}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(campaign)}
                          data-testid={`button-edit-${campaign.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(campaign.id)}
                          data-testid={`button-delete-${campaign.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!(campaignsData?.data || []).length) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('campaigns.noCampaigns')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑活动对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingCampaign ? t('campaigns.editCampaign') : t('campaigns.createNew')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="font-medium">{t('campaigns.basicInfo')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">{t('campaigns.campaignTitle')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('campaigns.description')} *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  data-testid="input-description"
                />
              </div>
            </div>

            {/* 券设置 */}
            <div className="space-y-4">
              <h3 className="font-medium">{t('campaigns.couponSettings')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="discountType">{t('campaigns.couponType')} *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: any) => setFormData({ ...formData, discountType: value })}
                >
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="final_price">{t('campaigns.finalPrice')}</SelectItem>
                    <SelectItem value="gift_card">{t('campaigns.giftCard')}</SelectItem>
                    <SelectItem value="cash_voucher">{t('campaigns.cashVoucher')}</SelectItem>
                    <SelectItem value="full_reduction">{t('campaigns.fullReduction')}</SelectItem>
                    <SelectItem value="percentage_off">{t('campaigns.percentageOff')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 根据优惠类型动态显示字段 */}
              {formData.discountType === 'percentage_off' && (
                <div className="space-y-2">
                  <Label htmlFor="couponValue">{t('campaigns.discount')} *</Label>
                  <Input
                    id="couponValue"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={formData.couponValue}
                    onChange={(e) => setFormData({ ...formData, couponValue: e.target.value })}
                    placeholder={t('campaigns.discountPlaceholder')}
                    required
                    data-testid="input-discount"
                  />
                  <p className="text-sm text-muted-foreground">{t('campaigns.discountHelp')}</p>
                </div>
              )}

              {formData.discountType === 'full_reduction' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">{t('campaigns.minAmount')} *</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      placeholder={t('campaigns.minAmountPlaceholder')}
                      required
                      data-testid="input-min-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couponValue">{t('campaigns.reductionAmount')} *</Label>
                    <Input
                      id="couponValue"
                      type="number"
                      step="0.01"
                      value={formData.couponValue}
                      onChange={(e) => setFormData({ ...formData, couponValue: e.target.value })}
                      placeholder={t('campaigns.reductionAmountPlaceholder')}
                      required
                      data-testid="input-reduction-amount"
                    />
                  </div>
                </div>
              )}

              {formData.discountType === 'final_price' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">{t('campaigns.originalPrice')} *</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      placeholder={t('campaigns.originalPricePlaceholder')}
                      required
                      data-testid="input-original-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couponValue">{t('campaigns.finalPriceValue')} *</Label>
                    <Input
                      id="couponValue"
                      type="number"
                      step="0.01"
                      value={formData.couponValue}
                      onChange={(e) => setFormData({ ...formData, couponValue: e.target.value })}
                      placeholder={t('campaigns.finalPricePlaceholder')}
                      required
                      data-testid="input-final-price"
                    />
                  </div>
                </div>
              )}

              {(formData.discountType === 'cash_voucher' || formData.discountType === 'gift_card') && (
                <div className="space-y-2">
                  <Label htmlFor="couponValue">{t('campaigns.faceValue')} *</Label>
                  <Input
                    id="couponValue"
                    type="number"
                    step="0.01"
                    value={formData.couponValue}
                    onChange={(e) => setFormData({ ...formData, couponValue: e.target.value })}
                    placeholder={t('campaigns.faceValuePlaceholder')}
                    required
                    data-testid="input-face-value"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startAt">{t('campaigns.startDate')} *</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    required
                    data-testid="input-start-at"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endAt">{t('campaigns.endDate')} *</Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    required
                    data-testid="input-end-at"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPerUser">{t('campaigns.maxPerUser')} *</Label>
                  <Input
                    id="maxPerUser"
                    type="number"
                    min="1"
                    value={formData.maxPerUser}
                    onChange={(e) => setFormData({ ...formData, maxPerUser: e.target.value })}
                    required
                    data-testid="input-max-per-user"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTotal">{t('campaigns.maxTotal')}</Label>
                  <Input
                    id="maxTotal"
                    type="number"
                    min="1"
                    value={formData.maxTotal}
                    onChange={(e) => setFormData({ ...formData, maxTotal: e.target.value })}
                    data-testid="input-max-total"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                  data-testid="checkbox-is-active"
                />
                <Label htmlFor="isActive" className="cursor-pointer">{t('campaigns.enableCampaign')}</Label>
              </div>
            </div>

            {/* 媒体文件 */}
            <div className="space-y-4">
              <h3 className="font-medium">{t('campaigns.mediaFiles')}</h3>
              <MediaUploader
                value={formData.mediaFiles}
                onChange={(files) => setFormData({ ...formData, mediaFiles: files })}
                maxImages={5}
                maxVideos={1}
                uploadUrl="/api/admin/upload"
                uploadHeaders={{ Authorization: `Bearer ${adminToken}` }}
              />
            </div>

            {/* 参与门店 */}
            <div className="space-y-4">
              <h3 className="font-medium">{t('campaigns.participatingStores')}</h3>
              
              {/* 城市筛选 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('campaigns.selectCity')}</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={toggleAllCities}
                    data-testid="button-toggle-all-cities"
                  >
                    {allCitiesSelected ? t('campaigns.deselectAllCities') : t('campaigns.selectAllCities')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCities.map((city) => (
                    <div key={city} className="flex items-center space-x-2">
                      <Checkbox
                        id={`city-${city}`}
                        checked={selectedCities.includes(city)}
                        onCheckedChange={() => {
                          if (selectedCities.includes(city)) {
                            setSelectedCities(selectedCities.filter((c) => c !== city));
                          } else {
                            setSelectedCities([...selectedCities, city]);
                          }
                        }}
                        data-testid={`checkbox-city-${city}`}
                      />
                      <Label htmlFor={`city-${city}`} className="cursor-pointer">
                        {city} ({(storesData?.data || []).filter((s) => s.city === city).length || 0})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 门店列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t('campaigns.storesSelected', { count: formData.storeIds.length.toString() })}
                    {filteredStoresByCity.length > 0 && (
                      <span> {t('campaigns.filteredStoresAvailable', { count: filteredStoresByCity.length.toString() })}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={toggleAllStores}
                    disabled={filteredStoresByCity.length === 0}
                    data-testid="button-toggle-all-stores"
                  >
                    {allFilteredStoresSelected ? t('campaigns.deselectAllStores') : t('campaigns.selectAllStores')}
                  </Button>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-4">
                  {filteredStoresByCity.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      {t('campaigns.selectCityFirst')}
                    </div>
                  ) : (
                    filteredStoresByCity.map((store) => (
                      <div
                        key={store.id}
                        className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
                          formData.storeIds.includes(store.id) ? 'bg-primary/5' : ''
                        } hover-elevate`}
                      >
                        <Checkbox
                          id={`form-store-${store.id}`}
                          checked={formData.storeIds.includes(store.id)}
                          onCheckedChange={() => {
                            if (formData.storeIds.includes(store.id)) {
                              setFormData({
                                ...formData,
                                storeIds: formData.storeIds.filter((id) => id !== store.id),
                              });
                            } else {
                              setFormData({
                                ...formData,
                                storeIds: [...formData.storeIds, store.id],
                              });
                            }
                          }}
                          data-testid={`checkbox-form-store-${store.id}`}
                        />
                        <Label htmlFor={`form-store-${store.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <StoreIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{store.name}</span>
                            {store.brand && <Badge variant="secondary" className="text-xs">{store.brand}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{store.city}</span>
                            <span className="text-xs">{store.address}</span>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save">
                {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 门店关联对话框 */}
      <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-store-dialog-title">{t('campaigns.manageStores')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {(storesData?.data || []).map((store) => (
                <div key={store.id} className="flex items-center space-x-2 p-2 hover-elevate rounded-md">
                  <Checkbox
                    id={`store-${store.id}`}
                    checked={selectedStoreIds.includes(store.id)}
                    onCheckedChange={() => handleStoreToggle(store.id)}
                    data-testid={`checkbox-store-${store.id}`}
                  />
                  <Label htmlFor={`store-${store.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{store.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {store.city} - {store.address}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStoreDialogOpen(false)} data-testid="button-cancel-stores">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveStores} disabled={updateStoresMutation.isPending} data-testid="button-save-stores">
                {updateStoresMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 员工指导对话框 */}
      <Dialog open={isStaffGuideDialogOpen} onOpenChange={setIsStaffGuideDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle data-testid="text-staff-guide-dialog-title">
              员工指导 - {selectedCampaignForGuide?.titleSource}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="staffInstructions">
                员工操作说明
              </Label>
              <Textarea
                id="staffInstructions"
                value={staffGuideData.staffInstructions}
                onChange={(e) => setStaffGuideData({ ...staffGuideData, staffInstructions: e.target.value })}
                rows={6}
                placeholder="输入员工核销优惠券时需要注意的事项、操作步骤等..."
                data-testid="input-staff-instructions"
              />
              <p className="text-sm text-muted-foreground">
                员工在核销优惠券时会看到这些说明，帮助他们正确处理此活动的优惠券
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffTraining">
                员工培训材料（文字说明）
              </Label>
              <Textarea
                id="staffTraining"
                value={staffGuideData.staffTraining}
                onChange={(e) => setStaffGuideData({ ...staffGuideData, staffTraining: e.target.value })}
                rows={4}
                placeholder="输入员工培训内容，如活动背景、如何向顾客介绍等..."
                data-testid="input-staff-training"
              />
              <p className="text-sm text-muted-foreground">
                帮助员工了解活动背景和推广技巧，提升活动转化率
              </p>
            </div>

            <div className="space-y-2">
              <Label>培训视频/图片</Label>
              <MediaUploader
                value={staffGuideData.trainingMediaFiles}
                onChange={(files) => setStaffGuideData({ ...staffGuideData, trainingMediaFiles: files })}
                maxImages={5}
                maxVideos={2}
                uploadUrl="/api/admin/upload"
                uploadHeaders={{ Authorization: `Bearer ${adminToken}` }}
              />
              <p className="text-sm text-muted-foreground">
                上传培训相关的视频或图片（支持mp4/jpg/png格式，自动存储到阿里云OSS）
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsStaffGuideDialogOpen(false)} 
              data-testid="button-cancel-staff-guide"
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveStaffGuide} 
              disabled={updateStaffGuideMutation.isPending} 
              data-testid="button-save-staff-guide"
            >
              {updateStaffGuideMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
