import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  ChevronLeft,
  Phone,
  UserPlus,
  Check,
  Users,
  Send,
  Loader2,
  Upload,
  FileText,
  Keyboard,
  Info,
} from 'lucide-react';

interface LocalContact {
  name: string;
  phone: string;
  phoneHash: string;
}

interface MatchResult {
  phoneHash: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isFriend: boolean;
}

async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('66') && cleaned.length === 11) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+66' + cleaned.substring(1);
    } else if (cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

function parseVCard(content: string): Array<{ name: string; phone: string }> {
  const contacts: Array<{ name: string; phone: string }> = [];
  const vcards = content.split(/BEGIN:VCARD/i).filter(v => v.trim());
  
  for (const vcard of vcards) {
    let name = '';
    const phones: string[] = [];
    
    const fnMatch = vcard.match(/FN[;:]([^\r\n]+)/i);
    if (fnMatch) {
      name = fnMatch[1].replace(/^[;:=]+/, '').trim();
    }
    
    const telMatches = Array.from(vcard.matchAll(/TEL[^:]*:([^\r\n]+)/gi));
    for (const match of telMatches) {
      phones.push(match[1].trim());
    }
    
    if (phones.length > 0) {
      for (const phone of phones) {
        contacts.push({ name: name || phone, phone });
      }
    }
  }
  
  return contacts;
}

function parseCSV(content: string): Array<{ name: string; phone: string }> {
  const contacts: Array<{ name: string; phone: string }> = [];
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/[,\t;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
    
    for (const part of parts) {
      const cleaned = part.replace(/\D/g, '');
      if (cleaned.length >= 8 && cleaned.length <= 15) {
        const name = parts.find(p => p !== part && !/^\d+$/.test(p.replace(/[\s\-\+\(\)]/g, ''))) || part;
        contacts.push({ name, phone: part });
        break;
      }
    }
  }
  
  return contacts;
}

export default function PhoneImport() {
  const { t } = useLanguage();
  const { isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'input' | 'result'>('input');
  const [phoneInput, setPhoneInput] = useState('');
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [selectedForInvite, setSelectedForInvite] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('file');

  const checkPhonesMutation = useMutation({
    mutationFn: async (phoneHashes: string[]) => {
      const res = await apiRequest('POST', '/api/contacts/phone-import/check', { phoneHashes });
      return res.json();
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendUserId: string) => {
      const res = await apiRequest('POST', '/api/contacts/add-friend', {
        friendUserId,
        sourceChannel: 'phone',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/super'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/friends'] });
    },
  });

  const processContacts = async (rawContacts: Array<{ name: string; phone: string }>) => {
    setIsProcessing(true);
    try {
      const contacts: LocalContact[] = [];
      for (const c of rawContacts) {
        const normalized = normalizePhone(c.phone);
        if (normalized.length >= 8) {
          const hash = await hashPhone(normalized);
          contacts.push({
            name: c.name,
            phone: normalized,
            phoneHash: hash,
          });
        }
      }

      if (contacts.length === 0) {
        toast({
          title: t('superContacts.noValidPhones'),
          description: t('superContacts.noValidPhonesDesc'),
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      setLocalContacts(contacts);

      const hashes = contacts.map(c => c.phoneHash);
      const result = await checkPhonesMutation.mutateAsync(hashes);
      setMatchResults(result.matches || []);
      setStep('result');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('superContacts.importError'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    let contacts: Array<{ name: string; phone: string }> = [];

    if (file.name.toLowerCase().endsWith('.vcf') || content.includes('BEGIN:VCARD')) {
      contacts = parseVCard(content);
    } else {
      contacts = parseCSV(content);
    }

    if (contacts.length === 0) {
      toast({
        title: t('superContacts.noContactsInFile'),
        description: t('superContacts.noContactsInFileDesc'),
        variant: 'destructive',
      });
      return;
    }

    await processContacts(contacts);
  };

  const handleManualInput = async () => {
    if (!phoneInput.trim()) return;

    const phones = phoneInput
      .split(/[\n,;]/)
      .map(p => p.trim())
      .filter(p => p.length >= 8);

    const contacts = phones.map(phone => ({
      name: phone,
      phone: phone,
    }));

    await processContacts(contacts);
  };

  const canAddAsFriend = matchResults.filter(m => !m.isFriend);
  const alreadyFriends = matchResults.filter(m => m.isFriend);
  const notOnPlatform = localContacts.filter(
    c => !matchResults.some(m => m.phoneHash === c.phoneHash)
  );

  const handleAddAllFriends = async () => {
    setIsProcessing(true);
    try {
      for (const match of canAddAsFriend) {
        await addFriendMutation.mutateAsync(match.userId);
      }
      toast({
        title: t('superContacts.friendsAdded'),
        description: t('superContacts.friendsAddedDesc', { count: String(canAddAsFriend.length) }),
      });
      setMatchResults(prev => prev.map(m => ({ ...m, isFriend: true })));
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('superContacts.addFriendError'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSingleFriend = async (userId: string) => {
    try {
      await addFriendMutation.mutateAsync(userId);
      setMatchResults(prev =>
        prev.map(m => (m.userId === userId ? { ...m, isFriend: true } : m))
      );
      toast({
        title: t('superContacts.friendAdded'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('superContacts.addFriendError'),
        variant: 'destructive',
      });
    }
  };

  const toggleInviteSelection = (phoneHash: string) => {
    setSelectedForInvite(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phoneHash)) {
        newSet.delete(phoneHash);
      } else {
        newSet.add(phoneHash);
      }
      return newSet;
    });
  };

  const handleSendInvites = async () => {
    if (selectedForInvite.size === 0) return;

    toast({
      title: t('superContacts.invitesSent'),
      description: t('superContacts.invitesSentDesc', { count: String(selectedForInvite.size) }),
    });
    setSelectedForInvite(new Set());
  };

  if (!isUserAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Phone className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('superContacts.loginRequired')}</h2>
        <Button onClick={() => navigate('/me')} data-testid="button-login">
          {t('common.login')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step === 'result' ? setStep('input') : navigate('/super-contacts'))}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">{t('superContacts.phoneImportTitle')}</h1>
        </div>
      </header>

      {step === 'input' && (
        <div className="flex-1 p-4">
          <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {t('superContacts.browserLimitNote')}
                </p>
              </div>
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {t('superContacts.uploadFile')}
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                {t('superContacts.manualInput')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <Card className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#38B03B]/10 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-[#38B03B]" />
                  </div>
                  <h3 className="font-medium mb-2">{t('superContacts.uploadVcardTitle')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('superContacts.uploadVcardDesc')}
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vcf,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-file"
                  />
                  
                  <Button
                    className="w-full bg-[#38B03B] hover:bg-[#2d8f2f]"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    data-testid="button-upload"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {t('superContacts.selectFile')}
                  </Button>
                  
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg w-full">
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      {t('superContacts.howToExport')}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 text-left">
                      <li>• iPhone: {t('superContacts.exportIphone')}</li>
                      <li>• Android: {t('superContacts.exportAndroid')}</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="manual">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#38B03B]/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#38B03B]" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t('superContacts.inputPhones')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('superContacts.inputPhonesDesc')}
                    </p>
                  </div>
                </div>
                <textarea
                  className="w-full min-h-[200px] p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#38B03B]/50 bg-background"
                  placeholder={t('superContacts.phonePlaceholder')}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  data-testid="input-phones"
                />
                <Button
                  className="w-full mt-4 bg-[#38B03B] hover:bg-[#2d8f2f]"
                  onClick={handleManualInput}
                  disabled={isProcessing || !phoneInput.trim()}
                  data-testid="button-check"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {t('superContacts.checkPhones')}
                </Button>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('superContacts.privacyNote')}
          </p>
        </div>
      )}

      {step === 'result' && (
        <div className="flex-1 p-4 pb-24">
          <Card className="p-3 mb-4 bg-muted/50">
            <p className="text-sm text-center">
              {t('superContacts.foundContacts', { 
                total: String(localContacts.length),
                matched: String(matchResults.length) 
              })}
            </p>
          </Card>

          {canAddAsFriend.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#38B03B]" />
                  {t('superContacts.canAddFriend')} ({canAddAsFriend.length})
                </h3>
                <Button
                  size="sm"
                  className="bg-[#38B03B] hover:bg-[#2d8f2f]"
                  onClick={handleAddAllFriends}
                  disabled={isProcessing}
                  data-testid="button-add-all"
                >
                  {t('superContacts.addAll')}
                </Button>
              </div>
              <div className="space-y-2">
                {canAddAsFriend.map((match) => (
                  <div
                    key={match.userId}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg"
                    data-testid={`match-${match.userId}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={match.avatarUrl} />
                      <AvatarFallback className="bg-[#38B03B]/10 text-[#38B03B]">
                        {match.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium">{match.displayName}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSingleFriend(match.userId)}
                      disabled={addFriendMutation.isPending}
                      data-testid={`button-add-${match.userId}`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alreadyFriends.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium flex items-center gap-2 mb-3 text-muted-foreground">
                <Check className="w-4 h-4" />
                {t('superContacts.alreadyFriends')} ({alreadyFriends.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {alreadyFriends.map((match) => (
                  <div
                    key={match.userId}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={match.avatarUrl} />
                      <AvatarFallback>{match.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{match.displayName}</span>
                    <Check className="w-4 h-4 text-[#38B03B]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {notOnPlatform.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Send className="w-4 h-4 text-orange-500" />
                {t('superContacts.canInvite')} ({notOnPlatform.length})
              </h3>
              <div className="space-y-2">
                {notOnPlatform.map((contact) => (
                  <div
                    key={contact.phoneHash}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg"
                    data-testid={`invite-${contact.phoneHash}`}
                  >
                    <Checkbox
                      checked={selectedForInvite.has(contact.phoneHash)}
                      onCheckedChange={() => toggleInviteSelection(contact.phoneHash)}
                      data-testid={`checkbox-${contact.phoneHash}`}
                    />
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{contact.name}</span>
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {localContacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('superContacts.noContactsFound')}</p>
            </div>
          )}
        </div>
      )}

      {step === 'result' && selectedForInvite.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button
            className="w-full bg-[#38B03B] hover:bg-[#2d8f2f]"
            onClick={handleSendInvites}
            data-testid="button-send-invites"
          >
            <Send className="w-4 h-4 mr-2" />
            {t('superContacts.sendInvites')} ({selectedForInvite.size})
          </Button>
        </div>
      )}
    </div>
  );
}
