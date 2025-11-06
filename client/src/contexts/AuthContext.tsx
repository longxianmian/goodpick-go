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
    const initAuth = async () => {
      const storedAdminToken = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('admin');
      const storedUserToken = localStorage.getItem('userToken');
      const storedUser = localStorage.getItem('user');

      if (storedAdminToken && storedAdmin) {
        setAdminToken(storedAdminToken);
        setAdmin(JSON.parse(storedAdmin));
      }

      if (storedUserToken && storedUser) {
        setUserToken(storedUserToken);
        setUser(JSON.parse(storedUser));
        setIsLoading(false);
        return;
      }

      // 【禁止自动登录】只从 localStorage 恢复登录状态，不自动发起 LINE 登录
      // 用户必须主动点击"立即领取"或"我的优惠券"按钮才触发登录
      
      setIsLoading(false);
    };

    const timer = setTimeout(initAuth, 500);
    return () => clearTimeout(timer);
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
