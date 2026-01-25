/**
 * LiquidDock - Premium "Liquid Crystal" Navigation
 * Apple-style physics with glass effects and vanish gradient
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Plus, X, Droplets, Dumbbell, Scale, Pill, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpartanHelm } from '@/components/icons/SpartanHelm';

export type QuickActionType = 'water' | 'workout' | 'weight' | 'supplements' | 'sleep';

interface LiquidDockProps {
  onVisionScan: () => void;
  onAresChat: () => void;
  onQuickAction: (action: QuickActionType) => void;
}

const quickActions = [
  { id: 'water' as const, icon: Droplets, color: 'bg-blue-500', label: 'Wasser' },
  { id: 'workout' as const, icon: Dumbbell, color: 'bg-orange-500', label: 'Workout' },
  { id: 'weight' as const, icon: Scale, color: 'bg-emerald-500', label: 'Gewicht' },
  { id: 'supplements' as const, icon: Pill, color: 'bg-purple-500', label: 'Supps' },
  { id: 'sleep' as const, icon: Moon, color: 'bg-indigo-500', label: 'Schlaf' },
];

// Spring physics config for bouncy Apple-style animations
const springConfig = { type: "spring" as const, stiffness: 350, damping: 25 };

export const LiquidDock: React.FC<LiquidDockProps> = ({ 
  onVisionScan, 
  onAresChat, 
  onQuickAction 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleQuickAction = useCallback((action: QuickActionType) => {
    onQuickAction(action);
    setIsMenuOpen(false);
  }, [onQuickAction]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
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

      {/* 2. THE DOCK CONTAINER */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        
        {/* Quick Menu Overlay - Fans out above the dock */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
              transition={springConfig}
              className="flex gap-3 mb-4"
            >
              {quickActions.map((item, i) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleQuickAction(item.id)}
                  initial={{ y: 20, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 10, opacity: 0, scale: 0.9 }}
                  transition={{ ...springConfig, delay: i * 0.04 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  className={cn(
                    item.color,
                    "p-3 rounded-full text-white shadow-lg",
                    "border border-white/20",
                    "transition-shadow hover:shadow-xl"
                  )}
                  aria-label={item.label}
                >
                  <item.icon className="w-5 h-5" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating buttons - no container */}
        <motion.div
          layout
          transition={springConfig}
          className="flex items-center gap-4"
        >
          {/* LEFT: VISION (Food Scan) */}
          <DockButton 
            icon={Aperture} 
            onClick={onVisionScan}
            label="Mahlzeit scannen"
          />

          {/* CENTER: ARES (The Hero - Spartan Helm) */}
          <div className="relative">
            {/* Pulsating GOLD glow behind ARES */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 blur-xl"
            />
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              transition={springConfig}
              onClick={onAresChat}
              className={cn(
                "relative w-16 h-16 flex items-center justify-center rounded-full",
                // Metallic brushed aluminum/platinum effect
                "bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300",
                "dark:bg-gradient-to-b dark:from-slate-400 dark:via-slate-300 dark:to-slate-500",
                // Inner lighting for 3D metal effect
                "shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.1)]",
                // Outer elevation
                "shadow-xl shadow-black/25",
                // Premium border
                "border border-white/60 dark:border-white/40",
                "z-10"
              )}
              aria-label="ARES Chat öffnen"
            >
              {/* Spartan Helm with Gold shimmer */}
              <SpartanHelm 
                className="w-10 h-10 drop-shadow-[0_0_8px_rgba(218,165,32,0.5)]" 
                animated={true}
              />
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
      "w-12 h-12 flex items-center justify-center",
      "transition-all duration-200",
      active 
        ? "text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" 
        : "text-white/90 hover:text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]"
    )}
    aria-label={label}
    aria-pressed={active}
  >
    <Icon className="w-6 h-6" />
  </motion.button>
);

export default LiquidDock;
