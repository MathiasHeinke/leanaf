/**
 * ExperienceBeam - Premium XP Bar with Shimmer and Particle Effects
 * Ultra-thin (3px), neon gradient, glowing head, and XP gain particles
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExperienceBeamProps {
  currentXP: number;
  maxXP: number;
  level: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
}

export const ExperienceBeam: React.FC<ExperienceBeamProps> = ({ 
  currentXP, 
  maxXP, 
  level 
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [prevXP, setPrevXP] = useState(currentXP);
  
  const percentage = Math.min((currentXP / maxXP) * 100, 100);

  // Trigger particles when XP increases
  useEffect(() => {
    if (currentXP > prevXP) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Create 10-15 particles
      const newParticles: Particle[] = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 30 - 15,
        y: Math.random() * 25 + 10,
      }));
      
      setParticles(prev => [...prev, ...newParticles]);
      
      // Cleanup after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 800);
    }
    setPrevXP(currentXP);
  }, [currentXP, prevXP]);

  return (
    <div className="w-full relative">
      {/* Level Badge - Subtle, centered below beam */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 pointer-events-none">
        <span className="text-[9px] font-bold tracking-[0.15em] text-primary/60 uppercase">
          Lvl {level}
        </span>
      </div>

      {/* Track (Background) */}
      <div className="w-full h-[3px] bg-border/30 dark:bg-border/20 relative overflow-visible">
        
        {/* The Beam (Fill) */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-r-full overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(280 80% 60%), hsl(190 90% 55%))',
            boxShadow: '0 0 12px hsl(var(--primary) / 0.6), 0 0 24px hsl(280 80% 60% / 0.4)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
        >
          {/* Shimmer Effect */}
          <motion.div
            className="absolute top-0 bottom-0 w-16 opacity-80"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              transform: 'skewX(-20deg)',
            }}
            animate={{ x: ['-100%', '400%'] }}
            transition={{ 
              repeat: Infinity, 
              duration: 3.5, 
              ease: "easeInOut", 
              repeatDelay: 2.5 
            }}
          />
        </motion.div>
        
        {/* Glowing Head (at the tip) */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
          style={{
            background: 'white',
            boxShadow: '0 0 8px rgba(255,255,255,1), 0 0 16px hsl(var(--primary) / 0.8)',
            left: `calc(${percentage}% - 4px)`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        />

        {/* Particle Emitter */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none"
          style={{ left: `${percentage}%` }}
        >
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: 0, x: p.x, y: p.y, scale: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, hsl(190 90% 60%), hsl(280 80% 70%))',
                  boxShadow: '0 0 6px currentColor',
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
