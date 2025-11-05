import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ScanLine, TrendingUp, BookOpen, CheckCircle2, Calendar } from 'lucide-react';

export default function StaffDemo() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">店员OA功能演示</h1>
            <p className="text-sm text-muted-foreground">Staff OA Feature Demo</p>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="redeem" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="redeem" className="flex items-center gap-2">
              <ScanLine className="w-4 h-4" />
              <span>{t('staffRedeem.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="campaign" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{t('staffCampaign.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{t('staffStats.title')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Redeem */}
          <TabsContent value="redeem">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ScanLine className="w-5 h-5" />
                    {t('staffRedeem.title')}
                  </CardTitle>
                  <CardDescription>{t('staffRedeem.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="demo-code">{t('staffRedeem.codeLabel')}</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="demo-code"
                        type="text"
                        placeholder={t('staffRedeem.codePlaceholder')}
                        maxLength={8}
                        className="font-mono text-lg text-center"
                        data-testid="input-redemption-code"
                        defaultValue="12345678"
                        disabled
                      />
                      <Button data-testid="button-query" disabled>
                        {t('staffRedeem.query')}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Demo Coupon Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      {t('staffRedeem.couponDetails')}
                    </h3>
                    
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('staffRedeem.campaignName')}</span>
                        <span className="font-medium">儿童乐园周末特惠</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('staffRedeem.customerName')}</span>
                        <span className="font-medium">张三</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('staffRedeem.customerPhone')}</span>
                        <span className="font-medium">+66 81-234-5678</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('staffRedeem.couponValue')}</span>
                        <Badge className="text-base">฿299</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('staffRedeem.validUntil')}</span>
                        <span className="font-medium">2025-12-31</span>
                      </div>
                    </div>

                    <Button className="w-full" size="lg" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('staffRedeem.confirmRedeem')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>💡 功能说明：</strong>
                    <br />• 支持8位数字核销码输入
                    <br />• 两步验证：查询优惠券 → 确认核销
                    <br />• 实时显示优惠券详情和客户信息
                    <br />• 权限验证：仅能核销本店铺的优惠券
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Campaign */}
          <TabsContent value="campaign">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    {t('staffCampaign.title')}
                  </CardTitle>
                  <CardDescription>{t('staffCampaign.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Demo Campaign 1 */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg">儿童乐园周末特惠</h3>
                      <Badge variant="default">进行中</Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      2025-11-01 ~ 2025-12-31
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{t('staffCampaign.instructions')}</p>
                        <p className="text-sm">1. 核对客户出示的8位核销码
2. 确认客户身份和优惠券有效期
3. 完成服务后点击确认核销</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{t('staffCampaign.training')}</p>
                        <p className="text-sm">• 优惠券仅限本人使用，请核对客户手机号
• 过期优惠券无法核销
• 每张优惠券仅可使用一次</p>
                      </div>
                    </div>
                  </div>

                  {/* Demo Campaign 2 */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg">7-11 咖啡买一送一</h3>
                      <Badge variant="default">进行中</Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      2025-11-05 ~ 2025-11-30
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{t('staffCampaign.instructions')}</p>
                        <p className="text-sm">1. 确认客户购买任意两杯咖啡
2. 扫描或输入优惠券核销码
3. 系统自动减免一杯咖啡金额</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>💡 功能说明：</strong>
                    <br />• 显示当前进行中的所有活动
                    <br />• 提供活动执行说明和培训内容
                    <br />• 支持多语言活动信息显示
                    <br />• 实时更新活动状态
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Stats */}
          <TabsContent value="stats">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('staffStats.today')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('staffStats.count')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('staffStats.thisWeek')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">58</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('staffStats.count')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('staffStats.thisMonth')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">234</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('staffStats.count')}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('staffStats.byCampaign')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">儿童乐园周末特惠</span>
                      <Badge variant="secondary">156</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">7-11 咖啡买一送一</span>
                      <Badge variant="secondary">78</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('staffStats.recentRedemptions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: '14:23', code: '12345678', campaign: '儿童乐园周末特惠' },
                      { time: '13:45', code: '87654321', campaign: '7-11 咖啡买一送一' },
                      { time: '12:10', code: '11223344', campaign: '儿童乐园周末特惠' },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between py-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.campaign}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('staffStats.code')}: {item.code}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">{item.time}</span>
                        </div>
                        {index < 2 && <Separator />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>💡 功能说明：</strong>
                    <br />• 个人核销统计：今日/本周/本月核销数量
                    <br />• 按活动分类显示核销明细
                    <br />• 最近核销记录列表
                    <br />• 实时数据更新
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Access Instructions */}
        <Card className="mt-8 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100">🔐 如何访问实际页面</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
            <p><strong>这三个店员页面需要登录认证才能访问：</strong></p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>访问首页 <code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">/campaign/1</code></li>
              <li>点击"领取优惠券"触发LINE登录</li>
              <li>访问 <code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">/staff/bind</code> 绑定店员身份</li>
              <li>登录成功后即可访问：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li><code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">/staff/redeem</code> - 店员核销</li>
                  <li><code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">/staff/campaign</code> - 活动说明</li>
                  <li><code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded">/staff/stats</code> - 我的统计</li>
                </ul>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
