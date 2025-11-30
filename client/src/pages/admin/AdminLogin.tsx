import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { loginAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        loginAdmin(data.token, data.admin);
        toast({ title: t('adminLogin.welcome'), description: t('adminLogin.success') });
        setTimeout(() => {
          setLocation('/admin/stores');
        }, 100);
      } else {
        toast({
          title: t('adminLogin.loginFailed'),
          description: data.message || t('adminLogin.invalidCredentials'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('adminLogin.connectionError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('adminLogin.title')}</CardTitle>
          <CardDescription>{t('adminLogin.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('adminLogin.email')}</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                placeholder={t('adminLogin.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('adminLogin.password')}</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                placeholder={t('adminLogin.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('adminLogin.signingIn')}
                </>
              ) : (
                t('adminLogin.signIn')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
