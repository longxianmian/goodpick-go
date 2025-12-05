import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Search, 
  Store, 
  MapPin, 
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertCircle
} from 'lucide-react';
import type { Store as StoreType } from '@shared/schema';

type StoreStatus = 'all' | 'pending' | 'active' | 'suspended';

interface ExtendedStore extends StoreType {
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  ownerName?: string;
  ownerPhone?: string;
}

export function OpsMerchants() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StoreStatus>('all');
  const [selectedStore, setSelectedStore] = useState<ExtendedStore | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: stores, isLoading } = useQuery<StoreType[]>({
    queryKey: ['/api/stores'],
  });

  const mockPendingStores: ExtendedStore[] = [
    {
      id: 901,
      name: '泰香园餐厅',
      brand: '泰香园',
      city: '曼谷',
      address: 'Sukhumvit Rd, Khlong Toei',
      phone: '02-123-4567',
      rating: null,
      imageUrl: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalStatus: 'pending',
      ownerName: 'Somchai',
      ownerPhone: '081-234-5678',
      industryType: 'food',
      businessStatus: 'closed',
      latitude: null,
      longitude: null,
      floorInfo: null,
      descriptionZh: null,
      descriptionEn: null,
      descriptionTh: null,
      coverImages: null,
      businessHours: null,
      monthlySales: 0,
      fansCount: 0,
      topRank: null,
      deliveryTime: null,
      pickupTime: null,
      serviceScores: null,
      businessLicenseUrl: null,
      foodLicenseUrl: null,
      ownerId: null,
    },
    {
      id: 902,
      name: '金龙美食',
      brand: null,
      city: '清迈',
      address: 'Nimmanhaemin Rd',
      phone: '053-456-789',
      rating: null,
      imageUrl: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalStatus: 'pending',
      ownerName: 'Wang Wei',
      ownerPhone: '089-876-5432',
      industryType: 'food',
      businessStatus: 'closed',
      latitude: null,
      longitude: null,
      floorInfo: null,
      descriptionZh: null,
      descriptionEn: null,
      descriptionTh: null,
      coverImages: null,
      businessHours: null,
      monthlySales: 0,
      fansCount: 0,
      topRank: null,
      deliveryTime: null,
      pickupTime: null,
      serviceScores: null,
      businessLicenseUrl: null,
      foodLicenseUrl: null,
      ownerId: null,
    },
    {
      id: 903,
      name: '星巴克 Central',
      brand: 'Starbucks',
      city: '曼谷',
      address: 'Central World, Ratchadamri',
      phone: '02-999-8888',
      rating: null,
      imageUrl: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalStatus: 'pending',
      ownerName: 'Central Group',
      ownerPhone: '02-111-2222',
      industryType: 'food',
      businessStatus: 'closed',
      latitude: null,
      longitude: null,
      floorInfo: null,
      descriptionZh: null,
      descriptionEn: null,
      descriptionTh: null,
      coverImages: null,
      businessHours: null,
      monthlySales: 0,
      fansCount: 0,
      topRank: null,
      deliveryTime: null,
      pickupTime: null,
      serviceScores: null,
      businessLicenseUrl: null,
      foodLicenseUrl: null,
      ownerId: null,
    },
  ];

  const allStores: ExtendedStore[] = [
    ...mockPendingStores,
    ...(stores || []).map(s => ({ ...s, approvalStatus: 'approved' as const })),
  ];

  const filteredStores = allStores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          store.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') return matchesSearch && store.approvalStatus === 'pending';
    if (statusFilter === 'active') return matchesSearch && store.isActive && store.approvalStatus === 'approved';
    if (statusFilter === 'suspended') return matchesSearch && !store.isActive && store.approvalStatus === 'approved';
    
    return matchesSearch;
  });

  const getStatusBadge = (store: ExtendedStore) => {
    if (store.approvalStatus === 'pending') {
      return <Badge className="bg-amber-500">待审核</Badge>;
    }
    if (store.approvalStatus === 'rejected') {
      return <Badge variant="destructive">已拒绝</Badge>;
    }
    if (store.isActive) {
      return <Badge className="bg-green-500">运营中</Badge>;
    }
    return <Badge variant="secondary">已暂停</Badge>;
  };

  const handleViewDetail = (store: ExtendedStore) => {
    setSelectedStore(store);
    setDetailDialogOpen(true);
  };

  const handleApprove = (storeId: number) => {
    console.log('Approve store:', storeId);
    setDetailDialogOpen(false);
  };

  const handleReject = (storeId: number) => {
    console.log('Reject store:', storeId);
    setDetailDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索商户名称或城市..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StoreStatus)}>
        <TabsList>
          <TabsTrigger value="all">
            全部 ({allStores.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            待审核
            <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
              {mockPendingStores.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            运营中 ({allStores.filter(s => s.isActive && s.approvalStatus === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            已暂停
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <div className="space-y-3">
            {filteredStores.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到符合条件的商户</p>
                </CardContent>
              </Card>
            ) : (
              filteredStores.map((store) => (
                <Card key={store.id} className="hover-elevate cursor-pointer" onClick={() => handleViewDetail(store)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 rounded-lg">
                        <AvatarImage src={store.imageUrl || undefined} />
                        <AvatarFallback className="rounded-lg bg-muted">
                          <Store className="w-6 h-6 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{store.name}</h3>
                          {getStatusBadge(store)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{store.city}</span>
                          </div>
                          {store.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{store.phone}</span>
                            </div>
                          )}
                        </div>

                        {store.approvalStatus === 'pending' && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                            <Clock className="w-3 h-3" />
                            <span>申请人: {store.ownerName} ({store.ownerPhone})</span>
                          </div>
                        )}
                      </div>

                      <Button variant="ghost" size="icon" data-testid={`button-view-${store.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              商户详情
            </DialogTitle>
            <DialogDescription>
              查看商户信息并进行审核操作
            </DialogDescription>
          </DialogHeader>

          {selectedStore && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 rounded-lg">
                  <AvatarImage src={selectedStore.imageUrl || undefined} />
                  <AvatarFallback className="rounded-lg bg-muted">
                    <Store className="w-8 h-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedStore.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedStore)}
                    {selectedStore.brand && (
                      <Badge variant="outline">{selectedStore.brand}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">城市</div>
                  <div className="font-medium">{selectedStore.city}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">电话</div>
                  <div className="font-medium">{selectedStore.phone || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">地址</div>
                  <div className="font-medium">{selectedStore.address}</div>
                </div>
                {selectedStore.approvalStatus === 'pending' && (
                  <>
                    <div>
                      <div className="text-muted-foreground mb-1">申请人</div>
                      <div className="font-medium">{selectedStore.ownerName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">联系方式</div>
                      <div className="font-medium">{selectedStore.ownerPhone}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">资质文件:</span>
                {selectedStore.businessLicenseUrl ? (
                  <a href={selectedStore.businessLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    查看营业执照
                  </a>
                ) : (
                  <span className="text-muted-foreground">暂未上传</span>
                )}
              </div>
            </div>
          )}

          {selectedStore?.approvalStatus === 'pending' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => handleReject(selectedStore.id)}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                拒绝
              </Button>
              <Button 
                onClick={() => handleApprove(selectedStore.id)}
                className="bg-[#38B03B] hover:bg-[#2d8a2f]"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                通过审核
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
