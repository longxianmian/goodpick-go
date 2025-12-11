import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Search, UserPlus, Check, X, Share2, QrCode, Link2 } from 'lucide-react';
import { SiLine } from 'react-icons/si';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { shareInviteToLineFriends, isInLiffClient } from '@/lib/liffClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import { useAuth } from '@/contexts/AuthContext';

interface SearchUser {
  id: number;
  displayName: string;
  avatarUrl?: string;
}

interface FriendRequest {
  id: number;
  userId: number;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export default function LiaoliaoAddFriend() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isInviting, setIsInviting] = useState(false);

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

  const { data: searchResults = [], isLoading: isSearching } = useQuery<SearchUser[]>({
    queryKey: ['/api/liaoliao/users/search', { q: searchQuery }],
    enabled: searchQuery.length >= 2,
  });

  const { data: friendRequests = [] } = useQuery<FriendRequest[]>({
    queryKey: ['/api/liaoliao/friend-requests'],
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: number) => {
      return apiRequest('POST', '/api/liaoliao/friends/request', { friendId });
    },
    onSuccess: () => {
      toast({
        title: t('liaoliao.requestSent'),
        description: t('liaoliao.requestSentDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (requesterId: number) => {
      return apiRequest('POST', '/api/liaoliao/friends/accept', { requesterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/chats'] });
      toast({
        title: t('liaoliao.friendAdded'),
      });
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-2 py-2 flex items-center gap-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => navigate('/liaoliao')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold" data-testid="text-page-title">
          {t('liaoliao.addFriend')}
        </h1>
      </header>

      <main className="flex-1 px-4 py-4 space-y-6">
        <div className="space-y-3">
          <Button
            onClick={handleLineInvite}
            disabled={isInviting}
            className="w-full h-14 text-base font-semibold bg-[#06C755] hover:bg-[#05b34d] text-white"
            data-testid="button-line-invite"
          >
            <SiLine className="w-6 h-6 mr-3" />
            {t('superContacts.inviteLineFriends')}
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleShowQR}
              className="flex flex-col items-center gap-1 h-auto py-3"
              data-testid="button-qr-invite"
            >
              <QrCode className="w-5 h-5" />
              <span className="text-xs">{t('superContacts.faceToFace')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1 h-auto py-3"
              data-testid="button-copy-link"
            >
              <Link2 className="w-5 h-5" />
              <span className="text-xs">{t('superContacts.copyLink')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/super-contacts')}
              className="flex flex-col items-center gap-1 h-auto py-3"
              data-testid="button-more-options"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-xs">{t('superContacts.moreOptions')}</span>
            </Button>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm text-muted-foreground">{t('liaoliao.searchByIdTitle')}</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('liaoliao.searchUserPlaceholder')}
              className="pl-9"
              data-testid="input-search-user"
            />
          </div>
          
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              {isSearching ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('common.loading')}
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('liaoliao.noUsersFound')}
                </p>
              ) : (
                searchResults.map((user) => (
                  <Card key={user.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.displayName}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={sendRequestMutation.isPending}
                        data-testid={`button-add-${user.id}`}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        {t('liaoliao.add')}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {friendRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">
              {t('liaoliao.friendRequests')} ({friendRequests.length})
            </h2>
            {friendRequests.map((request) => (
              <Card key={request.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.avatarUrl} />
                    <AvatarFallback>{request.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{request.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('liaoliao.wantsToAdd')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => acceptRequestMutation.mutate(request.userId)}
                      disabled={acceptRequestMutation.isPending}
                      data-testid={`button-accept-${request.id}`}
                    >
                      <Check className="w-5 h-5 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-reject-${request.id}`}
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

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
    </div>
  );
}
