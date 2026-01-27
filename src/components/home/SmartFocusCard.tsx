/**
 * SmartFocusCard - Swipeable action card with context-specific quick actions
 * Refactored: Uses shared components (DismissButton, SnoozeHint) and SmartActions
 * Frictionless logging: swipe right = snooze (2h)
 */

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Check, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EpiphanyCard } from './EpiphanyCard';
import { DismissButton, SnoozeHint } from './cards/shared';
import { SmartActions, SmartTask, QuickAction } from './cards/SmartActions';

// Re-export types for external usage
export type { SmartTask, QuickAction };

interface SmartFocusCardProps {
  task: SmartTask;
  onComplete: (action?: string) => void;
  onDismiss: () => void;
  onSnooze: () => void;           // 2h Snooze (Swipe Right)
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export const SmartFocusCard: React.FC<SmartFocusCardProps> = ({ 
  task, 
  onComplete, 
  onDismiss,
  onSnooze,
  onOpenChat,
  onSupplementAction,
  onHydrationAction,
  style,
  className
}) => {
  const [isCompleted, setIsCompleted] = useState(false);

  // Framer Motion for swipe
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 0.5, 1, 0.5, 0]);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);

  // Color feedback when swiping: Orange/Amber for snooze (right only)
  const bgOverlayOpacity = useTransform(x, [0, 80, 150], [0, 0.3, 0.5]);
  const bgOverlayColor = useTransform(x, [0, 80, 150], ["transparent", "#f59e0b", "#f59e0b"]);

  const Icon = task.icon;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      // SWIPE RIGHT -> 2H SNOOZE (Standby)
      onSnooze();
    }
    // Swipe links deaktiviert - Card snappt zurück
  };

  const handleComplete = (specificAction?: string) => {
    setIsCompleted(true);
    // Faster delay for snappier UX
    setTimeout(() => onComplete(specificAction), 500);
  };

  const handleCardClick = () => {
    // For insight type, open chat
    if (task.type === 'insight' && task.actionPrompt && onOpenChat) {
      onOpenChat(task.actionPrompt);
    }
  };

  // Render EpiphanyCard for epiphany type
  if (task.type === 'epiphany') {
    return (
      <EpiphanyCard 
        onOpenChat={onOpenChat || (() => {})}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
      />
    );
  }

  return (
    <div className={cn("relative w-full h-52", className)} style={style}>
      <AnimatePresence mode="wait">
        {!isCompleted ? (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.1, right: 0.7 }}
            style={{ x, rotate, opacity }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: "grabbing" }}
            onClick={handleCardClick}
            className="absolute inset-0 z-20 touch-pan-x"
          >
            {/* CARD CONTAINER - Increased padding for snooze hint */}
            <div className={cn(
              "relative h-full w-full overflow-hidden rounded-3xl p-6 pb-10 text-white shadow-2xl flex flex-col justify-between bg-gradient-to-br",
              task.gradient
            )}>
              
              {/* Swipe Feedback Overlay */}
              <motion.div 
                style={{ backgroundColor: bgOverlayColor, opacity: bgOverlayOpacity }}
                className="absolute inset-0 z-0 pointer-events-none rounded-3xl"
              />

              {/* Background Noise Texture for Premium Look */}
              <div 
                className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none z-0"
                style={{ 
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
                }}
              />

              {/* Shimmer Effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                  className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                  style={{ transform: 'skewX(-12deg)' }}
                />
              </div>

              {/* HEADER AREA */}
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10">
                      {task.type === 'insight' ? 'ARES Insight' : 'Priority'}
                    </span>
                    <span className="text-xs font-medium text-white/80">+{task.xp} XP</span>
                  </div>
                  <h3 className="text-xl font-bold leading-tight mb-1">{task.title}</h3>
                  <p className="text-white/80 text-sm font-medium line-clamp-2 max-w-[85%]">
                    {task.subtitle}
                  </p>
                </div>

                {/* THE DISMISS BUTTON - Icon morphs to X on hover */}
                <DismissButton icon={Icon} onDismiss={onDismiss} />
              </div>

              {/* SMART ACTION AREA - More padding for touch targets */}
              <div className="relative z-10 mt-auto pt-5 pb-4">
                <SmartActions 
                  task={task} 
                  onAction={handleComplete}
                  onOpenChat={onOpenChat}
                  onSupplementAction={onSupplementAction}
                  onHydrationAction={onHydrationAction}
                />
              </div>

              {/* SNOOZE HINT - Bottom Right */}
              <SnoozeHint onSnooze={onSnooze} />
            </div>
          </motion.div>
        ) : (
          /* SUCCESS STATE */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute inset-0 h-full w-full rounded-3xl bg-emerald-500 flex flex-col items-center justify-center text-white z-10"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1.5, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check size={48} strokeWidth={3} />
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 font-bold text-lg"
            >
              Erledigt!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Re-export DismissButton for backward compatibility
export { DismissButton } from './cards/shared';
