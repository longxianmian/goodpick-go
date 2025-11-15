import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import SiteFooter from '@/components/layout/SiteFooter';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 顶部标题栏 */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="terms-title">
              {t('terms.title')}
            </h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* 主体内容区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Card data-testid="terms-content">
            <CardHeader>
              <p className="text-sm text-muted-foreground" data-testid="terms-intro">
                {t('terms.intro')}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 第一节：服务说明 */}
              <section data-testid="terms-section1">
                <CardTitle className="text-base mb-2">
                  {t('terms.section1.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('terms.section1.content')}
                </p>
              </section>

              {/* 第二节：用户责任 */}
              <section data-testid="terms-section2">
                <CardTitle className="text-base mb-2">
                  {t('terms.section2.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('terms.section2.content')}
                </p>
              </section>

              {/* 第三节：服务限制 */}
              <section data-testid="terms-section3">
                <CardTitle className="text-base mb-2">
                  {t('terms.section3.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('terms.section3.content')}
                </p>
              </section>

              {/* 第四节：免责声明 */}
              <section data-testid="terms-section4">
                <CardTitle className="text-base mb-2">
                  {t('terms.section4.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('terms.section4.content')}
                </p>
              </section>

              {/* 联系我们 */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground italic" data-testid="terms-contact">
                  {t('terms.contactUs')}
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
