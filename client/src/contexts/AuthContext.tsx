import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ensureLiffReady, resetLiffState } from '@/lib/liffClient';

interface Admin {
  id: number;
  email: string;
  name: string;
}

export interface UserStoreRole {
  storeId: number;
  storeName: string;
  storeImageUrl: string | null;
  role: 'owner' | 'operator' | 'verifier';
}

export type UserRoleType = 'consumer' | 'owner' | 'operator' | 'verifier' | 'sysadmin' | 'creator' | 'member';

interface User {
  id: number;
  lineUserId: string;
  displayName: string;
  shuaName?: string | null;
  shuaBio?: string | null;
  avatarUrl: string | null;
  language: string;
  primaryRole?: UserRoleType;
  roles?: UserStoreRole[];
  hasOwnerRole?: boolean;
  hasOperatorRole?: boolean;
  hasVerifierRole?: boolean;
  hasSysAdminRole?: boolean;
  hasCreatorRole?: boolean;
  hasMemberRole?: boolean;
  isTestAccount?: boolean;
}

type AuthPhase = 'booting' | 'ready' | 'error';

interface AuthContextType {
  admin: Admin | null;
  user: User | null;
  adminToken: string | null;
  userToken: string | null;
  authPhase: AuthPhase;
  authError: string | null;
  loginAdmin: (token: string, admin: Admin) => void;
  loginUser: (token: string, user: User) => void;
  logoutAdmin: () => void;
  logoutUser: () => void;
  reloadAuth: () => void;
  isAdminAuthenticated: boolean;
  isUserAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRoleType;
  setActiveRole: (role: UserRoleType) => void;
  userRoles: UserStoreRole[];
  hasRole: (role: UserRoleType) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 解析JWT获取lineUserId（不验证签名，仅解码payload）
function decodeJwtPayload(token: string): { lineUserId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  
  const [authPhase, setAuthPhase] = useState<AuthPhase>('booting');
  const [authError, setAuthError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  
  const [activeRole, setActiveRoleState] = useState<UserRoleType>('consumer');

  function bootstrapTokenFromUrlAndStorage(): string | null {
    console.log('[AUTH] bootstrapTokenFromUrlAndStorage 开始');
    
    try {
      const url = new URL(window.location.href);
      const urlToken = url.searchParams.get('token');

      if (urlToken) {
        console.log('[AUTH] token from url');
        localStorage.setItem('userToken', urlToken);
        setUserToken(urlToken);

        url.searchParams.delete('token');
        url.searchParams.delete('autoClaim');
        const cleanUrl = url.pathname + url.search + url.hash;
        window.history.replaceState(null, '', cleanUrl);
        return urlToken;
      }

      const stored = localStorage.getItem('userToken');
      if (stored) {
        console.log('[AUTH] token from localStorage');
        setUserToken(stored);
        return stored;
      }

      console.log('[AUTH] no token found');
      setUserToken(null);
      return null;
    } catch (e) {
      console.error('[AUTH] bootstrapTokenFromUrlAndStorage 失败', e);
      setUserToken(null);
      return null;
    }
  }

  // 【关键】检查LIFF身份是否与存储的token匹配
  async function checkLiffIdentityMatch(storedToken: string): Promise<boolean> {
    console.log('[AUTH] ========== 检查LIFF身份匹配 ==========');
    
    try {
      // 解码存储的token获取lineUserId
      const decoded = decodeJwtPayload(storedToken);
      const storedLineUserId = decoded?.lineUserId;
      
      if (!storedLineUserId) {
        console.log('[AUTH] 无法从token解码lineUserId，跳过检查');
        return true; // 无法解码则不阻止
      }
      
      console.log('[AUTH] 存储token的用户ID:', storedLineUserId);
      
      // 初始化LIFF并获取当前用户profile
      const liffState = await ensureLiffReady();
      
      if (!liffState.liff || !liffState.isLoggedIn) {
        console.log('[AUTH] LIFF未登录，跳过身份检查');
        return true; // LIFF未登录则不阻止
      }
      
      const profile = await liffState.liff.getProfile();
      const liffUserId = profile.userId;
      
      console.log('[AUTH] 当前LIFF用户ID:', liffUserId);
      console.log('[AUTH] 当前LIFF用户名:', profile.displayName);
      
      // 比较两者
      if (storedLineUserId !== liffUserId) {
        console.log('[AUTH] ⚠️⚠️⚠️ 身份不匹配！清除旧token ⚠️⚠️⚠️');
        console.log('[AUTH] 存储的是:', storedLineUserId);
        console.log('[AUTH] 当前是:', liffUserId);
        
        // 清除旧的登录状态
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        localStorage.removeItem('activeRole');
        resetLiffState();
        
        console.log('[AUTH] ✓ 旧登录已清除');
        return false; // 身份不匹配
      }
      
      console.log('[AUTH] ✓ 身份匹配');
      return true;
    } catch (e) {
      console.error('[AUTH] LIFF身份检查失败:', e);
      return true; // 检查失败则不阻止
    }
  }

  async function fetchCurrentUser(token: string): Promise<User | null> {
    try {
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.log('[AUTH] token 失效，清除本地存储');
          localStorage.removeItem('userToken');
          localStorage.removeItem('user');
          setUserToken(null);
          setUser(null);
          return null;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('user', JSON.stringify(data.data));
        return data.data;
      }
      
      return null;
    } catch (e) {
      console.error('[AUTH] fetchCurrentUser 失败', e);
      throw e;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      console.log('[AUTH] bootstrap start');
      setAuthPhase('booting');
      setAuthError(null);

      const storedAdminToken = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('admin');
      if (storedAdminToken && storedAdmin) {
        try {
          setAdminToken(storedAdminToken);
          setAdmin(JSON.parse(storedAdmin));
        } catch {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin');
        }
      }

      try {
        const token = bootstrapTokenFromUrlAndStorage();

        if (!token) {
          console.log('[AUTH] 无 token，匿名用户状态');
          if (!cancelled) {
            setUser(null);
            setAuthPhase('ready');
          }
          return;
        }

        // 【关键】在调用/api/me之前，先检查LIFF身份是否匹配
        const identityMatch = await checkLiffIdentityMatch(token);
        if (cancelled) return;
        
        if (!identityMatch) {
          console.log('[AUTH] 身份不匹配，以匿名用户状态继续');
          setUserToken(null);
          setUser(null);
          setAuthPhase('ready');
          return;
        }

        console.log('[AUTH] 尝试用 token 获取用户信息');
        const me = await fetchCurrentUser(token);
        if (cancelled) return;

        if (me) {
          console.log('[AUTH] 用户信息获取成功', me);
          setUser(me);
          const savedRole = localStorage.getItem('activeRole') as UserRoleType | null;
          const primaryRole = me.primaryRole || 'consumer';
          const isTestUser = me.isTestAccount;
          if (savedRole && (
              savedRole === 'consumer' || 
              isTestUser ||
              (savedRole === 'owner' && me.hasOwnerRole) ||
              (savedRole === 'operator' && me.hasOperatorRole) ||
              (savedRole === 'verifier' && me.hasVerifierRole) ||
              (savedRole === 'sysadmin' && me.hasSysAdminRole) ||
              (savedRole === 'creator' && me.hasCreatorRole) ||
              (savedRole === 'member' && me.hasMemberRole))) {
            setActiveRoleState(savedRole);
          } else {
            setActiveRoleState(primaryRole);
            localStorage.setItem('activeRole', primaryRole);
          }
          setAuthPhase('ready');
        } else {
          console.log('[AUTH] 用户信息获取失败或 token 无效');
          setUser(null);
          setActiveRoleState('consumer');
          setAuthPhase('ready');
        }
      } catch (err) {
        if (cancelled) return;

        console.error('[AUTH] bootstrap failed', err);
        setUser(null);
        setAuthError('auth_bootstrap_failed');

        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        setUserToken(null);
        setAuthPhase('error');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [reloadVersion]);

  const loginAdmin = (token: string, adminData: Admin) => {
    setAdminToken(token);
    setAdmin(adminData);
    localStorage.setItem('adminToken', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
  };

  const loginUser = (token: string, userData: User) => {
    console.log('[AUTH] loginUser 被调用', userData);
    setUserToken(token);
    setUser(userData);
    localStorage.setItem('userToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setReloadVersion(v => v + 1);
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdmin(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
  };

  const logoutUser = () => {
    console.log('[AUTH] logoutUser 被调用');
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    setUserToken(null);
    setUser(null);
    
    setReloadVersion(v => v + 1);
  };

  const reloadAuth = () => {
    console.log('[AUTH] reloadAuth 被调用');
    setReloadVersion(v => v + 1);
  };

  const setActiveRole = (role: UserRoleType) => {
    console.log('[AUTH] setActiveRole 被调用', role);
    setActiveRoleState(role);
    localStorage.setItem('activeRole', role);
  };

  const userRoles: UserStoreRole[] = user?.roles || [];

  const hasRole = (role: UserRoleType): boolean => {
    if (user?.isTestAccount) return true;
    if (role === 'consumer') return true;
    if (role === 'owner') return !!user?.hasOwnerRole;
    if (role === 'operator') return !!user?.hasOperatorRole;
    if (role === 'verifier') return !!user?.hasVerifierRole;
    if (role === 'sysadmin') return !!user?.hasSysAdminRole;
    if (role === 'creator') return !!user?.hasCreatorRole;
    if (role === 'member') return !!user?.hasMemberRole;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        user,
        adminToken,
        userToken,
        authPhase,
        authError,
        loginAdmin,
        loginUser,
        logoutAdmin,
        logoutUser,
        reloadAuth,
        isAdminAuthenticated: !!adminToken,
        isUserAuthenticated: !!userToken && !!user,
        isLoading: authPhase === 'booting',
        activeRole,
        setActiveRole,
        userRoles,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
