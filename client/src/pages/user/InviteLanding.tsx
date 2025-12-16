import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { redirectToLineLogin, ensureLiffReady, isInLineApp } from '@/lib/liffClient';

const INVITE_PENDING_KEY = 'inviteAcceptPending';
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

export default function InviteLanding() {
  const { t } = useLanguage();
  const { logoutUser } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  const [accepted, setAccepted] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isOwnInviteError, setIsOwnInviteError] = useState(false);
  const [autoAccepting, setAutoAccepting] = useState(false);

  const params = new URLSearchParams(searchString);
  const inviteCode = params.get('code');

  // 获取邀请信息（公开接口，不需要认证）
  const { data: inviteInfo, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ['/api/invites', inviteCode],
    enabled: !!inviteCode,
  });

  // 执行接受邀请的核心逻辑
  const doAcceptInvite = async (token: string, code: string) => {
    console.log('[InviteLanding] 执行接受邀请...');
    const acceptRes = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ inviteCode: code }),
    });

    const acceptData = await acceptRes.json();

    if (!acceptRes.ok) {
      if (acceptData.message === 'Cannot accept your own invite') {
        setIsOwnInviteError(true);
        return false;
      }
      throw new Error(acceptData.message || '接受邀请失败');
    }

    // 成功！
    setAccepted(true);
    queryClient.invalidateQueries({ queryKey: ['/api/contacts/super'] });
    queryClient.invalidateQueries({ queryKey: ['/api/contacts/friends'] });
    
    toast({
      title: t('inviteLanding.success'),
      description: t('inviteLanding.successDesc'),
    });
    return true;
  };

  // 页面加载时：检查是否有待处理的邀请（登录后自动继续）
  useEffect(() => {
    const checkPendingInvite = async () => {
      // 方式1: 检查URL中是否有token（LINE OAuth登录返回）
      const urlToken = params.get('token');
      if (urlToken && inviteCode) {
        console.log('[InviteLanding] 检测到URL中的token，自动接受邀请...');
        setAutoAccepting(true);
        try {
          localStorage.setItem('userToken', urlToken);
          await doAcceptInvite(urlToken, inviteCode);
          // 清理URL中的token参数
          window.history.replaceState({}, '', `/invite?code=${inviteCode}`);
        } catch (err: any) {
          console.error('[InviteLanding] 自动接受邀请失败:', err);
          toast({
            title: '操作失败',
            description: err.message || '请稍后重试',
            variant: 'destructive',
          });
        } finally {
          setAutoAccepting(false);
        }
        return;
      }

      // 方式2: 检查sessionStorage（LIFF登录返回）
      const pendingData = sessionStorage.getItem(INVITE_PENDING_KEY);
      if (!pendingData) return;

      try {
        const { code, timestamp } = JSON.parse(pendingData);
        
        // 检查是否过期（5分钟）
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          console.log('[InviteLanding] 待处理邀请已过期');
          sessionStorage.removeItem(INVITE_PENDING_KEY);
          return;
        }

        // 只在LINE环境中自动处理LIFF登录
        if (!isInLineApp()) return;

        console.log('[InviteLanding] 检测到待处理邀请，自动继续...');
        setAutoAccepting(true);

        const liffState = await ensureLiffReady();
        if (!liffState.isLoggedIn) {
          console.log('[InviteLanding] LIFF仍未登录');
          return;
        }

        // 获取idToken并登录后端
        const idToken = liffState.liff.getIDToken();
        if (!idToken) {
          throw new Error('无法获取LINE ID Token');
        }

        const loginRes = await fetch('/api/auth/line/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const loginData = await loginRes.json();
        
        if (!loginData.success) {
          throw new Error(loginData.message || '登录失败');
        }

        localStorage.setItem('userToken', loginData.token);

        // 接受邀请
        await doAcceptInvite(loginData.token, code);
        
        // 清除标记
        sessionStorage.removeItem(INVITE_PENDING_KEY);

      } catch (err: any) {
        console.error('[InviteLanding] 自动接受邀请失败:', err);
        toast({
          title: '操作失败',
          description: err.message || '请稍后重试',
          variant: 'destructive',
        });
      } finally {
        setAutoAccepting(false);
        sessionStorage.removeItem(INVITE_PENDING_KEY);
      }
    };

    checkPendingInvite();
  }, [inviteCode]);

  // 点击"接受邀请"按钮
  const handleAcceptInvite = async () => {
    setLoginLoading(true);
    setIsOwnInviteError(false);
    
    try {
      // 清除可能错误的旧token
      localStorage.removeItem('userToken');
      localStorage.removeItem('user');
      logoutUser();

      // 判断是否在LINE环境
      if (isInLineApp()) {
        console.log('[InviteLanding] 在LINE环境，使用LIFF登录');
        const liffState = await ensureLiffReady();
        
        // 如果LIFF未登录，保存状态后触发登录
        if (!liffState.isLoggedIn) {
          console.log('[InviteLanding] LIFF未登录，保存状态并触发登录');
          // 使用sessionStorage保存待处理状态（不受LIFF localStorage共享影响）
          sessionStorage.setItem(INVITE_PENDING_KEY, JSON.stringify({
            code: inviteCode,
            timestamp: Date.now(),
          }));
          liffState.liff.login();
          return;
        }

        // LIFF已登录，获取idToken
        const idToken = liffState.liff.getIDToken();
        if (!idToken) {
          throw new Error('无法获取LINE ID Token');
        }

        const loginRes = await fetch('/api/auth/line/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const loginData = await loginRes.json();
        
        if (!loginData.success) {
          throw new Error(loginData.message || '登录失败');
        }

        localStorage.setItem('userToken', loginData.token);
        await doAcceptInvite(loginData.token, inviteCode!);
        
      } else {
        // 不在LINE内：跳转LINE OAuth登录
        console.log('[InviteLanding] 不在LINE环境，跳转LINE OAuth');
        redirectToLineLogin({ redirectPath: `/invite?code=${inviteCode}` });
        return;
      }

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
          disabled={loginLoading || autoAccepting}
          data-testid="button-accept"
        >
          {(loginLoading || autoAccepting) ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {autoAccepting ? '正在处理...' : '登录中...'}
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              {t('inviteLanding.acceptInvite')}
            </>
          )}
        </Button>

      </div>

      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          LiaoLiao & ShuaShua
        </p>
      </div>
    </div>
  );
}
