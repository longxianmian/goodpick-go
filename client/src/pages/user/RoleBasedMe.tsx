import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import UserCenter from './UserCenter';
import MeOperator from './MeOperator';
import MeVerifier from './MeVerifier';
import MeOwner from './MeOwner';
import MeSysAdmin from './MeSysAdmin';
import CreatorAccount from '@/pages/creator/CreatorAccount';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';

type RoleType = 'consumer' | 'owner' | 'operator' | 'verifier' | 'sysadmin' | 'creator';

const VALID_ROLES: RoleType[] = ['consumer', 'owner', 'operator', 'verifier', 'sysadmin', 'creator'];

export default function RoleBasedMe() {
  const { activeRole, authPhase } = useAuth();
  
  const devRole = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const role = params.get('dev');
    if (role && VALID_ROLES.includes(role as RoleType)) {
      return role as RoleType;
    }
    return null;
  }, []);
  
  const effectiveRole = devRole || activeRole;
  
  if (authPhase === 'booting') {
    return (
      <div className="min-h-screen bg-muted/30 pb-20">
        <div className="bg-gradient-to-b from-[#38B03B] to-[#2d8c2f] text-white">
          <header className="flex items-center h-12 px-4">
            <Skeleton className="w-6 h-6 bg-white/20" />
            <Skeleton className="h-5 w-16 mx-auto bg-white/20" />
          </header>
          <div className="px-4 py-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full bg-white/20" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2 bg-white/20" />
                <Skeleton className="h-4 w-20 bg-white/20" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-4">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <RoleAwareBottomNav forceRole="consumer" />
      </div>
    );
  }
  
  switch (effectiveRole) {
    case 'operator':
      return <MeOperator />;
    case 'verifier':
      return <MeVerifier />;
    case 'owner':
      return <MeOwner />;
    case 'sysadmin':
      return <MeSysAdmin />;
    case 'creator':
      return <CreatorAccount />;
    case 'consumer':
    default:
      return <UserCenter />;
  }
}
