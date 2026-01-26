/**
 * LiquidDock - Premium "Liquid Crystal" Navigation
 * Apple-style physics with glass effects, vanish gradient, and Liquid Carousel menu
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import spartanHelm from '@/assets/spartan-helm.png';
import { LiquidCarouselMenu } from './LiquidCarouselMenu';

export type QuickActionType = 'journal' | 'workout' | 'weight' | 'supplements' | 'sleep' | 'hydration' | 'nutrition';

interface LiquidDockProps {
  onVisionScan: () => void;
  onAresChat: () => void;
  onQuickAction: (action: QuickActionType) => void;
}

// Spring physics config for bouncy Apple-style animations
const springConfig = { type: "spring" as const, stiffness: 350, damping: 25 };

export const LiquidDock: React.FC<LiquidDockProps> = ({ 
  onVisionScan, 
  onAresChat, 
  onQuickAction 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCarouselAction = useCallback((actionId: string) => {
    onQuickAction(actionId as QuickActionType);
  }, [onQuickAction]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <>
      {/* 1. VANISH GRADIENT MASK - Content fades elegantly into the dock */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-20"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 40%, transparent 100%)'
        }}
      />

      {/* 2. LIQUID CAROUSEL MENU - Premium glassmorphism overlay */}
      <LiquidCarouselMenu 
        isOpen={isMenuOpen}
        onClose={closeMenu}
        onAction={handleCarouselAction}
      />

      {/* 3. THE DOCK CONTAINER */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        
        {/* Floating buttons - no container */}
        <motion.div
          layout
          transition={springConfig}
          className="flex items-center gap-4"
        >
          {/* LEFT: VISION (Food Scan) */}
          <DockButton 
            icon={Utensils} 
            onClick={onVisionScan}
            label="Mahlzeit scannen"
          />

          {/* CENTER: ARES (The Hero - Spartan Helm) */}
          <div className="relative">
            {/* Subtle white glow behind ARES */}
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-white blur-xl"
            />
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              transition={springConfig}
              onClick={onAresChat}
              className={cn(
                "relative w-16 h-16 flex items-center justify-center rounded-full overflow-hidden",
                // Premium white to soft gray gradient
                "bg-gradient-to-b from-white via-gray-50 to-gray-100",
                "dark:bg-gradient-to-b dark:from-gray-100 dark:via-gray-200 dark:to-gray-300",
                // Subtle inner shadow for depth
                "shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
                // Soft outer elevation
                "shadow-lg shadow-black/15",
                // Clean border
                "border border-gray-200/60 dark:border-gray-300/50",
                "z-10"
              )}
              aria-label="ARES Chat öffnen"
            >
              {/* Spartan Helm Image - larger, with gray tint */}
              <img 
                src={spartanHelm} 
                alt="ARES"
                className="w-10 h-10 object-contain opacity-70 grayscale-[20%] relative z-10"
              />
              
              {/* Shimmer/Mirror Reflection Effect */}
              <motion.div
                className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
              >
                <motion.div
                  className="absolute inset-0 w-[200%]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                    transform: 'skewX(-12deg)',
                  }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3.5, 
                    ease: "easeInOut", 
                    repeatDelay: 2.5 
                  }}
                />
              </motion.div>
            </motion.button>
          </div>

          {/* RIGHT: QUICK ACTIONS (Toggle Menu) */}
          <DockButton 
            icon={isMenuOpen ? X : Plus} 
            onClick={toggleMenu}
            active={isMenuOpen}
            label={isMenuOpen ? "Menü schließen" : "Schnellaktionen"}
          />
        </motion.div>
      </div>
    </>
  );
};

// Helper component for the side buttons
interface DockButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  label: string;
}

const DockButton: React.FC<DockButtonProps> = ({ 
  icon: Icon, 
  onClick, 
  active = false,
  label 
}) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    whileHover={{ scale: 1.1 }}
    transition={springConfig}
    onClick={onClick}
    className={cn(
      "w-14 h-14 flex items-center justify-center",
      "transition-all duration-200",
      active 
        ? "text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" 
        : "text-muted-foreground hover:text-foreground dark:text-white/90 dark:hover:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]"
    )}
    aria-label={label}
    aria-pressed={active}
  >
    <Icon className="w-7 h-7" />
  </motion.button>
);

export default LiquidDock;
