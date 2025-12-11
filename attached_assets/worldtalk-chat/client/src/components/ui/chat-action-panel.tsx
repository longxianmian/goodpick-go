import { Button } from '@/components/ui/button';
import { 
  Image, 
  Camera, 
  MapPin,
  Phone,
  FileText,
  Star,
  User,
  Video,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface ChatActionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'gallery' | 'camera' | 'location' | 'voice-call' | 'file' | 'favorites' | 'card' | 'video-call') => void;
}

export function ChatActionPanel({ isOpen, onClose, onSelectAction }: ChatActionPanelProps) {
  const actions = [
    {
      id: 'gallery' as const,
      label: t('gallery'),
      icon: Image,
      testId: 'action-gallery'
    },
    {
      id: 'camera' as const,
      label: t('camera'),
      icon: Camera,
      testId: 'action-camera'
    },
    {
      id: 'voice-call' as const,
      label: t('voiceCall'),
      icon: Phone,
      testId: 'action-voice-call'
    },
    {
      id: 'location' as const,
      label: t('location'),
      icon: MapPin,
      testId: 'action-location'
    },
    {
      id: 'file' as const,
      label: t('file'),
      icon: FileText,
      testId: 'action-file'
    },
    {
      id: 'favorites' as const,
      label: t('favorites'),
      icon: Star,
      testId: 'action-favorites'
    },
    {
      id: 'card' as const,
      label: t('businessCard'),
      icon: User,
      testId: 'action-card'
    },
    {
      id: 'video-call' as const,
      label: t('videoCall'),
      icon: Video,
      testId: 'action-video-call'
    }
  ];

  const handleActionClick = (actionId: typeof actions[0]['id']) => {
    onSelectAction(actionId);
    onClose();
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ease-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        data-testid="action-panel-overlay"
      />
      
      {/* 功能面板 */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 w-full bg-card border-t border-border z-50 transition-all duration-300 ease-out",
        isOpen ? "translate-y-0" : "translate-y-full"
      )}>
        {/* 面板头部 */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-sm font-medium text-muted-foreground">{t('selectFunction')}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            data-testid="action-panel-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 功能图标网格 */}
        <div className="p-6 pb-8">
          <div className="grid grid-cols-4 gap-6">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div 
                  key={action.id}
                  className="flex flex-col items-center space-y-2"
                >
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-14 h-14 p-0 bg-muted hover:bg-accent rounded-2xl flex-shrink-0 transition-colors"
                    onClick={() => handleActionClick(action.id)}
                    data-testid={action.testId}
                  >
                    <Icon className="w-6 h-6 text-foreground" />
                  </Button>
                  <span className="text-xs text-muted-foreground text-center">
                    {action.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 底部安全区域 */}
        <div className="h-6 bg-card" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </>
  );
}