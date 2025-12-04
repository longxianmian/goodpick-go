import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Ticket, 
  BarChart3, 
  Settings, 
  Bell, 
  FileText, 
  Package, 
  Tags,
  UserPlus,
  ClipboardList,
  BadgeCheck,
  Calendar,
  ShoppingBag,
  CircleDollarSign,
  Wallet,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Clock
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
    todayOrders: 28,
    pendingOrders: 5,
    todayVerified: 23,
    activeCampaigns: 3,
    orders: [
      { id: 'ORD001', product: '招牌奶茶套餐', amount: 58, status: 'pending', time: '10:30' },
      { id: 'ORD002', product: '超值午餐套餐', amount: 38, status: 'verified', time: '10:25' },
      { id: 'ORD003', product: '会员充值200', amount: 200, status: 'verified', time: '10:20' },
      { id: 'ORD004', product: '甜品双人套餐', amount: 68, status: 'pending', time: '10:15' },
    ],
    campaigns: [
      { id: 1, name: '新人首单立减', type: 'discount', remaining: 45, total: 100 },
      { id: 2, name: '周末买一送一', type: 'bogo', remaining: 12, total: 50 },
      { id: 3, name: '会员专享8折', type: 'member', remaining: 88, total: 100 },
    ],
  };

  const assetsData = {
    totalProducts: 45,
    activeProducts: 38,
    activeCampaigns: 8,
    accountBalance: 12680,
    monthlyRevenue: 38500,
    monthlyExpense: 15200,
    products: [
      { id: 1, name: '招牌奶茶', price: 18, stock: 999, sales: 156 },
      { id: 2, name: '超值午餐', price: 38, stock: 50, sales: 89 },
      { id: 3, name: '甜品套餐', price: 28, stock: 30, sales: 67 },
      { id: 4, name: '会员充值卡', price: 200, stock: 999, sales: 23 },
    ],
    transactions: [
      { id: 1, type: 'income', desc: '订单收入', amount: 580, time: '今天 10:30' },
      { id: 2, type: 'income', desc: '订单收入', amount: 320, time: '今天 09:45' },
      { id: 3, type: 'expense', desc: '平台服务费', amount: -45, time: '昨天 23:00' },
      { id: 4, type: 'income', desc: '订单收入', amount: 890, time: '昨天 18:30' },
    ],
  };

  const dataStats = {
    todayRevenue: 2580,
    yesterdayRevenue: 2340,
    weeklyRevenue: 18500,
    monthlyRevenue: 68000,
    todayOrders: 42,
    todayCustomers: 38,
    avgOrderValue: 61.4,
    conversionRate: 12.5,
    topProducts: [
      { name: '招牌奶茶', sales: 156, revenue: 2808 },
      { name: '超值午餐', sales: 89, revenue: 3382 },
      { name: '甜品套餐', sales: 67, revenue: 1876 },
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

  const renderStaffTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="text-xl font-bold text-blue-600">{staffData.operators}</div>
          <div className="text-[10px] text-muted-foreground">运营人员</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
          <div className="text-xl font-bold text-green-600">{staffData.verifiers}</div>
          <div className="text-[10px] text-muted-foreground">核销员</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
          <div className="text-xl font-bold text-purple-600">{staffData.totalStaff}</div>
          <div className="text-[10px] text-muted-foreground">总人数</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <div className="text-xl font-bold text-amber-600">{staffData.pendingActivation}</div>
          <div className="text-[10px] text-muted-foreground">待激活</div>
        </div>
      </div>

      <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
        <CardContent className="p-0">
          <div 
            className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2"
            onClick={handleComingSoon}
          >
            <div className="w-10 h-10 rounded-xl bg-[#38B03B] flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">添加新员工</div>
              <div className="text-xs text-muted-foreground">生成邀请二维码邀请员工加入</div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">员工列表</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px]">全部</Badge>
              <Badge variant="secondary" className="text-[10px]">运营</Badge>
              <Badge variant="secondary" className="text-[10px]">核销</Badge>
            </div>
          </div>
          <div className="space-y-2">
            {staffData.staffList.map((staff) => (
              <div 
                key={staff.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                onClick={handleComingSoon}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="text-sm">{staff.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{staff.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {staff.role === 'operator' ? '运营' : '核销'}
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
                    {staff.status === 'active' ? '已激活' : '待激活'}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderOperationsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
          <div className="text-xl font-bold text-blue-600">{operationsData.todayOrders}</div>
          <div className="text-[10px] text-muted-foreground">今日订单</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
          <div className="text-xl font-bold text-amber-600">{operationsData.pendingOrders}</div>
          <div className="text-[10px] text-muted-foreground">待核销</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
          <div className="text-xl font-bold text-green-600">{operationsData.todayVerified}</div>
          <div className="text-[10px] text-muted-foreground">已核销</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
          <div className="text-xl font-bold text-purple-600">{operationsData.activeCampaigns}</div>
          <div className="text-[10px] text-muted-foreground">活动中</div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">今日订单</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              全部订单 <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {operationsData.orders.map((order) => (
              <div 
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                onClick={handleComingSoon}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{order.product}</span>
                    <Badge 
                      variant={order.status === 'verified' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {order.status === 'verified' ? '已核销' : '待核销'}
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
              <span className="text-sm font-semibold">进行中活动</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              管理活动 <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {operationsData.campaigns.map((campaign) => (
              <div 
                key={campaign.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                onClick={handleComingSoon}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{campaign.name}</div>
                  <div className="text-[10px] text-muted-foreground">剩余 {campaign.remaining}/{campaign.total} 份</div>
                </div>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#38B03B]" 
                    style={{ width: `${(campaign.remaining / campaign.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium">活动日历</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium">营业设置</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">账户余额</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-white/80 hover:text-white hover:bg-white/20 h-auto p-1"
              onClick={handleComingSoon}
            >
              提现 <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-3xl font-bold mb-2">¥{assetsData.accountBalance.toLocaleString()}</div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="opacity-70">本月收入</span>
              <span className="ml-1 font-medium">¥{assetsData.monthlyRevenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="opacity-70">本月支出</span>
              <span className="ml-1 font-medium">¥{assetsData.monthlyExpense.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={() => navigate('/merchant/products')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">商品库</span>
            </div>
            <div className="text-2xl font-bold">{assetsData.totalProducts}</div>
            <div className="text-xs text-muted-foreground">在售 {assetsData.activeProducts} 件</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">活动库</span>
            </div>
            <div className="text-2xl font-bold">{assetsData.activeCampaigns}</div>
            <div className="text-xs text-muted-foreground">进行中活动</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">热门商品</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={() => navigate('/merchant/products')}>
              全部商品 <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {assetsData.products.map((product) => (
              <div 
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                onClick={handleComingSoon}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="text-[10px] text-muted-foreground">销量 {product.sales} · 库存 {product.stock}</div>
                </div>
                <div className="text-sm font-semibold">¥{product.price}</div>
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
              <span className="text-sm font-semibold">最近收支</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              全部记录 <ChevronRight className="w-3 h-3" />
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
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">今日营业额</span>
            <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>+10.2%</span>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">¥{dataStats.todayRevenue.toLocaleString()}</div>
          <div className="text-xs opacity-70">昨日 ¥{dataStats.yesterdayRevenue.toLocaleString()}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="text-lg font-bold">{dataStats.todayOrders}</div>
          <div className="text-[10px] text-muted-foreground">今日订单</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="text-lg font-bold">{dataStats.todayCustomers}</div>
          <div className="text-[10px] text-muted-foreground">今日顾客</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="text-lg font-bold">¥{dataStats.avgOrderValue}</div>
          <div className="text-[10px] text-muted-foreground">客单价</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <div className="text-lg font-bold">{dataStats.conversionRate}%</div>
          <div className="text-[10px] text-muted-foreground">转化率</div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">时段分布</span>
            </div>
            <span className="text-[10px] text-muted-foreground">今日订单</span>
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

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#38B03B]" />
              <span className="text-sm font-semibold">热销排行</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
              详细报表 <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-3">
            {dataStats.topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="text-[10px] text-muted-foreground">销量 {product.sales}</div>
                </div>
                <div className="text-sm font-semibold text-[#38B03B]">¥{product.revenue}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon}>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-[#38B03B]">¥{dataStats.weeklyRevenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">本周营业额</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon}>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-[#38B03B]">¥{dataStats.monthlyRevenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">本月营业额</div>
          </CardContent>
        </Card>
      </div>

      <Card className="cursor-pointer hover-elevate" onClick={handleComingSoon}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-medium">查看完整报表</div>
              <div className="text-xs text-muted-foreground">日报/周报/月报</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/merchant/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold flex-1" data-testid="text-page-title">{t('merchant.operations')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="staff" className="text-xs gap-1">
              <Users className="w-3.5 h-3.5" />
              员工
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              运营
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs gap-1">
              <Package className="w-3.5 h-3.5" />
              资产
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              数据
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
