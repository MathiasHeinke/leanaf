import React, { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardXPBarProps {
  xp: number;
  goal?: number;
  loading?: boolean;
  deltaBadge?: number;
  onBurst?: () => void;
}

export const DashboardXPBar: React.FC<DashboardXPBarProps> = ({ 
  xp, 
  goal = 100, 
  loading = false,
  deltaBadge,
  onBurst
}) => {
  const stages = 5;
  const perStage = goal / stages;
  const prevXpRef = useRef<number>(xp);
  const [recentGain, setRecentGain] = useState<number>(0);
  const [glowIndex, setGlowIndex] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevXpRef.current;
    const delta = Math.max(0, Math.round(xp - prev));
    if (delta > 0) {
      setRecentGain(delta);
      // Light haptic feedback if motion isn't reduced
      try {
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced && 'vibrate' in navigator) {
          navigator.vibrate(50); // Light vibration
        }
      } catch (e) {
        // Vibration not supported/failed, silent fail
      }

      // Determine which stage completed (if any)
      const oldStage = Math.min(Math.floor(prev / perStage), stages - 1);
      const newStage = Math.min(Math.floor(xp / perStage), stages - 1);
      if (newStage > oldStage) {
        setGlowIndex(newStage);
        onBurst?.();
        setTimeout(() => setGlowIndex(null), 2000); // glow for 2s
      }

      setTimeout(() => setRecentGain(0), 3000); // show gain for 3s
    }
    prevXpRef.current = xp;
  }, [xp, perStage, stages, onBurst]);

  if (loading) {
    return (
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <Flame className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="flex-1 relative" role="progressbar" aria-valuenow={xp} aria-valuemax={goal} aria-label={`XP Progress: ${xp} von ${goal}`}>
          <div className="flex gap-1">
            {Array.from({ length: stages }).map((_, i) => {
              const stageStart = i * perStage;
              const stageEnd = (i + 1) * perStage;
              const stageProgress = Math.max(0, Math.min(perStage, xp - stageStart)) / perStage;
              const isGlowing = glowIndex === i;
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 h-3 rounded-full bg-secondary relative overflow-hidden",
                    isGlowing && "animate-pulse shadow-lg shadow-primary/50"
                  )}
                >
                  <div 
                    className={cn(
                      "h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full",
                      isGlowing && "shadow-md shadow-primary/30"
                    )}
                    style={{ width: `${stageProgress * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {deltaBadge && deltaBadge > 0 && (
            <span className="text-xs text-green-600 font-medium animate-in slide-in-from-right-2 duration-300">
              +{deltaBadge}
            </span>
          )}
          {recentGain > 0 && (
            <span className="text-xs text-green-600 font-medium animate-in slide-in-from-right-2 duration-300">
              +{recentGain}
            </span>
          )}
          <span className="text-sm font-medium bg-secondary px-2 py-1 rounded-full tabular-nums">
            {Math.round(xp)}<span className="text-muted-foreground">/{goal}</span>
          </span>
        </div>
      </div>
    </div>
  );
};