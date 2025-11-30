import { useRef, useState, useCallback, useEffect, ReactNode } from 'react';

interface VerticalSwiperProps {
  children: ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onReachEnd?: () => void;
  className?: string;
}

export function VerticalSwiper({
  children,
  currentIndex,
  onIndexChange,
  onReachEnd,
  className = '',
}: VerticalSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchMove, setTouchMove] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const threshold = 80;

  useEffect(() => {
    setTranslateY(-currentIndex * 100);
  }, [currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    setTouchStart(e.touches[0].clientY);
    setTouchMove(null);
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null || isAnimating) return;
    
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStart;
    setTouchMove(currentTouch);

    const container = containerRef.current;
    if (!container) return;

    const containerHeight = container.clientHeight;
    const movePercent = (diff / containerHeight) * 100;
    
    const dampingFactor = 0.3;
    const dampedMove = movePercent * dampingFactor;
    
    setTranslateY(-currentIndex * 100 + dampedMove);
  }, [touchStart, currentIndex, isAnimating]);

  const handleTouchEnd = useCallback(() => {
    if (touchStart === null || touchMove === null || isAnimating) {
      setTouchStart(null);
      setTouchMove(null);
      return;
    }

    const diff = touchMove - touchStart;
    const container = containerRef.current;
    
    if (!container) {
      setTouchStart(null);
      setTouchMove(null);
      setTranslateY(-currentIndex * 100);
      return;
    }

    setIsAnimating(true);

    if (Math.abs(diff) > threshold) {
      if (diff < 0 && currentIndex < children.length - 1) {
        onIndexChange(currentIndex + 1);
        if (currentIndex + 1 === children.length - 1) {
          onReachEnd?.();
        }
      } else if (diff > 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else {
        setTranslateY(-currentIndex * 100);
      }
    } else {
      setTranslateY(-currentIndex * 100);
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    setTouchStart(null);
    setTouchMove(null);
  }, [touchStart, touchMove, currentIndex, children.length, onIndexChange, onReachEnd, isAnimating]);

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
      className={`h-full w-full overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="vertical-swiper"
    >
      <div
        className="h-full w-full transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${translateY}%)`,
          height: `${children.length * 100}%`,
        }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="w-full"
            style={{ height: `${100 / children.length}%` }}
            data-testid={`swiper-slide-${index}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
