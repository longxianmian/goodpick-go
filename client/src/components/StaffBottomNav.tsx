import { useLocation } from 'wouter';
import { ScanLine, Info, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StaffBottomNavProps {
  active: 'redeem' | 'campaign' | 'stats';
}

export default function StaffBottomNav({ active }: StaffBottomNavProps) {
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-50">
      <div className="container max-w-4xl mx-auto grid grid-cols-3">
        <button
          onClick={() => navigate('/staff/redeem')}
          className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${
            active === 'redeem' ? 'border-b-2 border-orange-500' : ''
          }`}
          data-testid="nav-staff-redeem"
        >
          <ScanLine
            className={`h-5 w-5 ${
              active === 'redeem' ? 'text-orange-500' : 'text-muted-foreground'
            }`}
          />
          <span
            className={`text-xs ${
              active === 'redeem'
                ? 'font-medium text-orange-500'
                : 'text-muted-foreground'
            }`}
          >
            {t('staffNav.redeem')}
          </span>
        </button>
        <button
          onClick={() => navigate('/staff/campaign')}
          className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${
            active === 'campaign' ? 'border-b-2 border-orange-500' : ''
          }`}
          data-testid="nav-staff-campaign"
        >
          <Info
            className={`h-5 w-5 ${
              active === 'campaign' ? 'text-orange-500' : 'text-muted-foreground'
            }`}
          />
          <span
            className={`text-xs ${
              active === 'campaign'
                ? 'font-medium text-orange-500'
                : 'text-muted-foreground'
            }`}
          >
            {t('staffNav.campaign')}
          </span>
        </button>
        <button
          onClick={() => navigate('/staff/stats')}
          className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${
            active === 'stats' ? 'border-b-2 border-orange-500' : ''
          }`}
          data-testid="nav-staff-stats"
        >
          <BarChart3
            className={`h-5 w-5 ${
              active === 'stats' ? 'text-orange-500' : 'text-muted-foreground'
            }`}
          />
          <span
            className={`text-xs ${
              active === 'stats'
                ? 'font-medium text-orange-500'
                : 'text-muted-foreground'
            }`}
          >
            {t('staffNav.stats')}
          </span>
        </button>
      </div>
    </div>
  );
}
