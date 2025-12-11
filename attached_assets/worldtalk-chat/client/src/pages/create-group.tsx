import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ArrowLeft, Users, Search } from 'lucide-react';

interface CreateGroupPageProps {
  currentUserId: string;
  onBack: () => void;
  onGroupCreated?: (groupId: string) => void;
}

export function CreateGroupPage({ currentUserId, onBack, onGroupCreated }: CreateGroupPageProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friends = [], isLoading, error } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: !!currentUserId,
  });

  const filteredFriends = friends.filter(friend => {
    const fullName = friend.firstName && friend.lastName 
      ? `${friend.firstName} ${friend.lastName}` 
      : friend.username;
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      memberIds: string[];
    }) => {
      // Create group (ownerId is automatically set by backend from session)
      const group = await apiRequest('/api/groups', {
        method: 'POST',
        body: {
          name: data.name,
        },
      });

      // Add members to group (batch add)
      if (data.memberIds.length > 0) {
        await apiRequest(`/api/groups/${group.id}/members`, {
          method: 'POST',
          body: {
            userIds: data.memberIds,
          },
        });
      }

      return group;
    },
    onSuccess: (group) => {
      toast({
        title: t('success'),
        description: t('groupCreated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      // Reset form
      setGroupName('');
      setSelectedMembers([]);
      setSearchQuery('');
      
      // Call callback if provided
      if (onGroupCreated) {
        onGroupCreated(group.id);
      }
      
      onBack();
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

    if (selectedMembers.length < 2) {
      toast({
        title: t('error'),
        description: t('groupNeedAtLeastThreePeople'),
        variant: 'destructive',
      });
      return;
    }

    createGroupMutation.mutate({
      name: groupName.trim(),
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

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredFriends.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredFriends.map(friend => friend.id));
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-3"
          data-testid="button-back-create-group"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center flex-1">
          <Users className="w-6 h-6 mr-3 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{t('createGroup')}</h1>
            {selectedMembers.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('selectedMembers')}: {selectedMembers.length}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Group Name Input */}
          <div className="p-4 border-b border-border">
            <Label htmlFor="groupName" className="text-sm font-medium">
              {t('groupName')}
            </Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('groupNamePlaceholder')}
              className="mt-2"
              data-testid="input-group-name"
            />
          </div>

          {/* Members Section */}
          <div className="flex-1 flex flex-col">
            {/* Search and Select All */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('selectMembers')}</Label>
                {filteredFriends.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-primary"
                    data-testid="button-select-all"
                  >
                    {selectedMembers.length === filteredFriends.length ? t('deselectAll') : t('selectAll')}
                  </Button>
                )}
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchFriends')}
                  className="pl-10"
                  data-testid="input-search-friends"
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full" hideScrollbar={true}>
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t('loading')}...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {searchQuery ? t('noSearchResults') : t('noFriends')}
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent transition-colors"
                        data-testid={`friend-item-${friend.id}`}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(friend.id)}
                          onCheckedChange={() => handleMemberToggle(friend.id)}
                          data-testid={`checkbox-friend-${friend.id}`}
                        />
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={friend.profileImageUrl} />
                          <AvatarFallback className="text-lg">
                            {friend.firstName?.[0] || friend.username[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleMemberToggle(friend.id)}
                        >
                          <div className="font-medium truncate">
                            {friend.firstName && friend.lastName
                              ? `${friend.firstName} ${friend.lastName}`
                              : friend.username}
                          </div>
                          {friend.isOnline && (
                            <div className="text-sm text-green-500">{t('online')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onBack}
                data-testid="button-cancel-create-group"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createGroupMutation.isPending || !groupName.trim() || selectedMembers.length < 2}
                data-testid="button-create-group"
              >
                {createGroupMutation.isPending ? (
                  <>{t('loading')}...</>
                ) : (
                  <>{t('create')} ({selectedMembers.length})</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}