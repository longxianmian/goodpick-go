import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

const AI_ASSISTANT_USER_ID = 4;

interface Member {
  id?: number;
  odId?: number;
  userId?: number;
  avatarUrl?: string;
  displayName?: string;
}

interface GroupAvatarProps {
  members: Member[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function isAiAssistant(member: Member): boolean {
  return member.id === AI_ASSISTANT_USER_ID || member.userId === AI_ASSISTANT_USER_ID;
}

function MemberAvatar({ member, className, iconSize = 'w-3 h-3' }: { member: Member; className?: string; iconSize?: string }) {
  if (isAiAssistant(member)) {
    return (
      <div className={cn("bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center", className)}>
        <Bot className={cn(iconSize, "text-white")} />
      </div>
    );
  }
  
  return (
    <Avatar className={cn(className, "rounded-none")}>
      <AvatarImage src={member.avatarUrl} className="object-cover" />
      <AvatarFallback className="rounded-none text-xs">
        {member.displayName?.charAt(0) || '?'}
      </AvatarFallback>
    </Avatar>
  );
}

export function GroupAvatar({ members, size = 'md', className }: GroupAvatarProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const displayMembers = members.slice(0, 4);
  const count = displayMembers.length;

  if (count === 0) {
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarFallback>G</AvatarFallback>
      </Avatar>
    );
  }

  if (count === 1) {
    const member = displayMembers[0];
    if (isAiAssistant(member)) {
      return (
        <div className={cn(sizeClasses[size], "rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center", className)}>
          <Bot className="w-6 h-6 text-white" />
        </div>
      );
    }
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={member.avatarUrl} />
        <AvatarFallback>{member.displayName?.charAt(0) || 'G'}</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={cn(sizeClasses[size], 'relative rounded-md overflow-hidden bg-muted', className)}>
      {count === 2 && (
        <div className="grid grid-cols-2 h-full w-full gap-[1px]">
          {displayMembers.map((member, i) => (
            <MemberAvatar key={i} member={member} className="h-full w-full" iconSize={iconSizeClasses[size]} />
          ))}
        </div>
      )}

      {count === 3 && (
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-[1px]">
          <MemberAvatar member={displayMembers[0]} className="h-full w-full" iconSize={iconSizeClasses[size]} />
          <MemberAvatar member={displayMembers[1]} className="h-full w-full row-span-2" iconSize={iconSizeClasses[size]} />
          <MemberAvatar member={displayMembers[2]} className="h-full w-full" iconSize={iconSizeClasses[size]} />
        </div>
      )}

      {count >= 4 && (
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-[1px]">
          {displayMembers.slice(0, 4).map((member, i) => (
            <MemberAvatar key={i} member={member} className="h-full w-full" iconSize={iconSizeClasses[size]} />
          ))}
        </div>
      )}
    </div>
  );
}
