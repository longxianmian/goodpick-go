import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Calendar,
  FileText,
  GraduationCap,
} from "lucide-react";
import { useLocation } from "wouter";
import StaffBottomNav from "@/components/StaffBottomNav";

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

// 格式化文本内容：保留段落和列表格式
function formatTextContent(text: string): JSX.Element[] {
  if (!text) return [];
  
  // 按双换行符分段
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((para, idx) => {
    // 检查是否是列表项
    const lines = para.split('\n').filter(line => line.trim());
    
    // 检查是否是编号列表（1）2）3. 等）
    const isNumberedList = lines.length > 1 && lines.every(line => 
      /^\s*\d+[.)）]/.test(line)
    );
    
    // 检查是否是符号列表（• - * 等）
    const isBulletList = !isNumberedList && lines.length > 1 && lines.every(line => 
      /^[•\-*]/.test(line)
    );
    
    if (isNumberedList) {
      // 编号列表使用 <ol>
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1 ml-2">
          {lines.map((line, i) => (
            <li key={i} className="text-sm">
              {line.replace(/^\s*\d+[.)）]\s*/, '')}
            </li>
          ))}
        </ol>
      );
    }
    
    if (isBulletList) {
      // 符号列表使用 <ul>
      return (
        <ul key={idx} className="list-disc list-inside space-y-1 ml-2">
          {lines.map((line, i) => (
            <li key={i} className="text-sm">
              {line.replace(/^[•\-*]\s*/, '')}
            </li>
          ))}
        </ul>
      );
    }
    
    // 普通段落
    return (
      <p key={idx} className="text-sm leading-relaxed">
        {para}
      </p>
    );
  });
}

export default function StaffCampaign({ params }: { params?: { id: string } }) {
  const [, navigate] = useLocation();
  const { user, userToken } = useAuth();
  const { t, language } = useLanguage();

  // 如果有ID参数，获取单个活动；否则获取所有活动列表
  const campaignId = params?.id;

  // 单个活动查询（有ID参数时）
  const { data: singleCampaign, isLoading: isSingleLoading } = useQuery<{ success: boolean; data: Campaign }>({
    queryKey: [`/api/campaigns/${campaignId}`],
    enabled: !!campaignId,
  });

  // 员工活动列表查询（已登录员工，无ID参数）
  const { data: staffCampaignsResponse, isLoading: isStaffListLoading } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ["/api/staff/campaigns"],
    enabled: !!userToken && !campaignId,
  });

  // 公开活动列表查询（未登录，无ID参数）
  const { data: publicCampaignsResponse, isLoading: isPublicListLoading } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ["/api/campaigns"],
    enabled: !userToken && !campaignId,
  });

  const isLoading = campaignId ? isSingleLoading : (userToken ? isStaffListLoading : isPublicListLoading);
  
  const displayCampaigns = campaignId && singleCampaign?.data 
    ? [singleCampaign.data] 
    : userToken 
      ? (staffCampaignsResponse?.data || [])
      : (publicCampaignsResponse?.data || []);

  const getLocalizedText = (
    source: string,
    zh: string | null,
    en: string | null,
    th: string | null,
  ): string => {
    if (language === "zh-cn") return zh || source;
    if (language === "en-us") return en || source;
    if (language === "th-th") return th || source;
    return source;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold">{t("staffCampaign.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("staffCampaign.description")}
            </p>
          </div>

          {/* Campaigns List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayCampaigns && displayCampaigns.length > 0 ? (
            <Accordion type="multiple" className="space-y-4">
              {displayCampaigns.map((campaign) => {
                const title = getLocalizedText(
                  campaign.titleSource,
                  campaign.titleZh,
                  campaign.titleEn,
                  campaign.titleTh,
                );

                return (
                  <AccordionItem
                    key={campaign.id}
                    value={`campaign-${campaign.id}`}
                    className="border rounded-lg overflow-hidden"
                    data-testid={`campaign-${campaign.id}`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex-1 text-left">
                          <h3 className="text-lg font-semibold">{title}</h3>
                          {campaign.bannerImageUrl && (
                            <img
                              src={campaign.bannerImageUrl}
                              alt={title}
                              className="mt-2 w-full h-32 object-cover rounded-md"
                            />
                          )}
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(campaign.startAt).toLocaleDateString(language)} -{" "}
                              {new Date(campaign.endAt).toLocaleDateString(language)}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {campaign.discountType === "percentage_off"
                            ? `${campaign.couponValue}%`
                            : `฿${campaign.couponValue}`}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 pb-4 space-y-4">
                      {/* Staff Instructions */}
                      {campaign.staffInstructions && (
                        <div className="space-y-2">
                          <h4 className="flex items-center gap-2 font-semibold text-base">
                            <FileText className="w-4 h-4" />
                            {t("staffCampaign.instructions")}
                          </h4>
                          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            {formatTextContent(campaign.staffInstructions)}
                          </div>
                        </div>
                      )}

                      {/* Staff Training */}
                      {(campaign.staffTraining || (campaign.staffTrainingMediaUrls && campaign.staffTrainingMediaUrls.length > 0)) && (
                        <div className="space-y-2">
                          <h4 className="flex items-center gap-2 font-semibold text-base">
                            <GraduationCap className="w-4 h-4" />
                            {t("staffCampaign.training")}
                          </h4>
                          {campaign.staffTraining && (
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                              {formatTextContent(campaign.staffTraining)}
                            </div>
                          )}
                          
                          {/* Training Media Carousel */}
                          {campaign.staffTrainingMediaUrls && campaign.staffTrainingMediaUrls.length > 0 && (
                            <div className="mt-4">
                              {campaign.staffTrainingMediaUrls.length === 1 ? (
                                // 单个媒体直接显示
                                <div className="rounded-lg overflow-hidden">
                                  {campaign.staffTrainingMediaUrls[0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                    <video
                                      src={campaign.staffTrainingMediaUrls[0]}
                                      controls
                                      playsInline
                                      className="w-full max-h-96 bg-black"
                                      data-testid="video-training-0"
                                    />
                                  ) : (
                                    <img
                                      src={campaign.staffTrainingMediaUrls[0]}
                                      alt="培训图片"
                                      className="w-full h-auto rounded-lg"
                                      data-testid="image-training-0"
                                    />
                                  )}
                                </div>
                              ) : (
                                // 多个媒体使用轮播
                                <Carousel className="w-full">
                                  <CarouselContent>
                                    {campaign.staffTrainingMediaUrls.map((url, index) => {
                                      const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                                      return (
                                        <CarouselItem key={index}>
                                          <div className="rounded-lg overflow-hidden">
                                            {isVideo ? (
                                              <video
                                                src={url}
                                                controls
                                                playsInline
                                                className="w-full max-h-96 bg-black"
                                                data-testid={`video-training-${index}`}
                                              />
                                            ) : (
                                              <img
                                                src={url}
                                                alt={`培训图片 ${index + 1}`}
                                                className="w-full h-auto rounded-lg"
                                                data-testid={`image-training-${index}`}
                                              />
                                            )}
                                          </div>
                                        </CarouselItem>
                                      );
                                    })}
                                  </CarouselContent>
                                  <CarouselPrevious className="left-2" />
                                  <CarouselNext className="right-2" />
                                </Carousel>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Price Info */}
                      {campaign.discountType !== "cash_voucher" && campaign.originalPrice && (
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">
                            {t("staffCampaign.originalPrice")}
                          </span>
                          <span className="font-medium">฿{campaign.originalPrice}</span>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  {t("staffCampaign.noCampaigns")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <StaffBottomNav active="campaign" />
    </div>
  );
}
