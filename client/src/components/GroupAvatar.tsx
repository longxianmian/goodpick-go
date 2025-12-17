import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Member {
  avatarUrl?: string;
  displayName?: string;
}

interface GroupAvatarProps {
  members: Member[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GroupAvatar({ members, size = 'md', className }: GroupAvatarProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const innerSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
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
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={displayMembers[0].avatarUrl} />
        <AvatarFallback>{displayMembers[0].displayName?.charAt(0) || 'G'}</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={cn(sizeClasses[size], 'relative rounded-md overflow-hidden bg-muted', className)}>
      {count === 2 && (
        <div className="grid grid-cols-2 h-full w-full gap-[1px]">
          {displayMembers.map((member, i) => (
            <Avatar key={i} className="h-full w-full rounded-none">
              <AvatarImage src={member.avatarUrl} className="object-cover" />
              <AvatarFallback className="rounded-none text-xs">
                {member.displayName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}

      {count === 3 && (
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-[1px]">
          <Avatar className="h-full w-full rounded-none">
            <AvatarImage src={displayMembers[0].avatarUrl} className="object-cover" />
            <AvatarFallback className="rounded-none text-xs">
              {displayMembers[0].displayName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <Avatar className="h-full w-full rounded-none row-span-2">
            <AvatarImage src={displayMembers[1].avatarUrl} className="object-cover" />
            <AvatarFallback className="rounded-none text-xs">
              {displayMembers[1].displayName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <Avatar className="h-full w-full rounded-none">
            <AvatarImage src={displayMembers[2].avatarUrl} className="object-cover" />
            <AvatarFallback className="rounded-none text-xs">
              {displayMembers[2].displayName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {count >= 4 && (
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-[1px]">
          {displayMembers.slice(0, 4).map((member, i) => (
            <Avatar key={i} className="h-full w-full rounded-none">
              <AvatarImage src={member.avatarUrl} className="object-cover" />
              <AvatarFallback className="rounded-none text-xs">
                {member.displayName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </div>
  );
}
