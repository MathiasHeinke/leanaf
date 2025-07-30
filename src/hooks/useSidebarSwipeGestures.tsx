import { useEffect, useRef, useCallback } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeGestureOptions {
  minSwipeDistance?: number;
  vibrationDuration?: number;
}

export const useSidebarSwipeGestures = (options: SwipeGestureOptions = {}) => {
  const { 
    minSwipeDistance = 120, 
    vibrationDuration = 50 
  } = options;
  
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isSwipeInProgress = useRef<boolean>(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const isMobileDevice = useIsMobile();

  // Vibration feedback
  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(vibrationDuration);
    }
  }, [vibrationDuration]);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!isMobileDevice) return;
    
    touchStartX.current = event.touches[0].clientX;
    isSwipeInProgress.current = true;
  }, [isMobileDevice]);

  // Handle touch move (optional - for visual feedback)
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isSwipeInProgress.current || !isMobileDevice) return;
    
    // Prevent default scrolling if this is a horizontal swipe
    const currentX = event.touches[0].clientX;
    const deltaX = Math.abs(currentX - touchStartX.current);
    const deltaY = Math.abs(event.touches[0].clientY - (event.touches[0].clientY || 0));
    
    // If horizontal movement is greater than vertical, prevent scrolling
    if (deltaX > deltaY && deltaX > 20) {
      event.preventDefault();
    }
  }, [isMobileDevice]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!isSwipeInProgress.current || !isMobileDevice) return;
    
    touchEndX.current = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX.current - touchStartX.current;
    const isValidSwipe = Math.abs(swipeDistance) >= minSwipeDistance;
    
    if (isValidSwipe) {
      const isSwipeRight = swipeDistance > 0;
      const currentSidebarState = isMobile ? openMobile : open;
      
      // Open sidebar on swipe right (only if closed)
      if (isSwipeRight && !currentSidebarState) {
        toggleSidebar();
        vibrate();
      }
      // Close sidebar on swipe left (only if open)
      else if (!isSwipeRight && currentSidebarState) {
        toggleSidebar();
        vibrate();
      }
    }
    
    isSwipeInProgress.current = false;
  }, [toggleSidebar, vibrate, minSwipeDistance, open, openMobile, isMobile, isMobileDevice]);

  // Set up touch event listeners
  useEffect(() => {
    const element = elementRef.current || document;
    
    if (!isMobileDevice) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobileDevice]);

  return {
    ref: elementRef,
    isSwipeEnabled: isMobileDevice
  };
};