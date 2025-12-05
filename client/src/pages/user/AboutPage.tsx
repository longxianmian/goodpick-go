import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserBottomNav } from '@/components/UserBottomNav';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('userCenter.about')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="text-center py-8 mb-4">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-primary">SS</span>
          </div>
          <h2 className="text-xl font-bold" data-testid="text-app-name">{t('about.appName')}</h2>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-version">
            {t('about.version')} 1.0.0
          </p>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-description">
              {t('about.description')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <Link href="/terms">
                <div className="flex items-center justify-between py-4 px-4 hover-elevate active-elevate-2 cursor-pointer" data-testid="link-terms">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">{t('about.terms')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/privacy">
                <div className="flex items-center justify-between py-4 px-4 hover-elevate active-elevate-2 cursor-pointer" data-testid="link-privacy">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">{t('about.privacy')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p data-testid="text-copyright">{t('about.copyright')}</p>
        </div>
      </main>

      <UserBottomNav />
    </div>
  );
}
