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
