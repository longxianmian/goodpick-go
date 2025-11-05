import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, TrendingUp, Award, Clock } from 'lucide-react';
import { useLocation } from 'wouter';

interface SummaryData {
  today: number;
  week: number;
  month: number;
  byCampaign: Array<{
    campaignId: number;
    campaignTitle: string;
    count: number;
  }>;
}

interface RecentRedemption {
  id: number;
  code: string;
  usedAt: string;
  campaignTitle: string;
  userName: string | null;
  couponValue: string;
}

export default function StaffStats() {
  const [, navigate] = useLocation();
  const { user, userToken } = useAuth();
  const { t, language } = useLanguage();

  const { data: summaryData, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ['/api/staff/summary'],
    enabled: !!userToken,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery<RecentRedemption[]>({
    queryKey: ['/api/staff/recent-redemptions'],
    enabled: !!userToken,
  });

  if (!user || !userToken) {
    navigate('/');
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen p-4 pb-20">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">{t('staffStats.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('staffStats.description')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('staffStats.today')}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{summaryData?.today || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('staffStats.redemptions')}
              </p>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('staffStats.thisWeek')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{summaryData?.week || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('staffStats.redemptions')}
              </p>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('staffStats.thisMonth')}
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{summaryData?.month || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('staffStats.redemptions')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* By Campaign */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t('staffStats.byCampaign')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : summaryData?.byCampaign && summaryData.byCampaign.length > 0 ? (
              <div className="space-y-3">
                {summaryData.byCampaign.map((item) => (
                  <div
                    key={item.campaignId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`campaign-stat-${item.campaignId}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.campaignTitle}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('staffStats.noCampaignData')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Redemptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('staffStats.recentRedemptions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentData && recentData.length > 0 ? (
              <div className="space-y-3">
                {recentData.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`redemption-${redemption.id}`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{redemption.code}</span>
                        <Badge variant="outline" className="text-xs">
                          ฿{redemption.couponValue}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {redemption.campaignTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {redemption.userName || '-'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {new Date(redemption.usedAt).toLocaleString(language, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('staffStats.noRecentData')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
