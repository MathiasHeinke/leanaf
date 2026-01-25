/**
 * AresTopNav - Clean Top Navigation
 * Menu trigger (left), ARES avatar button (right) - opens chat
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import spartanHelm from '@/assets/spartan-helm.png';

interface AresTopNavProps {
  onOpenChat: () => void;
}

export const AresTopNav: React.FC<AresTopNavProps> = ({ onOpenChat }) => {
  return (
    <div className="fixed top-[3px] left-0 right-0 z-40 pt-2 px-4 pb-2 bg-gradient-to-b from-background/95 via-background/80 to-transparent backdrop-blur-sm">
      <div className="flex justify-between items-center max-w-md mx-auto">
        
        {/* Left: Sidebar Trigger */}
        <SidebarTrigger className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors" />

        {/* Center: Empty for clean look */}
        <div className="flex-1" />

        {/* Right: ARES Avatar Button - Elegant Metallic Style from LiquidDock */}
        <div className="relative">
          {/* Subtle white glow behind ARES */}
          <motion.div
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.35, 0.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-white blur-lg"
          />
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={onOpenChat}
            className={cn(
              "relative w-10 h-10 flex items-center justify-center rounded-full overflow-hidden",
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
            {/* Spartan Helm Image */}
            <img 
              src={spartanHelm} 
              alt="ARES"
              className="w-6 h-6 object-contain opacity-70 grayscale-[20%] relative z-10"
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
      </div>
    </div>
  );
};
