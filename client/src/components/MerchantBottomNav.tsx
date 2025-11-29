import { Link, useLocation } from 'wouter';
import { Home, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function MerchantBottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { href: '/merchant', icon: Home, label: t('merchant.home') },
    { href: '/merchant/operations', icon: Settings, label: t('merchant.operations') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t" data-testid="merchant-bottom-nav">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== '/merchant' && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[80px] transition-colors ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`nav-${item.href.replace('/merchant', 'merchant').replace('/', '-')}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
