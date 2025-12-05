import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, WifiOff, ServerCrash, FileQuestion, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

type ErrorType = "network" | "server" | "notFound" | "generic";

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  className?: string;
}

const errorConfig = {
  network: {
    icon: WifiOff,
    titleKey: "error.network.title",
    messageKey: "error.network.message",
    defaultTitle: "网络连接失败",
    defaultMessage: "请检查您的网络连接后重试",
    colorClass: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  },
  server: {
    icon: ServerCrash,
    titleKey: "error.server.title",
    messageKey: "error.server.message",
    defaultTitle: "服务器错误",
    defaultMessage: "服务器暂时无法响应，请稍后重试",
    colorClass: "bg-destructive/10 text-destructive",
  },
  notFound: {
    icon: FileQuestion,
    titleKey: "error.notFound.title",
    messageKey: "error.notFound.message",
    defaultTitle: "内容不存在",
    defaultMessage: "您访问的内容可能已被删除或移动",
    colorClass: "bg-muted text-muted-foreground",
  },
  generic: {
    icon: AlertCircle,
    titleKey: "error.generic.title",
    messageKey: "error.generic.message",
    defaultTitle: "出错了",
    defaultMessage: "发生了一些问题，请稍后重试",
    colorClass: "bg-muted text-muted-foreground",
  },
};

export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  showHomeButton = false,
  showBackButton = false,
  className,
}: ErrorStateProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const config = errorConfig[type];
  const Icon = config.icon;

  const displayTitle = title || t(config.titleKey) || config.defaultTitle;
  const displayMessage = message || t(config.messageKey) || config.defaultMessage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
      data-testid="error-state"
    >
      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", config.colorClass)}>
        <Icon className="w-8 h-8" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2" data-testid="error-title">
        {displayTitle}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-xs" data-testid="error-message">
        {displayMessage}
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        {onRetry && (
          <Button onClick={onRetry} variant="default" data-testid="button-retry">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("common.retry") || "重试"}
          </Button>
        )}
        
        {showBackButton && (
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back") || "返回"}
          </Button>
        )}
        
        {showHomeButton && (
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            data-testid="button-home"
          >
            <Home className="w-4 h-4 mr-2" />
            {t("common.home") || "首页"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, message, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
      data-testid="empty-state"
    >
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      
      {message && (
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{message}</p>
      )}

      {action && (
        <Button onClick={action.onClick} data-testid="button-empty-action">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  const { t } = useLanguage();
  
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm",
        className
      )}
      data-testid="inline-error"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="text-destructive hover:text-destructive"
          data-testid="button-inline-retry"
        >
          {t("common.retry") || "重试"}
        </Button>
      )}
    </div>
  );
}
