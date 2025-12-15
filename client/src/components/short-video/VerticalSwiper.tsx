import { useRef, useState, useCallback, useEffect, ReactNode } from 'react';

interface VerticalSwiperProps {
  children: ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onReachEnd?: () => void;
  onUserInteract?: () => void;
  className?: string;
}

export function VerticalSwiper({
  children,
  currentIndex,
  onIndexChange,
  onReachEnd,
  onUserInteract,
  className = '',
}: VerticalSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const velocityRef = useRef(0);
  const userInteractedRef = useRef(false);

  const threshold = 50;
  const velocityThreshold = 0.3;
  const translateY = -currentIndex * 100 + dragOffset;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    velocityRef.current = 0;
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimating) return;
    
    e.preventDefault();
    
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStartRef.current.y;
    const timeDiff = Date.now() - touchStartRef.current.time;
    
    if (timeDiff > 0) {
      velocityRef.current = diff / timeDiff;
    }

    const container = containerRef.current;
    if (!container) return;

    const containerHeight = container.clientHeight;
    const movePercent = (diff / containerHeight) * 100;
    
    const atStart = currentIndex === 0 && diff > 0;
    const atEnd = currentIndex === children.length - 1 && diff < 0;
    const dampingFactor = (atStart || atEnd) ? 0.2 : 0.6;
    
    setDragOffset(movePercent * dampingFactor);
  }, [isAnimating, currentIndex, children.length]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || isAnimating) {
      touchStartRef.current = null;
      setDragOffset(0);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      touchStartRef.current = null;
      setDragOffset(0);
      return;
    }

    const containerHeight = container.clientHeight;
    const dragPixels = (dragOffset / 100) * containerHeight;
    const velocity = velocityRef.current;
    
    const shouldSwipe = Math.abs(dragPixels) > threshold || Math.abs(velocity) > velocityThreshold;
    const direction = dragPixels !== 0 ? Math.sign(dragPixels) : Math.sign(velocity);

    setIsAnimating(true);
    setDragOffset(0);

    if (shouldSwipe) {
      if (direction < 0 && currentIndex < children.length - 1) {
        onIndexChange(currentIndex + 1);
        if (currentIndex + 1 === children.length - 1) {
          onReachEnd?.();
        }
      } else if (direction > 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      }
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 280);

    touchStartRef.current = null;
    velocityRef.current = 0;
    
    if (!userInteractedRef.current) {
      userInteractedRef.current = true;
      onUserInteract?.();
    }
  }, [dragOffset, currentIndex, children.length, onIndexChange, onReachEnd, onUserInteract, isAnimating]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isAnimating) return;
      
      e.preventDefault();
      
      const threshold = 50;
      if (Math.abs(e.deltaY) > threshold) {
        setIsAnimating(true);
        if (e.deltaY > 0 && currentIndex < children.length - 1) {
          onIndexChange(currentIndex + 1);
          if (currentIndex + 1 === children.length - 1) {
            onReachEnd?.();
          }
        } else if (e.deltaY < 0 && currentIndex > 0) {
          onIndexChange(currentIndex - 1);
        }
        setTimeout(() => setIsAnimating(false), 300);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [currentIndex, children.length, onIndexChange, onReachEnd, isAnimating]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        if (currentIndex < children.length - 1) {
          setIsAnimating(true);
          onIndexChange(currentIndex + 1);
          if (currentIndex + 1 === children.length - 1) {
            onReachEnd?.();
          }
          setTimeout(() => setIsAnimating(false), 300);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        if (currentIndex > 0) {
          setIsAnimating(true);
          onIndexChange(currentIndex - 1);
          setTimeout(() => setIsAnimating(false), 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, children.length, onIndexChange, onReachEnd, isAnimating]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-hidden touch-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="vertical-swiper"
    >
      <div
        className="w-full"
        style={{
          transform: `translate3d(0, ${translateY}svh, 0)`,
          height: `${children.length * 100}svh`,
          transition: isAnimating ? 'transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
          pointerEvents: isAnimating ? 'none' : 'auto',
        }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="w-full"
            style={{ height: '100svh' }}
            data-testid={`swiper-slide-${index}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
