import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft,
  Bell,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Megaphone,
  Gift,
  Settings,
  Trash2
} from 'lucide-react';

interface Notification {
  id: number;
  type: 'earning' | 'system' | 'promotion' | 'alert';
  title: string;
  content: string;
  date: string;
  isRead: boolean;
}

export default function CreatorNotifications() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: 'earning', title: '收益到账', content: '您的CPC推广收益 ฿35.50 已结算', date: '2小时前', isRead: false },
    { id: 2, type: 'promotion', title: '新推广活动', content: '您关注的商户发布了新的推广活动', date: '5小时前', isRead: false },
    { id: 3, type: 'system', title: '系统通知', content: '平台将于明日凌晨2点进行维护升级', date: '1天前', isRead: true },
    { id: 4, type: 'alert', title: '内容审核', content: '您的作品《美食探店vlog》已通过审核', date: '2天前', isRead: true },
    { id: 5, type: 'earning', title: '收益到账', content: '您的CPS佣金 ฿120.00 已结算', date: '3天前', isRead: true },
  ]);

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earning': return <DollarSign className="w-5 h-5" />;
      case 'system': return <Settings className="w-5 h-5" />;
      case 'promotion': return <Megaphone className="w-5 h-5" />;
      case 'alert': return <AlertCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earning': return 'bg-green-100 dark:bg-green-900/30 text-green-500';
      case 'system': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-500';
      case 'promotion': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-500';
      case 'alert': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-500';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-6">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/creator/me')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('notifications.title')}</span>
          <div className="w-9" />
        </header>
      </div>

      <main className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('notifications.unread')}: 
            </span>
            <Badge variant="secondary">{unreadCount}</Badge>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              data-testid="button-mark-all-read"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1" data-testid="tab-all">{t('notifications.all')}</TabsTrigger>
            <TabsTrigger value="earning" className="flex-1" data-testid="tab-earning">{t('notifications.earnings')}</TabsTrigger>
            <TabsTrigger value="system" className="flex-1" data-testid="tab-system">{t('notifications.system')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="pt-4 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                {t('notifications.noNotifications')}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    notification.isRead ? 'bg-transparent' : 'bg-blue-50 dark:bg-blue-950/20'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getTypeColor(notification.type)}`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{notification.content}</div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {notification.date}
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    data-testid={`button-delete-${notification.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
