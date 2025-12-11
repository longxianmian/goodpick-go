import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import { apiRequest } from '@/lib/queryClient';

export function ChatRedirectPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleRedirect = async () => {
      // Get Magic Link token from URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('ml');

      if (!token) {
        toast({
          title: t('error'),
          description: t('invalid_invite_link'),
          variant: 'destructive'
        });
        setLocation('/');
        return;
      }

      try {
        // Accept invitation
        const response = await apiRequest('/api/invite/accept', {
          method: 'POST',
          body: JSON.stringify({ ml: token })
        });

        if (response.ok) {
          toast({
            title: t('success'),
            description: t('invite_accepted_successfully')
          });

          // Redirect to chat page
          const chatPath = response.roomType === 'group' 
            ? `/chat/group/${response.roomId}`
            : `/chat/friend/${response.roomId}`;
          
          setLocation(chatPath);
        } else {
          throw new Error(response.error || 'Failed to accept invite');
        }
      } catch (error: any) {
        console.error('Failed to accept invite:', error);
        
        let errorMessage = t('failed_to_accept_invite');
        if (error.message === 'INVALID_OR_EXPIRED') {
          errorMessage = t('invite_link_expired');
        } else if (error.message === 'MISSING_TOKEN') {
          errorMessage = t('invalid_invite_link');
        }
        
        toast({
          title: t('error'),
          description: errorMessage,
          variant: 'destructive'
        });
        
        setLocation('/');
      }
    };

    handleRedirect();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('accepting')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('processing_invite')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}