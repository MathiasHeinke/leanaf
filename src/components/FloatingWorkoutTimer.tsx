import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';

interface FloatingWorkoutTimerProps {
  isRunning: boolean;
  isPaused: boolean;
  currentDuration: number;
  pauseDuration: number;
  formattedTime: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isActive: boolean; // Whether timer is started
}

export const FloatingWorkoutTimer: React.FC<FloatingWorkoutTimerProps> = ({
  isRunning,
  isPaused,
  currentDuration,
  pauseDuration,
  formattedTime,
  onStart,
  onPause,
  onResume,
  onStop,
  isActive,
}) => {
  const pauseDurationFormatted = `${Math.floor(pauseDuration / 60000)}:${Math.floor((pauseDuration % 60000) / 1000).toString().padStart(2, '0')}`;

  // Dynamic styling based on timer state
  const getTimerStyles = () => {
    if (!isActive) {
      // Idle state: green border with light glow
      return "border-green-500 shadow-green-500/20 shadow-lg";
    } else if (isPaused) {
      // Paused state: orange border with slow pulse
      return "border-orange-500 shadow-orange-500/40 shadow-lg";
    } else if (isRunning) {
      // Running state: green border
      return "border-green-500 shadow-green-500/40 shadow-lg";
    } else {
      // Stopped state: red border without pulse
      return "border-red-500 shadow-red-500/20 shadow-lg";
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full flex justify-center">
      <div className={`bg-card/70 backdrop-blur-md border-2 rounded-2xl hover:bg-card/80 transition-all duration-300 px-7 py-5 mx-4 w-full ${getTimerStyles()}`} style={{ maxWidth: '378px' }}>
        {!isActive ? (
          // Not started state
          <div className="flex items-center justify-center gap-5">
            <Button 
              onClick={onStart}
              className="bg-green-600 hover:bg-green-700 text-white w-14 h-14 rounded-full p-0 hover-scale transition-all"
              size="lg"
            >
              <Play className="h-7 w-7" />
            </Button>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-muted-foreground">
                0:00<span className="text-xl text-muted-foreground/60">.00</span>
              </div>
            </div>
            <Button 
              className="bg-red-600/50 hover:bg-red-600/50 text-white/50 w-14 h-14 rounded-full p-0 cursor-not-allowed"
              size="lg"
              disabled
            >
              <Square className="h-7 w-7" />
            </Button>
          </div>
        ) : (
          // Active state
          <div className="flex items-center justify-center gap-5">
            {/* Left: Pause/Resume Button */}
            {isRunning ? (
              <Button 
                onClick={onPause}
                className="bg-yellow-500 hover:bg-yellow-600 text-white w-14 h-14 rounded-full p-0 hover-scale transition-all"
                size="lg"
              >
                <Pause className="h-7 w-7" />
              </Button>
            ) : (
              <Button 
                onClick={onResume}
                className="bg-green-600 hover:bg-green-700 text-white w-14 h-14 rounded-full p-0 hover-scale transition-all"
                size="lg"
              >
                <Play className="h-7 w-7" />
              </Button>
            )}

            {/* Center: Timer Display */}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-foreground">
                {formattedTime}<span className="text-xl text-muted-foreground/60">.{Math.floor((currentDuration % 1000) / 10).toString().padStart(2, '0')}</span>
              </div>
              {isPaused && (
                <div className="text-sm font-mono text-yellow-500 font-semibold">
                  Pause: {pauseDurationFormatted}
                </div>
              )}
            </div>

            {/* Right: Stop Button */}
            <Button 
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white w-14 h-14 rounded-full p-0 hover-scale transition-all"
              size="lg"
            >
              <Square className="h-7 w-7" />
            </Button>
          </div>
        )}
        
        {currentDuration > 300000 && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            {Math.floor(currentDuration / 60000)} Min Training
          </div>
        )}
      </div>
    </div>
  );
};