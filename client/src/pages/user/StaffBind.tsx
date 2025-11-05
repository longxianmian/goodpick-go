import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface PresetInfo {
  storeName: string;
  storeAddress: string;
  staffName: string;
  staffId: string;
  phone: string;
}

export default function StaffBind() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [token, setToken] = useState('');
  const [presetInfo, setPresetInfo] = useState<PresetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('token');
    const urlLang = params.get('lang');
    const successParam = params.get('success');
    const errorParam = params.get('error');

    // Set language from URL if provided
    if (urlLang && ['zh-cn', 'en-us', 'th-th'].includes(urlLang)) {
      setLanguage(urlLang as 'zh-cn' | 'en-us' | 'th-th');
    }

    if (!authToken) {
      setError(t('staffBind.missingToken'));
      setLoading(false);
      return;
    }

    setToken(authToken);

    // Check if returning from OAuth callback
    if (successParam === 'true') {
      setBindSuccess(true);
      toast({
        title: t('staffBind.success'),
        description: t('staffBind.successDesc'),
      });
      setTimeout(() => {
        navigate('/staff/redeem');
      }, 2000);
      return;
    }

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: '缺少必要参数',
        invalid_token: '无效的二维码',
        already_bound: '此账号已绑定',
        token_exchange_failed: 'LINE授权失败',
        invalid_line_token: 'LINE验证失败',
        phone_mismatch: '手机号不匹配，请确保LINE账号绑定的手机号与员工信息一致',
        qr_code_expired: '二维码已过期（超过24小时），请联系管理员重新生成',
        callback_failed: '绑定失败，请重试',
      };
      const errorMsg = errorMessages[errorParam] || '绑定失败';
      setError(errorMsg);
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: 'destructive',
      });
    }

    verifyToken(authToken);
  }, [setLanguage, navigate, toast, t]);

  const verifyToken = async (authToken: string) => {
    try {
      const res = await fetch(`/api/staff/bind/verify?token=${encodeURIComponent(authToken)}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.message || t('staffBind.invalidToken'));
        setLoading(false);
        return;
      }

      setPresetInfo(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Verify token error:', err);
      setError(t('staffBind.invalidToken'));
      setLoading(false);
    }
  };

  const handleLineLogin = async () => {
    try {
      // Get LINE Channel ID from API
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      
      const lineChannelId = configData.data?.lineChannelId;
      
      if (!lineChannelId) {
        toast({
          title: t('common.error'),
          description: 'LINE配置错误',
          variant: 'destructive',
        });
        return;
      }

      const protocol = window.location.protocol;
      const host = window.location.host;
      const redirectUri = `${protocol}//${host}/api/auth/line/staff-callback`;
      
      const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      lineAuthUrl.searchParams.append('response_type', 'code');
      lineAuthUrl.searchParams.append('client_id', lineChannelId);
      lineAuthUrl.searchParams.append('redirect_uri', redirectUri);
      lineAuthUrl.searchParams.append('state', token); // QR code token as state
      lineAuthUrl.searchParams.append('scope', 'profile openid phone');

      console.log('Redirecting to LINE OAuth:', lineAuthUrl.toString());
      
      // Redirect to LINE OAuth
      window.location.href = lineAuthUrl.toString();
    } catch (err) {
      console.error('LINE login error:', err);
      toast({
        title: t('common.error'),
        description: '无法连接到LINE',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t('staffBind.failed')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => navigate('/')}
              data-testid="button-back-home"
            >
              {t('staffBind.backHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bindSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>{t('staffBind.success')}</CardTitle>
            <CardDescription>
              {t('staffBind.successDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {presetInfo && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('staffBind.store')}:</span>
                  <span className="font-medium">{presetInfo.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('staffBind.name')}:</span>
                  <span className="font-medium">{presetInfo.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('staffBind.id')}:</span>
                  <span className="font-medium">{presetInfo.staffId}</span>
                </div>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              {t('staffBind.redirecting')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{t('staffBind.title')}</CardTitle>
          <CardDescription>
            {t('staffBind.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {presetInfo && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{t('staffBind.store')}</div>
                  <div className="font-medium">{presetInfo.storeName}</div>
                  <div className="text-sm text-muted-foreground">{presetInfo.storeAddress}</div>
                </div>
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-1">{t('staffBind.staffInfo')}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('staffBind.name')}:</span>
                      <span className="ml-2 font-medium">{presetInfo.staffName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('staffBind.id')}:</span>
                      <span className="ml-2 font-medium">{presetInfo.staffId}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">{t('staffBind.phone')}:</span>
                    <span className="ml-2 font-medium">{presetInfo.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <div className="font-medium mb-1">{t('staffBind.phoneVerificationRequired')}</div>
                    <div className="text-blue-700 dark:text-blue-300">
                      {t('staffBind.phoneVerificationDesc')}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleLineLogin}
                disabled={binding}
                data-testid="button-line-login"
              >
                {binding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('staffBind.authorizing')}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('staffBind.authorizeButton')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
