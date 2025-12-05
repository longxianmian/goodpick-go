import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleAwareBottomNav } from "@/components/RoleAwareBottomNav";
import {
  Package,
  Calendar,
  Plus,
  Image,
  Video,
  Share2,
  Target,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Megaphone,
  Palette,
  Film,
  Radio,
  Settings,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  PauseCircle,
} from "lucide-react";

export default function OperatorCenter() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("products");

  const productStats = {
    total: 48,
    online: 42,
    offline: 3,
    pending: 3,
  };

  const campaignStats = {
    total: 12,
    active: 5,
    scheduled: 3,
    ended: 4,
  };

  const pendingProducts = [
    { id: 1, name: "招牌奶茶", status: "pending", updatedAt: "10分钟前" },
    { id: 2, name: "芒果冰沙", status: "pending", updatedAt: "30分钟前" },
    { id: 3, name: "草莓蛋糕", status: "offline", updatedAt: "1小时前" },
  ];

  const campaigns = [
    { id: 1, name: "双12大促", status: "active", progress: 68, endDate: "12月12日" },
    { id: 2, name: "新品尝鲜", status: "scheduled", startDate: "12月15日" },
    { id: 3, name: "会员专享", status: "active", progress: 45, endDate: "12月20日" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t('operator.active')}</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{t('operator.scheduled')}</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{t('operatorCenter.pending')}</Badge>;
      case "offline":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">{t('operatorCenter.offline')}</Badge>;
      case "ended":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">{t('operatorCenter.ended')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#38B03B] to-[#2d8f2f] text-white p-4 pt-6">
        <h1 className="text-xl font-bold text-center mb-4">{t('operatorCenter.title')}</h1>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/10 border-white/20 p-3">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Package className="w-4 h-4" />
              <span>{t('operatorCenter.products')}</span>
            </div>
            <div className="text-2xl font-bold">{productStats.total}</div>
            <div className="text-xs text-white/60">
              {productStats.online} {t('operatorCenter.online')} / {productStats.pending} {t('operatorCenter.pending')}
            </div>
          </Card>
          <Card className="bg-white/10 border-white/20 p-3">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              <span>{t('operatorCenter.campaigns')}</span>
            </div>
            <div className="text-2xl font-bold">{campaignStats.total}</div>
            <div className="text-xs text-white/60">
              {campaignStats.active} {t('operator.active')} / {campaignStats.scheduled} {t('operator.scheduled')}
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="products" className="flex items-center gap-2" data-testid="tab-products">
              <Package className="w-4 h-4" />
              {t('operatorCenter.productModule')}
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2" data-testid="tab-campaigns">
              <Megaphone className="w-4 h-4" />
              {t('operatorCenter.campaignModule')}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => navigate("/operator/products")}
                data-testid="button-all-products"
              >
                <Package className="w-5 h-5 text-[#38B03B]" />
                <span className="text-xs">{t('operatorCenter.allProducts')}</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => navigate("/operator/products/new")}
                data-testid="button-add-product"
              >
                <Plus className="w-5 h-5 text-blue-500" />
                <span className="text-xs">{t('operatorCenter.addProduct')}</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                data-testid="button-product-stats"
              >
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span className="text-xs">{t('operatorCenter.productStats')}</span>
              </Button>
            </div>

            {/* Pending Items */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  {t('operatorCenter.pendingItems')}
                </h3>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {pendingProducts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.updatedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <Button size="icon" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Product Status Overview */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">{t('operatorCenter.statusOverview')}</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-lg font-bold">{productStats.online}</p>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.online')}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <PauseCircle className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                  <p className="text-lg font-bold">{productStats.offline}</p>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.offline')}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-lg font-bold">{productStats.pending}</p>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.pending')}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Package className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-bold">{productStats.total}</p>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.total')}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            {/* Campaign Sections */}
            <div className="grid grid-cols-2 gap-3">
              {/* Campaign Planning */}
              <Card 
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => navigate("/operator/campaigns")}
                data-testid="card-campaign-planning"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="font-medium">{t('operatorCenter.campaignPlanning')}</h4>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.campaignPlanningDesc')}</p>
                </div>
              </Card>

              {/* Graphic Design */}
              <Card 
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => navigate("/operator/design")}
                data-testid="card-graphic-design"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Palette className="w-6 h-6 text-purple-500" />
                  </div>
                  <h4 className="font-medium">{t('operatorCenter.graphicDesign')}</h4>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.graphicDesignDesc')}</p>
                </div>
              </Card>

              {/* Video Production */}
              <Card 
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => navigate("/operator/video")}
                data-testid="card-video-production"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                    <Film className="w-6 h-6 text-pink-500" />
                  </div>
                  <h4 className="font-medium">{t('operatorCenter.videoProduction')}</h4>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.videoProductionDesc')}</p>
                </div>
              </Card>

              {/* Channel Selection */}
              <Card 
                className="p-4 hover-elevate cursor-pointer"
                onClick={() => navigate("/operator/channels")}
                data-testid="card-channel-selection"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-orange-500" />
                  </div>
                  <h4 className="font-medium">{t('operatorCenter.channelSelection')}</h4>
                  <p className="text-xs text-muted-foreground">{t('operatorCenter.channelSelectionDesc')}</p>
                </div>
              </Card>
            </div>

            {/* Active Campaigns */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  {t('operatorCenter.activeCampaigns')}
                </h3>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{campaign.name}</span>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <Button size="icon" variant="ghost">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    {campaign.progress !== undefined && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t('operatorCenter.progress')}</span>
                          <span>{campaign.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#38B03B] rounded-full transition-all"
                            style={{ width: `${campaign.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('operatorCenter.endsOn')} {campaign.endDate}
                        </p>
                      </div>
                    )}
                    {campaign.startDate && (
                      <p className="text-xs text-muted-foreground">
                        {t('operatorCenter.startsOn')} {campaign.startDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Tools */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">{t('operatorCenter.quickTools')}</h3>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-3">
                  <Image className="w-5 h-5 text-purple-500" />
                  <span className="text-xs">{t('operatorCenter.poster')}</span>
                </Button>
                <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-3">
                  <Video className="w-5 h-5 text-pink-500" />
                  <span className="text-xs">{t('operatorCenter.video')}</span>
                </Button>
                <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-3">
                  <Share2 className="w-5 h-5 text-blue-500" />
                  <span className="text-xs">{t('operatorCenter.share')}</span>
                </Button>
                <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-3">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="text-xs">{t('operatorCenter.settings')}</span>
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <RoleAwareBottomNav forceRole="operator" />
    </div>
  );
}
