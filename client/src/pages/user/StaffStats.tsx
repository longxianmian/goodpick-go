import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { RoleAwareBottomNav } from "@/components/RoleAwareBottomNav";
import { DrawerMenu } from "@/components/DrawerMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  ChevronDown,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  ScanLine,
  CheckCircle,
  BarChart3,
  Target,
  User,
  Zap,
  Store,
  Cog,
  BadgeCheck,
  Crown,
  Shield,
  ChevronRight
} from "lucide-react";
import { Link } from 'wouter';

interface SummaryData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  byCampaign: Array<{
    campaignId: number;
    campaignTitle: string;
    count: number;
  }>;
}

interface RecentRedemption {
  id: number;
  code: string;
  usedAt: string;
  campaignTitle: string;
  userName: string | null;
  couponValue: string;
}

export default function StaffStats() {
  const [, navigate] = useLocation();
  const { user, userToken, userRoles, setActiveRole, activeRole, hasRole } = useAuth();
  const { t, language } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const isTestAccount = user?.isTestAccount === true;

  const allRoleOptions = [
    { role: 'consumer', label: t('roles.consumer'), icon: User, path: '/me', color: 'text-blue-500' },
    { role: 'creator', label: t('roles.creator'), icon: Zap, path: '/creator/me', color: 'text-pink-500' },
    { role: 'owner', label: t('roles.owner'), icon: Store, path: '/merchant/me', color: 'text-orange-500' },
    { role: 'operator', label: t('roles.operator'), icon: Cog, path: '/merchant', color: 'text-purple-500' },
    { role: 'verifier', label: t('roles.verifier'), icon: BadgeCheck, path: '/verifier', color: 'text-green-500' },
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

  const verifierRoles = userRoles.filter(r => r.role === 'verifier');
  const currentStore = verifierRoles[0];

  const { data: summaryData, isLoading: summaryLoading } =
    useQuery<SummaryData, Error, SummaryData, [string]>({
      queryKey: ["/api/staff/summary"],
      enabled: !!userToken,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
      select: (response: any) => response.data,
    });

  const { data: recentData, isLoading: recentLoading } = useQuery<
    RecentRedemption[], Error, RecentRedemption[], [string]
  >({
    queryKey: ["/api/staff/recent-redemptions"],
    enabled: !!userToken,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    select: (response: any) => response.data,
  });

  if (!user || !userToken) {
    navigate("/");
    return null;
  }

  const mockStats = {
    today: summaryData?.today || 0,
    thisWeek: summaryData?.thisWeek || 0,
    thisMonth: summaryData?.thisMonth || 0,
    total: (summaryData?.thisMonth || 0) * 3,
    avgPerDay: Math.round((summaryData?.thisMonth || 0) / 30 * 10) / 10,
    ranking: 2,
  };

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
            {t('staffStats.title')}
          </h1>
          <div className="w-9" />
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
                        <span>{allRoleOptions.find(r => r.role === activeRole)?.label || t('roles.verifier')}</span>
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
                  <ScanLine className="w-3 h-3" />
                  {t('verifier.role')}
                </Badge>
                {currentStore && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 border-white/30 text-white">
                    {currentStore.storeName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-around py-4 bg-white/10">
          <div className="text-center">
            <div className="text-xl font-bold">{mockStats.today}</div>
            <div className="text-xs opacity-90">{t('verifier.today')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{mockStats.thisWeek}</div>
            <div className="text-xs opacity-90">{t('verifier.thisWeek')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{mockStats.thisMonth}</div>
            <div className="text-xs opacity-90">{t('verifier.thisMonth')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{mockStats.total}</div>
            <div className="text-xs opacity-90">{t('verifier.total')}</div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('verifier.performance')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                <Award className="w-8 h-8 mx-auto mb-1 text-amber-500" />
                <div className="text-2xl font-bold text-amber-600">#{mockStats.ranking}</div>
                <div className="text-xs text-muted-foreground">{t('verifier.ranking')}</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">{mockStats.avgPerDay || 0}</div>
                <div className="text-xs text-muted-foreground">{t('verifier.avgPerDay')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
          <CardContent className="p-0">
            <Link href="/staff/redeem">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2" data-testid="link-quick-redeem">
                <div className="w-14 h-14 rounded-xl bg-[#38B03B] flex items-center justify-center">
                  <ScanLine className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{t('verifier.quickRedeem')}</div>
                  <div className="text-sm text-muted-foreground">{t('verifier.scanToRedeem')}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-semibold">{t('staffStats.byCampaign')}</span>
            </div>
            
            {summaryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : summaryData?.byCampaign && summaryData.byCampaign.length > 0 ? (
              <div className="space-y-2">
                {summaryData.byCampaign.map((item) => (
                  <div
                    key={item.campaignId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`campaign-stat-${item.campaignId}`}
                  >
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-[#38B03B]" />
                      <span className="text-sm font-medium">{item.campaignTitle}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('staffStats.noCampaignData')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('staffStats.recentRedemptions')}</span>
              </div>
            </div>
            
            {recentLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentData && recentData.length > 0 ? (
              <div className="space-y-2">
                {recentData.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`redemption-${redemption.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="text-sm font-medium">{redemption.campaignTitle}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('verifier.code')}: {redemption.code}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">
                        {redemption.couponValue}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(redemption.usedAt).toLocaleString(language, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('staffStats.noRecentData')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav forceRole="verifier" />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
