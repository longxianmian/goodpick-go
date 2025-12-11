import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, getTranslatedUserName } from '@/lib/i18n';
import { User } from '@/types';
import { useQuery } from '@tanstack/react-query';

interface FriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (selectedFriends: User[], callType: 'voice' | 'video') => void;
  currentCallType: 'voice' | 'video';
}

export function FriendSelector({ 
  isOpen, 
  onClose, 
  onInvite,
  currentCallType 
}: FriendSelectorProps) {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  // 获取好友列表
  const { data: friends = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    enabled: isOpen
  });

  // 清除选择状态
  useEffect(() => {
    if (isOpen) {
      setSelectedFriends(new Set());
    }
  }, [isOpen]);

  const handleFriendToggle = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleInvite = () => {
    const selectedFriendsList = friends.filter((friend: User) => 
      selectedFriends.has(friend.id)
    );
    onInvite(selectedFriendsList, currentCallType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentCallType === 'voice' ? (
              <Phone className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
            {t('inviteToCall')}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={onClose}
            data-testid="button-close-friend-selector"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* 好友列表 */}
          <ScrollArea className="h-[300px] w-full" hideScrollbar={true}>
            <div className="space-y-2 pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {t('loading')}...
                  </div>
                </div>
              ) : friends.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {t('noFriends')}
                  </div>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedFriends.has(friend.id) 
                        ? "bg-accent border-primary" 
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => handleFriendToggle(friend.id)}
                    data-testid={`friend-item-${friend.id}`}
                  >
                    <Checkbox
                      checked={selectedFriends.has(friend.id)}
                      onChange={() => handleFriendToggle(friend.id)}
                      data-testid={`checkbox-friend-${friend.id}`}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.profileImageUrl} alt={friend.firstName || friend.username} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {(friend.firstName || friend.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-friend-name-${friend.id}`}>
                        {friend.firstName && friend.lastName 
                          ? `${getTranslatedUserName(friend.id, friend.firstName)} ${friend.lastName}` 
                          : friend.firstName 
                          ? getTranslatedUserName(friend.id, friend.firstName)
                          : friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {friend.isOnline ? t('online') : t('offline')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* 操作按钮 */}
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-invite"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={selectedFriends.size === 0}
              className="flex-1"
              data-testid="button-send-invite"
            >
              {t('invite')} ({selectedFriends.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}