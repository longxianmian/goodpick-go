import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Admin {
  id: number;
  email: string;
  name: string;
}

interface User {
  id: number;
  lineUserId: string;
  displayName: string;
  avatarUrl: string | null;
  language: string;
}

interface AuthContextType {
  admin: Admin | null;
  user: User | null;
  adminToken: string | null;
  userToken: string | null;
  loginAdmin: (token: string, admin: Admin) => void;
  loginUser: (token: string, user: User) => void;
  logoutAdmin: () => void;
  logoutUser: () => void;
  isAdminAuthenticated: boolean;
  isUserAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const storedAdminToken = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('admin');
      const storedUserToken = localStorage.getItem('userToken');
      const storedUser = localStorage.getItem('user');

      // 恢复后台登录态
      if (storedAdminToken && storedAdmin) {
        setAdminToken(storedAdminToken);
        setAdmin(JSON.parse(storedAdmin));
      }

      // 先看 URL 里有没有 token（LINE OAuth 回调带回来的）
      let tokenFromUrl: string | null = null;
      try {
        const url = new URL(window.location.href);
        tokenFromUrl = url.searchParams.get('token');

        if (tokenFromUrl) {
          // 这是最新的用户登录 token
          setUserToken(tokenFromUrl);
          localStorage.setItem('userToken', tokenFromUrl);

          // 如果本地已经有旧的 user 信息，就先用着；以后也可以加「拉 profile」接口
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }

          // 清理 URL 上的 token / autoClaim 参数（避免泄露 & 反复解析）
          url.searchParams.delete('token');
          url.searchParams.delete('autoClaim');
          window.history.replaceState({}, '', url.toString());
        } else if (storedUserToken && storedUser) {
          // 没有新 token，就恢复之前的登录态
          setUserToken(storedUserToken);
          setUser(JSON.parse(storedUser));
        } else if (storedUserToken) {
          // 只有 token 没有 user 信息，也先恢复 token，确保接口能带 Authorization
          setUserToken(storedUserToken);
        }
      } catch {
        // URL 解析失败时，退回到本地存储
        if (storedUserToken && storedUser) {
          setUserToken(storedUserToken);
          setUser(JSON.parse(storedUser));
        } else if (storedUserToken) {
          setUserToken(storedUserToken);
        }
      }

      // 不再自动发起 LINE 登录，只恢复状态
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loginAdmin = (token: string, adminData: Admin) => {
    setAdminToken(token);
    setAdmin(adminData);
    localStorage.setItem('adminToken', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
  };

  const loginUser = (token: string, userData: User) => {
    setUserToken(token);
    setUser(userData);
    localStorage.setItem('userToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdmin(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
  };

  const logoutUser = () => {
    setUserToken(null);
    setUser(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        user,
        adminToken,
        userToken,
        loginAdmin,
        loginUser,
        logoutAdmin,
        logoutUser,
        isAdminAuthenticated: !!adminToken,
        isUserAuthenticated: !!userToken,
        isLoading,
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
