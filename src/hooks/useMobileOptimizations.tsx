import { useState, useEffect } from 'react';

export const useMobileOptimizations = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      setIsMobile(mobile);
      setIsIOS(ios);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Haptic feedback for iOS devices
  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    if (!isIOS || !window.navigator.vibrate) return;

    try {
      // Use Web Vibration API as fallback
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
        selection: [5]
      };
      
      window.navigator.vibrate(patterns[type]);
    } catch (error) {
      console.log('Haptic feedback not supported');
    }
  };

  return {
    isMobile,
    isIOS,
    viewport,
    hapticFeedback
  };
};