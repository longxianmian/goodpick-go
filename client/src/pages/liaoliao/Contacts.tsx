import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Users, Search, ChevronRight, QrCode, Link2, Share2 } from 'lucide-react';
import { SiLine } from 'react-icons/si';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { shareInviteToLineFriends, isInLiffClient } from '@/lib/liffClient';
import QRCode from 'qrcode';

interface Friend {
  id: number;
  name: string;
  avatarUrl?: string;
  remarkName?: string;
}

export default function LiaoliaoContacts() {
  const { t } = useLanguage();
  const { isUserAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const { data: friends = [], isLoading } = useQuery<Friend[]>({
    queryKey: ['/api/liaoliao/friends'],
    enabled: isUserAuthenticated,
  });

  const filteredFriends = searchQuery
    ? friends.filter(f => 
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.remarkName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  const handleFriendClick = (friend: Friend) => {
    navigate(`/liaoliao/chat/${friend.id}`);
  };

  const generateInviteLink = async () => {
    try {
      const res = await apiRequest('POST', '/api/contacts/invite');
      const data = await res.json();
      const link = `${window.location.origin}/invite/${data.inviteCode}`;
      setInviteLink(link);
      return link;
    } catch (error) {
      console.error('Failed to generate invite link:', error);
      return '';
    }
  };

  const handleLineInvite = async () => {
    setIsInviting(true);
    try {
      const link = inviteLink || await generateInviteLink();
      if (!link) {
        toast({ title: t('superContacts.inviteError'), variant: 'destructive' });
        return;
      }
      
      if (isInLiffClient()) {
        const inviterName = user?.displayName || user?.shuaName || 'Friend';
        const success = await shareInviteToLineFriends(link, inviterName);
        if (success) {
          toast({ 
            title: t('superContacts.inviteSent'),
            description: t('superContacts.lineInviteSentDesc'),
          });
        }
      } else {
        await navigator.clipboard.writeText(link);
        toast({
          title: t('superContacts.linkCopied'),
          description: t('superContacts.linkCopiedDesc'),
        });
      }
    } catch (error) {
      console.error('LINE invite error:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleShowQR = async () => {
    const link = inviteLink || await generateInviteLink();
    if (link) {
      const qr = await QRCode.toDataURL(link, { width: 200, margin: 2 });
      setQrCodeUrl(qr);
      setShowQRDialog(true);
    }
  };

  const handleCopyLink = async () => {
    const link = inviteLink || await generateInviteLink();
    if (link) {
      await navigator.clipboard.writeText(link);
      toast({
        title: t('superContacts.linkCopied'),
        description: t('superContacts.linkCopiedDesc'),
      });
    }
  };

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

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t('liaoliao.searchContacts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
            data-testid="input-search-contacts"
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleLineInvite}
            disabled={isInviting}
            className="w-full h-12 text-base font-semibold bg-[#06C755] hover:bg-[#05b34d] text-white"
            data-testid="button-line-invite"
          >
            <SiLine className="w-5 h-5 mr-2" />
            {t('superContacts.inviteLineFriends')}
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleShowQR}
              className="flex flex-col items-center gap-1 h-auto py-2"
              data-testid="button-qr-invite"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-xs">{t('superContacts.faceToFace')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1 h-auto py-2"
              data-testid="button-copy-link"
            >
              <Link2 className="w-4 h-4" />
              <span className="text-xs">{t('superContacts.copyLink')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/liaoliao/add-friend')}
              className="flex flex-col items-center gap-1 h-auto py-2"
              data-testid="button-more-options"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs">{t('superContacts.moreOptions')}</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t('liaoliao.noContacts')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mb-2 px-1">
              {t('liaoliao.liaoliaoId')} ({filteredFriends.length})
            </p>
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover-elevate"
                onClick={() => handleFriendClick(friend)}
                data-testid={`contact-item-${friend.id}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={friend.avatarUrl} />
                  <AvatarFallback>
                    {(friend.remarkName || friend.name)?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {friend.remarkName || friend.name}
                  </p>
                  {friend.remarkName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {friend.name}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{t('superContacts.scanToJoin')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" data-testid="img-qr-code" />
            )}
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {t('superContacts.scanQRDesc')}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <UserBottomNav />
    </div>
  );
}
