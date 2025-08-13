import React, { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardXPBarProps {
  xp: number;
  goal: number;
  loading?: boolean;
  deltaBadge?: React.ReactNode;
  onBurst?: () => void;
}

export const DashboardXPBar: React.FC<DashboardXPBarProps> = ({
  xp,
  goal,
  loading = false,
  deltaBadge,
  onBurst
}) => {
  const prevXp = useRef(xp);
  const [recentGain, setRecentGain] = useState<number | null>(null);
  const [glowIndex, setGlowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (xp > prevXp.current) {
      const gain = xp - prevXp.current;
      setRecentGain(gain);
      
      // Haptic feedback if available and not reduced motion
      if ('vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion)').matches) {
        navigator.vibrate(50);
      }
      
      // Stage completion effects
      const completed = Math.floor(xp / 20);
      const prevCompleted = Math.floor(prevXp.current / 20);
      
      if (completed > prevCompleted) {
        setGlowIndex(completed - 1);
        onBurst?.();
        setTimeout(() => setGlowIndex(null), 1000);
      }
      
      setTimeout(() => setRecentGain(null), 3000);
    }
    prevXp.current = xp;
  }, [xp, onBurst]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    );
  }

  const progress = Math.min(1, xp / goal);
  const stages = 5;
  const stageWidth = 100 / stages;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex h-3 rounded-full bg-secondary overflow-hidden">
          {Array.from({ length: stages }, (_, i) => {
            const stageStart = (i * goal) / stages;
            const stageEnd = ((i + 1) * goal) / stages;
            const stageProgress = Math.max(0, Math.min(1, (xp - stageStart) / (stageEnd - stageStart)));
            
            return (
              <div
                key={i}
                className={cn(
                  "relative transition-all duration-300",
                  glowIndex === i && "animate-pulse"
                )}
                style={{ width: `${stageWidth}%` }}
              >
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${stageProgress * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        
        {deltaBadge && (
          <div className="absolute -top-6 right-0 animate-in slide-in-from-right-2 duration-500">
            {deltaBadge}
          </div>
        )}
        
        {recentGain && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-in slide-in-from-bottom-2 duration-700 animate-out fade-out-0 slide-out-to-top-2">
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
              +{recentGain} XP
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">XP: {xp}</span>
        <span className="text-muted-foreground">Ziel: {goal}</span>
      </div>
    </div>
  );
};