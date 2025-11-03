import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Store } from '@shared/schema';

export default function AdminStores() {
  const { adminToken, logoutAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    city: '',
    address: '',
    phone: '',
    latitude: '',
    longitude: '',
  });

  const { data: stores, isLoading } = useQuery<{ ok: boolean; stores: Store[] }>({
    queryKey: ['/api/admin/stores'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stores', {
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...data,
          latitude: data.latitude ? data.latitude : null,
          longitude: data.longitude ? data.longitude : null,
          isActive: true,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: t('common.success'), description: t('stores.createSuccess') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('stores.createError'), variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...data,
          latitude: data.latitude ? data.latitude : null,
          longitude: data.longitude ? data.longitude : null,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: t('common.success'), description: t('stores.updateSuccess') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('stores.updateError'), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: t('common.success'), description: t('stores.deleteSuccess') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('stores.deleteError'), variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      city: '',
      address: '',
      phone: '',
      latitude: '',
      longitude: '',
    });
    setEditingStore(null);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      brand: store.brand || '',
      city: store.city,
      address: store.address,
      phone: store.phone || '',
      latitude: store.latitude || '',
      longitude: store.longitude || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('stores.title')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-store" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              {t('stores.addStore')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingStore ? t('stores.editTitle') : t('stores.createTitle')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('stores.name')} *</Label>
                  <Input
                    id="name"
                    data-testid="input-store-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">{t('stores.brand')}</Label>
                  <Input
                    id="brand"
                    data-testid="input-store-brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t('stores.city')} *</Label>
                  <Input
                    id="city"
                    data-testid="input-store-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('stores.phone')}</Label>
                  <Input
                    id="phone"
                    data-testid="input-store-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t('stores.address')} *</Label>
                <Input
                  id="address"
                  data-testid="input-store-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">{t('stores.latitude')}</Label>
                  <Input
                    id="latitude"
                    data-testid="input-store-latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">{t('stores.longitude')}</Label>
                  <Input
                    id="longitude"
                    data-testid="input-store-longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  data-testid="button-save-store"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingStore ? t('common.edit') : t('common.create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('stores.allStores')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('stores.name')}</TableHead>
                  <TableHead>{t('stores.brand')}</TableHead>
                  <TableHead>{t('stores.city')}</TableHead>
                  <TableHead>{t('stores.address')}</TableHead>
                  <TableHead>{t('stores.phone')}</TableHead>
                  <TableHead className="text-right">{t('stores.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores?.stores?.map((store) => (
                  <TableRow key={store.id} data-testid={`row-store-${store.id}`}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.brand || '-'}</TableCell>
                    <TableCell>{store.city}</TableCell>
                    <TableCell>{store.address}</TableCell>
                    <TableCell>{store.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-edit-${store.id}`}
                          onClick={() => handleEdit(store)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          data-testid={`button-delete-${store.id}`}
                          onClick={() => deleteMutation.mutate(store.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
