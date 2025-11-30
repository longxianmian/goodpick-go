import { Link, useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Globe, Bell, Shield, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const settingsItems = [
    { 
      icon: Globe, 
      label: t('settings.language'), 
      description: t('settings.languageDesc'),
      path: '/settings/language' 
    },
    { 
      icon: Bell, 
      label: t('settings.notifications'), 
      description: t('settings.notificationsDesc'),
      path: '/settings/notifications',
      comingSoon: true
    },
    { 
      icon: Shield, 
      label: t('settings.privacy'), 
      description: t('settings.privacyDesc'),
      path: '/privacy' 
    },
    { 
      icon: HelpCircle, 
      label: t('settings.help'), 
      description: t('settings.helpDesc'),
      path: '/help' 
    },
    { 
      icon: Info, 
      label: t('settings.about'), 
      description: t('settings.aboutDesc'),
      path: '/about' 
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('settings.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {settingsItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => !item.comingSoon && setLocation(item.path)}
                  className="w-full flex items-center justify-between py-4 px-4 hover-elevate active-elevate-2 disabled:opacity-50"
                  disabled={item.comingSoon}
                  data-testid={`button-setting-${item.path.replace(/\//g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium flex items-center gap-2">
                        {item.label}
                        {item.comingSoon && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {t('common.comingSoon')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav />
    </div>
  );
}
