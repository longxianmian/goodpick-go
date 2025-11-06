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

      if ((window as any).liff && (window as any).liff.isInClient() && (window as any).liff.isLoggedIn()) {
        console.log('[AuthContext] LIFF环境且已登录，执行自动登录');
        try {
          const idToken = (window as any).liff.getIDToken();
          const response = await fetch('/api/auth/line/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });

          const data = await response.json();

          if (data.success) {
            setUserToken(data.token);
            setUser(data.user);
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('[AuthContext] LIFF自动登录成功');
          }
        } catch (error) {
          console.error('[AuthContext] LIFF自动登录失败:', error);
        }
      }
      
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
