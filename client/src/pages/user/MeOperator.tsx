import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Menu,
  ChevronRight,
  ChevronDown,
  Package,
  Megaphone,
  Calendar,
  Image,
  FileText,
  Share2,
  Bell,
  Settings,
  Store,
  User,
  Zap,
  BadgeCheck,
  Crown,
  Shield,
  Cog,
  AlertCircle,
  Clock,
  CheckCircle2,
  Edit3,
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function MeOperator() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { user, userRoles, hasRole, activeRole, setActiveRole } = useAuth();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  
  const isTestAccount = user?.isTestAccount === true;
  
  const operatorRoles = userRoles.filter(r => r.role === 'operator');
  const currentStore = operatorRoles[0];

  const allRoleOptions = [
    { role: 'consumer', label: t('roles.consumer'), icon: User, path: '/me', color: 'text-blue-500' },
    { role: 'creator', label: t('roles.creator'), icon: Zap, path: '/creator/me', color: 'text-pink-500' },
    { role: 'owner', label: t('roles.owner'), icon: Store, path: '/merchant/me', color: 'text-orange-500' },
    { role: 'operator', label: t('roles.operator'), icon: Cog, path: '/operator/me', color: 'text-purple-500' },
    { role: 'verifier', label: t('roles.verifier'), icon: BadgeCheck, path: '/staff/stats', color: 'text-green-500' },
    { role: 'member', label: t('roles.member'), icon: Crown, path: '/me', color: 'text-yellow-500' },
    { role: 'sysadmin', label: t('roles.sysadmin'), icon: Shield, path: '/sysadmin', color: 'text-red-500' },
  ];

  const availableRoleOptions = allRoleOptions.filter(option => 
    hasRole(option.role as any)
  );

  const handleSwitchRole = (role: string, path: string) => {
    setActiveRole(role as any);
    setRoleMenuOpen(false);
    navigate(path);
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const pendingTasks = [
    { id: 1, type: 'product', title: '新品上架待审核', count: 3, icon: Package, color: 'text-blue-500' },
    { id: 2, type: 'campaign', title: '活动素材待更新', count: 2, icon: Image, color: 'text-amber-500' },
    { id: 3, type: 'content', title: '推文待发布', count: 1, icon: FileText, color: 'text-purple-500' },
  ];

  const quickActions = [
    { 
      id: 'products', 
      title: t('operator.productManage'), 
      desc: t('operator.productManageDesc'),
      icon: Package, 
      color: 'bg-blue-500',
      path: '/operator/products'
    },
    { 
      id: 'campaigns', 
      title: t('operator.campaignManage'), 
      desc: t('operator.campaignManageDesc'),
      icon: Calendar, 
      color: 'bg-green-500',
      path: '/operator/campaigns'
    },
    { 
      id: 'promotion', 
      title: t('operator.promotion'), 
      desc: t('operator.promotionDesc'),
      icon: Megaphone, 
      color: 'bg-purple-500',
      path: '/operator/promotion'
    },
  ];

  const promotionTools = [
    { id: 'poster', title: t('operator.posterDesign'), icon: Image, desc: t('operator.posterDesignDesc') },
    { id: 'article', title: t('operator.articleEdit'), icon: FileText, desc: t('operator.articleEditDesc') },
    { id: 'share', title: t('operator.socialShare'), icon: Share2, desc: t('operator.socialShareDesc') },
  ];

  const recentActivities = [
    { id: 1, action: '上架了新商品', item: '招牌奶茶', time: '10分钟前', icon: Plus },
    { id: 2, action: '更新了活动', item: '周末特惠', time: '1小时前', icon: Edit3 },
    { id: 3, action: '发布了推文', item: '新品上市公告', time: '3小时前', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#38B03B] to-[#2d8c2f] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => setDrawerOpen(true)}
            data-testid="button-drawer-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold" data-testid="text-page-title">
            {t('operator.myTitle')}
          </h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={handleComingSoon}
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
          </Button>
        </header>
        
        <div className="px-4 py-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-xl font-bold bg-white/20 text-white">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-bold" data-testid="text-user-name">
                  {user?.displayName || 'User'}
                </h2>
                {isTestAccount && availableRoleOptions.length > 1 && (
                  <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] gap-0.5 bg-white/20 hover:bg-white/30 text-white"
                        data-testid="button-switch-role"
                      >
                        <span>{t('roles.operator')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('common.switchRole')}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableRoleOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.role}
                            onClick={() => handleSwitchRole(option.role, option.path)}
                            className={`gap-2 cursor-pointer ${activeRole === option.role ? 'bg-accent' : ''}`}
                            data-testid={`menu-role-${option.role}`}
                          >
                            <IconComponent className={`w-4 h-4 ${option.color}`} />
                            <span>{option.label}</span>
                            {activeRole === option.role && (
                              <Badge variant="outline" className="ml-auto text-[10px]">{t('common.current')}</Badge>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 border-white/30 text-white">
                  <Cog className="w-3 h-3" />
                  {t('operator.role')}
                </Badge>
                {currentStore && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 border-white/30 text-white">
                    <Store className="w-3 h-3" />
                    {currentStore.storeName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {pendingTasks.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{t('operator.pendingTasks')}</span>
                <Badge className="ml-auto bg-white/20 text-white text-[10px]">
                  {pendingTasks.reduce((sum, t) => sum + t.count, 0)}
                </Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto">
                {pendingTasks.map((task) => {
                  const IconComponent = task.icon;
                  return (
                    <div 
                      key={task.id}
                      className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 whitespace-nowrap cursor-pointer"
                      onClick={handleComingSoon}
                    >
                      <IconComponent className={`w-4 h-4 ${task.color}`} />
                      <span className="text-xs">{task.title}</span>
                      <Badge className="bg-red-500 text-white text-[10px]">{task.count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <Card 
                key={action.id}
                className="cursor-pointer hover-elevate active-elevate-2"
                onClick={handleComingSoon}
                data-testid={`card-action-${action.id}`}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-xl ${action.color} flex items-center justify-center mb-2`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm font-medium">{action.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold">{t('operator.promotionTools')}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {promotionTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <div 
                    key={tool.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate active-elevate-2"
                    onClick={handleComingSoon}
                    data-testid={`tool-${tool.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{tool.title}</div>
                      <div className="text-xs text-muted-foreground">{tool.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('operator.recentActivity')}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground h-7"
                onClick={handleComingSoon}
              >
                {t('consumer.viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {recentActivities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div 
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="text-muted-foreground">{activity.action}</span>
                        <span className="font-medium ml-1">"{activity.item}"</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div 
              className="flex items-center gap-3 p-4 cursor-pointer hover-elevate"
              onClick={handleComingSoon}
              data-testid="link-settings"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{t('operator.settings')}</div>
                <div className="text-xs text-muted-foreground">{t('operator.settingsDesc')}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav forceRole="operator" />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
