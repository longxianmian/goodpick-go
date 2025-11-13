import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="mt-8 border-t border-gray-100 pt-4 pb-6 text-xs text-muted-foreground">
      <div className="container max-w-4xl mx-auto px-4 space-y-2">
        {/* 上面一行：隐私政策 / 使用条款 */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            <a
              href="/privacy"
              className="hover:underline underline-offset-2"
            >
              {t('footer.privacy')}
            </a>

            <span className="hidden md:inline text-muted-foreground">·</span>

            <a
              href="/terms"
              className="hover:underline underline-offset-2"
            >
              {t('footer.terms')}
            </a>
          </div>

          {/* 下面一行：版权信息 */}
          <div className="text-center md:text-right">
            {t('footer.copyright')}
          </div>
        </div>
      </div>
    </footer>
  );
}
