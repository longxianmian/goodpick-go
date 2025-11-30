import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, UserRoleType } from '@/contexts/AuthContext';
import { ScanLine, Info, User, Home, Settings, BarChart3, Shield, Upload, Megaphone } from 'lucide-react';

interface NavItem {
  key: string;
  path: string;
  icon: typeof User;
  labelKey: string;
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18.9 8.1 13.5 4.2 9.7l5.4-.8z" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="10" r="3.2" />
      <path d="M5.5 19.5a6.5 6.5 0 0113 0" />
    </svg>
  );
}

const roleNavConfigs: Record<UserRoleType, { items: NavItem[], activePath: (location: string) => string }> = {
  consumer: {
    items: [
      { key: 'feed', path: '/', icon: EyeIcon as any, labelKey: 'bottomNav.feed' },
      { key: 'discover', path: '/shop', icon: StarIcon as any, labelKey: 'bottomNav.discover' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/' || location.startsWith('/campaign/')) return '/';
      if (location === '/shop' || location.startsWith('/shop/')) return '/shop';
      if (location === '/me' || location.startsWith('/me/') || location.startsWith('/my-')) return '/me';
      return location;
    }
  },
  owner: {
    items: [
      { key: 'merchantHome', path: '/merchant', icon: Home, labelKey: 'roleNav.merchantHome' },
      { key: 'operations', path: '/merchant/operations', icon: BarChart3, labelKey: 'roleNav.operationData' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/merchant') return '/merchant';
      if (location.startsWith('/merchant/operations')) return '/merchant/operations';
      if (location === '/me' || location.startsWith('/me/')) return '/me';
      return location;
    }
  },
  operator: {
    items: [
      { key: 'merchantHome', path: '/merchant', icon: Home, labelKey: 'roleNav.merchantHome' },
      { key: 'operations', path: '/merchant/operations', icon: Settings, labelKey: 'roleNav.operationManage' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/merchant') return '/merchant';
      if (location.startsWith('/merchant/operations')) return '/merchant/operations';
      if (location === '/me' || location.startsWith('/me/')) return '/me';
      return location;
    }
  },
  verifier: {
    items: [
      { key: 'redeem', path: '/staff/redeem', icon: ScanLine, labelKey: 'roleNav.redeem' },
      { key: 'campaign', path: '/staff/campaign', icon: Info, labelKey: 'roleNav.campaignInfo' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location.startsWith('/staff/redeem')) return '/staff/redeem';
      if (location.startsWith('/staff/campaign')) return '/staff/campaign';
      if (location === '/me' || location.startsWith('/me/')) return '/me';
      return location;
    }
  },
  sysadmin: {
    items: [
      { key: 'shuashuaOps', path: '/admin/shuashua-ops', icon: EyeIcon as any, labelKey: 'roleNav.shuashuaOps' },
      { key: 'discoverOps', path: '/admin/discover-ops', icon: StarIcon as any, labelKey: 'roleNav.discoverOps' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location.startsWith('/admin/shuashua-ops')) return '/admin/shuashua-ops';
      if (location.startsWith('/admin/discover-ops')) return '/admin/discover-ops';
      if (location === '/me' || location.startsWith('/me/')) return '/me';
      return location;
    }
  },
  creator: {
    // 刷刷号（自媒体人）使用与消费者相同的底部导航：刷刷 | 发现 | 我的
    items: [
      { key: 'feed', path: '/', icon: EyeIcon as any, labelKey: 'bottomNav.feed' },
      { key: 'discover', path: '/shop', icon: StarIcon as any, labelKey: 'bottomNav.discover' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/' || location.startsWith('/campaign/')) return '/';
      if (location === '/shop' || location.startsWith('/shop/')) return '/shop';
      if (location === '/me' || location.startsWith('/me/') || location.startsWith('/my-')) return '/me';
      return location;
    }
  },
};

interface RoleAwareBottomNavProps {
  className?: string;
  forceRole?: UserRoleType;
}

export function RoleAwareBottomNav({ className = '', forceRole }: RoleAwareBottomNavProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { activeRole } = useAuth();
  
  const currentRole = forceRole || activeRole;
  const config = roleNavConfigs[currentRole];
  const activeNavPath = config.activePath(location);

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border ${className}`}
      data-testid="nav-role-aware-bottom"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {config.items.map((item) => {
          const active = activeNavPath === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-[#38B03B]'
                  : 'text-muted-foreground'
              }`}
              data-testid={`nav-${item.key}`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-sm font-semibold">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}

export default RoleAwareBottomNav;
