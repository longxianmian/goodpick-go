import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ensureLiffReady, isInLineApp, resetLiffState } from '@/lib/liffClient';
import {
  Users,
  UserPlus,
  Check,
  Gift,
  MessageCircle,
  Store,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface InviteInfo {
  inviteCode: string;
  channel: string;
  scene: string;
  inviter: {
    id: number;
    displayName: string;
    avatarUrl?: string;
  };
  isUsed: boolean;
}

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export default function InviteLanding() {
  const { t } = useLanguage();
  const { user, loginUser, logoutUser } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  const [accepted, setAccepted] = useState(false);
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isOwnInviteError, setIsOwnInviteError] = useState(false);

  const params = new URLSearchParams(searchString);
  const inviteCode = params.get('code');

  // 获取邀请信息（公开接口，不需要认证）
  const { data: inviteInfo, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ['/api/invites', inviteCode],
    enabled: !!inviteCode,
  });

  // 使用LIFF idToken登录并接受邀请
  const handleAcceptInvite = async () => {
    setLoginLoading(true);
    setIsOwnInviteError(false);
    
    try {
      // 第一步：确保使用正确的LIFF身份登录
      const liffState = await ensureLiffReady();
      console.log('[InviteLanding] LIFF状态:', {
        isInClient: liffState.isInClient,
        isLoggedIn: liffState.isLoggedIn
      });

      // 如果在LINE App内但LIFF未登录，触发LIFF登录
      if (liffState.isInClient && !liffState.isLoggedIn) {
        console.log('[InviteLanding] 在LINE内但LIFF未登录，触发登录');
        liffState.liff.login();
        return;
      }

      // 获取LIFF用户信息
      if (!liffState.liff || !liffState.isLoggedIn) {
        throw new Error('请在LINE App中打开此链接');
      }

      const profile = await liffState.liff.getProfile();
      console.log('[InviteLanding] 当前LINE用户:', profile.displayName, profile.userId);
      
      setLiffProfile({
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl
      });

      // 检查当前登录用户是否与LIFF用户匹配
      if (user && user.lineUserId !== profile.userId) {
        console.log('[InviteLanding] 身份不匹配，清除旧登录');
        console.log('[InviteLanding] 当前登录:', user.lineUserId);
        console.log('[InviteLanding] LIFF用户:', profile.userId);
        
        // 清除旧登录
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        resetLiffState();
        logoutUser();
      }

      // 第二步：使用LIFF idToken登录
      const idToken = liffState.liff.getIDToken();
      if (!idToken) {
        throw new Error('无法获取LINE ID Token');
      }

      console.log('[InviteLanding] 使用LIFF idToken登录...');
      const loginResponse = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const loginResult = await loginResponse.json();

      if (!loginResult.success) {
        throw new Error(loginResult.message || '登录失败');
      }

      console.log('[InviteLanding] 登录成功:', loginResult.user.displayName);
      
      // 保存新的登录状态
      localStorage.setItem('userToken', loginResult.token);
      loginUser(loginResult.token, loginResult.user);

      // 第三步：接受邀请
      console.log('[InviteLanding] 接受邀请...');
      const acceptResponse = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult.token}`,
        },
        body: JSON.stringify({ inviteCode }),
      });

      const acceptResult = await acceptResponse.json();

      if (!acceptResponse.ok) {
        if (acceptResult.message === 'Cannot accept your own invite') {
          setIsOwnInviteError(true);
          toast({
            title: '无法接受邀请',
            description: '您不能接受自己发出的邀请',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(acceptResult.message || '接受邀请失败');
      }

      // 成功！
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/super'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/friends'] });
      
      toast({
        title: t('inviteLanding.success'),
        description: t('inviteLanding.successDesc'),
      });

    } catch (err: any) {
      console.error('[InviteLanding] 处理失败:', err);
      toast({
        title: '操作失败',
        description: err.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // 无效邀请码
  if (!inviteCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('inviteLanding.invalidCode')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('inviteLanding.invalidCodeDesc')}
        </p>
        <Button onClick={() => navigate('/')} data-testid="button-home">
          {t('common.backHome')}
        </Button>
      </div>
    );
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  // 邀请码过期或无效
  if (error || !inviteInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('inviteLanding.expiredCode')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('inviteLanding.expiredCodeDesc')}
        </p>
        <Button onClick={() => navigate('/')} data-testid="button-home">
          {t('common.backHome')}
        </Button>
      </div>
    );
  }

  // 自己的邀请错误
  if (isOwnInviteError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-lg font-medium mb-2">无法接受邀请</h2>
        <p className="text-muted-foreground text-center mb-4">
          您不能接受自己发出的邀请
        </p>
        <Button onClick={() => navigate('/')} data-testid="button-home">
          {t('common.backHome')}
        </Button>
      </div>
    );
  }

  // 已接受或已使用
  if (accepted || inviteInfo.isUsed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-[#38B03B]/10 to-background">
        <div className="w-20 h-20 rounded-full bg-[#38B03B] flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('inviteLanding.alreadyFriends')}</h2>
        <p className="text-muted-foreground text-center mb-6">
          {t('inviteLanding.alreadyFriendsDesc', { name: inviteInfo.inviter.displayName })}
        </p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
          <Card
            className="p-4 text-center hover-elevate cursor-pointer"
            onClick={() => navigate(`/liaoliao/chat/${inviteInfo.inviter.id}`)}
            data-testid="button-start-chat"
          >
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-[#38B03B]" />
            <span className="text-sm font-medium">{t('inviteLanding.startChat')}</span>
          </Card>
          <Card
            className="p-4 text-center hover-elevate cursor-pointer"
            onClick={() => navigate('/')}
            data-testid="button-explore"
          >
            <Store className="w-8 h-8 mx-auto mb-2 text-[#38B03B]" />
            <span className="text-sm font-medium">{t('inviteLanding.exploreShuashua')}</span>
          </Card>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/super-contacts')}
          data-testid="button-contacts"
        >
          {t('inviteLanding.viewContacts')}
        </Button>
      </div>
    );
  }

  // 主邀请页面
  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-gradient-to-b from-[#38B03B]/10 to-background">
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
        {/* 邀请人信息 */}
        <div className="relative mb-6">
          <Avatar className="w-24 h-24 border-4 border-[#38B03B]/20">
            <AvatarImage src={inviteInfo.inviter.avatarUrl} />
            <AvatarFallback className="bg-[#38B03B] text-white text-2xl">
              {inviteInfo.inviter.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#38B03B] flex items-center justify-center">
            <Gift className="w-4 h-4 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2 text-center">
          {t('inviteLanding.inviteFrom', { name: inviteInfo.inviter.displayName })}
        </h2>
        <p className="text-muted-foreground text-center mb-6">
          {t('inviteLanding.inviteDesc')}
        </p>

        {/* 如果已获取LIFF用户信息，显示确认 */}
        {liffProfile && (
          <Card className="w-full p-4 mb-6 border-[#38B03B]/30">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={liffProfile.pictureUrl} />
                <AvatarFallback className="bg-[#06C755] text-white">
                  {liffProfile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">使用此账号</p>
                <p className="font-medium">{liffProfile.displayName}</p>
              </div>
              <Check className="w-5 h-5 text-[#06C755]" />
            </div>
          </Card>
        )}

        {/* 功能说明 */}
        <Card className="w-full p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <MessageCircle className="w-6 h-6 text-[#38B03B]" />
            <div>
              <h4 className="font-medium text-sm">{t('inviteLanding.feature1Title')}</h4>
              <p className="text-xs text-muted-foreground">{t('inviteLanding.feature1Desc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <Store className="w-6 h-6 text-[#38B03B]" />
            <div>
              <h4 className="font-medium text-sm">{t('inviteLanding.feature2Title')}</h4>
              <p className="text-xs text-muted-foreground">{t('inviteLanding.feature2Desc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Gift className="w-6 h-6 text-[#38B03B]" />
            <div>
              <h4 className="font-medium text-sm">{t('inviteLanding.feature3Title')}</h4>
              <p className="text-xs text-muted-foreground">{t('inviteLanding.feature3Desc')}</p>
            </div>
          </div>
        </Card>

        {/* 操作按钮 */}
        <Button
          className="w-full bg-[#38B03B] hover:bg-[#2d8f2f] h-12"
          onClick={handleAcceptInvite}
          disabled={loginLoading}
          data-testid="button-accept"
        >
          {loginLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              {t('inviteLanding.acceptInvite')}
            </>
          )}
        </Button>

        {!isInLineApp() && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            请在LINE App中打开此链接以接受邀请
          </p>
        )}
      </div>

      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          LiaoLiao & ShuaShua
        </p>
      </div>
    </div>
  );
}
