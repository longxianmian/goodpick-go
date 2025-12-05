import { useLocation } from 'wouter';
import { 
  User, 
  Store,
  Sparkles,
  Settings,
  HelpCircle,
  Info,
  Bell,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  X
} from 'lucide-react';
import { SiLine } from 'react-icons/si';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DrawerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItemProps {
  icon: typeof User;
  label: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  disabled?: boolean;
  onClick?: () => void;
}

function MenuItem({ icon: Icon, label, description, badge, badgeVariant = 'secondary', disabled, onClick }: MenuItemProps) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover-elevate active-elevate-2'
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-testid={`menu-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground truncate">{description}</div>
        )}
      </div>
      {badge && (
        <Badge variant={badgeVariant} className="text-[10px] flex-shrink-0">
          {badge}
        </Badge>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </div>
  );
}

export function DrawerMenu({ open, onOpenChange }: DrawerMenuProps) {
  const { t } = useLanguage();
  const { user, logoutUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const isLoggedIn = !!user;
  
  // TODO: 从真实用户数据获取身份状态
  // 未来需要从 /api/me/roles 或用户profile中获取 hasDiscoverId 和 hasShuaId
  // 当用户开通发现号/刷刷号后，这些值应该从后端返回
  const hasDiscoverId = false; // 待接入后端API
  const hasShuaId = false; // 待接入后端API

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const handleApplyDiscover = () => {
    if (hasDiscoverId) {
      toast({
        title: t('drawer.alreadyHasDiscover'),
        description: t('drawer.switchInMe'),
      });
      return;
    }
    handleNavigate('/apply/discover');
  };

  const handleApplyShua = () => {
    if (hasShuaId) {
      toast({
        title: t('drawer.alreadyHasShua'),
        description: t('drawer.switchInMe'),
      });
      return;
    }
    handleNavigate('/apply/shuashua');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      onOpenChange(false);
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

  const getIdentityStatus = () => {
    if (hasDiscoverId && hasShuaId) return t('drawer.identityBoth');
    if (hasDiscoverId) return t('drawer.identityDiscover');
    if (hasShuaId) return t('drawer.identityShua');
    return t('drawer.identityNormal');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{t('drawer.title')}</SheetTitle>
            <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            <SectionTitle>{t('drawer.section.account')}</SectionTitle>
            
            <MenuItem
              icon={User}
              label={t('drawer.myProfile')}
              description={isLoggedIn ? t('drawer.profileDesc') : t('drawer.loginRequired')}
              onClick={() => isLoggedIn ? handleNavigate('/me') : handleComingSoon()}
            />

            <div className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {user?.displayName || t('drawer.guest')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {getIdentityStatus()}
                  </div>
                </div>
              </div>
              
              {isLoggedIn && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <SiLine className="w-3 h-3" />
                    {t('drawer.lineBound')}
                  </Badge>
                  {hasDiscoverId && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Store className="w-3 h-3" />
                      {t('drawer.discoverOpened')}
                    </Badge>
                  )}
                  {hasShuaId && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Sparkles className="w-3 h-3" />
                      {t('drawer.shuaOpened')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="py-2">
            <SectionTitle>{t('drawer.section.create')}</SectionTitle>
            
            <MenuItem
              icon={Store}
              label={t('drawer.applyDiscover')}
              description={t('drawer.applyDiscoverDesc')}
              badge={hasDiscoverId ? t('drawer.opened') : undefined}
              disabled={hasDiscoverId}
              onClick={handleApplyDiscover}
            />
            
            <MenuItem
              icon={Sparkles}
              label={t('drawer.applyShua')}
              description={t('drawer.applyShuaDesc')}
              badge={hasShuaId ? t('drawer.opened') : undefined}
              disabled={hasShuaId}
              onClick={handleApplyShua}
            />
          </div>

          <Separator />

          <div className="py-2">
            <SectionTitle>{t('drawer.section.settings')}</SectionTitle>
            
            <MenuItem
              icon={Settings}
              label={t('userCenter.language')}
              onClick={() => handleNavigate('/settings/language')}
            />
            
            <MenuItem
              icon={Bell}
              label={t('userCenter.notifications')}
              onClick={handleComingSoon}
            />
            
            <MenuItem
              icon={Shield}
              label={t('drawer.privacy')}
              onClick={handleComingSoon}
            />
            
            <MenuItem
              icon={HelpCircle}
              label={t('userCenter.help')}
              onClick={() => handleNavigate('/help')}
            />
            
            <MenuItem
              icon={Info}
              label={t('userCenter.about')}
              onClick={() => handleNavigate('/about')}
            />
            
            <MenuItem
              icon={Trash2}
              label={t('drawer.clearCache')}
              onClick={handleComingSoon}
            />
          </div>

          {isLoggedIn && (
            <>
              <Separator />
              <div className="py-2">
                <MenuItem
                  icon={LogOut}
                  label={t('profile.logout')}
                  onClick={handleLogout}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t text-center">
          <div className="text-[10px] text-muted-foreground">
            {t('drawer.version')} 1.0.0
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
