import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ChevronRight, Ticket, Settings, HelpCircle, Info, User, LogIn, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken, logoutUser } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const isLoggedIn = !!userToken && !!user;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      
      const data = await response.json();
      
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast({
          title: t('login.failed'),
          description: data.message || t('common.error'),
          variant: 'destructive',
        });
        setIsLoggingIn(false);
      }
    } catch (error: any) {
      console.error('[UserCenter] LINE OAuth init failed:', error);
      toast({
        title: t('login.failed'),
        description: error.message || t('common.error'),
        variant: 'destructive',
      });
      setIsLoggingIn(false);
    }
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

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-center h-12 px-4">
          <h1 className="text-base font-semibold" data-testid="text-page-title">{t('userCenter.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-3 max-w-lg mx-auto">
        <Card className="mb-3">
          <CardContent className="p-4">
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
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium" data-testid="text-user-name">
                      {user?.displayName || 'User'}
                    </span>
                    <div className="text-[11px] text-muted-foreground">{t('profile.boundLine')}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('profile.logout')}
                </Button>
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
                    disabled={isLoggingIn}
                    className="mb-1" 
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {isLoggingIn ? t('common.loading') : t('userCenter.login')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
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
