import React from 'react';
import { cn } from '@/lib/utils';

interface VoiceVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
  className?: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  audioLevel,
  isRecording,
  className
}) => {
  // Create bars based on audio level
  const barCount = 5;
  const activeBars = Math.ceil((audioLevel * 100) / 20); // 0-5 bars

  return (
    <div className={cn("flex items-center justify-center gap-1 py-2", className)}>
      {Array.from({ length: barCount }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            index < activeBars && isRecording
              ? "h-6 bg-primary animate-pulse"
              : "h-2 bg-muted",
            isRecording && index < activeBars && "shadow-md shadow-primary/30"
          )}
          style={{
            animationDelay: `${index * 50}ms`,
            height: isRecording && index < activeBars 
              ? `${Math.max(8, audioLevel * 100 + Math.random() * 10)}px` 
              : '8px'
          }}
        />
      ))}
      
      {isRecording && (
        <div className="ml-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Aufnahme läuft</span>
        </div>
      )}
    </div>
  );
};