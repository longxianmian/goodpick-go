import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserBottomNavProps {
  className?: string;
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

export function UserBottomNav({ className = '' }: UserBottomNavProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  
  const navItems = [
    {
      key: 'feed',
      path: '/',
      Icon: EyeIcon,
      label: t('bottomNav.feed'),
    },
    {
      key: 'discover',
      path: '/shop',
      Icon: StarIcon,
      label: t('bottomNav.discover'),
    },
    {
      key: 'me',
      path: '/me',
      Icon: PersonIcon,
      label: t('bottomNav.me'),
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location === '/' || location.startsWith('/campaign/');
    }
    return location === path || location.startsWith(path + '/');
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border ${className}`}
      data-testid="nav-user-bottom"
    >
      <div className="flex items-center justify-around h-12 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.Icon;
          
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                active
                  ? 'text-[#38B03B]'
                  : 'text-muted-foreground'
              }`}
              data-testid={`nav-${item.key}`}
            >
              <Icon className={`w-5 h-5 mb-0.5`} />
              <span className={`text-sm font-semibold`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}

export default UserBottomNav;
