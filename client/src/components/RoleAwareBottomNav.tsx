import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, UserRoleType } from '@/contexts/AuthContext';
import { ScanLine, Info, User, Home, Settings, BarChart3, Shield, Upload, Megaphone, ShoppingBag, Calendar } from 'lucide-react';

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
      { key: 'products', path: '/operator/products', icon: ShoppingBag, labelKey: 'roleNav.products' },
      { key: 'campaigns', path: '/operator/campaigns', icon: Calendar, labelKey: 'roleNav.campaigns' },
      { key: 'me', path: '/operator/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location.startsWith('/operator/products')) return '/operator/products';
      if (location.startsWith('/operator/campaigns')) return '/operator/campaigns';
      if (location === '/operator/me' || location.startsWith('/operator/')) return '/operator/me';
      return location;
    }
  },
  verifier: {
    items: [
      { key: 'redeem', path: '/staff/redeem', icon: ScanLine, labelKey: 'roleNav.redeem' },
      { key: 'campaign', path: '/staff/campaign', icon: Info, labelKey: 'roleNav.campaignInfo' },
      { key: 'me', path: '/staff/stats', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location.startsWith('/staff/redeem')) return '/staff/redeem';
      if (location.startsWith('/staff/campaign')) return '/staff/campaign';
      if (location === '/staff/stats' || location === '/verifier') return '/staff/stats';
      return location;
    }
  },
  sysadmin: {
    items: [
      { key: 'shuashuaOps', path: '/ops/shuashua', icon: EyeIcon as any, labelKey: 'roleNav.shuashuaOps' },
      { key: 'discoverOps', path: '/ops/discover', icon: StarIcon as any, labelKey: 'roleNav.discoverOps' },
      { key: 'me', path: '/sysadmin', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/ops/shuashua') return '/ops/shuashua';
      if (location === '/ops/discover') return '/ops/discover';
      if (location === '/sysadmin' || location === '/me' || location.startsWith('/me/')) return '/sysadmin';
      return location;
    }
  },
  creator: {
    // 刷刷号专属导航：账号首页（预览作品）| 创作中心（内容管理）| 我的（账号/收益/切换）
    items: [
      { key: 'creatorHome', path: '/creator', icon: Home, labelKey: 'roleNav.creatorHome' },
      { key: 'creatorCenter', path: '/creator/create', icon: Upload, labelKey: 'roleNav.creatorCenter' },
      { key: 'creatorMe', path: '/creator/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/creator') return '/creator';
      if (location.startsWith('/creator/create')) return '/creator/create';
      if (location.startsWith('/creator/me')) return '/creator/me';
      return location;
    }
  },
  member: {
    // 商户会员角色：与consumer一样使用刷刷发现平台，同时可以使用会员权益
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
