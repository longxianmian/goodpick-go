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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Calendar,
  FileText,
  GraduationCap,
  ChevronDown,
  ChevronUp,
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
}

export default function StaffCampaign() {
  const [, navigate] = useLocation();
  const { user, userToken } = useAuth();
  const { t, language } = useLanguage();
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<number>>(
    new Set(),
  );

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/staff/campaigns"],
    enabled: !!userToken,
  });

  if (!user || !userToken) {
    navigate("/");
    return null;
  }

  const toggleExpanded = (campaignId: number) => {
    setExpandedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

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
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const isExpanded = expandedCampaigns.has(campaign.id);
                const title = getLocalizedText(
                  campaign.titleSource,
                  campaign.titleZh,
                  campaign.titleEn,
                  campaign.titleTh,
                );
                const description = getLocalizedText(
                  campaign.descriptionSource,
                  campaign.descriptionZh,
                  campaign.descriptionEn,
                  campaign.descriptionTh,
                );

                return (
                  <Card
                    key={campaign.id}
                    data-testid={`campaign-${campaign.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{title}</CardTitle>
                          <CardDescription className="mt-1">
                            {description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {campaign.discountType === "percentage_off"
                            ? `${campaign.couponValue}%`
                            : `฿${campaign.couponValue}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Banner Image */}
                      {campaign.bannerImageUrl && (
                        <img
                          src={campaign.bannerImageUrl}
                          alt={title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}

                      {/* Campaign Period */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(campaign.startAt).toLocaleDateString(
                            language,
                          )}{" "}
                          -{" "}
                          {new Date(campaign.endAt).toLocaleDateString(
                            language,
                          )}
                        </span>
                      </div>

                      {/* Expandable Details */}
                      {(campaign.staffInstructions ||
                        campaign.staffTraining) && (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => toggleExpanded(campaign.id)}
                            data-testid={`button-expand-${campaign.id}`}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                {t("staffCampaign.hideDetails")}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                {t("staffCampaign.showDetails")}
                              </>
                            )}
                          </Button>

                          {isExpanded && (
                            <div className="space-y-4 pt-4">
                              <Separator />

                              {/* Staff Instructions */}
                              {campaign.staffInstructions && (
                                <div className="space-y-2">
                                  <h3 className="flex items-center gap-2 font-semibold">
                                    <FileText className="w-4 h-4" />
                                    {t("staffCampaign.instructions")}
                                  </h3>
                                  <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">
                                      {campaign.staffInstructions}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Staff Training */}
                              {campaign.staffTraining && (
                                <div className="space-y-2">
                                  <h3 className="flex items-center gap-2 font-semibold">
                                    <GraduationCap className="w-4 h-4" />
                                    {t("staffCampaign.training")}
                                  </h3>
                                  <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">
                                      {campaign.staffTraining}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Price Info */}
                      {campaign.discountType !== "cash_voucher" &&
                        campaign.originalPrice && (
                          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">
                              {t("staffCampaign.originalPrice")}
                            </span>
                            <span className="font-medium">
                              ฿{campaign.originalPrice}
                            </span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
