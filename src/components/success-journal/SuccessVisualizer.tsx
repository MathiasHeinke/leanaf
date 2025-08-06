import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SuccessVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
  className?: string;
}

export const SuccessVisualizer: React.FC<SuccessVisualizerProps> = ({
  audioLevel,
  isRecording,
  className
}) => {
  // Create visualization bars
  const bars = Array.from({ length: 12 }, (_, i) => {
    const baseHeight = 4;
    const maxHeight = 24;
    const height = baseHeight + (audioLevel * maxHeight);
    
    // Add some randomness and delay for visual appeal
    const delay = i * 0.05;
    const randomFactor = 0.7 + Math.random() * 0.6;
    
    return (
      <motion.div
        key={i}
        className={cn(
          "rounded-full",
          isRecording ? "bg-success" : "bg-success/30"
        )}
        style={{
          width: '3px',
          height: `${Math.max(baseHeight, height * randomFactor)}px`,
        }}
        animate={{
          height: isRecording 
            ? `${Math.max(baseHeight, height * randomFactor)}px`
            : `${baseHeight}px`,
          opacity: isRecording ? 0.8 + (audioLevel * 0.2) : 0.3
        }}
        transition={{
          duration: 0.1,
          delay: delay,
          ease: "easeOut"
        }}
      />
    );
  });

  return (
    <div className={cn(
      "flex items-end justify-center gap-1 h-8 p-2 rounded-lg border bg-background/50",
      isRecording ? "border-success/30 bg-success/5" : "border-border/50",
      className
    )}>
      {bars}
      
      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          className="absolute top-1 right-1"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-2 h-2 rounded-full bg-success" />
        </motion.div>
      )}
    </div>
  );
};