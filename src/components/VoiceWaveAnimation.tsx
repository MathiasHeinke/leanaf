import React from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveAnimationProps {
  audioLevel?: number;
  isActive?: boolean;
}

export const VoiceWaveAnimation: React.FC<VoiceWaveAnimationProps> = ({ 
  audioLevel = 0, 
  isActive = true 
}) => {
  const bars = Array.from({ length: 5 }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center gap-1">
      {bars.map((_, index) => {
        const delay = index * 0.1;
        const baseHeight = 8;
        const maxHeight = 32;
        const animatedHeight = isActive 
          ? Math.max(baseHeight, audioLevel * maxHeight + Math.random() * 8)
          : baseHeight;
        
        return (
          <motion.div
            key={index}
            className="bg-red-500 rounded-full"
            style={{
              width: 3,
              minHeight: baseHeight,
            }}
            animate={{
              height: isActive ? [baseHeight, animatedHeight, baseHeight] : baseHeight,
              opacity: isActive ? [0.6, 1, 0.6] : 0.4,
            }}
            transition={{
              duration: 0.8,
              repeat: isActive ? Infinity : 0,
              delay: delay,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
};