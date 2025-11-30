import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Admin {
  id: number;
  email: string;
  name: string;
}

// 用户在某个门店的角色信息
export interface UserStoreRole {
  storeId: number;
  storeName: string;
  storeImageUrl: string | null;
  role: 'owner' | 'operator' | 'verifier';
}

// 用户角色类型
export type UserRoleType = 'consumer' | 'owner' | 'operator' | 'verifier';

interface User {
  id: number;
  lineUserId: string;
  displayName: string;
  avatarUrl: string | null;
  language: string;
  // 新增角色相关字段
  primaryRole?: UserRoleType;
  roles?: UserStoreRole[];
  hasOwnerRole?: boolean;
  hasOperatorRole?: boolean;
  hasVerifierRole?: boolean;
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
  // 新增角色相关
  activeRole: UserRoleType;
  setActiveRole: (role: UserRoleType) => void;
  userRoles: UserStoreRole[];
  hasRole: (role: UserRoleType) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  
  const [authPhase, setAuthPhase] = useState<AuthPhase>('booting');
  const [authError, setAuthError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  
  // 角色状态管理
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

        console.log('[AUTH] 尝试用 token 获取用户信息');
        const me = await fetchCurrentUser(token);
        if (cancelled) return;

        if (me) {
          console.log('[AUTH] 用户信息获取成功', me);
          setUser(me);
          // 根据用户的主要角色设置activeRole
          const savedRole = localStorage.getItem('activeRole') as UserRoleType | null;
          const primaryRole = me.primaryRole || 'consumer';
          // 如果保存的角色是用户拥有的角色，则使用保存的角色；否则使用主要角色
          if (savedRole && (savedRole === 'consumer' || 
              (savedRole === 'owner' && me.hasOwnerRole) ||
              (savedRole === 'operator' && me.hasOperatorRole) ||
              (savedRole === 'verifier' && me.hasVerifierRole))) {
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

  // 设置当前活跃角色
  const setActiveRole = (role: UserRoleType) => {
    console.log('[AUTH] setActiveRole 被调用', role);
    setActiveRoleState(role);
    localStorage.setItem('activeRole', role);
  };

  // 获取用户的所有角色列表
  const userRoles: UserStoreRole[] = user?.roles || [];

  // 检查用户是否拥有某个角色
  const hasRole = (role: UserRoleType): boolean => {
    if (role === 'consumer') return true; // 所有用户都是消费者
    if (role === 'owner') return !!user?.hasOwnerRole;
    if (role === 'operator') return !!user?.hasOperatorRole;
    if (role === 'verifier') return !!user?.hasVerifierRole;
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
        // 角色相关
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
