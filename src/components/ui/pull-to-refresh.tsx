/**
 * Pull-to-Refresh Component
 * Mobile-native pull gesture with haptic feedback and smooth animations
 */

import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export const PullToRefresh = ({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false
}: PullToRefreshProps) => {
  const [state, setState] = useState<RefreshState>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const pullDistance = useMotionValue(0);
  const indicatorOpacity = useTransform(pullDistance, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, threshold], [0.6, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, threshold], [0, 180]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || state === 'refreshing') return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only start pull if at top of scroll
    if (container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    setState('pulling');
  }, [disabled, state]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (state !== 'pulling' && state !== 'ready') return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      pullDistance.set(0);
      setState('idle');
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const delta = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance curve for natural feel
    const resistance = 0.5;
    const adjustedDelta = delta * resistance;
    
    pullDistance.set(adjustedDelta);
    
    // Transition to ready state when threshold is crossed
    if (adjustedDelta >= threshold && state !== 'ready') {
      setState('ready');
      triggerHaptic();
    } else if (adjustedDelta < threshold && state === 'ready') {
      setState('pulling');
    }
  }, [state, threshold, pullDistance, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (state === 'ready') {
      setState('refreshing');
      triggerHaptic();
      
      // Animate to fixed position during refresh
      animate(pullDistance, 60, { duration: 0.2 });
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
      
      // Animate back to zero
      await animate(pullDistance, 0, { duration: 0.3 });
      setState('idle');
    } else {
      // Spring back if not triggered
      await animate(pullDistance, 0, { duration: 0.3, type: 'spring', stiffness: 400, damping: 30 });
      setState('idle');
    }
  }, [state, onRefresh, pullDistance, triggerHaptic]);

  const isActive = state !== 'idle';

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <motion.div
        style={{ 
          opacity: indicatorOpacity,
          scale: indicatorScale,
          y: useTransform(pullDistance, [0, threshold], [-40, 0])
        }}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50",
          "w-10 h-10 rounded-full",
          "bg-primary/10 border border-primary/20",
          "flex items-center justify-center",
          "pointer-events-none"
        )}
      >
        {state === 'refreshing' ? (
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <motion.div style={{ rotate: indicatorRotation }}>
            <ArrowDown className="w-5 h-5 text-primary" />
          </motion.div>
        )}
      </motion.div>

      {/* Content with pull offset */}
      <motion.div
        style={{ 
          y: isActive ? pullDistance : 0 
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
