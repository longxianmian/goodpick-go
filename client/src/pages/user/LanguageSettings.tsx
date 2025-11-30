import { Link } from 'wouter';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserBottomNav } from '@/components/UserBottomNav';

const languages = [
  { code: 'zh-cn' as const, label: '中文简体', nativeLabel: '中文' },
  { code: 'en-us' as const, label: 'English', nativeLabel: 'English' },
  { code: 'th-th' as const, label: 'ภาษาไทย', nativeLabel: 'ไทย' },
  { code: 'id-id' as const, label: 'Bahasa Indonesia', nativeLabel: 'Indonesia' },
  { code: 'vi-vn' as const, label: 'Tiếng Việt', nativeLabel: 'Việt Nam' },
  { code: 'my-mm' as const, label: 'မြန်မာဘာသာ', nativeLabel: 'မြန်မာ' },
];

export default function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center h-12 px-4 gap-2">
          <Link href="/me">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('userCenter.language')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className="w-full flex items-center justify-between py-4 px-4 hover-elevate active-elevate-2"
                  data-testid={`button-lang-${lang.code}`}
                >
                  <div className="text-left">
                    <div className="font-medium">{lang.nativeLabel}</div>
                    <div className="text-sm text-muted-foreground">{lang.label}</div>
                  </div>
                  {language === lang.code && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <UserBottomNav />
    </div>
  );
}
