import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2, Wand2, Store as StoreIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Campaign, Store as StoreType } from '@shared/schema';
import { format } from 'date-fns';

type CampaignFormData = {
  titleSourceLang: 'zh-cn' | 'en-us' | 'th-th';
  titleSource: string;
  descriptionSourceLang: 'zh-cn' | 'en-us' | 'th-th';
  descriptionSource: string;
  titleZh: string;
  titleEn: string;
  titleTh: string;
  descriptionZh: string;
  descriptionEn: string;
  descriptionTh: string;
  couponValue: string;
  discountType: 'final_price' | 'gift_card' | 'cash_voucher' | 'full_reduction' | 'percentage_off';
  startAt: string;
  endAt: string;
  maxPerUser: string;
  maxTotal: string;
  isActive: boolean;
};

export default function AdminCampaigns() {
  const { adminToken, logoutAdmin } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    titleSourceLang: 'zh-cn',
    titleSource: '',
    descriptionSourceLang: 'zh-cn',
    descriptionSource: '',
    titleZh: '',
    titleEn: '',
    titleTh: '',
    descriptionZh: '',
    descriptionEn: '',
    descriptionTh: '',
    couponValue: '',
    discountType: 'cash_voucher',
    startAt: '',
    endAt: '',
    maxPerUser: '1',
    maxTotal: '',
    isActive: true,
  });

  const { data: campaignsData, isLoading } = useQuery<{ ok: boolean; campaigns: Campaign[] }>({
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

  const { data: storesData } = useQuery<{ ok: boolean; stores: StoreType[] }>({
    queryKey: ['/api/admin/stores'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stores', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      return res.json();
    },
    enabled: !!adminToken,
  });

  const { data: campaignStoresData } = useQuery<{ ok: boolean; stores: StoreType[] }>({
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
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...data,
          couponValue: data.couponValue,
          maxPerUser: parseInt(data.maxPerUser) || 1,
          maxTotal: data.maxTotal ? parseInt(data.maxTotal) : null,
          startAt: new Date(data.startAt),
          endAt: new Date(data.endAt),
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
      toast({ title: '成功', description: '活动创建成功' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: '错误', description: error.message || '创建活动失败', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CampaignFormData> }) => {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...data,
          couponValue: data.couponValue,
          maxPerUser: data.maxPerUser ? parseInt(data.maxPerUser) : undefined,
          maxTotal: data.maxTotal ? parseInt(data.maxTotal) : null,
          startAt: data.startAt ? new Date(data.startAt) : undefined,
          endAt: data.endAt ? new Date(data.endAt) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({ title: '成功', description: '活动更新成功' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: '错误', description: error.message || '更新活动失败', variant: 'destructive' });
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
      toast({ title: '成功', description: '活动删除成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '删除活动失败', variant: 'destructive' });
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
      toast({ title: '成功', description: '门店关联更新成功' });
      setIsStoreDialogOpen(false);
    },
    onError: () => {
      toast({ title: '错误', description: '更新门店关联失败', variant: 'destructive' });
    },
  });

  const autoTranslateMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/auto-translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          fields: ['title', 'description'],
          targetLangs: ['zh-cn', 'en-us', 'th-th'],
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      if (editingCampaign) {
        setFormData({
          ...formData,
          titleZh: data.campaign.titleZh || '',
          titleEn: data.campaign.titleEn || '',
          titleTh: data.campaign.titleTh || '',
          descriptionZh: data.campaign.descriptionZh || '',
          descriptionEn: data.campaign.descriptionEn || '',
          descriptionTh: data.campaign.descriptionTh || '',
        });
      }
      toast({ title: '成功', description: 'AI翻译完成' });
      setIsTranslating(false);
    },
    onError: () => {
      toast({ title: '错误', description: 'AI翻译失败', variant: 'destructive' });
      setIsTranslating(false);
    },
  });

  const resetForm = () => {
    setFormData({
      titleSourceLang: 'zh-cn',
      titleSource: '',
      descriptionSourceLang: 'zh-cn',
      descriptionSource: '',
      titleZh: '',
      titleEn: '',
      titleTh: '',
      descriptionZh: '',
      descriptionEn: '',
      descriptionTh: '',
      couponValue: '',
      discountType: 'cash_voucher',
      startAt: '',
      endAt: '',
      maxPerUser: '1',
      maxTotal: '',
      isActive: true,
    });
    setEditingCampaign(null);
  };

  const handleCreate = () => {
    setEditingCampaign(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      titleSourceLang: campaign.titleSourceLang,
      titleSource: campaign.titleSource,
      descriptionSourceLang: campaign.descriptionSourceLang,
      descriptionSource: campaign.descriptionSource,
      titleZh: campaign.titleZh || '',
      titleEn: campaign.titleEn || '',
      titleTh: campaign.titleTh || '',
      descriptionZh: campaign.descriptionZh || '',
      descriptionEn: campaign.descriptionEn || '',
      descriptionTh: campaign.descriptionTh || '',
      couponValue: campaign.couponValue,
      discountType: campaign.discountType,
      startAt: campaign.startAt ? format(new Date(campaign.startAt), "yyyy-MM-dd'T'HH:mm") : '',
      endAt: campaign.endAt ? format(new Date(campaign.endAt), "yyyy-MM-dd'T'HH:mm") : '',
      maxPerUser: campaign.maxPerUser.toString(),
      maxTotal: campaign.maxTotal?.toString() || '',
      isActive: campaign.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('确定要删除此活动吗？')) {
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
    setIsStoreDialogOpen(true);
  };

  const handleAutoTranslate = () => {
    if (editingCampaign) {
      setIsTranslating(true);
      autoTranslateMutation.mutate(editingCampaign.id);
    }
  };

  const handleStoreToggle = (storeId: number) => {
    setSelectedStoreIds(prev =>
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSaveStores = () => {
    if (selectedCampaignId) {
      updateStoresMutation.mutate({ campaignId: selectedCampaignId, storeIds: selectedStoreIds });
    }
  };

  const getDiscountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      final_price: '特价',
      gift_card: '礼品卡',
      cash_voucher: '现金券',
      full_reduction: '满减',
      percentage_off: '折扣',
    };
    return labels[type] || type;
  };

  // 当门店对话框打开时，设置已选门店
  if (isStoreDialogOpen && campaignStoresData && selectedStoreIds.length === 0) {
    setSelectedStoreIds(campaignStoresData.stores.map(s => s.id));
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle data-testid="text-page-title">活动管理</CardTitle>
          <Button onClick={handleCreate} data-testid="button-create-campaign">
            <Plus className="w-4 h-4 mr-2" />
            新建活动
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
                  <TableHead>标题</TableHead>
                  <TableHead>券类型</TableHead>
                  <TableHead>券值</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>结束时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsData?.campaigns.map((campaign) => (
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
                        {campaign.isActive ? '启用' : '禁用'}
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
                {(!campaignsData?.campaigns || campaignsData.campaigns.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      暂无活动数据
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
              {editingCampaign ? '编辑活动' : '新建活动'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="font-medium">基本信息</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titleSourceLang">标题主语言</Label>
                  <Select
                    value={formData.titleSourceLang}
                    onValueChange={(value: any) => setFormData({ ...formData, titleSourceLang: value })}
                  >
                    <SelectTrigger data-testid="select-title-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-cn">中文</SelectItem>
                      <SelectItem value="en-us">English</SelectItem>
                      <SelectItem value="th-th">ไทย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titleSource">标题 *</Label>
                  <Input
                    id="titleSource"
                    value={formData.titleSource}
                    onChange={(e) => setFormData({ ...formData, titleSource: e.target.value })}
                    required
                    data-testid="input-title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionSource">描述 *</Label>
                <Textarea
                  id="descriptionSource"
                  value={formData.descriptionSource}
                  onChange={(e) => setFormData({ ...formData, descriptionSource: e.target.value })}
                  required
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              {editingCampaign && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoTranslate}
                  disabled={isTranslating}
                  data-testid="button-auto-translate"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isTranslating ? 'AI翻译中...' : 'AI自动翻译'}
                </Button>
              )}
            </div>

            {/* 多语言翻译 */}
            <div className="space-y-4">
              <h3 className="font-medium">多语言内容（可选）</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titleZh">中文标题</Label>
                  <Input
                    id="titleZh"
                    value={formData.titleZh}
                    onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
                    data-testid="input-title-zh"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleEn">英文标题</Label>
                  <Input
                    id="titleEn"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    data-testid="input-title-en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleTh">泰文标题</Label>
                  <Input
                    id="titleTh"
                    value={formData.titleTh}
                    onChange={(e) => setFormData({ ...formData, titleTh: e.target.value })}
                    data-testid="input-title-th"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descriptionZh">中文描述</Label>
                  <Textarea
                    id="descriptionZh"
                    value={formData.descriptionZh}
                    onChange={(e) => setFormData({ ...formData, descriptionZh: e.target.value })}
                    rows={2}
                    data-testid="input-description-zh"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">英文描述</Label>
                  <Textarea
                    id="descriptionEn"
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    rows={2}
                    data-testid="input-description-en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionTh">泰文描述</Label>
                  <Textarea
                    id="descriptionTh"
                    value={formData.descriptionTh}
                    onChange={(e) => setFormData({ ...formData, descriptionTh: e.target.value })}
                    rows={2}
                    data-testid="input-description-th"
                  />
                </div>
              </div>
            </div>

            {/* 券设置 */}
            <div className="space-y-4">
              <h3 className="font-medium">券设置</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType">券类型 *</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: any) => setFormData({ ...formData, discountType: value })}
                  >
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="final_price">特价</SelectItem>
                      <SelectItem value="gift_card">礼品卡</SelectItem>
                      <SelectItem value="cash_voucher">现金券</SelectItem>
                      <SelectItem value="full_reduction">满减</SelectItem>
                      <SelectItem value="percentage_off">折扣</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="couponValue">券值 *</Label>
                  <Input
                    id="couponValue"
                    type="number"
                    step="0.01"
                    value={formData.couponValue}
                    onChange={(e) => setFormData({ ...formData, couponValue: e.target.value })}
                    required
                    data-testid="input-coupon-value"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startAt">开始时间 *</Label>
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
                  <Label htmlFor="endAt">结束时间 *</Label>
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
                  <Label htmlFor="maxPerUser">每人限领 *</Label>
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
                  <Label htmlFor="maxTotal">总库存（留空=无限）</Label>
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
                <Label htmlFor="isActive" className="cursor-pointer">启用活动</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save">
                {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 门店关联对话框 */}
      <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-store-dialog-title">门店关联管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {storesData?.stores.map((store) => (
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
                取消
              </Button>
              <Button onClick={handleSaveStores} disabled={updateStoresMutation.isPending} data-testid="button-save-stores">
                {updateStoresMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
