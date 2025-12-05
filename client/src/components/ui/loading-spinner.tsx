import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-[3px]",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-muted-foreground/20 border-t-[#38B03B] animate-spin",
          sizeClasses[size]
        )}
        data-testid="loading-spinner"
      />
      {text && (
        <span className="text-sm text-muted-foreground animate-pulse">{text}</span>
      )}
    </div>
  );
}

interface FullPageLoadingProps {
  text?: string;
}

export function FullPageLoading({ text }: FullPageLoadingProps) {
  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
      data-testid="full-page-loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted-foreground/20 border-t-[#38B03B] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#38B03B]/10 animate-pulse" />
          </div>
        </div>
        {text && (
          <span className="text-sm text-muted-foreground font-medium">{text}</span>
        )}
      </div>
    </div>
  );
}

interface ButtonLoadingProps {
  className?: string;
}

export function ButtonLoading({ className }: ButtonLoadingProps) {
  return (
    <div
      className={cn(
        "w-4 h-4 rounded-full border-2 border-current/20 border-t-current animate-spin",
        className
      )}
      data-testid="button-loading"
    />
  );
}

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({ isRefreshing }: PullToRefreshIndicatorProps) {
  if (!isRefreshing) return null;
  
  return (
    <div className="flex justify-center py-4">
      <LoadingSpinner size="sm" />
    </div>
  );
}
