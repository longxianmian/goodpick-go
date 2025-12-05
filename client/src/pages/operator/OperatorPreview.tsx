import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleAwareBottomNav } from "@/components/RoleAwareBottomNav";
import {
  Store,
  Eye,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  Phone,
  Star,
  ChevronRight,
  Package,
  Calendar,
  TrendingUp,
} from "lucide-react";

export default function OperatorPreview() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const storeInfo = {
    id: 1,
    name: "星巴克咖啡 (天安门店)",
    logo: null,
    address: "北京市东城区长安街1号",
    phone: "010-12345678",
    rating: 4.8,
    reviewCount: 1256,
    status: "open",
    businessHours: "08:00 - 22:00",
  };

  const quickStats = {
    todayViews: 328,
    todayOrders: 45,
    activePromotions: 3,
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleViewStoreFront = () => {
    navigate(`/store/${storeInfo.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#38B03B] to-[#2d8f2f] text-white p-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{t('operatorPreview.title')}</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={handleRefresh}
            data-testid="button-refresh-preview"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Store Card */}
        <Card className="bg-white/10 border-white/20 p-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              {storeInfo.logo ? (
                <img src={storeInfo.logo} alt={storeInfo.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Store className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{storeInfo.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={storeInfo.status === 'open' ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}>
                  {storeInfo.status === 'open' ? t('operatorPreview.open') : t('operatorPreview.closed')}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-white/80">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{storeInfo.rating}</span>
                  <span className="text-white/60">({storeInfo.reviewCount})</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3 text-center">
            <Eye className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{quickStats.todayViews}</p>
            <p className="text-xs text-muted-foreground">{t('operatorPreview.todayViews')}</p>
          </Card>
          <Card className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{quickStats.todayOrders}</p>
            <p className="text-xs text-muted-foreground">{t('operatorPreview.todayOrders')}</p>
          </Card>
          <Card className="p-3 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold">{quickStats.activePromotions}</p>
            <p className="text-xs text-muted-foreground">{t('operatorPreview.activePromos')}</p>
          </Card>
        </div>

        {/* Store Info */}
        <Card className="p-4 mb-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Store className="w-4 h-4" />
            {t('operatorPreview.storeInfo')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm">{storeInfo.address}</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm">{storeInfo.businessHours}</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm">{storeInfo.phone}</p>
            </div>
          </div>
        </Card>

        {/* View as Consumer Button */}
        <Button
          className="w-full bg-[#38B03B] hover:bg-[#2d8f2f] text-white mb-4"
          onClick={handleViewStoreFront}
          data-testid="button-view-store-front"
        >
          <Eye className="w-4 h-4 mr-2" />
          {t('operatorPreview.viewAsConsumer')}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">{t('operatorPreview.quickActions')}</h3>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => navigate("/operator/center")}
              data-testid="button-goto-products"
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                {t('operatorPreview.manageProducts')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => navigate("/operator/center")}
              data-testid="button-goto-campaigns"
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                {t('operatorPreview.manageCampaigns')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => navigate("/operator/center")}
              data-testid="button-view-analytics"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                {t('operatorPreview.viewAnalytics')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Tip */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          {t('operatorPreview.tip')}
        </p>
      </div>

      <RoleAwareBottomNav forceRole="operator" />
    </div>
  );
}
