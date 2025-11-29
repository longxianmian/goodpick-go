import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ChevronRight, Ticket, Store, QrCode, Settings, HelpCircle, Info, User, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

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

function RoleBadge({ role }: { role: 'owner' | 'operator' | 'verifier' }) {
  const { t } = useLanguage();
  
  const roleConfig = {
    owner: { label: t('userCenter.roleOwner'), variant: 'default' as const },
    operator: { label: t('userCenter.roleOperator'), variant: 'secondary' as const },
    verifier: { label: t('userCenter.roleVerifier'), variant: 'outline' as const },
  };
  
  const config = roleConfig[role];
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

function MenuItem({ 
  icon: Icon, 
  label, 
  href, 
  badge,
  onClick 
}: { 
  icon: typeof Ticket; 
  label: string; 
  href?: string;
  badge?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between py-3 px-1 hover-elevate active-elevate-2 cursor-pointer rounded-md">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return <div onClick={onClick}>{content}</div>;
}

function MenuSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
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

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken } = useAuth();
  const [, navigate] = useLocation();
  
  const isLoggedIn = !!userToken && !!user;
  
  const { data: rolesData, isLoading: rolesLoading } = useQuery<RolesResponse>({
    queryKey: ['/api/me/roles'],
    enabled: isLoggedIn,
  });

  const roles = rolesData?.data?.roles || [];
  const userInfo = rolesData?.data?.user;
  
  const hasOwnerRole = roles.some(r => r.role === 'owner');
  const hasOperatorRole = roles.some(r => r.role === 'operator');
  const hasVerifierRole = roles.some(r => r.role === 'verifier');
  const hasAnyRole = roles.length > 0;

  const handleLogin = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('userCenter.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Card className="mb-4">
          <CardContent className="p-4">
            {authPhase === 'booting' ? (
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={userInfo?.avatarUrl || user?.avatarUrl || undefined} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg" data-testid="text-user-name">
                    {userInfo?.displayName || user?.displayName || 'User'}
                  </h2>
                  {hasAnyRole && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {roles.slice(0, 3).map((r, idx) => (
                        <RoleBadge key={idx} role={r.role} />
                      ))}
                      {roles.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{roles.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Button onClick={handleLogin} className="mb-1" data-testid="button-login">
                    <LogIn className="w-4 h-4 mr-2" />
                    {t('userCenter.login')}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t('userCenter.loginHint')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MenuSection>
          <MenuItem 
            icon={Ticket} 
            label={t('userCenter.myCoupons')} 
            href="/my-coupons"
            data-testid="menu-my-coupons"
          />
        </MenuSection>

        {(hasAnyRole || isLoggedIn) && (
          <MenuSection title={t('userCenter.workstation')}>
            {(hasOwnerRole || hasOperatorRole) && (
              <MenuItem 
                icon={Store} 
                label={t('userCenter.merchantHome')} 
                href="/merchant"
                data-testid="menu-merchant-home"
              />
            )}
            {hasVerifierRole && (
              <MenuItem 
                icon={QrCode} 
                label={t('userCenter.staffRedeem')} 
                href="/staff/redeem"
                data-testid="menu-staff-redeem"
              />
            )}
          </MenuSection>
        )}

        <MenuSection title={t('userCenter.settings')}>
          <MenuItem 
            icon={Settings} 
            label={t('userCenter.language')} 
            href="/settings/language"
            data-testid="menu-language"
          />
          <MenuItem 
            icon={HelpCircle} 
            label={t('userCenter.help')} 
            href="/help"
            data-testid="menu-help"
          />
          <MenuItem 
            icon={Info} 
            label={t('userCenter.about')} 
            href="/about"
            data-testid="menu-about"
          />
        </MenuSection>
      </main>

      <UserBottomNav />
    </div>
  );
}
