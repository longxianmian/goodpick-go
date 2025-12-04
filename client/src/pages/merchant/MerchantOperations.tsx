import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Ticket, 
  BarChart3, 
  Package, 
  Tags,
  UserPlus,
  ClipboardList,
  BadgeCheck,
  ShoppingBag,
  CircleDollarSign,
  Wallet,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  Settings,
  QrCode,
  Boxes,
  FileText,
  CreditCard,
  ToggleLeft,
  Sparkles,
  Gift,
  Percent,
  Calendar,
  Eye,
  EyeOff,
  Heart,
  ShoppingCart,
  Target,
  Bot,
  Palette,
  Video,
  Lightbulb,
  PartyPopper,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

type TabType = 'staff' | 'operations' | 'assets' | 'data';

export default function MerchantOperations() {
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialTab = (urlParams.get('tab') as TabType) || 'staff';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab') as TabType;
    if (tab && ['staff', 'operations', 'assets', 'data'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const staffData = {
    operators: 3,
    verifiers: 8,
    totalStaff: 11,
    pendingActivation: 1,
    staffList: [
      { id: 1, name: '张三', role: 'operator', status: 'active', lastActive: '10分钟前' },
      { id: 2, name: '李四', role: 'verifier', status: 'active', lastActive: '1小时前' },
      { id: 3, name: '王五', role: 'verifier', status: 'active', lastActive: '2小时前' },
      { id: 4, name: '赵六', role: 'verifier', status: 'pending', lastActive: '-' },
      { id: 5, name: '钱七', role: 'operator', status: 'active', lastActive: '刚刚' },
      { id: 6, name: '孙八', role: 'verifier', status: 'active', lastActive: '30分钟前' },
    ],
  };

  const operationsData = {
    totalProducts: 45,
    activeProducts: 38,
    inactiveProducts: 7,
    activeCampaigns: 3,
    products: [
      { id: 1, name: '招牌奶茶', price: 18, status: 'active', sales: 156 },
      { id: 2, name: '超值午餐', price: 38, status: 'active', sales: 89 },
      { id: 3, name: '甜品套餐', price: 28, status: 'inactive', sales: 67 },
      { id: 4, name: '会员充值卡', price: 200, status: 'active', sales: 23 },
    ],
    campaigns: [
      { id: 1, name: '新人首单立减', type: 'discount', status: 'active', remaining: 45, total: 100 },
      { id: 2, name: '周末买一送一', type: 'bogo', status: 'active', remaining: 12, total: 50 },
      { id: 3, name: '会员专享8折', type: 'member', status: 'scheduled', remaining: 100, total: 100 },
    ],
  };

  const assetsData = {
    totalInventory: 1250,
    lowStockItems: 5,
    pendingPurchase: 3,
    accountBalance: 12680,
    monthlyRevenue: 38500,
    monthlyExpense: 15200,
    inventoryItems: [
      { id: 1, name: '奶茶原料', stock: 50, unit: '袋', minStock: 20, status: 'normal' },
      { id: 2, name: '一次性杯子', stock: 15, unit: '箱', minStock: 20, status: 'low' },
      { id: 3, name: '吸管', stock: 8, unit: '箱', minStock: 10, status: 'low' },
      { id: 4, name: '打包盒', stock: 100, unit: '个', minStock: 50, status: 'normal' },
    ],
    transactions: [
      { id: 1, type: 'income', desc: '订单收入', amount: 580, time: '今天 10:30' },
      { id: 2, type: 'income', desc: '订单收入', amount: 320, time: '今天 09:45' },
      { id: 3, type: 'expense', desc: '进货支出', amount: -1200, time: '昨天 15:00' },
      { id: 4, type: 'expense', desc: '平台服务费', amount: -45, time: '昨天 23:00' },
    ],
  };

  const dataStats = {
    todayOrders: 28,
    pendingVerify: 5,
    todayVerified: 23,
    activeCampaigns: 3,
    todayRevenue: 2580,
    yesterdayRevenue: 2340,
    weeklyRevenue: 18500,
    monthlyRevenue: 68000,
    todayCustomers: 38,
    avgOrderValue: 61.4,
    conversionRate: 12.5,
    todayViews: 328,
    todayFavorites: 24,
    orders: [
      { id: 'ORD001', product: '招牌奶茶套餐', amount: 58, status: 'pending', time: '10:30' },
      { id: 'ORD002', product: '超值午餐套餐', amount: 38, status: 'verified', time: '10:25' },
      { id: 'ORD003', product: '会员充值200', amount: 200, status: 'verified', time: '10:20' },
      { id: 'ORD004', product: '甜品双人套餐', amount: 68, status: 'pending', time: '10:15' },
    ],
    campaignStats: [
      { id: 1, name: '新人首单立减', claimed: 55, used: 45, revenue: 2580 },
      { id: 2, name: '周末买一送一', claimed: 38, used: 28, revenue: 1890 },
      { id: 3, name: '会员专享8折', claimed: 12, used: 8, revenue: 960 },
    ],
    hourlyData: [
      { hour: '09:00', orders: 8 },
      { hour: '10:00', orders: 12 },
      { hour: '11:00', orders: 18 },
      { hour: '12:00', orders: 25 },
      { hour: '13:00', orders: 22 },
      { hour: '14:00', orders: 15 },
    ],
  };

  const digitalAgents = {
    purchased: [
      { id: 1, name: '小美', type: 'guide', typeLabel: 'opsCenter.agentGuide', price: 299, status: 'active', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
      { id: 2, name: '设计师小艺', type: 'designer', typeLabel: 'opsCenter.agentDesigner', price: 399, status: 'active', icon: Palette, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
    ],
    available: [
      { id: 101, name: '导购数字人', type: 'guide', typeLabel: 'opsCenter.agentGuide', price: 299, icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', desc: 'opsCenter.agentGuideDesc' },
      { id: 102, name: '平面设计师', type: 'designer', typeLabel: 'opsCenter.agentDesigner', price: 399, icon: Palette, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30', desc: 'opsCenter.agentDesignerDesc' },
      { id: 103, name: '视频制作师', type: 'video', typeLabel: 'opsCenter.agentVideo', price: 499, icon: Video, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', desc: 'opsCenter.agentVideoDesc' },
      { id: 104, name: '经营顾问', type: 'consultant', typeLabel: 'opsCenter.agentConsultant', price: 599, icon: Lightbulb, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', desc: 'opsCenter.agentConsultantDesc' },
      { id: 105, name: '活动策划师', type: 'planner', typeLabel: 'opsCenter.agentPlanner', price: 349, icon: PartyPopper, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', desc: 'opsCenter.agentPlannerDesc' },
    ],
  };

  const renderStaffTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="text-xl font-bold text-blue-600">{staffData.operators}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.operators')}</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
          <div className="text-xl font-bold text-green-600">{staffData.verifiers}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.verifiers')}</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
          <div className="text-xl font-bold text-purple-600">{staffData.totalStaff}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.totalStaff')}</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <div className="text-xl font-bold text-amber-600">{staffData.pendingActivation}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.pendingActivation')}</div>
        </div>
      </div>

      <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
        <CardContent className="p-0">
          <div 
            className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2"
            onClick={handleComingSoon}
            data-testid="button-add-staff"
          >
            <div className="w-10 h-10 rounded-xl bg-[#38B03B] flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{t('opsCenter.addStaff')}</div>
              <div className="text-xs text-muted-foreground">{t('opsCenter.addStaffDesc')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{t('opsCenter.staffList')}</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]">{t('common.all')}</Badge>
              <Badge variant="secondary" className="text-[10px]">{t('opsCenter.operatorRole')}</Badge>
              <Badge variant="secondary" className="text-[10px]">{t('opsCenter.verifierRole')}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            {staffData.staffList.map((staff) => (
              <div 
                key={staff.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                onClick={handleComingSoon}
                data-testid={`staff-item-${staff.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="text-sm">{staff.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{staff.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {staff.role === 'operator' ? t('opsCenter.operatorRole') : t('opsCenter.verifierRole')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{staff.lastActive}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={staff.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {staff.status === 'active' ? t('opsCenter.activated') : t('opsCenter.pendingActivation')}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {digitalAgents.purchased.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('opsCenter.digitalAgents')}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {digitalAgents.purchased.length} {t('opsCenter.agentWorking')}
              </Badge>
            </div>
            <div className="space-y-2">
              {digitalAgents.purchased.map((agent) => {
                const IconComponent = agent.icon;
                return (
                  <div 
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 cursor-pointer hover-elevate"
                    onClick={handleComingSoon}
                    data-testid={`digital-agent-${agent.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${agent.bgColor} flex items-center justify-center`}>
                        <IconComponent className={`w-5 h-5 ${agent.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{agent.name}</span>
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-violet-100 dark:bg-violet-900/30 border-violet-200">
                            {t(agent.typeLabel)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">¥{agent.price}/{t('opsCenter.perMonth')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] bg-[#38B03B]">
                        {t('opsCenter.agentOnline')}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderOperationsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="text-xl font-bold text-blue-600">{operationsData.totalProducts}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.totalProducts')}</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
          <div className="text-xl font-bold text-green-600">{operationsData.activeProducts}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.activeProducts')}</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <div className="text-xl font-bold text-amber-600">{operationsData.inactiveProducts}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.inactiveProducts')}</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
          <div className="text-xl font-bold text-purple-600">{operationsData.activeCampaigns}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.activeCampaigns')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={() => navigate('/merchant/products')} data-testid="button-product-manage">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium">{t('opsCenter.productManage')}</span>
            <span className="text-[10px] text-muted-foreground">{t('opsCenter.productManageDesc')}</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => navigate('/merchant/campaigns')} data-testid="button-campaign-manage">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium">{t('opsCenter.campaignManage')}</span>
            <span className="text-[10px] text-muted-foreground">{t('opsCenter.campaignManageDesc')}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.productList')}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={() => navigate('/merchant/products')}>
              {t('opsCenter.viewAll')} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-3">
            {operationsData.products.map((product) => (
              <div 
                key={product.id}
                className="flex items-center justify-between py-3 border-b border-muted last:border-b-0 cursor-pointer"
                onClick={() => navigate(`/merchant/products/${product.id}/edit`)}
                data-testid={`product-item-${product.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge 
                      className={`text-[10px] ${product.status === 'active' ? 'bg-[#38B03B]' : 'bg-gray-400'}`}
                    >
                      {product.status === 'active' ? t('opsCenter.onShelf') : t('opsCenter.offShelf')}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t('opsCenter.sales')}: {product.sales}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">¥{product.price}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComingSoon();
                    }}
                    data-testid={`button-toggle-visibility-${product.id}`}
                  >
                    {product.status === 'active' ? (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.campaignList')}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={() => navigate('/merchant/campaigns')}>
              {t('opsCenter.manageAll')} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-3">
            {operationsData.campaigns.map((campaign) => {
              const usedPercent = ((campaign.total - campaign.remaining) / campaign.total) * 100;
              return (
                <div 
                  key={campaign.id}
                  className="py-3 border-b border-muted last:border-b-0 cursor-pointer"
                  onClick={() => navigate('/merchant/campaigns')}
                  data-testid={`campaign-item-${campaign.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{campaign.name}</span>
                      <Badge 
                        className={`text-[10px] ${campaign.status === 'active' ? 'bg-[#38B03B]' : 'bg-amber-500'}`}
                      >
                        {campaign.status === 'active' ? t('opsCenter.inProgress') : t('opsCenter.scheduled')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-muted-foreground">{t('opsCenter.remaining')}: {campaign.remaining}/{campaign.total}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#38B03B] rounded-full transition-all duration-300" 
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent cursor-pointer hover-elevate" onClick={() => navigate('/merchant/campaigns/new')} data-testid="button-create-campaign">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#38B03B] flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{t('opsCenter.createCampaign')}</div>
            <div className="text-xs text-muted-foreground">{t('opsCenter.createCampaignDesc')}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">{t('opsCenter.accountBalance')}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-white/80 hover:text-white hover:bg-white/20 h-auto p-1"
              onClick={handleComingSoon}
              data-testid="button-withdraw"
            >
              {t('opsCenter.withdraw')} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-3xl font-bold mb-2">¥{assetsData.accountBalance.toLocaleString()}</div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="opacity-70">{t('opsCenter.monthlyRevenue')}</span>
              <span className="ml-1 font-medium">¥{assetsData.monthlyRevenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="opacity-70">{t('opsCenter.monthlyExpense')}</span>
              <span className="ml-1 font-medium">¥{assetsData.monthlyExpense.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 cursor-pointer hover-elevate" onClick={() => navigate('/merchant/payment-qrcode')} data-testid="button-payment-qrcode">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{t('opsCenter.paymentQrCode')}</div>
            <div className="text-xs text-muted-foreground">{t('opsCenter.paymentQrCodeDesc')}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon} data-testid="button-inventory">
          <CardContent className="p-2 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[11px] font-medium">{t('opsCenter.inventory')}</span>
            <span className="text-sm font-bold">{assetsData.totalInventory}</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon} data-testid="button-purchase">
          <CardContent className="p-2 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-[11px] font-medium">{t('opsCenter.purchase')}</span>
            <Badge variant="destructive" className="text-[8px] h-4">{assetsData.pendingPurchase} {t('opsCenter.pending')}</Badge>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate border-violet-300 dark:border-violet-700" onClick={handleComingSoon} data-testid="button-digital-agents">
          <CardContent className="p-2 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-[11px] font-medium">{t('opsCenter.digitalAgentPurchase')}</span>
            <Badge className="text-[8px] h-4 bg-violet-500">{digitalAgents.purchased.length} {t('opsCenter.agentWorking')}</Badge>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon} data-testid="button-finance">
          <CardContent className="p-2 flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-[11px] font-medium">{t('opsCenter.finance')}</span>
            <span className="text-[9px] text-muted-foreground">{t('opsCenter.viewReport')}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.inventoryAlert')}</span>
            </div>
            <Badge variant="destructive" className="text-[10px]">{assetsData.lowStockItems} {t('opsCenter.lowStock')}</Badge>
          </div>
          <div className="space-y-2">
            {assetsData.inventoryItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                data-testid={`inventory-item-${item.id}`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t('opsCenter.minStock')}: {item.minStock}{item.unit}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${item.status === 'low' ? 'text-destructive' : ''}`}>
                    {item.stock}{item.unit}
                  </span>
                  {item.status === 'low' && (
                    <Badge variant="destructive" className="text-[9px]">{t('opsCenter.lowStock')}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.recentTransactions')}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              {t('opsCenter.allRecords')} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {assetsData.transactions.map((tx) => (
              <div 
                key={tx.id}
                className="flex items-center justify-between p-2 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {tx.type === 'income' ? 
                      <ArrowDownRight className="w-4 h-4 text-green-600" /> : 
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div>
                    <div className="text-sm">{tx.desc}</div>
                    <div className="text-[10px] text-muted-foreground">{tx.time}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'income' ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {digitalAgents.purchased.length > 0 && (
        <Card className="border-violet-200 dark:border-violet-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold">{t('opsCenter.myDigitalAgents')}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-violet-600 h-auto p-0" onClick={handleComingSoon}>
                {t('opsCenter.browseMore')} <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {digitalAgents.purchased.map((agent) => {
                const IconComponent = agent.icon;
                return (
                  <div 
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 cursor-pointer hover-elevate"
                    onClick={handleComingSoon}
                    data-testid={`purchased-agent-${agent.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${agent.bgColor} flex items-center justify-center`}>
                        <IconComponent className={`w-5 h-5 ${agent.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{agent.name}</span>
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-violet-100 dark:bg-violet-900/30 border-violet-200">
                            {t(agent.typeLabel)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">¥{agent.price}/{t('opsCenter.perMonth')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] bg-[#38B03B]">
                        {t('opsCenter.agentOnline')}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-violet-300 dark:border-violet-700 bg-gradient-to-r from-violet-500/5 to-purple-500/5 cursor-pointer hover-elevate" onClick={handleComingSoon} data-testid="button-browse-digital-agents">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{t('opsCenter.discoverDigitalAgents')}</div>
            <div className="text-xs text-muted-foreground">{t('opsCenter.discoverDigitalAgentsDesc')}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="text-xl font-bold text-blue-600">{dataStats.todayOrders}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.todayOrders')}</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <div className="text-xl font-bold text-amber-600">{dataStats.pendingVerify}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.pendingVerify')}</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
          <div className="text-xl font-bold text-green-600">{dataStats.todayVerified}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.todayVerified')}</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
          <div className="text-xl font-bold text-purple-600">{dataStats.activeCampaigns}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.activeCampaigns')}</div>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t('opsCenter.todayRevenue')}</span>
            <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>+10.2%</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">¥{dataStats.todayRevenue.toLocaleString()}</div>
          <div className="text-xs opacity-70">{t('opsCenter.yesterday')} ¥{dataStats.yesterdayRevenue.toLocaleString()}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold">{dataStats.todayViews}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.views')}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Heart className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold">{dataStats.todayFavorites}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.favorites')}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ShoppingCart className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold">¥{dataStats.avgOrderValue}</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.avgOrderValue')}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold">{dataStats.conversionRate}%</div>
          <div className="text-[10px] text-muted-foreground">{t('opsCenter.conversionRate')}</div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.todayOrderList')}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              {t('opsCenter.allOrders')} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {dataStats.orders.map((order) => (
              <div 
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                onClick={handleComingSoon}
                data-testid={`order-item-${order.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{order.product}</span>
                    <Badge 
                      variant={order.status === 'verified' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {order.status === 'verified' ? t('opsCenter.verified') : t('opsCenter.pendingVerify')}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{order.id} · {order.time}</div>
                </div>
                <div className="text-sm font-semibold text-[#38B03B]">¥{order.amount}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.campaignStats')}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              {t('opsCenter.viewDetails')} <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {dataStats.campaignStats.map((campaign) => (
              <div 
                key={campaign.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                data-testid={`campaign-stats-${campaign.id}`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{campaign.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {t('opsCenter.claimed')}: {campaign.claimed} · {t('opsCenter.used')}: {campaign.used}
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#38B03B]">¥{campaign.revenue}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('opsCenter.hourlyDistribution')}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{t('opsCenter.todayOrders')}</span>
          </div>
          <div className="flex items-end gap-2 h-24">
            {dataStats.hourlyData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-[#38B03B]/20 rounded-t"
                  style={{ height: `${(item.orders / 25) * 100}%` }}
                >
                  <div 
                    className="w-full bg-[#38B03B] rounded-t transition-all"
                    style={{ height: '100%' }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{item.hour.split(':')[0]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/merchant/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">{t('merchant.operationsCenter')}</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="staff" className="text-xs gap-1" data-testid="tab-staff">
              <Users className="w-3 h-3" />
              {t('opsCenter.staff')}
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs gap-1" data-testid="tab-operations">
              <ClipboardList className="w-3 h-3" />
              {t('opsCenter.operations')}
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs gap-1" data-testid="tab-assets">
              <Wallet className="w-3 h-3" />
              {t('opsCenter.assets')}
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs gap-1" data-testid="tab-data">
              <BarChart3 className="w-3 h-3" />
              {t('opsCenter.data')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="mt-0">
            {renderStaffTab()}
          </TabsContent>
          <TabsContent value="operations" className="mt-0">
            {renderOperationsTab()}
          </TabsContent>
          <TabsContent value="assets" className="mt-0">
            {renderAssetsTab()}
          </TabsContent>
          <TabsContent value="data" className="mt-0">
            {renderDataTab()}
          </TabsContent>
        </Tabs>
      </main>

      <MerchantBottomNav />
    </div>
  );
}
