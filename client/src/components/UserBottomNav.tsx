import { Link, useLocation } from 'wouter';
import { Sparkles, ShoppingBag, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserBottomNavProps {
  className?: string;
}

export function UserBottomNav({ className = '' }: UserBottomNavProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  
  const navItems = [
    {
      key: 'shuashua',
      path: '/',
      icon: Sparkles,
      label: t('bottomNav.shuashua'),
    },
    {
      key: 'shop',
      path: '/shop',
      icon: ShoppingBag,
      label: t('bottomNav.shop'),
    },
    {
      key: 'me',
      path: '/me',
      icon: User,
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
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`nav-${item.key}`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className={`text-xs ${active ? 'font-medium' : ''}`}>
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
