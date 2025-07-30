import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Timer, RotateCcw } from 'lucide-react';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { cn } from '@/lib/utils';

interface WorkoutTimerProps {
  onStartWorkout?: (sessionId?: string) => void;
  onStopWorkout?: (result: { totalDurationMs: number; actualStartTime: Date | null }) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'floating';
  showControls?: boolean;
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({
  onStartWorkout,
  onStopWorkout,
  className,
  variant = 'default',
  showControls = true
}) => {
  const {
    isRunning,
    currentDuration,
    formattedTime,
    pauseDurationFormatted,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    hasActiveTimer,
    isPaused
  } = useWorkoutTimer();

  const handleStart = () => {
    startTimer();
    onStartWorkout?.();
  };

  const handleStop = () => {
    const result = stopTimer();
    onStopWorkout?.(result);
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleResume = () => {
    resumeTimer();
  };

  // Time display is now display-only, no click functionality

  if (variant === 'floating') {
    if (!hasActiveTimer) return null;
    
    return (
      <div className={cn("fixed top-4 left-1/2 transform -translate-x-1/2 z-40", className)}>
        <Badge 
          variant={isRunning ? "default" : "secondary"} 
          className="px-4 py-2 text-base font-mono"
        >
          <Timer className="h-4 w-4 mr-2" />
          {formattedTime}
          {isRunning && <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          {!isRunning && <div className="ml-2 w-2 h-2 bg-yellow-500 rounded-full" />}
        </Badge>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant={isRunning ? "default" : "secondary"} 
          className="font-mono"
        >
          <Timer className="h-3 w-3 mr-1" />
          {formattedTime}
          {isRunning && <div className="ml-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
          {hasActiveTimer && !isRunning && <div className="ml-1 w-1.5 h-1.5 bg-yellow-500 rounded-full" />}
        </Badge>
        
        {showControls && (
          <div className="flex gap-1">
            {!hasActiveTimer ? (
              <Button size="sm" variant="outline" onClick={handleStart} className="text-green-600 hover:text-green-700">
                <Play className="h-3 w-3" />
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button size="sm" variant="outline" onClick={handlePause} className="text-yellow-600 hover:text-yellow-700">
                    <Pause className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleResume} className="text-green-600 hover:text-green-700">
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleStop} className="text-red-600 hover:text-red-700">
                  <Square className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-gradient-primary", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Workout Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasActiveTimer ? (
          <div className="text-center space-y-4">
            <div className="text-4xl font-mono font-bold text-muted-foreground mb-6">
              {formattedTime}
            </div>
            <Button 
              onClick={handleStart} 
              className="bg-green-600 hover:bg-green-700 text-white w-full max-w-xs"
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Workout starten
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Left: Pause/Resume Button */}
            <div className="flex justify-center">
              {isRunning ? (
                <Button 
                  onClick={handlePause}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white w-16 h-16 rounded-full p-0"
                  size="lg"
                >
                  <Pause className="h-8 w-8" />
                </Button>
              ) : (
                <Button 
                  onClick={handleResume}
                  className="bg-green-600 hover:bg-green-700 text-white w-16 h-16 rounded-full p-0"
                  size="lg"
                >
                  <Play className="h-8 w-8" />
                </Button>
              )}
            </div>

            {/* Center: Timer Display */}
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-muted-foreground mb-2">
                {formattedTime}
              </div>
              {isPaused && (
                <div className="text-lg font-mono text-yellow-600">
                  Pause: {pauseDurationFormatted}
                </div>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                {isRunning && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Läuft
                  </div>
                )}
                {isPaused && (
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Pausiert
                  </div>
                )}
              </div>
            </div>

            {/* Right: Stop Button */}
            <div className="flex justify-center">
              <Button 
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white w-16 h-16 rounded-full p-0"
                size="lg"
              >
                <Square className="h-8 w-8" />
              </Button>
            </div>
          </div>
        )}

        {currentDuration > 300000 && ( // Show after 5 minutes (300000ms)
          <div className="text-center text-sm text-muted-foreground">
            {Math.floor(currentDuration / 60000)} Minuten Training
          </div>
        )}
      </CardContent>
    </Card>
  );
};