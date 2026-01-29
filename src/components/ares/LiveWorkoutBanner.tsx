/**
 * LiveWorkoutBanner
 * 
 * Sticky progress banner for active live workouts.
 * Compact design for mobile chat overlay.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Pause, Play, List, Flame, Timer } from 'lucide-react';

interface LiveWorkoutBannerProps {
  workoutType: string;
  progress: { current: number; total: number; percent: number };
  sessionStartedAt: string;
  isPaused?: boolean;
  onPause: () => void;
  onResume: () => void;
  onExpand?: () => void;
  className?: string;
}

function formatWorkoutType(type: string): string {
  const labels: Record<string, string> = {
    push: 'Push Day',
    pull: 'Pull Day',
    legs: 'Leg Day',
    upper: 'Upper Body',
    lower: 'Lower Body',
    full_body: 'Full Body'
  };
  return labels[type] || type.replace('_', ' ');
}

export function LiveWorkoutBanner({
  workoutType,
  progress,
  sessionStartedAt,
  isPaused,
  onPause,
  onResume,
  onExpand,
  className
}: LiveWorkoutBannerProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00');
  
  // Update elapsed time every second
  useEffect(() => {
    if (isPaused) return;
    
    const updateTime = () => {
      const seconds = Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt, isPaused]);

  return (
    <div className={cn(
      "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent",
      "backdrop-blur-md border-b border-primary/20",
      "px-4 py-2",
      className
    )}>
      {/* Top Row: Workout Info + Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {formatWorkoutType(workoutType)}
              </span>
              <span className="text-xs text-muted-foreground">
                • {progress.current}/{progress.total}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono">{elapsedTime}</span>
          </div>
          
          {/* Pause/Resume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={isPaused ? onResume : onPause}
            className="h-8 w-8"
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-primary" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </Button>
          
          {/* Expand (optional) */}
          {onExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onExpand}
              className="h-8 w-8"
            >
              <List className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <Progress 
        value={progress.percent} 
        className="h-1.5 bg-primary/10"
      />
    </div>
  );
}
