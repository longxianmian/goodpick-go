import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Calendar,
  ArrowLeft,
  FileText,
  GraduationCap,
} from "lucide-react";
import { useLocation } from "wouter";
import StaffBottomNav from "@/components/StaffBottomNav";
import { format } from "date-fns";
import { zhCN, enUS, th } from "date-fns/locale";
import { formatTextContent } from "@/lib/formatTextContent";

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

export default function StaffCampaignDetail({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const { t, language } = useLanguage();
  const campaignId = params.id;

  // 获取活动详情
  const { data, isLoading } = useQuery<{ success: boolean; data: Campaign }>({
    queryKey: [`/api/campaigns/${campaignId}`],
  });

  const campaign = data?.data;

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

  // 格式化日期范围
  const formatDateRange = (startAt: string, endAt: string) => {
    const locale = language === "zh-cn" ? zhCN : language === "en-us" ? enUS : th;
    const start = format(new Date(startAt), "MMM d, yyyy", { locale });
    const end = format(new Date(endAt), "MMM d, yyyy", { locale });
    return `${start} - ${end}`;
  };

  // 判断是否为视频
  const isVideoUrl = (url: string): boolean => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url);
  };

  // 转换OSS URL为代理URL（用于视频播放）
  const convertToProxyUrl = (ossUrl: string): string => {
    // 检查是否是阿里云OSS的public路径视频
    const match = ossUrl.match(/https?:\/\/[^/]+\/(.+\.(mp4|webm|ogg|mov))$/i);
    if (match && match[1].startsWith('public/')) {
      return `/api/media/video/${match[1]}`;
    }
    // 如果不是视频或不是public路径，返回原URL
    return ossUrl;
  };

  // 获取所有媒体（优先培训媒体，然后横幅图片）
  const getAllMedia = (campaign: Campaign): string[] => {
    const media: string[] = [];
    
    // 优先添加培训媒体
    if (campaign.staffTrainingMediaUrls && campaign.staffTrainingMediaUrls.length > 0) {
      media.push(...campaign.staffTrainingMediaUrls);
    }
    
    // 然后添加横幅图片（如果没有培训媒体）
    if (media.length === 0 && campaign.bannerImageUrl) {
      media.push(campaign.bannerImageUrl);
    }
    
    return media;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <StaffBottomNav active="campaign" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t("staffCampaign.notFound")}</p>
          <Button
            onClick={() => navigate("/staff/campaign")}
            className="mt-4"
            data-testid="button-back-notfound"
          >
            {t("common.back")}
          </Button>
        </div>
        <StaffBottomNav active="campaign" />
      </div>
    );
  }

  const allMedia = getAllMedia(campaign);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/staff/campaign")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{t("staffCampaign.detailTitle")}</h1>
        </div>

        {/* Media Carousel - 16:9 Aspect Ratio */}
        {allMedia.length > 0 && (
          <div className="w-full">
            {allMedia.length === 1 ? (
              // Single media
              <AspectRatio ratio={16/9} className="bg-card rounded-lg overflow-hidden">
                {isVideoUrl(allMedia[0]) ? (
                  <video
                    controls
                    playsInline
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    preload="auto"
                    className="w-full h-full object-contain"
                    data-testid="video-media-0"
                    style={{ display: 'block' }}
                  >
                    <source src={convertToProxyUrl(allMedia[0])} type="video/mp4" />
                    您的浏览器不支持视频播放
                  </video>
                ) : (
                  <img
                    src={allMedia[0]}
                    alt={getTranslatedText(campaign, "title")}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    data-testid="image-media-0"
                  />
                )}
              </AspectRatio>
            ) : (
              // Multiple media - carousel
              <div className="relative px-12">
                <Carousel className="w-full">
                  <CarouselContent>
                    {allMedia.map((url, index) => {
                      const isVideo = isVideoUrl(url);
                      return (
                        <CarouselItem key={index}>
                          <AspectRatio ratio={16/9} className="bg-card rounded-lg overflow-hidden">
                            {isVideo ? (
                              <video
                                controls
                                playsInline
                                webkit-playsinline="true"
                                x5-playsinline="true"
                                preload="auto"
                                className="w-full h-full object-contain"
                                data-testid={`video-media-${index}`}
                                style={{ display: 'block' }}
                              >
                                <source src={convertToProxyUrl(url)} type="video/mp4" />
                                您的浏览器不支持视频播放
                              </video>
                            ) : (
                              <img
                                src={url}
                                alt={`${getTranslatedText(campaign, "title")} ${index + 1}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                data-testid={`image-media-${index}`}
                              />
                            )}
                          </AspectRatio>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            )}
          </div>
        )}

        {/* Campaign Info Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-campaign-title">
                {getTranslatedText(campaign, "title")}
              </h2>
            </div>

            {/* Discount Badge and Date */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="text-sm" data-testid="badge-discount">
                {formatDiscount(campaign)}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-date-range">
                  {formatDateRange(campaign.startAt, campaign.endAt)}
                </span>
              </div>
            </div>

            {/* Campaign Rules */}
            {campaign.descriptionSource && (
              <div className="space-y-2">
                <h3 className="font-semibold text-base">{t("staffCampaign.rules")}</h3>
                <div className="text-sm text-muted-foreground space-y-2" data-testid="content-rules">
                  {formatTextContent(getTranslatedText(campaign, "description"))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Instructions */}
        {campaign.staffInstructions && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{t("staffCampaign.instructions")}</h3>
              </div>
              <div className="space-y-2" data-testid="content-instructions">
                {formatTextContent(campaign.staffInstructions)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Training */}
        {campaign.staffTraining && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{t("staffCampaign.training")}</h3>
              </div>
              <div className="space-y-2" data-testid="content-training">
                {formatTextContent(campaign.staffTraining)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <StaffBottomNav active="campaign" />
    </div>
  );
}
