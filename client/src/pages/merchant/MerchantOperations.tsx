import { Link, useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Users, Ticket, BarChart3, Settings, Bell, FileText, Package, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  icon: typeof Users;
  label: string;
  description: string;
  href?: string;
}

function MenuSection({ title, items, onItemClick }: { title: string; items: MenuItem[]; onItemClick: (href?: string) => void }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">{title}</h2>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {items.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-4 px-4 hover-elevate active-elevate-2 cursor-pointer"
                data-testid={`menu-item-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => onItemClick(item.href)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MerchantOperations() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleMenuClick = (href?: string) => {
    if (href) {
      navigate(href);
    } else {
      toast({
        title: t('common.comingSoon'),
        description: t('common.featureInDevelopment'),
      });
    }
  };

  const campaignItems: MenuItem[] = [
    {
      icon: Ticket,
      label: t('merchant.campaignManage'),
      description: t('merchant.campaignManageDesc'),
      // TODO: 创建商户活动管理页面 /merchant/campaigns
    },
    {
      icon: BarChart3,
      label: t('merchant.campaignStats'),
      description: t('merchant.campaignStatsDesc'),
      // TODO: 创建商户活动统计页面 /merchant/campaign-stats
    },
  ];

  const productItems: MenuItem[] = [
    {
      icon: Package,
      label: t('merchant.productManage'),
      description: t('merchant.productManageDesc'),
      href: '/merchant/products',
    },
    {
      icon: Tags,
      label: t('merchant.categoryManage'),
      description: t('merchant.categoryManageDesc'),
      href: '/merchant/categories',
    },
  ];

  const staffItems: MenuItem[] = [
    {
      icon: Users,
      label: t('merchant.staffManage'),
      description: t('merchant.staffManageDesc'),
      // TODO: 创建商户员工管理页面 /merchant/staff
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      icon: Bell,
      label: t('merchant.notifications'),
      description: t('merchant.notificationsDesc'),
      // TODO: 创建商户通知设置页面 /merchant/notifications
    },
    {
      icon: Settings,
      label: t('merchant.storeSettings'),
      description: t('merchant.storeSettingsDesc'),
      href: '/merchant/store-settings',  // 新的商户门店设置页面
    },
    {
      icon: FileText,
      label: t('merchant.reports'),
      description: t('merchant.reportsDesc'),
      // TODO: 创建商户报表页面 /merchant/reports
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('merchant.operations')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <MenuSection title={t('merchant.productSection')} items={productItems} onItemClick={handleMenuClick} />
        <MenuSection title={t('merchant.campaignSection')} items={campaignItems} onItemClick={handleMenuClick} />
        <MenuSection title={t('merchant.staffSection')} items={staffItems} onItemClick={handleMenuClick} />
        <MenuSection title={t('merchant.settingsSection')} items={settingsItems} onItemClick={handleMenuClick} />
      </main>

      <MerchantBottomNav />
    </div>
  );
}
