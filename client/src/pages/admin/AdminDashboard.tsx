import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, TrendingUp, Package, Award, Store } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardSummary {
  month: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
  activeCampaigns: number;
  totalStores: number;
}

interface CampaignStat {
  campaignId: number;
  campaignTitle: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
}

interface BrandStat {
  brand: string;
  storeCount: number;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
}

interface StoreStat {
  storeId: number;
  storeName: string;
  brand: string | null;
  city: string;
  issuedCount: number;
  redeemedCount: number;
  redemptionRate: number;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [storePage, setStorePage] = useState<number>(1);

  // Fetch summary data
  const { data: summaryData, isLoading: summaryLoading } = useQuery<{ success: boolean; data: DashboardSummary }>({
    queryKey: ['/api/admin/dashboard/summary', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard/summary?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      return res.json();
    },
  });

  // Fetch campaign stats
  const { data: campaignData, isLoading: campaignLoading } = useQuery<{
    success: boolean;
    data: { month: string; campaigns: CampaignStat[] };
  }>({
    queryKey: ['/api/admin/dashboard/campaigns', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard/campaigns?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      return res.json();
    },
  });

  // Fetch brand stats
  const { data: brandData, isLoading: brandLoading } = useQuery<{
    success: boolean;
    data: { month: string; brands: BrandStat[] };
  }>({
    queryKey: ['/api/admin/dashboard/brands', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard/brands?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      return res.json();
    },
  });

  // Fetch store stats with pagination
  const { data: storeData, isLoading: storeLoading } = useQuery<{
    success: boolean;
    data: {
      month: string;
      stores: StoreStat[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>({
    queryKey: ['/api/admin/dashboard/stores', selectedMonth, storePage],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/dashboard/stores?month=${selectedMonth}&page=${storePage}&limit=20`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        }
      );
      return res.json();
    },
  });

  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    setSelectedMonth(date.toISOString().substring(0, 7));
    setStorePage(1);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    setSelectedMonth(date.toISOString().substring(0, 7));
    setStorePage(1);
  };

  const summary = summaryData?.data;
  const campaigns = campaignData?.data?.campaigns || [];
  const brands = brandData?.data?.brands || [];
  const stores = storeData?.data?.stores || [];
  const pagination = storeData?.data?.pagination;

  return (
    <div className="w-full min-h-screen p-4 md:p-8 space-y-6" data-testid="page-admin-dashboard">
      {/* Month Selector */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
          {t('dashboard.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            data-testid="button-previous-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[120px] text-center font-medium" data-testid="text-selected-month">
            {selectedMonth}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={selectedMonth >= new Date().toISOString().substring(0, 7)}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('common.loading')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-summary-issued">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.issuedCount')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-issued-count">
                {summary?.issuedCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-redeemed">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.redeemedCount')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-redeemed-count">
                {summary?.redeemedCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-rate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.redemptionRate')}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-redemption-rate">
                {summary?.redemptionRate || 0}%
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-summary-stores">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalStores')}</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-stores">
                {summary?.totalStores || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Different Dimensions */}
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-dimensions">
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            {t('dashboard.campaignDimension')}
          </TabsTrigger>
          <TabsTrigger value="brands" data-testid="tab-brands">
            {t('dashboard.brandDimension')}
          </TabsTrigger>
          <TabsTrigger value="stores" data-testid="tab-stores">
            {t('dashboard.storeDimension')}
          </TabsTrigger>
        </TabsList>

        {/* Campaign Dimension */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.campaignStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dashboard.noData')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.campaignTitle')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.issuedCount')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.redeemedCount')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.redemptionRate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.campaignId} data-testid={`row-campaign-${campaign.campaignId}`}>
                          <TableCell className="font-medium">{campaign.campaignTitle}</TableCell>
                          <TableCell className="text-right">{campaign.issuedCount}</TableCell>
                          <TableCell className="text-right">{campaign.redeemedCount}</TableCell>
                          <TableCell className="text-right">{campaign.redemptionRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Dimension */}
        <TabsContent value="brands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.brandStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              {brandLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dashboard.noData')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.brandName')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.storeCount')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.issuedCount')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.redeemedCount')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.redemptionRate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((brand, index) => (
                        <TableRow key={index} data-testid={`row-brand-${index}`}>
                          <TableCell className="font-medium">{brand.brand}</TableCell>
                          <TableCell className="text-right">{brand.storeCount}</TableCell>
                          <TableCell className="text-right">{brand.issuedCount}</TableCell>
                          <TableCell className="text-right">{brand.redeemedCount}</TableCell>
                          <TableCell className="text-right">{brand.redemptionRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Dimension */}
        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.storeStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              {storeLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('dashboard.noData')}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dashboard.storeName')}</TableHead>
                          <TableHead>{t('dashboard.brandName')}</TableHead>
                          <TableHead>{t('dashboard.city')}</TableHead>
                          <TableHead className="text-right">{t('dashboard.issuedCount')}</TableHead>
                          <TableHead className="text-right">{t('dashboard.redeemedCount')}</TableHead>
                          <TableHead className="text-right">{t('dashboard.redemptionRate')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stores.map((store) => (
                          <TableRow key={store.storeId} data-testid={`row-store-${store.storeId}`}>
                            <TableCell className="font-medium">{store.storeName}</TableCell>
                            <TableCell>{store.brand || '-'}</TableCell>
                            <TableCell>{store.city}</TableCell>
                            <TableCell className="text-right">{store.issuedCount}</TableCell>
                            <TableCell className="text-right">{store.redeemedCount}</TableCell>
                            <TableCell className="text-right">{store.redemptionRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {t('common.page')} {pagination.page} / {pagination.totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStorePage((p) => Math.max(1, p - 1))}
                          disabled={storePage === 1}
                          data-testid="button-previous-page"
                        >
                          {t('common.previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStorePage((p) => Math.min(pagination.totalPages, p + 1))}
                          disabled={storePage === pagination.totalPages}
                          data-testid="button-next-page"
                        >
                          {t('common.next')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
