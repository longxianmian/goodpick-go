import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Search,
  Plus,
  UserPlus,
  QrCode,
  Link2,
  MessageCircle,
  Phone,
  Users,
  Store,
  Bot,
  ChevronLeft,
  Share2,
  Copy,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { SiLine, SiWhatsapp, SiTelegram, SiFacebook } from 'react-icons/si';
import { shareInviteToLineFriends, isShareTargetPickerAvailable } from '@/lib/liffClient';

type FilterType = 'all' | 'friends' | 'phone' | 'im' | 'stores' | 'agents';
type InviteChannel = 'line' | 'whatsapp' | 'viber' | 'telegram' | 'sms' | 'generic';

interface UnifiedContact {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  contactType: 'user' | 'merchant' | 'agent' | 'system';
  sources: Array<{
    sourceType: 'platform' | 'phone' | 'im';
    imChannel?: string;
    status: 'not_known' | 'invited' | 'registered' | 'friend';
    lastInvitedAt?: string;
    inviteChannel?: string;
  }>;
  isFriend: boolean;
  isRegistered: boolean;
  lastMessageAt?: string;
  languages?: string[];
}

interface InviteResult {
  inviteCode: string;
  inviteUrl: string;
  inviteQrImageUrl?: string;
}

const IM_CHANNELS = [
  { id: 'line', name: 'LINE', icon: SiLine, color: '#00B900' },
  { id: 'whatsapp', name: 'WhatsApp', icon: SiWhatsapp, color: '#25D366' },
  { id: 'viber', name: 'Viber', icon: MessageCircle, color: '#7360F2' },
  { id: 'telegram', name: 'Telegram', icon: SiTelegram, color: '#0088CC' },
  { id: 'sms', name: 'SMS', icon: MessageCircle, color: '#666666' },
];

