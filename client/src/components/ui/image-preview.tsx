import { useState, useCallback, useEffect, useRef, type MouseEvent, type TouchEvent } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ImagePreviewProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreview({ 
  images, 
  initialIndex = 0, 
  isOpen, 
  onClose 
}: ImagePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex, images.length]);

  const handleZoomIn = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const handleDoubleClick = useCallback((e: MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastPosRef.current = position;
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isDragging && scale > 1) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setPosition({
        x: lastPosRef.current.x + deltaX,
        y: lastPosRef.current.y + deltaY
      });
    }
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPosRef.current = position;
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: lastPosRef.current.x + deltaX,
        y: lastPosRef.current.y + deltaY
      });
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleBackdropClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && scale === 1) {
      onClose();
    }
  }, [onClose, scale]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black"
          onClick={handleBackdropClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
            <span className="text-white text-sm">
              {currentIndex + 1} / {images.length}
            </span>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
              data-testid="button-close-preview"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center overflow-hidden",
              isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : ""
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onDoubleClick={handleDoubleClick}
              draggable={false}
              data-testid={`image-preview-${currentIndex}`}
            />
          </div>

          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 z-10"
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}
              {currentIndex < images.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 z-10"
                  data-testid="button-next-image"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-4 z-10">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full bg-white/10",
                scale <= 1 && "opacity-50"
              )}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full bg-white/10",
                scale >= 3 && "opacity-50"
              )}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === currentIndex 
                      ? "bg-white w-4" 
                      : "bg-white/40 w-1.5"
                  )}
                  data-testid={`button-goto-image-${idx}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
