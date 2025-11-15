import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import SiteFooter from '@/components/layout/SiteFooter';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 顶部标题栏 */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="privacy-title">
              {t('privacy.title')}
            </h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* 主体内容区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Card data-testid="privacy-content">
            <CardHeader>
              <p className="text-sm text-muted-foreground" data-testid="privacy-intro">
                {t('privacy.intro')}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 第一节：信息收集 */}
              <section data-testid="privacy-section1">
                <CardTitle className="text-base mb-2">
                  {t('privacy.section1.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('privacy.section1.content')}
                </p>
              </section>

              {/* 第二节：信息使用 */}
              <section data-testid="privacy-section2">
                <CardTitle className="text-base mb-2">
                  {t('privacy.section2.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('privacy.section2.content')}
                </p>
              </section>

              {/* 第三节：信息保护 */}
              <section data-testid="privacy-section3">
                <CardTitle className="text-base mb-2">
                  {t('privacy.section3.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('privacy.section3.content')}
                </p>
              </section>

              {/* 第四节：您的权利 */}
              <section data-testid="privacy-section4">
                <CardTitle className="text-base mb-2">
                  {t('privacy.section4.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('privacy.section4.content')}
                </p>
              </section>

              {/* 更新通知 */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground italic" data-testid="privacy-update-notice">
                  {t('privacy.updateNotice')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 页脚 */}
        <SiteFooter />
      </main>
    </div>
  );
}
