import { useEffect } from "react";
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
import StaffCampaign from "@/pages/user/StaffCampaign";
import CampaignDetail from "@/pages/user/CampaignDetail";
import MyCoupons from "@/pages/user/MyCoupons";
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
      <Route path="/" component={() => <Redirect to="/campaign/1" />} />
      <Route path="/campaign/:id" component={CampaignDetail} />
      <Route path="/my-coupons" component={MyCoupons} />
      <Route path="/admin" component={() => <Redirect to="/admin/login" />} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/staff/bind" component={StaffBind} />
      <Route path="/staff/redeem" component={StaffRedeem} />
      <Route path="/staff/stats" component={StaffStats} />
      <Route path="/staff/campaign" component={StaffCampaign} />
      <Route path="/admin/:rest*">
        <ProtectedAdminRoutes />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// 【修复】全局标志，确保LIFF只初始化一次（即使App组件被多次挂载）
let liffInitialized = false;
let liffInitializing = false;

function App() {
  useEffect(() => {
    console.log('[App] App组件挂载 at', new Date().toISOString());
    
    // Initialize LIFF (once globally, only initialization, no auto-login)
    const initLiff = async () => {
      // 【修复】如果已经初始化或正在初始化，直接跳过
      if (liffInitialized || liffInitializing) {
        console.log('[App] LIFF已初始化或正在初始化，跳过重复初始化');
        return;
      }

      liffInitializing = true;
      console.log('[App] 开始初始化LIFF at', new Date().toISOString());
      
      try {
        console.log('[App] 准备请求 /api/config');
        const response = await fetch('/api/config');
        console.log('[App] /api/config 请求完成');
        const data = await response.json();
        
        if (data.success && data.data.liffId && (window as any).liff) {
          // 检查LIFF是否已经初始化（通过_liff._init私有属性）
          const liff = (window as any).liff;
          const alreadyInit = liff._liff && liff._liff._init;
          
          if (!alreadyInit) {
            console.log('[App] LIFF未初始化，开始初始化');
            await liff.init({ liffId: data.data.liffId });
            console.log('[App] LIFF初始化成功');
          } else {
            console.log('[App] LIFF已初始化，跳过');
          }
          liffInitialized = true;
        }
      } catch (error) {
        console.error('[App] LIFF初始化失败:', error);
      } finally {
        liffInitializing = false;
      }
    };

    initLiff();

    return () => {
      console.log('[App] App组件卸载 at', new Date().toISOString());
    };
  }, []);

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
