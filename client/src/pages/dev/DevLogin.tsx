import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, AlertTriangle } from 'lucide-react';

const TEST_ACCOUNTS = [
  {
    lineUserId: 'U36ca390160a7674f51442fa6df2290f0',
    displayName: '宝宝龙',
    description: '系统测试账号 - 拥有所有角色权限',
  },
];

export default function DevLogin() {
  const [, setLocation] = useLocation();
  const { loginUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDevLogin = async (lineUserId: string) => {
    setLoading(lineUserId);
    
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineUserId }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('userToken', result.token);
        loginUser(result.token, result.user);
        
        toast({
          title: '登录成功',
          description: `欢迎, ${result.user.displayName}`,
        });
        
        setLocation('/dev/me/creator');
      } else {
        toast({
          title: '登录失败',
          description: result.message || '未知错误',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Dev login error:', error);
      toast({
        title: '登录失败',
        description: '服务器错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              开发环境
            </Badge>
          </div>
          <CardTitle className="mt-3">开发测试登录</CardTitle>
          <CardDescription>
            选择一个测试账号登录。此功能仅在开发环境可用。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TEST_ACCOUNTS.map((account) => (
            <Button
              key={account.lineUserId}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleDevLogin(account.lineUserId)}
              disabled={loading !== null}
              data-testid={`button-login-${account.lineUserId}`}
            >
              {loading === account.lineUserId ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <User className="w-5 h-5 mr-3 text-muted-foreground" />
              )}
              <div className="text-left">
                <div className="font-medium">{account.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  {account.description}
                </div>
              </div>
            </Button>
          ))}
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              登录后将跳转到刷刷号创作者中心
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
