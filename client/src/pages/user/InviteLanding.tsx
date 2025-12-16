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
import { ensureLiffReady, isInLineApp } from '@/lib/liffClient';
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

export default function InviteLanding() {
  const { t } = useLanguage();
  const { user, isUserAuthenticated, reloadAuth } = useAuth();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  const [accepted, setAccepted] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const liffCheckDone = useRef(false);

  const params = new URLSearchParams(searchString);
  const inviteCode = params.get('code');
  const channel = params.get('channel');

  // 检查LIFF环境中的LINE身份是否与当前登录用户匹配
  useEffect(() => {
    if (liffCheckDone.current) return;
    liffCheckDone.current = true;

    async function checkLiffIdentity() {
      // 只在LINE App内检查
      if (!isInLineApp()) {
        console.log('[InviteLanding] 不在LINE App内，跳过身份验证');
        setIdentityChecked(true);
        return;
      }

      try {
        const liffState = await ensureLiffReady();
        
        if (liffState.isLoggedIn && liffState.liff) {
          // 获取当前LINE用户的profile
          const profile = await liffState.liff.getProfile();
          const currentLineUserId = profile.userId;
          
          console.log('[InviteLanding] LIFF用户ID:', currentLineUserId);
          console.log('[InviteLanding] 已登录用户:', user?.lineUserId);
          
          // 如果已有用户登录，但LINE用户ID不匹配，需要清除旧登录
          if (user && user.lineUserId !== currentLineUserId) {
            console.log('[InviteLanding] LINE身份不匹配，清除旧登录');
            localStorage.removeItem('userToken');
            localStorage.removeItem('user');
            // 保存邀请码，登录后自动接受
            localStorage.setItem('pendingInviteCode', inviteCode || '');
            // 重新加载认证状态
            reloadAuth?.();
          }
        }
      } catch (err) {
        console.error('[InviteLanding] LIFF身份检查失败:', err);
      }
      
      setIdentityChecked(true);
    }

    checkLiffIdentity();
  }, [user, inviteCode, reloadAuth]);

  const { data: inviteInfo, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ['/api/invites', inviteCode],
    enabled: !!inviteCode,
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

  const handleAcceptInvite = async () => {
    if (!isUserAuthenticated) {
      localStorage.setItem('pendingInviteCode', inviteCode || '');
      navigate('/me');
      return;
    }

    await acceptInviteMutation.mutateAsync();
  };

  useEffect(() => {
    const pendingCode = localStorage.getItem('pendingInviteCode');
    if (pendingCode && isUserAuthenticated && pendingCode === inviteCode && inviteInfo && !inviteInfo.isOwnInvite) {
      localStorage.removeItem('pendingInviteCode');
      acceptInviteMutation.mutate();
    }
  }, [isUserAuthenticated, inviteCode, inviteInfo]);

  useEffect(() => {
    if (inviteInfo?.isOwnInvite) {
      navigate('/');
    }
  }, [inviteInfo?.isOwnInvite, navigate]);

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

  // 等待LIFF身份检查和邀请信息加载
  if (isLoading || !identityChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

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

  return (
    <div className="flex flex-col items-center min-h-screen p-4 bg-gradient-to-b from-[#38B03B]/10 to-background">
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
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
        <p className="text-muted-foreground text-center mb-8">
          {t('inviteLanding.inviteDesc')}
        </p>

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

        <Button
          className="w-full bg-[#38B03B] hover:bg-[#2d8f2f] h-12"
          onClick={handleAcceptInvite}
          disabled={acceptInviteMutation.isPending}
          data-testid="button-accept"
        >
          {acceptInviteMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              {isUserAuthenticated ? t('inviteLanding.acceptInvite') : t('inviteLanding.joinNow')}
            </>
          )}
        </Button>

        {!isUserAuthenticated && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('inviteLanding.loginHint')}
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
