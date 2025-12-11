import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserBottomNavProps {
  className?: string;
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

export function UserBottomNav({ className = '' }: UserBottomNavProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  
  const navItems = [
    {
      key: 'liaoliao',
      path: '/liaoliao',
      Icon: ChatBubbleIcon,
      label: t('bottomNav.liaoliao'),
    },
    {
      key: 'feed',
      path: '/',
      Icon: EyeCircleIcon,
      label: t('bottomNav.feed'),
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
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.Icon;
          
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
