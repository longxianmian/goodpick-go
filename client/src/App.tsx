import { useEffect, useState } from "react";
import { Switch, Route, Redirect, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminStores from "@/pages/admin/AdminStores";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import StaffBind from "@/pages/user/StaffBind";
import StaffRedeem from "@/pages/user/StaffRedeem";
import StaffStats from "@/pages/user/StaffStats";
import StaffCampaignList from "@/pages/user/StaffCampaignList";
import StaffCampaignDetail from "@/pages/user/StaffCampaignDetail";
import CampaignDetail from "@/pages/user/CampaignDetail";
import ProductDetail from "@/pages/user/ProductDetail";
import MyCoupons from "@/pages/user/MyCoupons";
import ShuaShuaHome from "@/pages/user/ShuaShuaHome";
import RoleBasedMe from "@/pages/user/RoleBasedMe";
import UserCenter from "@/pages/user/UserCenter";
import MeOwner from "@/pages/user/MeOwner";
import MeOperator from "@/pages/user/MeOperator";
import MeVerifier from "@/pages/user/MeVerifier";
import MeSysAdmin from "@/pages/user/MeSysAdmin";
import CreatorHome from "@/pages/creator/CreatorHome";
import CreatorStudio from "@/pages/creator/CreatorStudio";
import CreatorAccount from "@/pages/creator/CreatorAccount";
import CreatorAnalytics from "@/pages/creator/CreatorAnalytics";
import ContentEditor from "@/pages/creator/ContentEditor";
import IncomeRecords from "@/pages/creator/IncomeRecords";
import PaymentSettings from "@/pages/creator/PaymentSettings";
import CreatorNotifications from "@/pages/creator/CreatorNotifications";
import AccountSecurity from "@/pages/creator/AccountSecurity";
import DevLogin from "@/pages/dev/DevLogin";
import ShortVideoFeed from "@/pages/short-video/ShortVideoFeed";
import ArticleDetail from "@/pages/user/ArticleDetail";
import UserProfile from "@/pages/user/UserProfile";
import LanguageSettings from "@/pages/user/LanguageSettings";
import SettingsPage from "@/pages/user/SettingsPage";
import HelpPage from "@/pages/user/HelpPage";
import AboutPage from "@/pages/user/AboutPage";
import ApplyDiscover from "@/pages/user/ApplyDiscover";
import ApplyShuashua from "@/pages/user/ApplyShuashua";
import MerchantHome from "@/pages/merchant/MerchantHome";
import MerchantOperations from "@/pages/merchant/MerchantOperations";
import MerchantStoreSettings from "@/pages/merchant/MerchantStoreSettings";
import MerchantStoreEdit from "@/pages/merchant/MerchantStoreEdit";
import MerchantStoreCreate from "@/pages/merchant/MerchantStoreCreate";
import MerchantProducts from "@/pages/merchant/MerchantProducts";
import MerchantProductEdit from "@/pages/merchant/MerchantProductEdit";
import MerchantCampaigns from "@/pages/merchant/MerchantCampaigns";
import MerchantCampaignEdit from "@/pages/merchant/MerchantCampaignEdit";
import MerchantPaymentQrCode from "@/pages/merchant/MerchantPaymentQrCode";
import MerchantPspSetup from "@/pages/merchant/MerchantPspSetup";
import MerchantVouchers from "@/pages/merchant/MerchantVouchers";
import MerchantOrders from "@/pages/merchant/MerchantOrders";
import MerchantPackages from "@/pages/merchant/MerchantPackages";
import StoreFront from "@/pages/user/StoreFront";
import Checkout from "@/pages/user/Checkout";
import AdminPaymentSettings from "@/pages/admin/AdminPaymentSettings";
import PaymentPage from "@/pages/user/PaymentPage";
import PaymentSuccess from "@/pages/user/PaymentSuccess";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import OpsCenter from "@/pages/ops/OpsCenter";
import OpsShuashua from "@/pages/ops/OpsShuashua";
import OpsDiscover from "@/pages/ops/OpsDiscover";
import OperatorCenter from "@/pages/operator/OperatorCenter";
import OperatorPreview from "@/pages/operator/OperatorPreview";
import PayEntryPage from "@/pages/payment/PayEntryPage";
import PaySuccessPage from "@/pages/payment/PaySuccessPage";
import LiaoliaoChatList from "@/pages/liaoliao/ChatList";
import LiaoliaoChatDetail from "@/pages/liaoliao/ChatDetail";
import LiaoliaoAiChat from "@/pages/liaoliao/AiChat";
import SuperContacts from "@/pages/user/SuperContacts";
import PhoneImport from "@/pages/user/PhoneImport";
import InviteLanding from "@/pages/user/InviteLanding";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger } from "@/components/ui/sidebar";
import { Store, Tag, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logoutAdmin, admin } = useAuth();
  const { t } = useLanguage();
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>GoodPick Go Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === '/admin/stores'}>
                      <Link href="/admin/stores" data-testid="link-stores">
                        <Store />
                        <span>{t('nav.stores')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === '/admin/campaigns'}>
                      <Link href="/admin/campaigns" data-testid="link-campaigns">
                        <Tag />
                        <span>{t('nav.campaigns')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === '/admin/dashboard'}>
                      <Link href="/admin/dashboard" data-testid="link-dashboard">
                        <LayoutDashboard />
                        <span>{t('nav.dashboard')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h2 className="text-lg font-semibold">{t('common.welcome')}, {admin?.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Button
                variant="outline"
                size="sm"
                data-testid="button-logout"
                onClick={logoutAdmin}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('common.logout')}
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedAdminRoutes() {
  const { isAdminAuthenticated, admin, isLoading } = useAuth();
  const [location] = useLocation();
  
  // 只在 /admin/* 路径下才执行守卫逻辑，防止生产环境构建顺序问题导致首页被重定向
  if (!location.startsWith('/admin/') && location !== '/admin') {
    return null;
  }
  
  // 登录页不需要验证
  if (location === '/admin/login') {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAdminAuthenticated || !admin) {
    return <Redirect to="/admin/login" />;
  }
  
  return (
    <AdminLayout>
      <Switch location={location}>
        <Route path="/admin/stores/:id/payment" component={AdminPaymentSettings} />
        <Route path="/admin/stores" component={AdminStores} />
        <Route path="/admin/campaigns" component={AdminCampaigns} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Redirect to="/admin/stores" />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* 公开页面 - 游客可访问 */}
      <Route path="/videos/:id" component={ShortVideoFeed} />
      <Route path="/videos" component={ShortVideoFeed} />
      <Route path="/articles/:id" component={ArticleDetail} />
      <Route path="/user/:id" component={UserProfile} />
      <Route path="/store/:id" component={StoreFront} />
      <Route path="/campaign/:id" component={CampaignDetail} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/settings/language" component={LanguageSettings} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/about" component={AboutPage} />
      
      {/* 开发环境 - 测试登录 */}
      <Route path="/dev/login" component={DevLogin} />
      
      {/* 支付公开页面 */}
      <Route path="/p/:qrToken" component={PayEntryPage} />
      <Route path="/success/:paymentId" component={PaySuccessPage} />
      
      {/* 聊聊模块 - 首页公开可见，聊天和添加好友需要登录 */}
      <Route path="/liaoliao" component={LiaoliaoChatList} />
      <Route path="/liaoliao/ai-chat" component={LiaoliaoAiChat} />
      <Route path="/liaoliao/chat/:friendId">
        {() => <ProtectedRoute><LiaoliaoChatDetail /></ProtectedRoute>}
      </Route>
      
      {/* ========== 超级通讯录 ========== */}
      <Route path="/super-contacts" component={SuperContacts} />
      <Route path="/super-contacts/phone-import" component={PhoneImport} />
      <Route path="/invite" component={InviteLanding} />
      
      {/* ========== 以下路由需要登录 ========== */}
      
      {/* 个人中心 - 需要登录 */}
      <Route path="/me">
        <ProtectedRoute><RoleBasedMe /></ProtectedRoute>
      </Route>
      <Route path="/my-coupons">
        <ProtectedRoute><MyCoupons /></ProtectedRoute>
      </Route>
      <Route path="/pay/:id/success">
        {(params) => <ProtectedRoute><PaymentSuccess /></ProtectedRoute>}
      </Route>
      <Route path="/pay/:id">
        {(params) => <ProtectedRoute><PaymentPage /></ProtectedRoute>}
      </Route>
      
      {/* 申请入驻 - 需要登录 */}
      <Route path="/apply/discover">
        <ProtectedRoute><ApplyDiscover /></ProtectedRoute>
      </Route>
      <Route path="/apply/shuashua">
        <ProtectedRoute><ApplyShuashua /></ProtectedRoute>
      </Route>
      
      {/* 系统管理员 - 需要登录 + sysadmin 角色 */}
      <Route path="/sysadmin">
        <ProtectedRoute requiredRole="sysadmin"><MeSysAdmin /></ProtectedRoute>
      </Route>
      <Route path="/ops">
        <ProtectedRoute requiredRole="sysadmin"><OpsCenter /></ProtectedRoute>
      </Route>
      <Route path="/ops/shuashua">
        <ProtectedRoute requiredRole="sysadmin"><OpsShuashua /></ProtectedRoute>
      </Route>
      <Route path="/ops/discover">
        <ProtectedRoute requiredRole="sysadmin"><OpsDiscover /></ProtectedRoute>
      </Route>
      
      {/* 创作者 - 需要登录 */}
      <Route path="/creator/edit/:id">
        {(params) => <ProtectedRoute><ContentEditor /></ProtectedRoute>}
      </Route>
      <Route path="/creator/create">
        <ProtectedRoute><CreatorStudio /></ProtectedRoute>
      </Route>
      <Route path="/creator/me">
        <ProtectedRoute><CreatorAccount /></ProtectedRoute>
      </Route>
      <Route path="/creator/analytics">
        <ProtectedRoute><CreatorAnalytics /></ProtectedRoute>
      </Route>
      <Route path="/creator/income-records">
        <ProtectedRoute><IncomeRecords /></ProtectedRoute>
      </Route>
      <Route path="/creator/payment">
        <ProtectedRoute><PaymentSettings /></ProtectedRoute>
      </Route>
      <Route path="/creator/notifications">
        <ProtectedRoute><CreatorNotifications /></ProtectedRoute>
      </Route>
      <Route path="/creator/security">
        <ProtectedRoute><AccountSecurity /></ProtectedRoute>
      </Route>
      <Route path="/creator">
        <ProtectedRoute><CreatorHome /></ProtectedRoute>
      </Route>
      
      {/* 商户端 - 需要登录 + owner 角色 */}
      <Route path="/merchant">
        <ProtectedRoute requiredRole="owner"><MerchantHome /></ProtectedRoute>
      </Route>
      <Route path="/merchant/operations">
        <ProtectedRoute requiredRole="owner"><MerchantOperations /></ProtectedRoute>
      </Route>
      <Route path="/merchant/store-settings">
        <ProtectedRoute requiredRole="owner"><MerchantStoreSettings /></ProtectedRoute>
      </Route>
      <Route path="/merchant/store-create">
        <ProtectedRoute requiredRole="owner"><MerchantStoreCreate /></ProtectedRoute>
      </Route>
      <Route path="/merchant/store-edit/:id">
        {(params) => <ProtectedRoute requiredRole="owner"><MerchantStoreEdit /></ProtectedRoute>}
      </Route>
      <Route path="/merchant/products">
        <ProtectedRoute requiredRole="owner"><MerchantProducts /></ProtectedRoute>
      </Route>
      <Route path="/merchant/products/:id">
        {(params) => <ProtectedRoute requiredRole="owner"><MerchantProductEdit /></ProtectedRoute>}
      </Route>
      <Route path="/merchant/campaigns">
        <ProtectedRoute requiredRole="owner"><MerchantCampaigns /></ProtectedRoute>
      </Route>
      <Route path="/merchant/campaigns/:id">
        {(params) => <ProtectedRoute requiredRole="owner"><MerchantCampaignEdit /></ProtectedRoute>}
      </Route>
      <Route path="/merchant/payment-qrcode">
        <ProtectedRoute requiredRole="owner"><MerchantPaymentQrCode /></ProtectedRoute>
      </Route>
      <Route path="/merchant/psp-setup">
        <ProtectedRoute requiredRole="owner"><MerchantPspSetup /></ProtectedRoute>
      </Route>
      <Route path="/merchant/vouchers">
        <ProtectedRoute requiredRole="owner"><MerchantVouchers /></ProtectedRoute>
      </Route>
      <Route path="/merchant/orders">
        <ProtectedRoute requiredRole="owner"><MerchantOrders /></ProtectedRoute>
      </Route>
      <Route path="/merchant/packages">
        <ProtectedRoute requiredRole="owner"><MerchantPackages /></ProtectedRoute>
      </Route>
      <Route path="/merchant/me">
        <ProtectedRoute requiredRole="owner"><MeOwner /></ProtectedRoute>
      </Route>
      
      {/* 运营号 - 需要登录 + operator 角色 */}
      <Route path="/operator/preview">
        <ProtectedRoute requiredRole="operator"><OperatorPreview /></ProtectedRoute>
      </Route>
      <Route path="/operator/center">
        <ProtectedRoute requiredRole="operator"><OperatorCenter /></ProtectedRoute>
      </Route>
      <Route path="/operator/products">
        <ProtectedRoute requiredRole="operator"><MerchantProducts /></ProtectedRoute>
      </Route>
      <Route path="/operator/campaigns">
        <ProtectedRoute requiredRole="operator"><MerchantCampaigns /></ProtectedRoute>
      </Route>
      <Route path="/operator/me">
        <ProtectedRoute requiredRole="operator"><MeOperator /></ProtectedRoute>
      </Route>
      
      {/* 核销员 - 需要登录 + verifier 角色 */}
      <Route path="/staff/bind">
        <ProtectedRoute requiredRole="verifier"><StaffBind /></ProtectedRoute>
      </Route>
      <Route path="/staff/redeem">
        <ProtectedRoute requiredRole="verifier"><StaffRedeem /></ProtectedRoute>
      </Route>
      <Route path="/staff/stats">
        <ProtectedRoute requiredRole="verifier"><StaffStats /></ProtectedRoute>
      </Route>
      <Route path="/staff/campaign/:id">
        {(params: { id: string }) => <ProtectedRoute requiredRole="verifier"><StaffCampaignDetail params={params} /></ProtectedRoute>}
      </Route>
      <Route path="/staff/campaign">
        <ProtectedRoute requiredRole="verifier"><StaffCampaignList /></ProtectedRoute>
      </Route>
      
      {/* 开发预览 - 需要登录 */}
      <Route path="/dev/me/consumer">
        <ProtectedRoute><UserCenter /></ProtectedRoute>
      </Route>
      <Route path="/dev/me/owner">
        <ProtectedRoute><MeOwner /></ProtectedRoute>
      </Route>
      <Route path="/dev/me/operator">
        <ProtectedRoute><MeOperator /></ProtectedRoute>
      </Route>
      <Route path="/dev/me/verifier">
        <ProtectedRoute><MeVerifier /></ProtectedRoute>
      </Route>
      <Route path="/dev/me/sysadmin">
        <ProtectedRoute><MeSysAdmin /></ProtectedRoute>
      </Route>
      <Route path="/dev/me/creator">
        <ProtectedRoute><CreatorAccount /></ProtectedRoute>
      </Route>
      
      {/* Admin 后台 */}
      <Route path="/admin" component={() => <Redirect to="/admin/login" />} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/:rest*">
        <ProtectedAdminRoutes />
      </Route>
      
      {/* 首页放在最后，避免匹配所有路径 */}
      <Route path="/" component={ShuaShuaHome} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    console.log('[App] App组件挂载 at', new Date().toISOString());
    
    let cancelled = false;

    // 【方案要求】只用最简单的 fetch 加载配置，只跑一次
    (async () => {
      try {
        const sessionId = (window as any).__GPGO_SESSION_ID__;
        const res = await fetch('/api/config', {
          headers: {
            'X-GPGO-Session': sessionId || 'unknown',
          },
        });
        const data = await res.json();
        
        if (!cancelled) {
          setConfig(data);

          // 【修改】不再在这里自动初始化 LIFF
          // LIFF 将在用户点击"立即领取"时按需初始化（见 CampaignDetail.tsx）
          console.log('[App] 配置加载完成，LIFF ID =', data.data?.liffId);
        }
      } catch (error) {
        console.error('[App] 加载配置失败:', error);
      }
    })();

    return () => {
      cancelled = true;
      console.log('[App] App组件卸载 at', new Date().toISOString());
    };
  }, []); // 【方案要求】空依赖，只跑一次

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
