import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Search, UserPlus, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

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
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults = [], isLoading: isSearching } = useQuery<SearchUser[]>({
    queryKey: ['/api/liaoliao/users/search', { q: searchQuery }],
    enabled: searchQuery.length >= 2,
  });

  const { data: friendRequests = [], isLoading: isLoadingRequests } = useQuery<FriendRequest[]>({
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
        <div className="space-y-2">
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
    </div>
  );
}
