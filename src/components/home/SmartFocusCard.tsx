/**
 * SmartFocusCard - Swipeable action card with context-specific quick actions
 * Frictionless logging: swipe right = complete, swipe left = dismiss
 * Multi-action support for supplements (individual timing buttons)
 */

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sun, Clock, Dumbbell, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartTask {
  id: string;
  type: 'hydration' | 'supplement' | 'supplements' | 'food' | 'workout' | 'sleep' | 'protein' | 'insight' | 'profile' | 'journal' | 'sleep_fix';
  title: string;
  subtitle: string;
  xp: number;
  gradient: string;
  icon: LucideIcon;
  actionPrompt?: string;
  canSwipeComplete?: boolean;
  quickActions?: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

interface SmartFocusCardProps {
  task: SmartTask;
  onComplete: (action?: string) => void;
  onDismiss: () => void;
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void; // New: for individual supplement logging
  style?: React.CSSProperties;
  className?: string;
}

export const SmartFocusCard: React.FC<SmartFocusCardProps> = ({ 
  task, 
  onComplete, 
  onDismiss,
  onOpenChat,
  onSupplementAction,
  style,
  className
}) => {
  const [isCompleted, setIsCompleted] = useState(false);

  // Framer Motion for swipe
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 0.5, 1, 0.5, 0]);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);

  // Color feedback when swiping: Green right, Red left
  const bgOverlayOpacity = useTransform(x, [-150, 0, 150], [0.5, 0, 0.5]);
  const bgOverlayColor = useTransform(x, [-150, 0, 150], ["#ef4444", "transparent", "#22c55e"]);

  const Icon = task.icon;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100 && task.canSwipeComplete !== false) {
      // SWIPE RIGHT -> COMPLETE (default action)
      handleComplete();
    } else if (info.offset.x < -100) {
      // SWIPE LEFT -> DISMISS
      onDismiss();
    }
  };

  const handleComplete = (specificAction?: string) => {
    setIsCompleted(true);
    // Small delay for animation, then save data
    setTimeout(() => onComplete(specificAction), 800);
  };

  const handleCardClick = () => {
    // For insight type, open chat
    if (task.type === 'insight' && task.actionPrompt && onOpenChat) {
      onOpenChat(task.actionPrompt);
    }
  };

  return (
    <div className={cn("relative w-full h-52", className)} style={style}>
      <AnimatePresence mode="wait">
        {!isCompleted ? (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            style={{ x, rotate, opacity }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: "grabbing" }}
            onClick={handleCardClick}
            className="absolute inset-0 z-20 touch-pan-x"
          >
            {/* CARD CONTAINER - Increased padding for button breathing room */}
            <div className={cn(
              "relative h-full w-full overflow-hidden rounded-3xl p-6 pb-7 text-white shadow-2xl flex flex-col justify-between bg-gradient-to-br",
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

                {/* THE ICON / STATUS INDICATOR */}
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* SMART ACTION AREA - More padding for touch targets */}
              <div className="relative z-10 mt-auto pt-5">
                <SmartActions 
                  task={task} 
                  onAction={handleComplete}
                  onOpenChat={onOpenChat}
                  onSupplementAction={onSupplementAction}
                />
              </div>
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

// --- SUB COMPONENTS ---

interface SmartActionsProps {
  task: SmartTask;
  onAction: (action?: string) => void;
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
}

const SmartActions: React.FC<SmartActionsProps> = ({ task, onAction, onOpenChat, onSupplementAction }) => {
  
  // SUPPLEMENTS: Multi-action with individual timing tracking - PRIORITY BEFORE quickActions!
  // CRITICAL: Check BOTH 'supplement' (from useActionCards) AND 'supplements' for compatibility
  if (task.type === 'supplement' || task.type === 'supplements') {
    // Only render if we have the dedicated supplement handler
    if (onSupplementAction) {
      return (
        <SupplementMultiActions 
          quickActions={task.quickActions}
          onAction={onSupplementAction}
          onDismiss={() => onAction('snooze')}
        />
      );
    }
    // Fallback: simple complete button if no dedicated handler
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Pill size={16} />
        <span>Supplements erledigt</span>
      </button>
    );
  }

  // Use custom quick actions if provided (but NOT for supplements - handled above)
  if (task.quickActions && task.quickActions.length > 0) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {task.quickActions.map((action) => (
          <ActionButton 
            key={action.id}
            onClick={() => onAction(action.id)} 
            icon={action.icon} 
            label={action.label}
            primary={action.primary}
          />
        ))}
      </div>
    );
  }

  // HYDRATION: Water & Coffee Buttons
  if (task.type === 'hydration') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        <ActionButton onClick={() => onAction('250ml_water')} icon={Droplets} label="+250ml" />
        <ActionButton onClick={() => onAction('500ml_water')} icon={Droplets} label="+500ml" />
        <ActionButton onClick={() => onAction('coffee')} icon={Coffee} label="+Kaffee" />
      </div>
    );
  }

  // INSIGHT: Open ARES Chat
  if (task.type === 'insight') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (task.actionPrompt && onOpenChat) {
            onOpenChat(task.actionPrompt);
          }
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <BrainCircuit size={16} />
        <span>ARES fragen</span>
        <ChevronRight size={14} className="opacity-60" />
      </button>
    );
  }

  // SLEEP FIX: Open Chat for advice
  if (task.type === 'sleep_fix') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenChat) {
            onOpenChat(`Ich habe nur ${task.subtitle.match(/[\d.]+/)?.[0] || '?'}h geschlafen. Gib mir konkrete Tipps um heute trotzdem produktiv zu sein und heute Nacht besser zu schlafen.`);
          }
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Moon size={16} />
        <span>Strategie besprechen</span>
        <ChevronRight size={14} className="opacity-60" />
      </button>
    );
  }

  // DEFAULT / FOOD
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onAction();
      }}
      className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
    >
      {task.type === 'food' ? <Camera size={16} /> : <Check size={16} />}
      <span>{task.type === 'food' ? 'Mahlzeit tracken' : 'Erledigen'}</span>
      <ChevronRight size={14} className="opacity-60" />
    </button>
  );
};

