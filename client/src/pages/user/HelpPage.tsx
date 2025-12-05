import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, MessageCircle, FileQuestion, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserBottomNav } from '@/components/UserBottomNav';

export default function HelpPage() {
  const { t } = useLanguage();

  const helpItems = [
    {
      icon: FileQuestion,
      label: t('help.faq'),
      description: t('help.faqDesc'),
    },
    {
      icon: MessageCircle,
      label: t('help.contact'),
      description: t('help.contactDesc'),
    },
    {
      icon: Phone,
      label: t('help.phone'),
      description: '+66 2-xxx-xxxx',
    },
    {
      icon: Mail,
      label: t('help.email'),
      description: 'support@shuashua.app',
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
          <h1 className="text-lg font-bold" data-testid="text-page-title">{t('userCenter.help')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {helpItems.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-4 px-4 hover-elevate active-elevate-2 cursor-pointer"
                  data-testid={`help-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <UserBottomNav />
    </div>
  );
}
