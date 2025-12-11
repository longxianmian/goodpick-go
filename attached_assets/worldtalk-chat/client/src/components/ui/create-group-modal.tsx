import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Friend } from '@/types';
import { t } from '@/lib/i18n';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function CreateGroupModal({ isOpen, onClose, currentUserId }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch friends list
  const { data: friends = [], isLoading } = useQuery<Friend[]>({
    queryKey: ['/api/friends', currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/friends?userId=${currentUserId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch friends');
      return response.json();
    },
    enabled: isOpen,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      ownerId: string;
      memberIds: string[];
    }) => {
      // Create group
      const group = await apiRequest('/api/groups', {
        method: 'POST',
        body: {
          name: data.name,
          ownerId: data.ownerId,
        }
      });

      // Add members to group
      for (const memberId of data.memberIds) {
        await apiRequest(`/api/groups/${group.id}/members`, {
          method: 'POST',
          body: { userId: memberId }
        });
      }

      return group;
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('groupCreated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message || t('createGroupFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast({
        title: t('error'),
        description: t('enterGroupName'),
        variant: 'destructive',
      });
      return;
    }

    if (selectedMembers.length === 0) {
      toast({
        title: t('error'),
        description: t('selectOneFriend'),
        variant: 'destructive',
      });
      return;
    }

    createGroupMutation.mutate({
      name: groupName.trim(),
      ownerId: currentUserId,
      memberIds: selectedMembers,
    });
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedMembers([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="create-group-modal">
        <DialogHeader>
          <DialogTitle>{t('createGroup')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">{t('groupName')}</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('groupNamePlaceholder')}
              data-testid="input-group-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t('selectMembers')}</Label>
            <div className="border border-input rounded-md">
              <ScrollArea className="h-32" hideScrollbar={true}>
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('loading')}
                  </div>
                ) : friends.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('noFriends')}
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center space-x-3 p-3 border-b border-border last:border-0 hover:bg-accent"
                    >
                      <Checkbox
                        id={`friend-${friend.id}`}
                        checked={selectedMembers.includes(friend.id)}
                        onCheckedChange={() => handleMemberToggle(friend.id)}
                        data-testid={`checkbox-friend-${friend.id}`}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={friend.profileImageUrl} />
                        <AvatarFallback>
                          {friend.firstName?.[0] || friend.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Label
                        htmlFor={`friend-${friend.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {friend.firstName && friend.lastName
                          ? `${friend.firstName} ${friend.lastName}`
                          : friend.username}
                      </Label>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              data-testid="button-cancel-create-group"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createGroupMutation.isPending}
              data-testid="button-create-group"
            >
              {createGroupMutation.isPending ? t('loading') : t('create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
