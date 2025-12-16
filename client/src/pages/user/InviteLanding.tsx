import { useState, useEffect, useRef } from 'react';
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
  isOwnInvite?: boolean;
}

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

// 解析JWT获取lineUserId（不验证签名，仅解码payload）
function decodeJwtPayload(token: string): { lineUserId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export default function InviteLanding() {
  const { t } = useLanguage();
  const { isUserAuthenticated, loginUser, logoutUser } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  const [accepted, setAccepted] = useState(false);
  const [identityResolved, setIdentityResolved] = useState(false);
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const liffInitDone = useRef(false);

  const params = new URLSearchParams(searchString);
  const inviteCode = params.get('code');

  // 【关键】初始化LIFF，直接从localStorage读取token并比较，不依赖React状态
  useEffect(() => {
    if (liffInitDone.current) return;
    liffInitDone.current = true;

    async function initAndCheckIdentity() {
      console.log('[InviteLanding] ========== 开始身份验证流程 ==========');
      
      // 直接从localStorage读取token，不依赖React状态
      const storedToken = localStorage.getItem('userToken');
      let storedLineUserId: string | null = null;
      
      if (storedToken) {
        const decoded = decodeJwtPayload(storedToken);
        storedLineUserId = decoded?.lineUserId || null;
        console.log('[InviteLanding] localStorage中的token对应用户:', storedLineUserId);
      } else {
        console.log('[InviteLanding] localStorage中没有token');
      }
      
      try {
        const liffState = await ensureLiffReady();
        console.log('[InviteLanding] LIFF状态:', {
          isInClient: liffState.isInClient,
          isLoggedIn: liffState.isLoggedIn
        });

        if (liffState.liff) {
          // 如果在LINE App内但LIFF未登录，触发LIFF登录
          if (liffState.isInClient && !liffState.isLoggedIn) {
            console.log('[InviteLanding] 在LINE内但LIFF未登录，触发登录');
            liffState.liff.login();
            return;
          }

          // 获取当前LINE用户profile
          if (liffState.isLoggedIn) {
            try {
              const profile = await liffState.liff.getProfile();
              console.log('[InviteLanding] 当前扫码的LINE用户:', profile.displayName, profile.userId);
              
              setLiffProfile({
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl
              });

              // 【核心修复】比较LIFF用户ID和localStorage中token的用户ID
              if (storedLineUserId && storedLineUserId !== profile.userId) {
                console.log('[InviteLanding] ⚠️⚠️⚠️ 身份不匹配！⚠️⚠️⚠️');
                console.log('[InviteLanding] localStorage中的用户:', storedLineUserId);
                console.log('[InviteLanding] 当前扫码用户:', profile.userId);
                console.log('[InviteLanding] 正在清除旧登录...');
                
                // 立即清除旧的登录状态
                localStorage.removeItem('userToken');
                resetLiffState();
                logoutUser();
                
                console.log('[InviteLanding] ✓ 旧登录已清除');
              } else if (storedLineUserId) {
                console.log('[InviteLanding] ✓ 身份匹配');
              } else {
                console.log('[InviteLanding] 用户未登录，将显示登录按钮');
              }
            } catch (e) {
              console.error('[InviteLanding] 获取profile失败:', e);
            }
          }
        }
      } catch (err) {
        console.error('[InviteLanding] LIFF初始化失败:', err);
      }
      
      // 身份验证完成，允许查询邀请信息
      console.log('[InviteLanding] ========== 身份验证完成 ==========');
      setIdentityResolved(true);
    }

    initAndCheckIdentity();
  }, [logoutUser]);

  // 【关键】只有在身份验证完成后才查询邀请信息
  const { data: inviteInfo, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ['/api/invites', inviteCode],
    enabled: !!inviteCode && identityResolved,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/invites/accept', { inviteCode });
      return res.json();
    },
    onSuccess: () => {
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/super'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/friends'] });
      toast({
        title: t('inviteLanding.success'),
        description: t('inviteLanding.successDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('inviteLanding.acceptError'),
        variant: 'destructive',
      });
    },
  });

  // 使用LIFF idToken直接登录
  const handleLiffLogin = async () => {
    setLoginLoading(true);
    
    try {
      const liffState = await ensureLiffReady();
      
      if (!liffState.liff || !liffState.isLoggedIn) {
        if (liffState.liff && liffState.isInClient) {
          liffState.liff.login();
          return;
        }
        throw new Error('LIFF未登录');
      }

      const idToken = liffState.liff.getIDToken();
      console.log('[InviteLanding] 获取到idToken，正在登录...');
      
      if (!idToken) {
        throw new Error('无法获取LINE ID Token');
      }

      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[InviteLanding] 登录成功:', result.user.displayName, result.user.lineUserId);
        
        localStorage.setItem('userToken', result.token);
        loginUser(result.token, result.user);
        
        toast({
          title: '登录成功',
          description: `欢迎, ${result.user.displayName}`,
        });

        // 登录成功后，重新查询邀请信息并接受
        queryClient.invalidateQueries({ queryKey: ['/api/invites', inviteCode] });
        
        // 延迟执行接受邀请
        setTimeout(async () => {
          try {
            const res = await apiRequest('POST', '/api/invites/accept', { inviteCode });
            const data = await res.json();
            if (data.success) {
              setAccepted(true);
              queryClient.invalidateQueries({ queryKey: ['/api/contacts/super'] });
              queryClient.invalidateQueries({ queryKey: ['/api/contacts/friends'] });
              toast({
                title: t('inviteLanding.success'),
                description: t('inviteLanding.successDesc'),
              });
            }
          } catch (e) {
            console.error('[InviteLanding] 接受邀请失败:', e);
          }
        }, 500);
      } else {
        throw new Error(result.message || '登录失败');
      }
    } catch (err: any) {
      console.error('[InviteLanding] 登录失败:', err);
      toast({
        title: '登录失败',
        description: err.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!isUserAuthenticated) {
      await handleLiffLogin();
      return;
    }
    await acceptInviteMutation.mutateAsync();
  };

  // 检查是否是自己的邀请
  useEffect(() => {
    if (inviteInfo?.isOwnInvite) {
      toast({
        title: '无法接受自己的邀请',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [inviteInfo?.isOwnInvite, navigate, toast]);

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

  // 加载中（等待身份验证或邀请信息）
  if (!identityResolved || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
        <p className="text-xs text-muted-foreground mt-4">
          {!identityResolved ? '正在验证身份...' : '正在加载邀请信息...'}
        </p>
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

        {/* 如果未登录，显示LINE用户信息确认 */}
        {!isUserAuthenticated && liffProfile && (
          <Card className="w-full p-4 mb-6 border-[#38B03B]/30">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={liffProfile.pictureUrl} />
                <AvatarFallback className="bg-[#06C755] text-white">
                  {liffProfile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">使用此账号登录</p>
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
          disabled={acceptInviteMutation.isPending || loginLoading}
          data-testid="button-accept"
        >
          {acceptInviteMutation.isPending || loginLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              {isUserAuthenticated 
                ? t('inviteLanding.acceptInvite') 
                : liffProfile 
                  ? '确认登录并加为好友'
                  : t('inviteLanding.joinNow')
              }
            </>
          )}
        </Button>

        {!isUserAuthenticated && !liffProfile && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            {isInLineApp() ? '正在获取LINE账号信息...' : '请在LINE App中打开此链接'}
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
