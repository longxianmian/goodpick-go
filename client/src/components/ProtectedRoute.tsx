import { useAuth, UserRoleType } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LineLoginButton } from "@/components/LineLoginButton";
import { LogIn, Lock, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRoleType;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isUserAuthenticated, authPhase, user, hasRole } = useAuth();
  const { t } = useLanguage();
  const [location, navigate] = useLocation();

  if (authPhase === 'booting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38B03B] mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isUserAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#38B03B]/10 to-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#38B03B]/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-[#38B03B]" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('auth.loginRequired')}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t('auth.loginRequiredDesc')}
            </p>
            <div className="space-y-3">
              <LineLoginButton 
                returnTo={location}
                className="w-full bg-[#06C755] hover:bg-[#05b04c]"
              />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/')}
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.backToHome')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-500/10 to-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('auth.noPermission')}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t('auth.noPermissionDesc')}
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
