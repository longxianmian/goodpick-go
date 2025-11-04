import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [token, setToken] = useState('');
  const [presetInfo, setPresetInfo] = useState<PresetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('token');

    if (!authToken) {
      setError('Missing authorization token');
      setLoading(false);
      return;
    }

    setToken(authToken);
    verifyToken(authToken);
  }, []);

  const verifyToken = async (authToken: string) => {
    try {
      const res = await fetch(`/api/staff/bind/verify?token=${encodeURIComponent(authToken)}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Invalid authorization token');
        setLoading(false);
        return;
      }

      setPresetInfo(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Verify token error:', err);
      setError('Failed to verify authorization token');
      setLoading(false);
    }
  };

  const handleLineLogin = async () => {
    try {
      setBinding(true);

      // Check if LIFF is available
      if (typeof window !== 'undefined' && (window as any).liff) {
        const liff = (window as any).liff;

        if (!liff.isLoggedIn()) {
          // Redirect to LINE login
          liff.login({ redirectUri: window.location.href });
          return;
        }

        // Get ID token
        const idToken = liff.getIDToken();
        if (!idToken) {
          throw new Error('Failed to get LINE ID token');
        }

        // Execute binding
        const res = await fetch('/api/staff/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authToken: token,
            lineIdToken: idToken,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.message || 'Binding failed');
          toast({
            title: 'Binding Failed',
            description: data.message || 'Please check if your LINE phone number matches the registered staff phone',
            variant: 'destructive',
          });
          setBinding(false);
          return;
        }

        setBindSuccess(true);
        toast({
          title: 'Success!',
          description: 'You are now authorized to redeem coupons at this store',
        });

        // Redirect to home or success page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // LIFF not available, show error
        setError('This page must be opened from LINE app');
        toast({
          title: 'Error',
          description: 'Please open this page from LINE app',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('LINE login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      toast({
        title: 'Error',
        description: 'Failed to complete authorization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBinding(false);
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
            <CardTitle>Authorization Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => navigate('/')}
              data-testid="button-back-home"
            >
              Back to Home
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
            <CardTitle>Authorization Successful!</CardTitle>
            <CardDescription>
              You can now redeem coupons at this store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {presetInfo && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Store:</span>
                  <span className="font-medium">{presetInfo.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="font-medium">{presetInfo.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff ID:</span>
                  <span className="font-medium">{presetInfo.staffId}</span>
                </div>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              Redirecting to home...
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
          <CardTitle>Staff Authorization</CardTitle>
          <CardDescription>
            Complete your authorization to redeem coupons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {presetInfo && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Store</div>
                  <div className="font-medium">{presetInfo.storeName}</div>
                  <div className="text-sm text-muted-foreground">{presetInfo.storeAddress}</div>
                </div>
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-1">Staff Information</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2 font-medium">{presetInfo.staffName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <span className="ml-2 font-medium">{presetInfo.staffId}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="ml-2 font-medium">{presetInfo.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <div className="font-medium mb-1">Phone Verification Required</div>
                    <div className="text-blue-700 dark:text-blue-300">
                      Your LINE account's phone number must match the registered staff phone number to complete authorization.
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
                    Authorizing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Authorize with LINE
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
