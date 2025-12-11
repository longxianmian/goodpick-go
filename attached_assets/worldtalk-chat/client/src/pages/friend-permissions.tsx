import { ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface FriendPermissionsPageProps {
  onBack: () => void;
}

export function FriendPermissionsPage({ onBack }: FriendPermissionsPageProps) {
  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="h-14 bg-slate-900 flex items-center px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 hover:bg-slate-800"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-white">{t('friendPermissions')}</h1>
        <div className="w-8" />
      </div>

      {/* 黑色分隔线 */}
      <div className="h-2 bg-black" />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <UserPlus className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {t('inDevelopment')}...
          </p>
        </div>
      </div>
    </div>
  );
}
