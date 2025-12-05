import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Eye,
  MousePointer,
  ShoppingBag,
  Ticket,
  Filter,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface EarningRecord {
  id: number;
  type: 'cpc' | 'cpm' | 'cps';
  amount: number;
  contentTitle: string;
  promotionTitle: string;
  date: string;
  status: 'pending' | 'settled' | 'paid';
}

export default function IncomeRecords() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { userToken } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const { data: earningsData, isLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/creator/earnings'],
    enabled: !!userToken,
  });

  const mockRecords: EarningRecord[] = [
    { id: 1, type: 'cpc', amount: 35.5, contentTitle: '美食探店vlog', promotionTitle: '火锅套餐5折券', date: '2024-11-28', status: 'pending' },
    { id: 2, type: 'cps', amount: 120, contentTitle: '周末好去处推荐', promotionTitle: '商场满减活动', date: '2024-11-25', status: 'settled' },
    { id: 3, type: 'cpm', amount: 48, contentTitle: '新店开业探访', promotionTitle: '咖啡店新品推广', date: '2024-11-22', status: 'paid' },
    { id: 4, type: 'cpc', amount: 28.5, contentTitle: '美食探店vlog', promotionTitle: '甜品店8折券', date: '2024-11-20', status: 'paid' },
    { id: 5, type: 'cps', amount: 85, contentTitle: '假期消费指南', promotionTitle: '服装店满减', date: '2024-11-18', status: 'paid' },
  ];

  const records = mockRecords;
  const filteredRecords = activeTab === 'all' 
    ? records 
    : records.filter(r => r.type === activeTab);

  const stats = {
    total: records.reduce((sum, r) => sum + r.amount, 0),
    pending: records.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
    settled: records.filter(r => r.status === 'settled' || r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cpc': return <MousePointer className="w-4 h-4" />;
      case 'cpm': return <Eye className="w-4 h-4" />;
      case 'cps': return <ShoppingBag className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cpc': return t('creator.billing.cpc');
      case 'cpm': return t('creator.billing.cpm');
      case 'cps': return t('creator.billing.cps');
      default: return type.toUpperCase();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">{t('incomeRecords.pending')}</Badge>;
      case 'settled':
        return <Badge className="text-xs bg-blue-500">{t('incomeRecords.settled')}</Badge>;
      case 'paid':
        return <Badge className="text-xs bg-green-500">{t('incomeRecords.paid')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-6">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/creator/me')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('incomeRecords.title')}</span>
          <div className="w-9" />
        </header>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{t('common.currencySymbol')}{stats.total.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{t('incomeRecords.totalIncome')}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-amber-600">{t('common.currencySymbol')}{stats.pending.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{t('incomeRecords.pendingAmount')}</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-green-600">{t('common.currencySymbol')}{stats.settled.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{t('incomeRecords.settledAmount')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1" data-testid="tab-all">{t('incomeRecords.all')}</TabsTrigger>
              <TabsTrigger value="cpc" className="flex-1" data-testid="tab-cpc">CPC</TabsTrigger>
              <TabsTrigger value="cpm" className="flex-1" data-testid="tab-cpm">CPM</TabsTrigger>
              <TabsTrigger value="cps" className="flex-1" data-testid="tab-cps">CPS</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[120px]" data-testid="select-month">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('incomeRecords.selectMonth')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('incomeRecords.allTime')}</SelectItem>
              <SelectItem value="2024-11">2024-11</SelectItem>
              <SelectItem value="2024-10">2024-10</SelectItem>
              <SelectItem value="2024-09">2024-09</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('incomeRecords.recordList')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('incomeRecords.noRecords')}
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between py-3 border-b last:border-0"
                  data-testid={`income-record-${record.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      record.type === 'cpc' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' :
                      record.type === 'cpm' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500' :
                      'bg-green-100 dark:bg-green-900/30 text-green-500'
                    }`}>
                      {getTypeIcon(record.type)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{record.contentTitle}</div>
                      <div className="text-xs text-muted-foreground">{record.promotionTitle}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{getTypeLabel(record.type)}</Badge>
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">+{t('common.currencySymbol')}{record.amount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{record.date}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
