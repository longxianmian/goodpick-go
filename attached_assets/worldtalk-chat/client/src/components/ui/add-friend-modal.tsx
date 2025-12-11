import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { User } from '@/types';
import { Loader2, Search } from 'lucide-react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function AddFriendModal({ isOpen, onClose, currentUserId }: AddFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search users query
  const { data: searchResults = [], isLoading: isSearching } = useQuery<User[]>({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!searchQuery.trim() && isOpen,
    staleTime: 30000, // Cache for 30 seconds
  });

  const addFriendMutation = useMutation({
    mutationFn: async (data: { friendId?: string; friendUsername?: string }) => {
      return await apiRequest('/api/friends', { method: 'POST', body: data });
    },
    onSuccess: (data: any) => {
      toast({
        title: t('success'),
        description: data.message || t('friendRequestSent'),
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      setSearchQuery('');
      setSelectedUser(null);
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = t('addFriendFailed');
      
      // 处理具体的错误消息
      if (error.message === 'Already friends') {
        errorMessage = t('alreadyFriends');
      } else if (error.message === 'Friend request already sent') {
        errorMessage = t('friendRequestAlreadySent');
      } else if (error.message === 'Cannot add yourself as friend') {
        errorMessage = t('cannotAddYourself');
      } else if (error.message === 'User not found') {
        errorMessage = t('noUsersFound');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('error'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleAddFriend = (user: User) => {
    addFriendMutation.mutate({
      friendId: user.id
    });
  };

  const handleAddByUsername = () => {
    if (!searchQuery.trim()) {
      toast({
        title: t('error'),
        description: t('enterUsername'),
        variant: 'destructive',
      });
      return;
    }

    addFriendMutation.mutate({
      friendUsername: searchQuery.trim()
    });
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUser(null);
    onClose();
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedUser(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="add-friend-modal">
        <DialogHeader>
          <DialogTitle>{t('addFriend')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">{t('searchUsers')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>
          
          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('searchResults')}</Label>
              <ScrollArea className="h-40 border rounded-md" hideScrollbar={true}>
                {isSearching ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">{t('searching')}</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('noUsersFound')}
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleAddFriend(user)}
                        data-testid={`search-result-${user.id}`}
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback>
                            {user.firstName?.[0] || user.username[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {user.firstName || user.username}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            @{user.username.length > 30 ? user.username.slice(0, 30) + '...' : user.username}
                          </div>
                        </div>
                        {addFriendMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
          
          {/* Quick add by exact username */}
          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddByUsername}
                disabled={addFriendMutation.isPending}
                data-testid="button-add-by-username"
              >
                {addFriendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t('addByUsername', searchQuery)}
              </Button>
            </div>
          )}
          
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              data-testid="button-cancel-add-friend"
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}