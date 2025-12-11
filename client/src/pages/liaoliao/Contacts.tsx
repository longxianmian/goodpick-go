import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, UserPlus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserBottomNav } from '@/components/UserBottomNav';

export default function LiaoliaoContacts() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate('/liaoliao')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold" data-testid="text-contacts-title">
            {t('liaoliao.contacts')}
          </h1>
        </div>
      </header>

      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t('liaoliao.searchContacts')}
            className="pl-9 bg-muted/50"
            data-testid="input-search-contacts"
          />
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">{t('liaoliao.noContacts')}</p>
          <Button 
            onClick={() => navigate('/liaoliao/add-friend')}
            className="bg-[#38B03B] hover:bg-[#2e9632]"
            data-testid="button-add-first-friend"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('liaoliao.addFriend')}
          </Button>
        </div>
      </div>

      <UserBottomNav />
    </div>
  );
}
