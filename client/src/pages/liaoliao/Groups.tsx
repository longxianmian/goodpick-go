import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Search, Plus, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface GroupItem {
  id: number;
  name: string;
  avatarUrl?: string;
  memberCount: number;
  lastMessage?: string;
}

export default function LiaoliaoGroups() {
  const { t } = useLanguage();
  const { isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: groups = [], isLoading } = useQuery<GroupItem[]>({
    queryKey: ['/api/liaoliao/groups'],
    enabled: isUserAuthenticated,
  });

  const filteredGroups = searchQuery
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups;

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
          <h1 className="text-lg font-semibold flex-1">
            {t('liaoliao.myGroups') || 'My Groups'}
          </h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {}}
            data-testid="button-create-group"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('liaoliao.searchPlaceholder') || 'Search groups...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-groups"
          />
        </div>
      </header>

      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('liaoliao.noGroups') || 'No groups yet'}
            </p>
            <Button
              className="mt-4"
              onClick={() => {}}
              data-testid="button-create-first-group"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('liaoliao.createGroup') || 'Create Group'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(`/liaoliao/group/${group.id}`)}
                data-testid={`card-group-${group.id}`}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar className="w-12 h-12">
                    {group.avatarUrl ? (
                      <AvatarImage src={group.avatarUrl} alt={group.name} />
                    ) : null}
                    <AvatarFallback>
                      <Users className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.memberCount} {t('liaoliao.members') || 'members'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