export default function SuperContacts() {
  const { t, language: currentLang } = useLanguage();
  const { user, isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [imShareSheetOpen, setImShareSheetOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<InviteResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLineInviting, setIsLineInviting] = useState(false);
  const [linePickerAvailable, setLinePickerAvailable] = useState(false);

  useEffect(() => {
    isShareTargetPickerAvailable().then(setLinePickerAvailable);
  }, []);

  const { data: contactsData, isLoading } = useQuery<{ data: UnifiedContact[] }>({
    queryKey: ['/api/contacts/super'],
    enabled: isUserAuthenticated,
  });

  const generateInviteMutation = useMutation({
    mutationFn: async (params: { channel: InviteChannel; scene: string }) => {
      const res = await apiRequest('POST', '/api/invites/generate', params);
      return res.json();
    },
    onSuccess: (data: InviteResult) => {
      setCurrentInvite(data);
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('superContacts.inviteError'),
        variant: 'destructive',
      });
    },
  });

  const filters: { id: FilterType; label: string; icon: any }[] = [
    { id: 'all', label: t('superContacts.filterAll'), icon: Users },
    { id: 'friends', label: t('superContacts.filterFriends'), icon: UserPlus },
    { id: 'phone', label: t('superContacts.filterPhone'), icon: Phone },
    { id: 'im', label: t('superContacts.filterIM'), icon: MessageCircle },
    { id: 'stores', label: t('superContacts.filterStores'), icon: Store },
    { id: 'agents', label: t('superContacts.filterAgents'), icon: Bot },
  ];

  const contacts = contactsData?.data || [];
  
  const filteredContacts = contacts.filter(contact => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!contact.displayName.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    switch (activeFilter) {
      case 'friends':
        return contact.isFriend;
      case 'phone':
        return contact.sources.some(s => s.sourceType === 'phone');
      case 'im':
        return contact.sources.some(s => s.sourceType === 'im');
      case 'stores':
        return contact.contactType === 'merchant';
      case 'agents':
        return contact.contactType === 'agent';
      default:
        return true;
    }
  });

  const handleLineInvite = async () => {
    setIsLineInviting(true);
    setInviteSheetOpen(false);
    
    try {
      const result = await generateInviteMutation.mutateAsync({ channel: 'line', scene: 'line_share' });
      const inviterName = user?.displayName || user?.shuaName || 'ShuaShua';
      const success = await shareInviteToLineFriends(result.inviteUrl, inviterName);
      
      if (success) {
        toast({
          title: t('superContacts.inviteSent'),
          description: t('superContacts.lineInviteSentDesc'),
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('superContacts.inviteError'),
        variant: 'destructive',
      });
    } finally {
      setIsLineInviting(false);
    }
  };

  const handleInviteOption = async (option: 'phone' | 'im' | 'qr' | 'link' | 'line') => {
    setInviteSheetOpen(false);
    
    switch (option) {
      case 'line':
        handleLineInvite();
        break;
      case 'phone':
        navigate('/super-contacts/phone-import');
        break;
      case 'im':
        setImShareSheetOpen(true);
        break;
      case 'qr':
        await generateInviteMutation.mutateAsync({ channel: 'generic', scene: 'face_to_face' });
        setQrDialogOpen(true);
        break;
      case 'link':
        const result = await generateInviteMutation.mutateAsync({ channel: 'generic', scene: 'super_contacts' });
        await navigator.clipboard.writeText(result.inviteUrl);
        setCopiedLink(true);
        toast({
          title: t('superContacts.linkCopied'),
          description: t('superContacts.linkCopiedDesc'),
        });
        setTimeout(() => setCopiedLink(false), 3000);
        break;
    }
  };

  const handleIMShare = async (channel: InviteChannel) => {
    setImShareSheetOpen(false);
    const result = await generateInviteMutation.mutateAsync({ channel, scene: 'chat_share' });
    
    const shareText = getShareText(channel, result.inviteUrl);
    
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          url: result.inviteUrl,
        });
      } catch (err) {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: t('superContacts.textCopied'),
          description: t('superContacts.pasteToShare'),
        });
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: t('superContacts.textCopied'),
        description: t('superContacts.pasteToShare'),
      });
    }
  };

  const getShareText = (channel: string, url: string): string => {
    const templates: Record<string, Record<string, string>> = {
      'zh-cn': {
        default: `我在用「聊聊 & 刷刷」和你跨语言聊天，还能一起领附近好店优惠。点这里加入：${url}`,
      },
      'en-us': {
        default: `I'm using "LiaoLiao & ShuaShua" to chat with you across languages and get local shop discounts. Join here: ${url}`,
      },
      'th-th': {
        default: `ฉันใช้ "LiaoLiao & ShuaShua" เพื่อแชทข้ามภาษาและรับส่วนลดจากร้านค้าใกล้ตัว มาร่วมกันที่ลิงก์นี้: ${url}`,
      },
      'vi-vn': {
        default: `Tôi đang sử dụng "LiaoLiao & ShuaShua" để trò chuyện đa ngôn ngữ và nhận ưu đãi từ cửa hàng địa phương. Tham gia tại đây: ${url}`,
      },
      'my-mm': {
        default: `LiaoLiao & ShuaShua ကိုသုံးပြီး ဘာသာစကားမတူဘဲ စကားပြောနိုင်တယ်၊ အနီးအနား ဆိုင်တွေက လျော့ဈေးတွေလည်း ရရှိနိုင်တယ်။ ဤလင့်ကိုနှိပ်ပြီး ပါဝင်လိုက်ပါ: ${url}`,
      },
      'id-id': {
        default: `Saya menggunakan "LiaoLiao & ShuaShua" untuk chat lintas bahasa dan mendapatkan diskon toko lokal. Bergabung di sini: ${url}`,
      },
    };

    const langTemplates = templates[currentLang] || templates['en-us'];
    return langTemplates[channel] || langTemplates.default;
  };

  const getContactStatusBadge = (contact: UnifiedContact) => {
    if (contact.isFriend) {
      return <Badge variant="secondary" className="text-xs">{t('superContacts.statusFriend')}</Badge>;
    }
    if (contact.isRegistered) {
      return <Badge variant="outline" className="text-xs">{t('superContacts.statusRegistered')}</Badge>;
    }
    const invitedSource = contact.sources.find(s => s.status === 'invited');
    if (invitedSource) {
      return <Badge variant="outline" className="text-xs text-muted-foreground">{t('superContacts.statusInvited')}</Badge>;
    }
    return null;
  };

  const getContactSourceIcon = (contact: UnifiedContact) => {
    const imSource = contact.sources.find(s => s.sourceType === 'im');
    if (imSource?.imChannel) {
      const channel = IM_CHANNELS.find(c => c.id === imSource.imChannel);
      if (channel) {
        const Icon = channel.icon;
        return <Icon className="w-3 h-3" style={{ color: channel.color }} />;
      }
    }
    
    const phoneSource = contact.sources.find(s => s.sourceType === 'phone');
    if (phoneSource) {
      return <Phone className="w-3 h-3 text-muted-foreground" />;
    }
    
    return null;
  };

  if (!isUserAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium mb-2">{t('superContacts.loginRequired')}</h2>
        <p className="text-muted-foreground text-center mb-4">{t('superContacts.loginDesc')}</p>
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
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">{t('superContacts.title')}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {}}
            data-testid="button-search"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="px-4 py-3">
        <Input
          placeholder={t('superContacts.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          data-testid="input-search"
        />
      </div>

      <Card className="mx-4 mb-3 p-4">
        <Button
          className="w-full h-14 bg-[#00B900] hover:bg-[#009900] text-white gap-3 text-base font-medium"
          onClick={handleLineInvite}
          disabled={isLineInviting}
          data-testid="button-line-invite-main"
        >
          {isLineInviting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <SiLine className="w-6 h-6" />
          )}
          {t('superContacts.inviteLineFriends')}
        </Button>
        
        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex-1">
            <h3 className="font-medium text-sm">{t('superContacts.otherMethods')}</h3>
            <button
              onClick={() => navigate('/super-contacts/phone-import')}
              className="text-xs text-[#38B03B] hover:underline mt-1"
              data-testid="link-import-phone"
            >
              {t('superContacts.importPhone')}
            </button>
          </div>
          
          <Sheet open={inviteSheetOpen} onOpenChange={setInviteSheetOpen}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-testid="button-invite-more"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('superContacts.moreOptions')}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader className="pb-4">
                <SheetTitle>{t('superContacts.inviteMethod')}</SheetTitle>
              </SheetHeader>
              <div className="space-y-2">
                <Button
                  className="w-full justify-start gap-3 h-12 bg-[#00B900] hover:bg-[#009900] text-white"
                  onClick={() => handleInviteOption('line')}
                  disabled={isLineInviting}
                  data-testid="button-invite-line"
                >
                  {isLineInviting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <SiLine className="w-5 h-5" />
                  )}
                  {t('superContacts.inviteLineFriends')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleInviteOption('phone')}
                  data-testid="button-invite-phone"
                >
                  <Phone className="w-5 h-5 text-[#38B03B]" />
                  {t('superContacts.fromPhoneContacts')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleInviteOption('im')}
                  data-testid="button-invite-im"
                >
                  <Share2 className="w-5 h-5 text-[#38B03B]" />
                  {t('superContacts.shareToIM')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleInviteOption('qr')}
                  data-testid="button-invite-qr"
                >
                  <QrCode className="w-5 h-5 text-[#38B03B]" />
                  {t('superContacts.faceToFace')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleInviteOption('link')}
                  data-testid="button-invite-link"
                >
                  {copiedLink ? (
                    <Check className="w-5 h-5 text-[#38B03B]" />
                  ) : (
                    <Link2 className="w-5 h-5 text-[#38B03B]" />
                  )}
                  {t('superContacts.copyLink')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Card>

      <Sheet open={imShareSheetOpen} onOpenChange={setImShareSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>{t('superContacts.shareToIM')}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4">
            {IM_CHANNELS.map((channel) => (
              <Button
                key={channel.id}
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => handleIMShare(channel.id as InviteChannel)}
                data-testid={`button-share-${channel.id}`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${channel.color}20` }}
                >
                  <channel.icon className="w-6 h-6" style={{ color: channel.color }} />
                </div>
                <span className="text-xs">{channel.name}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('superContacts.scanToJoin')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {currentInvite?.inviteQrImageUrl ? (
              <img
                src={currentInvite.inviteQrImageUrl}
                alt="Invite QR Code"
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center mt-4">
              {t('superContacts.scanQRDesc')}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                activeFilter === filter.id
                  ? 'bg-[#38B03B] text-white'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`filter-${filter.id}`}
            >
              <filter.icon className="w-3.5 h-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-20">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('superContacts.emptyTitle')}</h3>
            <p className="text-muted-foreground text-center mb-4 text-sm">
              {t('superContacts.emptyDesc')}
            </p>
            <Button
              onClick={() => navigate('/super-contacts/phone-import')}
              className="bg-[#38B03B] hover:bg-[#2d8f2f]"
              data-testid="button-import-empty"
            >
              {t('superContacts.importNow')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg hover-elevate cursor-pointer"
                onClick={() => {
                  if (contact.isFriend && contact.contactType === 'user') {
                    const userId = contact.id.replace('user_', '');
                    navigate(`/liaoliao/chat/${userId}`);
                  }
                }}
                data-testid={`contact-${contact.id}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.avatarUrl || undefined} />
                  <AvatarFallback className="bg-[#38B03B]/10 text-[#38B03B]">
                    {contact.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{contact.displayName}</span>
                    {getContactSourceIcon(contact)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {getContactStatusBadge(contact)}
                    {contact.languages && contact.languages.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {contact.languages.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {!contact.isFriend && contact.isRegistered && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    data-testid={`button-add-${contact.id}`}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
