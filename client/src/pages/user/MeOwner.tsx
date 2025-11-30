import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Menu,
  ChevronRight,
  Users,
  UserPlus,
  Shield,
  Store,
  Settings,
  BarChart3,
  Crown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function MeOwner() {
  const { t } = useLanguage();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // 获取商户老板关联的门店
  const ownerRoles = userRoles.filter(r => r.role === 'owner');
  
  // TODO: 从后端API获取真实员工数据
  const staffStats = {
    operators: 3,
    verifiers: 8,
    totalStaff: 11,
  };
  
  const staffList = [
    { id: 1, name: '张三', role: 'operator', avatar: null, status: 'active' },
    { id: 2, name: '李四', role: 'verifier', avatar: null, status: 'active' },
    { id: 3, name: '王五', role: 'verifier', avatar: null, status: 'active' },
    { id: 4, name: '赵六', role: 'verifier', avatar: null, status: 'pending' },
  ];

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* 顶部用户卡片区域 */}
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
            {t('owner.myTitle')}
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
              <h2 className="text-lg font-bold mb-1" data-testid="text-user-name">
                {user?.displayName || 'User'}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/20 border-amber-300/50 text-white">
                  <Crown className="w-3 h-3" />
                  {t('owner.role')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {/* 门店列表 */}
        {ownerRoles.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {ownerRoles.map((store) => (
                <Badge 
                  key={store.storeId} 
                  variant="outline" 
                  className="text-[11px] gap-1 bg-white/10 border-white/30 text-white"
                >
                  <Store className="w-3 h-3" />
                  {store.storeName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* 员工统计 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('owner.staffOverview')}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                <div className="text-2xl font-bold text-blue-600">{staffStats.operators}</div>
                <div className="text-xs text-muted-foreground">{t('owner.operators')}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                <div className="text-2xl font-bold text-green-600">{staffStats.verifiers}</div>
                <div className="text-xs text-muted-foreground">{t('owner.verifiers')}</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                <div className="text-2xl font-bold text-purple-600">{staffStats.totalStaff}</div>
                <div className="text-xs text-muted-foreground">{t('owner.totalStaff')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 添加员工入口 */}
        <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
          <CardContent className="p-0">
            <div 
              className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2"
              onClick={handleComingSoon}
              data-testid="button-add-staff"
            >
              <div className="w-12 h-12 rounded-xl bg-[#38B03B] flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{t('owner.addStaff')}</div>
                <div className="text-xs text-muted-foreground">{t('owner.addStaffDesc')}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* 员工管理列表 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('owner.staffManagement')}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComingSoon}>
                {t('consumer.viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {staffList.map((staff) => (
                <div 
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={staff.avatar || undefined} />
                      <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{staff.name}</div>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] mt-0.5"
                      >
                        {staff.role === 'operator' ? t('owner.operator') : t('owner.verifier')}
                      </Badge>
                    </div>
                  </div>
                  <Badge 
                    variant={staff.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {staff.status === 'active' ? t('owner.active') : t('owner.pending')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5 text-[#38B03B]" />
              <span className="text-sm font-semibold">{t('owner.quickActions')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Link href="/merchant">
                <div className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate">
                  <Store className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-sm font-medium">{t('owner.storeHome')}</div>
                </div>
              </Link>
              <Link href="/merchant/operations">
                <div className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover-elevate">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-sm font-medium">{t('owner.viewData')}</div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav forceRole="owner" />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
