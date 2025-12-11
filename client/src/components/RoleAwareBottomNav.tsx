import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, UserRoleType } from '@/contexts/AuthContext';
import { ScanLine, Info, User, Home, Settings, BarChart3, Shield, Upload, Megaphone, ShoppingBag, Calendar, Store } from 'lucide-react';

interface NavItem {
  key: string;
  path: string;
  icon: typeof User;
  labelKey: string;
}

function ChatBubbleIcon({ className }: { className?: string }) {
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
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function EyeCircleIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M6 12s2.5-3.5 6-3.5 6 3.5 6 3.5-2.5 3.5-6 3.5S6 12 6 12z" />
      <circle cx="12" cy="12" r="1.5" />
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

const roleNavConfigs: Record<UserRoleType, { items: NavItem[], activePath: (location: string) => string }> = {
  consumer: {
    items: [
      { key: 'liaoliao', path: '/liaoliao', icon: ChatBubbleIcon as any, labelKey: 'bottomNav.liaoliao' },
      { key: 'feed', path: '/', icon: EyeCircleIcon as any, labelKey: 'bottomNav.feed' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/liaoliao' || location.startsWith('/liaoliao/')) return '/liaoliao';
      if (location === '/' || location.startsWith('/campaign/') || location === '/shop' || location.startsWith('/shop/')) return '/';
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
      { key: 'storePreview', path: '/operator/preview', icon: Store, labelKey: 'roleNav.storePreview' },
      { key: 'operatorCenter', path: '/operator/center', icon: BarChart3, labelKey: 'roleNav.operatorCenter' },
      { key: 'me', path: '/operator/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location.startsWith('/operator/preview') || location.startsWith('/store/')) return '/operator/preview';
      if (location === '/operator/center' || location.startsWith('/operator/products') || location.startsWith('/operator/campaigns') || location.startsWith('/operator/design') || location.startsWith('/operator/video') || location.startsWith('/operator/channels')) return '/operator/center';
      if (location === '/operator/me') return '/operator/me';
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
      { key: 'shuashuaOps', path: '/ops/shuashua', icon: EyeCircleIcon as any, labelKey: 'roleNav.shuashuaOps' },
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
      { key: 'liaoliao', path: '/liaoliao', icon: ChatBubbleIcon as any, labelKey: 'bottomNav.liaoliao' },
      { key: 'feed', path: '/', icon: EyeCircleIcon as any, labelKey: 'bottomNav.feed' },
      { key: 'me', path: '/me', icon: PersonIcon as any, labelKey: 'bottomNav.me' },
    ],
    activePath: (location: string) => {
      if (location === '/liaoliao' || location.startsWith('/liaoliao/')) return '/liaoliao';
      if (location === '/' || location.startsWith('/campaign/') || location === '/shop' || location.startsWith('/shop/')) return '/';
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
