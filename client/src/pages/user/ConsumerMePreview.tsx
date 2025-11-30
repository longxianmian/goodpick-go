import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleAwareBottomNav } from "@/components/RoleAwareBottomNav";
import { 
  ChevronRight, 
  Settings, 
  ShoppingCart, 
  Receipt, 
  Coins, 
  Wallet,
  ChevronDown
} from "lucide-react";
import { SiLine } from "react-icons/si";

type TabType = "cart" | "orders" | "points" | "wallet";
type IdentityType = "shua" | "discover";

export default function ConsumerMePreview() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("cart");
  const [identity, setIdentity] = useState<IdentityType>("shua");

  const renderTabContent = () => {
    switch (tab) {
      case "cart":
        return (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">按商户分组展示待结算商品：</div>
            {[1, 2].map((store) => (
              <Card key={store}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm">和牛烧肉屋 Sukhumvit {store}</div>
                    <Button variant="ghost" size="sm" className="text-xs h-auto p-0">进店逛逛</Button>
                  </div>
                  {[1, 2].map((item) => (
                    <div key={item} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div>
                          <div className="text-xs">人气套餐 {item}</div>
                          <div className="text-[11px] text-muted-foreground">双人 · 晚市</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">฿399</div>
                        <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                          <button className="px-1.5 rounded-full border">-</button>
                          <span>1</span>
                          <button className="px-1.5 rounded-full border">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case "orders":
        return (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {["全部", "待付款", "待使用", "已完成", "退款售后"].map((s) => (
                <Badge key={s} variant="secondary" className="whitespace-nowrap">{s}</Badge>
              ))}
            </div>
            {[1, 2, 3].map((o) => (
              <Card key={o}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">和牛烧肉屋 Sukhumvit {o}</span>
                    <span className="text-orange-500">已完成</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-muted" />
                      <div>
                        <div className="text-xs">下班小聚人气套餐</div>
                        <div className="text-[11px] text-muted-foreground">共 3 件商品</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">实付 ฿1,288</div>
                      <div className="text-[11px] text-muted-foreground">2025-11-28 19:30</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 text-[11px] mt-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs">再次购买</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">查看详情</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case "points":
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl p-3 text-white flex justify-between items-center">
              <div>
                <div className="text-xs opacity-80">平台积分</div>
                <div className="text-xl font-semibold">12,680</div>
              </div>
              <Button variant="ghost" size="sm" className="bg-white/15 text-white text-xs">
                积分兑换专区
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">各商户积分</div>
              {[1, 2, 3].map((s) => (
                <Card key={s}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted" />
                      <div>
                        <div className="text-xs">和牛烧肉屋 Sukhumvit {s}</div>
                        <div className="text-[11px] text-muted-foreground">白金会员 · 双倍积分</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div>积分 3,28{s}</div>
                      <div className="text-[11px] text-emerald-500">查看明细 <ChevronRight className="inline w-3 h-3" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">我的卡券</div>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span className="text-emerald-500">可使用</span>
                  <span>已使用</span>
                  <span>已过期</span>
                </div>
              </div>
              {[1, 2].map((c) => (
                <Card key={c}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="space-y-1 text-xs">
                      <div>和牛烧肉屋 下班小聚代金券</div>
                      <div className="text-[11px] text-orange-500">满 800 减 200</div>
                      <div className="text-[11px] text-muted-foreground">适用门店：Sukhumvit {c}</div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div>剩余 2 张</div>
                      <div className="text-muted-foreground">有效期至 2025-12-31</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "wallet":
        return (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">可用余额</div>
                  <div className="text-xl font-semibold">฿ 528.00</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>红包 / 代金券：3 张</div>
                  <div className="text-emerald-500 mt-1">查看详情 <ChevronRight className="inline w-3 h-3" /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs">收支明细</div>
                  <div className="text-[11px] text-muted-foreground">最近 30 天</div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div>
                        <div>和牛烧肉屋消费返现</div>
                        <div className="text-[11px] text-muted-foreground">2025-11-2{i} 20:15</div>
                      </div>
                      <div className={i % 2 === 0 ? "text-emerald-500" : "text-muted-foreground"}>
                        {i % 2 === 0 ? "+ ฿30.00" : "- ฿399.00"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  const tabItems = [
    { key: "cart" as TabType, label: "购物车", icon: ShoppingCart },
    { key: "orders" as TabType, label: "订单", icon: Receipt },
    { key: "points" as TabType, label: "积分/卡券", icon: Coins },
    { key: "wallet" as TabType, label: "钱包", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="flex items-center justify-between h-12 px-4 bg-background border-b">
        <div className="text-base font-semibold">我的</div>
        <Button variant="ghost" size="icon" data-testid="button-settings">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* 账号信息区 */}
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 cursor-pointer" data-testid="avatar-user">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-muted">
                  {user?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium cursor-pointer" data-testid="text-user-name">
                    {user?.displayName || '宝宝龙'}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => setIdentity((prev) => (prev === "shua" ? "discover" : "shua"))}
                    data-testid="button-switch-identity"
                  >
                    <span>{identity === "shua" ? "刷刷号" : "发现号"}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <SiLine className="w-3 h-3" />
                    已绑定
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">已实名</Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" data-testid="button-logout">
              退出登录
            </Button>
          </CardContent>
        </Card>

        {/* 会员卡区域 */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">我的会员卡</div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0">
                更多 <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="min-w-[180px] h-28 rounded-xl bg-gradient-to-br from-[#38B03B] to-emerald-600 text-white p-3 flex flex-col justify-between flex-shrink-0"
                  data-testid={`card-member-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20" />
                    <div className="text-xs font-semibold">和牛烧肉屋 Sukhumvit {i}</div>
                  </div>
                  <div className="flex items-end justify-between text-xs">
                    <div>
                      <div className="text-[11px] opacity-80 mb-1">白金会员</div>
                      <div className="flex items-baseline gap-2">
                        <span className="opacity-80">积分</span>
                        <span className="text-lg font-semibold">3,28{i}</span>
                      </div>
                    </div>
                    <div className="text-right opacity-80 text-[11px]">今日下班小聚首选</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 购物信息区 */}
        <Card>
          <CardContent className="p-3">
            <div className="flex mb-3 gap-1 bg-muted/50 rounded-lg p-1">
              {tabItems.map((item) => (
                <button
                  key={item.key}
                  className={`flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                    tab === item.key
                      ? "bg-background text-[#38B03B] shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setTab(item.key)}
                  data-testid={`tab-${item.key}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-xs">
              {renderTabContent()}
            </div>
          </CardContent>
        </Card>
      </div>

      <RoleAwareBottomNav forceRole="consumer" />
    </div>
  );
}
