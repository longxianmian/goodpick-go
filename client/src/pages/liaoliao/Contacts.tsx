import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Users, UserPlus, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserBottomNav } from '@/components/UserBottomNav';

interface Friend {
  id: number;
  name: string;
  avatarUrl?: string;
  remarkName?: string;
}

export default function LiaoliaoContacts() {
  const { t } = useLanguage();
  const { isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

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

      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t('liaoliao.searchContacts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50"
            data-testid="input-search-contacts"
          />
        </div>

        <div 
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-4 cursor-pointer hover-elevate"
          onClick={() => navigate('/super-contacts')}
          data-testid="button-super-contacts"
        >
          <div className="w-10 h-10 rounded-full bg-[#38B03B] flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium">{t('superContacts.title')}</span>
          <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{t('liaoliao.noContacts')}</p>
            <Button 
              onClick={() => navigate('/super-contacts')}
              className="bg-[#38B03B] hover:bg-[#2e9632]"
              data-testid="button-add-first-friend"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('liaoliao.addFriend')}
            </Button>
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

      <UserBottomNav />
    </div>
  );
}
