import { useQuery } from '@tanstack/react-query';

interface FriendRequest {
  requestId: string;
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  requestDate: string;
}

interface UseFriendRequestsOptions {
  enabled?: boolean;
}

export function useFriendRequests(options: UseFriendRequestsOptions = {}) {
  const { enabled = true } = options;

  const { data: friendRequests = [], isLoading } = useQuery<FriendRequest[]>({
    queryKey: ['/api/friend-requests'],
    enabled,
  });

  return {
    friendRequests,
    count: friendRequests.length,
    isLoading
  };
}