// --- SUPPLEMENT MULTI-ACTION COMPONENT ---
// Allows individual timing buttons that disappear when clicked, card stays open

interface SupplementMultiActionsProps {
  quickActions?: QuickAction[];
  onAction: (timing: string) => void;
  onDismiss: () => void;
}

const SupplementMultiActions: React.FC<SupplementMultiActionsProps> = ({ quickActions, onAction, onDismiss }) => {
  const [completed, setCompleted] = useState<string[]>([]);

  // Use time-intelligent quickActions from useActionCards, or fallback
  const actions = quickActions || [
    { id: 'morning', label: 'Morgens', icon: Sun, primary: true },
    { id: 'pre_workout', label: 'Pre-WO', icon: Dumbbell, primary: false },
    { id: 'snooze', label: 'Später', icon: Clock, primary: false },
  ];

  const handleClick = (actionId: string) => {
    if (actionId === 'snooze') {
      onDismiss();
      return;
    }
    
    // Mark as completed locally (button disappears)
    setCompleted(prev => [...prev, actionId]);
    // Trigger the logging
    onAction(actionId);
  };

  const activeActions = actions.filter(a => !completed.includes(a.id));
  const allSupplementsDone = completed.length >= 2; // morning + pre_workout

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      <AnimatePresence mode="popLayout">
        {activeActions.map((action) => (
          <motion.button
            key={action.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0, width: 0, marginRight: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(action.id);
            }}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full transition-transform active:scale-95 border border-white/10",
              action.primary 
                ? "bg-white text-primary shadow-lg" 
                : "bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
            )}
            title={action.label}
          >
            <action.icon size={20} strokeWidth={2.5} />
          </motion.button>
        ))}

        {/* All done indicator */}
        {allSupplementsDone && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-emerald-300 font-bold px-2"
          >
            <Check size={20} strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- GENERIC ACTION BUTTON ---
interface ActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon: Icon, label, primary = false }) => (
  <button
    onClick={(e) => { 
      e.stopPropagation(); 
      onClick(); 
    }}
    className={cn(
      "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-transform active:scale-95 border border-white/10",
      primary 
        ? "bg-white text-indigo-600 shadow-lg" 
        : "bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
    )}
  >
    <Icon size={16} strokeWidth={2.5} />
    {label}
  </button>
);
