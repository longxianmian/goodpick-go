import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft,
  LayoutDashboard,
  Users,
  Store,
  FileText,
  Video,
  Shield,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

import { OpsDashboard } from './modules/OpsDashboard';
import { OpsMerchants } from './modules/OpsMerchants';
import { OpsContent } from './modules/OpsContent';
import { OpsUsers } from './modules/OpsUsers';

type OpsModule = 'dashboard' | 'merchants' | 'content' | 'users' | 'settings';

interface NavItem {
  id: OpsModule;
  icon: typeof LayoutDashboard;
  label: string;
  badge?: number;
}

export default function OpsCenter() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, logoutUser } = useAuth();
  const [activeModule, setActiveModule] = useState<OpsModule>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: '数据看板' },
    { id: 'merchants', icon: Store, label: '商户管理', badge: 3 },
    { id: 'content', icon: Video, label: '内容审核', badge: 12 },
    { id: 'users', icon: Users, label: '用户管理' },
    { id: 'settings', icon: Settings, label: '系统配置' },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <OpsDashboard />;
      case 'merchants':
        return <OpsMerchants />;
      case 'content':
        return <OpsContent />;
      case 'users':
        return <OpsUsers />;
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>系统配置模块开发中...</p>
            </div>
          </div>
        );
      default:
        return <OpsDashboard />;
    }
  };

  const handleNavClick = (moduleId: OpsModule) => {
    setActiveModule(moduleId);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#38B03B] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-sm">刷刷运营中心</h1>
                  <p className="text-xs text-muted-foreground">Operations Center</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 py-4">
            <div className="px-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                    transition-colors
                    ${activeModule === item.id 
                      ? 'bg-[#38B03B]/10 text-[#38B03B] font-medium' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                  data-testid={`nav-${item.id}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0 min-w-[20px] h-5">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="px-3 space-y-1">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                data-testid="nav-notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="flex-1 text-left">系统通知</span>
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 min-w-[20px] h-5">
                  5
                </Badge>
              </button>
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#38B03B]/10 text-[#38B03B]">
                  {user?.displayName?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.displayName || '管理员'}</p>
                <p className="text-xs text-muted-foreground">系统管理员</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setLocation('/me')}
                data-testid="button-back-me"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logoutUser();
                  setLocation('/');
                }}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-toggle-sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <h2 className="font-semibold">
              {navItems.find(item => item.id === activeModule)?.label || '数据看板'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
