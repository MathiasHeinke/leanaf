import { useEffect, useCallback, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileOptimizations {
  hapticFeedback: (type?: 'light' | 'medium' | 'heavy') => void;
  isIOSDevice: boolean;
  isLargeScreen: boolean;
  isTouchDevice: boolean;
  viewportHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export const useMobileOptimizations = (): MobileOptimizations => {
  const isMobile = useIsMobile();
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  // Detect iOS device
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Detect large screen (iPhone 14 Pro Max and similar)
  const isLargeScreen = window.screen.width >= 414 && window.screen.height >= 896;
  
  // Detect touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Haptic feedback function
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!('vibrate' in navigator)) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    };
    
    navigator.vibrate(patterns[type]);
  }, []);

  // Update viewport height on resize/orientation change
  useEffect(() => {
    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
      
      // Calculate safe area insets for iOS devices
      if (isIOSDevice) {
        const computedStyle = getComputedStyle(document.documentElement);
        setSafeAreaInsets({
          top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
          bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
          left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
          right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0')
        });
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, [isIOSDevice]);

  return {
    hapticFeedback,
    isIOSDevice,
    isLargeScreen,
    isTouchDevice,
    viewportHeight,
    safeAreaInsets
  };
};