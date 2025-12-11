import { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface VoiceSettingsPageProps {
  onBack: () => void;
}

interface VoiceProfile {
  userId: string;
  remoteVoiceForMe: string;
  myDefaultVoiceForOthers: string;
  autoCallTranscript: boolean;
}

const VOICE_OPTIONS = [
  { value: 'default', labelKey: 'voiceOptionDefault' },
  { value: 'male', labelKey: 'voiceOptionMale' },
  { value: 'female', labelKey: 'voiceOptionFemale' },
  { value: 'male_deep', labelKey: 'voiceOptionMaleDeep' },
  { value: 'female_sweet', labelKey: 'voiceOptionFemaleSweet' },
  { value: 'neutral', labelKey: 'voiceOptionNeutral' },
] as const;

export function VoiceSettingsPage({ onBack }: VoiceSettingsPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [remoteVoiceForMe, setRemoteVoiceForMe] = useState('default');
  const [myDefaultVoiceForOthers, setMyDefaultVoiceForOthers] = useState('default');
  const [autoCallTranscript, setAutoCallTranscript] = useState(false);
  
  const { data: voiceProfile, isLoading } = useQuery<VoiceProfile>({
    queryKey: ['/api/users/voice-profile'],
  });
  
  useEffect(() => {
    if (voiceProfile) {
      setRemoteVoiceForMe(voiceProfile.remoteVoiceForMe || 'default');
      setMyDefaultVoiceForOthers(voiceProfile.myDefaultVoiceForOthers || 'default');
      setAutoCallTranscript(voiceProfile.autoCallTranscript || false);
    }
  }, [voiceProfile]);
  
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<VoiceProfile>) => {
      return await apiRequest('/api/users/voice-profile', {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('saved'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/voice-profile'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error?.message || t('saveFailed'),
        variant: 'destructive',
      });
    },
  });
  
  const handleSave = () => {
    updateMutation.mutate({
      remoteVoiceForMe,
      myDefaultVoiceForOthers,
      autoCallTranscript,
    });
  };
  
  const hasChanges = voiceProfile && (
    remoteVoiceForMe !== (voiceProfile.remoteVoiceForMe || 'default') ||
    myDefaultVoiceForOthers !== (voiceProfile.myDefaultVoiceForOthers || 'default') ||
    autoCallTranscript !== (voiceProfile.autoCallTranscript || false)
  );
  
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-slate-950">
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
          <h1 className="flex-1 text-center font-semibold text-white">{t('voiceSettings')}</h1>
          <div className="w-8" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-slate-950">
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
        <h1 className="flex-1 text-center font-semibold text-white">{t('voiceSettings')}</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="h-8 px-3 hover:bg-slate-800 text-purple-400 disabled:text-slate-500"
          data-testid="button-save"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      <div className="h-2 bg-black" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 text-sm text-slate-400">
          {t('voiceSettingsDesc')}
        </div>
        
        <div className="bg-slate-900">
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900/50 flex items-center justify-center">
                <Volume2 className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <Label className="text-white font-medium">{t('remoteVoiceForMe')}</Label>
                <p className="text-xs text-slate-400 mt-1">{t('remoteVoiceForMeDesc')}</p>
              </div>
            </div>
            <Select value={remoteVoiceForMe} onValueChange={setRemoteVoiceForMe}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white" data-testid="select-remote-voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {VOICE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white hover:bg-slate-700"
                  >
                    {t(option.labelKey as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 flex items-center justify-center">
                <Volume2 className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <Label className="text-white font-medium">{t('myDefaultVoiceForOthers')}</Label>
                <p className="text-xs text-slate-400 mt-1">{t('myDefaultVoiceForOthersDesc')}</p>
              </div>
            </div>
            <Select value={myDefaultVoiceForOthers} onValueChange={setMyDefaultVoiceForOthers}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white" data-testid="select-my-voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {VOICE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white hover:bg-slate-700"
                  >
                    {t(option.labelKey as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-900/50 flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <Label className="text-white font-medium">{t('autoCallTranscript')}</Label>
                  <p className="text-xs text-slate-400 mt-1">{t('autoCallTranscriptDesc')}</p>
                </div>
              </div>
              <Switch
                checked={autoCallTranscript}
                onCheckedChange={setAutoCallTranscript}
                data-testid="switch-auto-transcript"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
