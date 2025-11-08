import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Video, Image as ImageIcon } from "lucide-react";
import { useLocation } from "wouter";
import StaffBottomNav from "@/components/StaffBottomNav";
import { format } from "date-fns";
import { zhCN, enUS, th } from "date-fns/locale";

interface Campaign {
  id: number;
  titleSource: string;
  titleZh: string | null;
  titleEn: string | null;
  titleTh: string | null;
  descriptionSource: string;
  descriptionZh: string | null;
  descriptionEn: string | null;
  descriptionTh: string | null;
  bannerImageUrl: string | null;
  couponValue: string;
  discountType: "final_price" | "percentage_off" | "cash_voucher";
  originalPrice: string | null;
  startAt: string;
  endAt: string;
  staffInstructions: string | null;
  staffTraining: string | null;
  staffTrainingMediaUrls: string[] | null;
}

export default function StaffCampaignList() {
  const [, navigate] = useLocation();
  const { t, language } = useLanguage();

  // 获取活动列表
  const { data, isLoading } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ["/api/staff/campaigns"],
  });

  const campaigns = data?.data || [];

  // 获取翻译后的文本
  const getTranslatedText = (
    campaign: Campaign,
    field: "title" | "description"
  ) => {
    const sourceField = field === "title" ? "titleSource" : "descriptionSource";
    const zhField = field === "title" ? "titleZh" : "descriptionZh";
    const enField = field === "title" ? "titleEn" : "descriptionEn";
    const thField = field === "title" ? "titleTh" : "descriptionTh";

    if (language === "zh-cn") {
      return campaign[zhField] || campaign[sourceField];
    } else if (language === "en-us") {
      return campaign[enField] || campaign[sourceField];
    } else if (language === "th-th") {
      return campaign[thField] || campaign[sourceField];
    }
    return campaign[sourceField];
  };

  // 获取缩略图URL（优先视频/培训图片，然后横幅图片）
  const getThumbnailUrl = (campaign: Campaign): string | null => {
    if (campaign.staffTrainingMediaUrls && campaign.staffTrainingMediaUrls.length > 0) {
      return campaign.staffTrainingMediaUrls[0];
    }
    return campaign.bannerImageUrl;
  };

  // 判断是否为视频
  const isVideoUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url.trim());
      const pathname = urlObj.pathname.toLowerCase();
      return /\.(mp4|webm|ogg|mov)$/i.test(pathname);
    } catch {
      // 如果不是有效URL，回退到简单正则
      return /\.(mp4|webm|ogg|mov)$/i.test(url.trim());
    }
  };

  // 转换OSS URL为代理URL（用于视频播放，支持Range请求）
  const convertToProxyUrl = (ossUrl: string): string => {
    try {
      const urlObj = new URL(ossUrl.trim());
      const pathname = urlObj.pathname;
      
      // 检查是否是视频文件
      if (!/\.(mp4|webm|ogg|mov)$/i.test(pathname)) {
        return ossUrl;
      }
      
      // 检查是否是public路径
      if (pathname.startsWith('/public/')) {
        return `/api/media/video${pathname}`;
      }
      
      return ossUrl;
    } catch {
      // 如果URL解析失败，返回原URL
      return ossUrl;
    }
  };

  // 格式化折扣显示
  const formatDiscount = (campaign: Campaign): string => {
    if (campaign.discountType === "percentage_off") {
      const value = parseFloat(campaign.couponValue);
      return t("campaign.discountBadge.percentageOff", {
        value: Number.isInteger(value) ? value.toString() : value.toFixed(2)
      });
    } else if (campaign.discountType === "cash_voucher") {
      return t("campaign.discountBadge.cashVoucher", {
        value: parseFloat(campaign.couponValue).toFixed(0)
      });
    } else {
      return t("campaign.discountBadge.finalPrice", {
        value: parseFloat(campaign.couponValue).toFixed(0)
      });
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const locale = language === "zh-cn" ? zhCN : language === "en-us" ? enUS : th;
    return format(new Date(dateString), "MMM d, yyyy", { locale });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-64" />
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex gap-4 p-4">
                <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <StaffBottomNav active="campaign" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t("staffCampaign.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("staffCampaign.subtitle")}
          </p>
        </div>

        {/* Campaign List */}
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const thumbnailUrl = getThumbnailUrl(campaign);
            const isVideo = thumbnailUrl ? isVideoUrl(thumbnailUrl) : false;

            return (
              <Card
                key={campaign.id}
                className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => navigate(`/staff/campaign/${campaign.id}`)}
                data-testid={`card-campaign-${campaign.id}`}
              >
                <div className="flex gap-4 p-4">
                  {/* 左边：缩略图 */}
                  <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {thumbnailUrl ? (
                      isVideo ? (
                        <div className="relative w-full h-full bg-black">
                          <video
                            src={convertToProxyUrl(thumbnailUrl)}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            data-testid={`thumbnail-video-${campaign.id}`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={thumbnailUrl}
                          alt={getTranslatedText(campaign, "title")}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          data-testid={`thumbnail-image-${campaign.id}`}
                        />
                      )
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground" data-testid={`thumbnail-placeholder-${campaign.id}`} />
                    )}
                  </div>

                  {/* 右边：活动信息 */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-semibold text-base line-clamp-2" data-testid={`text-title-${campaign.id}`}>
                        {getTranslatedText(campaign, "title")}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* 折扣徽章 */}
                      <Badge variant="default" className="text-xs" data-testid={`badge-discount-${campaign.id}`}>
                        {formatDiscount(campaign)}
                      </Badge>
                      
                      {/* 日期 */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span data-testid={`text-date-${campaign.id}`}>
                          {formatDate(campaign.startAt)} - {formatDate(campaign.endAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t("staffCampaign.noCampaigns")}</p>
          </div>
        )}
      </div>

      <StaffBottomNav active="campaign" />
    </div>
  );
}
