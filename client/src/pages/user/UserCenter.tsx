import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ChevronRight, Ticket, Settings, HelpCircle, Info, User, LogIn, ShoppingCart, ClipboardList, Coins, Wallet, LogOut, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StoreRole {
  storeId: number;
  storeName: string;
  storeImageUrl: string | null;
  role: 'owner' | 'operator' | 'verifier';
}

interface RolesResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      displayName: string | null;
      avatarUrl: string | null;
    };
    roles: StoreRole[];
  };
}

type ShoppingTab = 'cart' | 'orders' | 'points' | 'wallet';
type IdentityType = 'shua' | 'discover';

function MenuItem({ 
  icon: Icon, 
  label, 
  href, 
  onClick 
}: { 
  icon: typeof Ticket; 
  label: string; 
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between py-3 px-1 hover-elevate active-elevate-2 cursor-pointer rounded-md">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return <div onClick={onClick}>{content}</div>;
}

function MenuSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        {title && (
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">{title}</h3>
        )}
        <div className="divide-y divide-border">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function CartContent({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{t('profile.cart.groupByStore')}</div>
      {[1, 2].map((store) => (
        <div key={store} className="bg-card rounded-xl p-3 space-y-2 border">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-medium text-sm">{t('profile.cart.storeName', { num: String(store) })}</div>
            <button className="text-xs text-primary">{t('profile.cart.visitStore')}</button>
          </div>
          {[1, 2].map((item) => (
            <div key={item} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div>
                  <div className="text-xs">{t('profile.cart.itemName', { num: String(item) })}</div>
                  <div className="text-[11px] text-muted-foreground">{t('profile.cart.itemSpec')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs">{t('common.currencySymbol')}399</div>
                <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                  <button className="px-1.5 rounded-full border" data-testid={`button-decrease-${store}-${item}`}>-</button>
                  <span>1</span>
                  <button className="px-1.5 rounded-full border" data-testid={`button-increase-${store}-${item}`}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function OrdersContent({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  const orderTabs = [
    t('profile.orders.all'),
    t('profile.orders.pending'),
    t('profile.orders.toUse'),
    t('profile.orders.completed'),
    t('profile.orders.refund'),
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {orderTabs.map((s, idx) => (
          <div
            key={s}
            className={`px-3 py-1 rounded-full whitespace-nowrap ${idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {s}
          </div>
        ))}
      </div>
      {[1, 2, 3].map((o) => (
        <div key={o} className="bg-card rounded-xl p-3 space-y-2 border">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{t('profile.cart.storeName', { num: String(o) })}</span>
            <span className="text-orange-500">{t('profile.orders.statusCompleted')}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div>
                <div className="text-xs">{t('profile.orders.packageName')}</div>
                <div className="text-[11px] text-muted-foreground">{t('profile.orders.itemCount', { count: '3' })}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs">{t('profile.orders.paid')} {t('common.currencySymbol')}1,288</div>
              <div className="text-[11px] text-muted-foreground">2025-11-28 19:30</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 text-[11px] mt-1">
            <button className="px-3 py-1 rounded-full border" data-testid={`button-rebuy-${o}`}>
              {t('profile.orders.rebuy')}
            </button>
            <button className="px-3 py-1 rounded-full border" data-testid={`button-detail-${o}`}>
              {t('profile.orders.viewDetail')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PointsContent({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl p-3 text-white flex justify-between items-center">
        <div>
          <div className="text-xs opacity-80">{t('profile.points.platformPoints')}</div>
          <div className="text-xl font-semibold">12,680</div>
        </div>
        <button className="px-3 py-1 rounded-full bg-white/15 text-xs" data-testid="button-points-exchange">
          {t('profile.points.exchangeZone')}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">{t('profile.points.storePoints')}</div>
        {[1, 2, 3].map((s) => (
          <div key={s} className="bg-card rounded-xl p-3 flex items-center justify-between border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted" />
              <div>
                <div className="text-xs">{t('profile.cart.storeName', { num: String(s) })}</div>
                <div className="text-[11px] text-muted-foreground">{t('profile.points.memberLevel')}</div>
              </div>
            </div>
            <div className="text-right text-xs">
              <div>{t('profile.points.points')} 3,28{s}</div>
              <div className="text-[11px] text-emerald-500">{t('profile.points.viewDetail')}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="text-muted-foreground">{t('profile.points.myCoupons')}</div>
          <div className="flex gap-2 text-[11px] text-muted-foreground">
            <span className="text-emerald-500">{t('profile.points.available')}</span>
            <span>{t('profile.points.used')}</span>
            <span>{t('profile.points.expired')}</span>
          </div>
        </div>
        {[1, 2].map((c) => (
          <div key={c} className="bg-card rounded-xl p-3 flex items-center justify-between border">
            <div className="space-y-1 text-xs">
              <div>{t('profile.points.couponName')}</div>
              <div className="text-[11px] text-orange-500">{t('profile.points.couponDiscount')}</div>
              <div className="text-[11px] text-muted-foreground">{t('profile.points.couponStore', { num: String(c) })}</div>
            </div>
            <div className="text-right text-[11px]">
              <div>{t('profile.points.remaining', { count: '2' })}</div>
              <div className="text-muted-foreground">{t('profile.points.validUntil')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletContent({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl p-3 flex items-center justify-between border">
        <div>
          <div className="text-xs text-muted-foreground">{t('profile.wallet.balance')}</div>
          <div className="text-xl font-semibold">{t('common.currencySymbol')} 528.00</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{t('profile.wallet.vouchers', { count: '3' })}</div>
          <div className="text-emerald-500 mt-1">{t('profile.wallet.viewDetail')}</div>
        </div>
      </div>
      <div className="bg-card rounded-xl p-3 border">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs">{t('profile.wallet.transactions')}</div>
          <div className="text-[11px] text-muted-foreground">{t('profile.wallet.last30Days')}</div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div>
                <div>{t('profile.wallet.cashback')}</div>
                <div className="text-[11px] text-muted-foreground">2025-11-2{i} 20:15</div>
              </div>
              <div className={i % 2 === 0 ? 'text-emerald-500' : 'text-muted-foreground'}>
                {i % 2 === 0 ? `+ ${t('common.currencySymbol')}30.00` : `- ${t('common.currencySymbol')}399.00`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembershipCards({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-sm font-medium">{t('profile.membership.title')}</div>
          <button className="text-xs text-muted-foreground" data-testid="button-membership-more">
            {t('common.more')}
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="min-w-[180px] h-28 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-white p-3 flex flex-col justify-between flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20" />
                <div className="text-xs font-semibold">
                  {t('profile.cart.storeName', { num: String(i) })}
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 text-xs">
                <div>
                  <div className="text-[11px] opacity-80 mb-1">{t('profile.membership.platinum')}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="opacity-80">{t('profile.points.points')}</span>
                    <span className="text-lg font-semibold">3,28{i}</span>
                  </div>
                </div>
                <div className="text-right opacity-80 text-[11px]">
                  {t('profile.membership.recommend')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ShoppingSection({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  const [tab, setTab] = useState<ShoppingTab>('cart');

  const tabs: { key: ShoppingTab; label: string; icon: typeof ShoppingCart }[] = [
    { key: 'cart', label: t('profile.shopping.cart'), icon: ShoppingCart },
    { key: 'orders', label: t('profile.shopping.orders'), icon: ClipboardList },
    { key: 'points', label: t('profile.shopping.pointsCoupons'), icon: Coins },
    { key: 'wallet', label: t('profile.shopping.wallet'), icon: Wallet },
  ];

  const renderContent = () => {
    switch (tab) {
      case 'cart':
        return <CartContent t={t} />;
      case 'orders':
        return <OrdersContent t={t} />;
      case 'points':
        return <PointsContent t={t} />;
      case 'wallet':
        return <WalletContent t={t} />;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-2">
        <div className="flex mb-2 gap-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === item.key
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-500'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setTab(item.key)}
              data-testid={`tab-${item.key}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="border-t pt-3 text-xs">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken, logoutUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [identity, setIdentity] = useState<IdentityType>('shua');
  
  const isLoggedIn = !!userToken && !!user;
  
  const { data: rolesData } = useQuery<RolesResponse>({
    queryKey: ['/api/me/roles'],
    enabled: isLoggedIn,
  });

  const roles = rolesData?.data?.roles || [];

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({
        title: t('profile.logoutSuccess'),
        description: t('profile.logoutSuccessDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleIdentity = () => {
    setIdentity(prev => prev === 'shua' ? 'discover' : 'shua');
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-base font-semibold" data-testid="text-page-title">{t('userCenter.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-3 max-w-lg mx-auto">
        <Card className="mb-3">
          <CardContent className="p-3">
            {authPhase === 'booting' ? (
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : isLoggedIn ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 cursor-pointer">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium cursor-pointer" data-testid="text-user-name">
                        {user?.displayName || 'User'}
                      </span>
                      <button
                        className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground flex items-center gap-1"
                        onClick={toggleIdentity}
                        data-testid="button-toggle-identity"
                      >
                        <span>{identity === 'shua' ? t('profile.shuaId') : t('profile.discoverId')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t('profile.boundLine')}</div>
                  </div>
                </div>
                <button 
                  className="text-[11px] text-muted-foreground"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  {t('profile.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 bg-muted">
                  <AvatarFallback>
                    <User className="w-6 h-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Button 
                    onClick={handleLogin} 
                    className="mb-1" 
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {t('userCenter.login')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    {t('userCenter.loginHint')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoggedIn && (
          <>
            <MembershipCards t={t} />
            <ShoppingSection t={t} />
          </>
        )}

        <MenuSection>
          <MenuItem 
            icon={Ticket} 
            label={t('userCenter.myCoupons')} 
            href="/my-coupons"
          />
        </MenuSection>

        <MenuSection title={t('userCenter.settings')}>
          <MenuItem 
            icon={Settings} 
            label={t('userCenter.language')} 
            href="/settings/language"
          />
          <MenuItem 
            icon={HelpCircle} 
            label={t('userCenter.help')} 
            href="/help"
          />
          <MenuItem 
            icon={Info} 
            label={t('userCenter.about')} 
            href="/about"
          />
        </MenuSection>
      </main>

      <UserBottomNav />
    </div>
  );
}
