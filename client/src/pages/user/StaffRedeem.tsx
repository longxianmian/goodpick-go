import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import StaffBottomNav from "@/components/StaffBottomNav";

interface CouponData {
  coupon: {
    id: number;
    code: string;
    status: string;
    issuedAt: string;
    expiredAt: string;
  };
  campaign: {
    id: number;
    title: string;
    description: string;
    bannerImageUrl: string | null;
    couponValue: string;
    discountType: "final_price" | "percentage_off" | "cash_voucher";
    originalPrice: string | null;
  };
  user: {
    id: number;
    displayName: string | null;
    phone: string | null;
  };
}

export default function StaffRedeem() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, userToken, loginUser } = useAuth();
  const { t, language } = useLanguage();

  const [inputCode, setInputCode] = useState("");
  const [notes, setNotes] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [querying, setQuerying] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 异步检测LIFF环境（等待SDK加载）
  const detectLiffEnvironment = async (): Promise<boolean> => {
    const maxWaitTime = 5000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      if ((window as any).liff) {
        try {
          const isInClient = (window as any).liff.isInClient?.() || false;
          return isInClient;
        } catch (e) {
          console.error('[detectLiffEnvironment] liff.isInClient() error:', e);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Fallback: LIFF SDK未加载，检查UA
    const ua = navigator.userAgent;
    return ua.includes('Line/') || ua.includes('LIFF');
  };

  // LIFF登录
  const handleLiffLogin = async () => {
    setIsLoggingIn(true);
    try {
      if (!(window as any).liff) {
        console.error('[StaffRedeem] LIFF SDK not available');
        toast({
          title: t('common.error'),
          description: 'LIFF not available',
          variant: 'destructive',
        });
        return;
      }

      const liff = (window as any).liff;

      // 初始化LIFF（如果还没初始化）
      if (!(window as any).__LIFF_INITED__) {
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId) {
          console.error('[StaffRedeem] No LIFF ID configured');
          toast({
            title: t('common.error'),
            description: 'LIFF ID not configured',
            variant: 'destructive',
          });
          return;
        }
        
        await liff.init({ liffId });
        (window as any).__LIFF_INITED__ = true;
      }

      // 检查登录状态
      if (!liff.isLoggedIn()) {
        await liff.login();
        return;
      }

      // 获取ID Token并登录后端
      const idToken = liff.getIDToken();
      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        loginUser(data.token, data.user);
        toast({
          title: t('common.success'),
          description: t('staffRedeem.bindSuccessDesc'),
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('[StaffRedeem] Login error:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Web OAuth登录
  const handleWebLogin = async () => {
    setIsLoggingIn(true);
    const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID || '2008410104';
    if (!lineChannelId) {
      toast({
        title: t('common.error'),
        description: 'LINE Channel ID not configured',
        variant: 'destructive',
      });
      setIsLoggingIn(false);
      return;
    }

    const origin = window.location.origin.replace(/^http:/, 'https:');
    const redirectUri = `${origin}/api/auth/line/callback`;
    
    const stateNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    try {
      const initResponse = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: stateNonce,
          returnTo: '/staff/redeem',
        }),
        credentials: 'include',
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize OAuth');
      }

      const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', lineChannelId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', stateNonce);
      authUrl.searchParams.set('scope', 'profile openid');
      authUrl.searchParams.set('nonce', stateNonce);
      
      window.location.href = authUrl.toString();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Login failed',
        variant: 'destructive',
      });
      setIsLoggingIn(false);
    }
  };

  // 处理登录按钮点击
  const handleLoginClick = async () => {
    const isLiff = await detectLiffEnvironment();
    
    if (isLiff) {
      await handleLiffLogin();
    } else {
      await handleWebLogin();
    }
  };

  // 【修复】页面加载时自动检测并登录（只执行一次）
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      const firstLogin = params.get("firstLogin");

      if (urlToken) {
        // OAuth回调：验证token
        try {
          const res = await fetch("/api/user/verify", {
            headers: { Authorization: `Bearer ${urlToken}` },
          });
          const data = await res.json();
          
          if (mounted && data.success && data.user) {
            loginUser(urlToken, data.user);

            if (firstLogin === "true") {
              toast({
                title: t("staffRedeem.bindSuccess") || "绑定成功",
                description: t("staffRedeem.bindSuccessDesc") || "欢迎使用员工工作台",
              });
            }

            // Clean URL
            window.history.replaceState({}, "", "/staff/redeem");
          }
        } catch (err) {
          console.error("Token verification failed:", err);
        } finally {
          if (mounted) setAuthChecking(false);
        }
      } else {
        // 不管有没有localStorage的token，都检测LIFF环境
        const isLiff = await detectLiffEnvironment();
        
        if (isLiff && !user) {
          // 在LIFF环境中且未登录，自动触发LIFF登录
          try {
            await handleLiffLogin();
          } finally {
            if (mounted) setAuthChecking(false);
          }
        } else {
          // 外部浏览器或已登录，停止loading
          if (mounted) setAuthChecking(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []); // 只在组件挂载时执行一次

  // Check if user is authenticated
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t("staffRedeem.loginRequired")}
            </CardTitle>
            <CardDescription>
              {t("staffRedeem.loginRequiredDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleLoginClick}
              disabled={isLoggingIn}
              className="w-full"
              data-testid="button-login-with-line"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("staffRedeem.loginWithLine")
              )}
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
              data-testid="button-goto-home"
            >
              {t("staffRedeem.backHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleQuery = async () => {
    if (!inputCode.trim()) {
      toast({
        title: t("staffRedeem.enterCode"),
        description: t("staffRedeem.enterCodeDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{8}$/.test(inputCode.trim())) {
      toast({
        title: t("staffRedeem.invalidFormat"),
        description: t("staffRedeem.invalidFormatDesc"),
        variant: "destructive",
      });
      return;
    }

    setQuerying(true);
    setCouponData(null);

    try {
      const response = await fetch("/api/staff/redeem/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ code: inputCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setCouponData(data.data);
        toast({
          title: t("staffRedeem.querySuccess"),
          description: t("staffRedeem.querySuccessDesc"),
        });
      } else {
        toast({
          title: t("staffRedeem.queryFailed"),
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Query error:", error);
      toast({
        title: t("staffRedeem.queryFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setQuerying(false);
    }
  };

  const handleRedeem = async () => {
    if (!couponData) {
      return;
    }

    setRedeeming(true);

    try {
      const response = await fetch("/api/staff/redeem/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          couponId: couponData.coupon.id,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRedeemSuccess(true);
        toast({
          title: t("staffRedeem.redeemSuccess"),
          description: t("staffRedeem.redeemSuccessDesc"),
        });
      } else {
        toast({
          title: t("staffRedeem.redeemFailed"),
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Redeem error:", error);
      toast({
        title: t("staffRedeem.redeemFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  const handleReset = () => {
    setInputCode("");
    setNotes("");
    setCouponData(null);
    setRedeemSuccess(false);
  };

  if (redeemSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              {t("staffRedeem.redeemSuccess")}
            </CardTitle>
            <CardDescription>
              {t("staffRedeem.redeemSuccessDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-center text-2xl font-bold text-green-600">
                {couponData?.coupon.code}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("staffRedeem.customerName")}:
                </span>
                <span className="font-medium">
                  {couponData?.user.displayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("staffRedeem.campaignName")}:
                </span>
                <span className="font-medium">
                  {couponData?.campaign.title}
                </span>
              </div>
              {notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("staffRedeem.notes")}:
                  </span>
                  <span className="font-medium">{notes}</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleReset}
              className="w-full"
              data-testid="button-redeem-another"
            >
              {t("staffRedeem.redeemAnother")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          {/* Manual Code Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="w-5 h-5" />
                {t("staffRedeem.title")}
              </CardTitle>
              <CardDescription>{t("staffRedeem.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input-code">{t("staffRedeem.codeLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="input-code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{8}"
                    maxLength={8}
                    placeholder={t("staffRedeem.codePlaceholder")}
                    value={inputCode}
                    onChange={(e) =>
                      setInputCode(e.target.value.replace(/\D/g, ""))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !querying) {
                        handleQuery();
                      }
                    }}
                    disabled={querying || !!couponData}
                    className="text-2xl tracking-widest text-center font-mono"
                    data-testid="input-redemption-code"
                  />
                  <Button
                    onClick={handleQuery}
                    disabled={querying || !!couponData}
                    data-testid="button-query-coupon"
                  >
                    {querying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("staffRedeem.query")
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {couponData && (
            <Card>
              <CardHeader>
                <CardTitle>{t("staffRedeem.couponDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {couponData.campaign.bannerImageUrl && (
                  <img
                    src={couponData.campaign.bannerImageUrl}
                    alt={couponData.campaign.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}

                <div>
                  <h3 className="text-xl font-semibold">
                    {couponData.campaign.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {couponData.campaign.description}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {t("staffRedeem.codeLabel")}
                    </p>
                    <p className="font-mono font-bold text-lg">
                      {couponData.coupon.code}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("staffRedeem.couponValue")}
                    </p>
                    <p className="font-bold text-lg text-orange-600">
                      {couponData.campaign.discountType === "percentage_off"
                        ? `${couponData.campaign.couponValue}%`
                        : `฿${couponData.campaign.couponValue}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("staffRedeem.customerName")}
                    </p>
                    <p className="font-medium">
                      {couponData.user.displayName || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("staffRedeem.customerPhone")}
                    </p>
                    <p className="font-medium">
                      {couponData.user.phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("coupon.issuedAt")}
                    </p>
                    <p className="text-xs">
                      {new Date(couponData.coupon.issuedAt).toLocaleString(
                        language,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("staffRedeem.validUntil")}
                    </p>
                    <p className="text-xs">
                      {new Date(couponData.coupon.expiredAt).toLocaleString(
                        language,
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="textarea-notes">
                    {t("staffRedeem.notes")}
                  </Label>
                  <Textarea
                    id="textarea-notes"
                    placeholder={t("staffRedeem.notesPlaceholder")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    data-testid="button-confirm-redeem"
                  >
                    {redeeming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("staffRedeem.redeeming")}
                      </>
                    ) : (
                      t("staffRedeem.confirmRedeem")
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <StaffBottomNav active="redeem" />
    </div>
  );
}
