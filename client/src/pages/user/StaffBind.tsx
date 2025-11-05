import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle2, XCircle, Loader2, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface PresetInfo {
  storeName: string;
  storeAddress: string;
  staffName: string;
  staffId: string;
  phone: string;
}

// 定义页面状态枚举
type PageState =
  | 'loading'      // 等待验证token
  | 'invalid'      // token无效/已过期/已绑定
  | 'ready'        // 展示门店和员工信息，等待确认
  | 'binding'      // 跳转到LINE OAuth中
  | 'success';     // 绑定成功

export default function StaffBind() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [token, setToken] = useState('');
  const [presetInfo, setPresetInfo] = useState<PresetInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    console.log('[StaffBind] 初始化页面');
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('token');
    const urlLang = params.get('lang');
    const successParam = params.get('success');
    const errorParam = params.get('error');

    // 设置语言
    if (urlLang && ['zh-cn', 'en-us', 'th-th'].includes(urlLang)) {
      setLanguage(urlLang as 'zh-cn' | 'en-us' | 'th-th');
    }

    // 检查必要参数
    if (!authToken) {
      console.log('[StaffBind] 缺少token参数');
      setErrorMessage(t('staffBind.missingToken'));
      setPageState('invalid');
      return;
    }

    setToken(authToken);

    // 处理OAuth回调成功
    if (successParam === 'true') {
      console.log('[StaffBind] OAuth回调成功，绑定完成');
      setPageState('success');
      toast({
        title: t('staffBind.success'),
        description: t('staffBind.successDesc'),
      });
      setTimeout(() => {
        navigate('/staff/redeem');
      }, 2000);
      return;
    }

    // 处理OAuth回调错误
    if (errorParam) {
      console.log('[StaffBind] OAuth回调错误:', errorParam);
      const errorMessages: Record<string, string> = {
        missing_params: '缺少必要参数',
        invalid_token: '无效的二维码',
        already_bound: '此员工预设已被绑定，如需更换请联系管理员',
        token_exchange_failed: 'LINE授权失败，请重试',
        invalid_line_token: 'LINE验证失败，请重试',
        qr_code_expired: '二维码已过期（超过24小时），请联系管理员重新生成',
        callback_failed: '绑定失败，请重试',
      };
      const errorMsg = errorMessages[errorParam] || '绑定失败，请重试';
      setErrorMessage(errorMsg);
      setPageState('invalid');
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    // 验证token
    verifyToken(authToken);
  }, [setLanguage, navigate, toast, t]);

  const verifyToken = async (authToken: string) => {
    console.log('[StaffBind] 验证token:', authToken);
    try {
      const res = await fetch(`/api/staff/bind/verify?token=${encodeURIComponent(authToken)}`);
      const data = await res.json();

      if (!data.success) {
        console.log('[StaffBind] Token验证失败:', data.message);
        setErrorMessage(data.message || t('staffBind.invalidToken'));
        setPageState('invalid');
        return;
      }

      console.log('[StaffBind] Token验证成功，显示员工信息');
      setPresetInfo(data.data);
      setPageState('ready');
    } catch (err) {
      console.error('[StaffBind] Token验证错误:', err);
      setErrorMessage(t('staffBind.invalidToken'));
      setPageState('invalid');
    }
  };

  const handleVerifyPhone = () => {
    if (!presetInfo) return;
    
    // 规范化手机号（移除非数字字符，取后9位）
    const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').slice(-9);
    
    const inputNormalized = normalizePhone(phoneInput);
    const presetNormalized = normalizePhone(presetInfo.phone);
    
    console.log('[StaffBind] 手机号验证 - 输入:', inputNormalized, '预设:', presetNormalized);
    
    if (inputNormalized === presetNormalized) {
      setPhoneVerified(true);
      console.log('[StaffBind] 手机号验证通过');
      toast({
        title: '✅ 确认成功',
        description: '信息确认通过，现在可以使用LINE授权绑定',
      });
    } else {
      console.log('[StaffBind] 手机号验证失败');
      toast({
        title: '❌ 确认失败',
        description: '手机号不匹配，请输入正确的手机号',
        variant: 'destructive',
      });
    }
  };

  const handleLineLogin = async () => {
    console.log('[StaffBind] 准备跳转LINE OAuth');
    setPageState('binding');
    
    try {
      // Get LINE Channel ID from API
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      
      const lineChannelId = configData.data?.lineChannelId;
      
      if (!lineChannelId) {
        console.error('[StaffBind] LINE配置错误');
        toast({
          title: t('common.error'),
          description: 'LINE配置错误',
          variant: 'destructive',
        });
        setPageState('ready');
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
      lineAuthUrl.searchParams.append('scope', 'profile openid');

      console.log('[StaffBind] 跳转LINE OAuth:', lineAuthUrl.toString());
      
      // Redirect to LINE OAuth
      window.location.href = lineAuthUrl.toString();
    } catch (err) {
      console.error('[StaffBind] LINE登录错误:', err);
      toast({
        title: t('common.error'),
        description: '无法连接到LINE',
        variant: 'destructive',
      });
      setPageState('ready');
    }
  };

  if (pageState === 'loading') {
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

  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t('staffBind.failed')}</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
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

  if (pageState === 'success') {
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

              {!phoneVerified ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</div>
                      <div className="text-sm text-yellow-900 dark:text-yellow-100">
                        <div className="font-medium mb-1">验证手机号</div>
                        <div className="text-yellow-700 dark:text-yellow-300">
                          请输入预设的手机号（后4位：****{presetInfo.phone.slice(-4)}）进行身份验证
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">手机号码</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="请输入手机号（如：0812345678）"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          className="pl-10"
                          data-testid="input-phone"
                        />
                      </div>
                      <Button
                        onClick={handleVerifyPhone}
                        disabled={!phoneInput}
                        data-testid="button-verify-phone"
                      >
                        验证
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      可以输入：0812345678、+66812345678 或 812345678
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="text-green-600 dark:text-green-400 mt-0.5">✅</div>
                      <div className="text-sm text-green-900 dark:text-green-100">
                        <div className="font-medium mb-1">手机号验证成功</div>
                        <div className="text-green-700 dark:text-green-300">
                          现在可以使用LINE账号完成授权绑定
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleLineLogin}
                    disabled={pageState === 'binding'}
                    data-testid="button-line-login"
                  >
                    {pageState === 'binding' ? (
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
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
