/**
 * SmartFocusCard - Swipeable action card with context-specific quick actions
 * Frictionless logging: swipe right = complete, swipe left = dismiss
 * Multi-action support for supplements (individual timing buttons)
 * Hydration micro-actions with bounce & reset (card stays open)
 */

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, ChevronLeft, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Sunrise, Clock, Dumbbell, LucideIcon, GlassWater, Milk, Syringe, PenTool, Scale, Utensils } from 'lucide-react';
import { openJournal, openSleep, openTraining, openWeight, openMeal } from '@/components/quick/quickAddBus';
import { cn } from '@/lib/utils';
import { EpiphanyCard } from './EpiphanyCard';
import { SupplementTimingCircles } from './cards/SupplementTimingCircles';
import { PeptideTimingCircles } from './cards/PeptideFocusCard';

export interface SmartTask {
  id: string;
  type: 'hydration' | 'supplement' | 'supplements' | 'peptide' | 'food' | 'workout' | 'sleep' | 'protein' | 'insight' | 'epiphany' | 'profile' | 'journal' | 'sleep_fix' | 'training' | 'weight' | 'sleep_log' | 'nutrition';
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
  onSnooze: () => void;           // 2h Snooze (Swipe Right)
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

// --- DISMISS BUTTON (Icon -> X Morph) ---
interface DismissButtonProps {
  icon: LucideIcon;
  onDismiss: () => void;
}

export const DismissButton: React.FC<DismissButtonProps> = ({ icon: Icon, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 300)}
      whileTap={{ scale: 0.9 }}
      className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 
                 flex items-center justify-center transition-colors hover:bg-white/30 flex-shrink-0"
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          <motion.div
            key="close"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            <X size={22} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Icon size={22} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// --- MICRO ACTION BUTTON (Bounce & Reset) ---
interface MicroActionButtonProps {
  action: { id: string; label: string; icon: LucideIcon };
  onTrigger: (id: string) => void;
}

const MicroActionButton: React.FC<MicroActionButtonProps> = ({ action, onTrigger }) => {
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    if (status === 'success') return; // Prevent double-click during animation
    
    // 1. Sofort Success-State zeigen
    setStatus('success');
    
    // 2. Daten senden
    onTrigger(action.id);

    // 3. Nach 1.5s Reset
    setTimeout(() => {
      setStatus('idle');
    }, 1500);
  };

  const IconComponent = action.icon;

  return (
    <motion.button
      onClick={handleClick}
      layout
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border transition-all overflow-hidden min-w-[70px]",
        status === 'success' 
          ? "bg-emerald-500 border-emerald-400 text-white" 
          : "bg-white/20 border-white/10 text-white hover:bg-white/30 backdrop-blur-md"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'success' ? (
          <motion.div
            key="check"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-full"
          >
            <Check size={18} strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div
            key="label"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5"
          >
            <IconComponent size={18} strokeWidth={2} />
            <span className="text-xs font-bold">{action.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// --- HYDRATION MICRO ACTIONS ---
interface HydrationMicroActionsProps {
  onAction: (actionId: string) => void;
}

const HydrationMicroActions: React.FC<HydrationMicroActionsProps> = ({ onAction }) => {
  const actions = [
    { id: '250ml_water', label: '1x', icon: GlassWater },
    { id: '500ml_water', label: '0.5L', icon: Milk },
    { id: 'coffee', label: '1x', icon: Coffee },
  ];

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <MicroActionButton 
          key={action.id}
          action={action}
          onTrigger={onAction}
        />
      ))}
    </div>
  );
};

// --- SNOOZE HINT (Bottom Right) ---
interface SnoozeHintProps {
  onSnooze: () => void;
}

const SnoozeHint: React.FC<SnoozeHintProps> = ({ onSnooze }) => (
  <motion.button
    onClick={(e) => { 
      e.stopPropagation(); 
      onSnooze(); 
    }}
    whileTap={{ scale: 0.9 }}
    className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-1 
               rounded-full bg-white/10 backdrop-blur-sm border border-white/10
               text-white/40 text-[10px] font-medium hover:bg-white/20 hover:text-white/60 
               transition-all"
  >
    <Clock size={10} />
    <span>2h</span>
    <ChevronRight size={10} className="opacity-60" />
  </motion.button>
);

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

// --- SUB COMPONENTS ---

interface SmartActionsProps {
  task: SmartTask;
  onAction: (action?: string) => void;
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void;
}

const SmartActions: React.FC<SmartActionsProps> = ({ task, onAction, onOpenChat, onSupplementAction, onHydrationAction }) => {
  
  // SUPPLEMENTS: Visual timing circles - NEW IMPLEMENTATION
  if (task.type === 'supplement' || task.type === 'supplements') {
    return (
      <SupplementTimingCircles 
        onComplete={() => onAction()} 
        compact={false}
      />
    );
  }

  // PEPTIDES: Visual protocol circles - NEW
  if (task.type === 'peptide') {
    return (
      <PeptideTimingCircles 
        onComplete={() => onAction()} 
      />
    );
  }

  // HYDRATION: Icon-based micro-actions with bounce & reset
  if (task.type === 'hydration') {
    // If dedicated hydration handler exists -> multi-tap without closing card
    if (onHydrationAction) {
      return <HydrationMicroActions onAction={onHydrationAction} />;
    }
    // Fallback: use MicroActionButtons but trigger card close via onAction
    return (
      <div className="flex gap-2">
        <MicroActionButton action={{ id: '250ml_water', label: '1x', icon: GlassWater }} onTrigger={onAction} />
        <MicroActionButton action={{ id: '500ml_water', label: '0.5L', icon: Droplets }} onTrigger={onAction} />
        <MicroActionButton action={{ id: 'coffee', label: '1x', icon: Coffee }} onTrigger={onAction} />
      </div>
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

  // JOURNAL: Open Quick Log Sheet (stay on homescreen)
  if (task.type === 'journal') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openJournal();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <PenTool size={16} />
        <span>Journal schreiben</span>
        <ChevronRight size={14} className="opacity-60" />
      </button>
    );
  }

  // SLEEP LOG: Open Sleep Logger
  if (task.type === 'sleep_log') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openSleep();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Moon size={16} />
        <span>Schlaf tracken</span>
        <ChevronRight size={14} className="opacity-60" />
      </button>
    );
  }

  // TRAINING: Open Training Logger
  if (task.type === 'training') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openTraining();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Dumbbell size={16} />
        <span>Workout starten</span>
        <ChevronRight size={14} className="opacity-60" />
      </button>
    );
  }

  // WEIGHT: Open Weight Logger
  if (task.type === 'weight') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openWeight();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Scale size={16} />
        <span>Gewicht loggen</span>
        <ChevronRight size={14} className="opacity-60" />
      </button>
    );
  }

  // NUTRITION: Open Meal Input
  if (task.type === 'nutrition') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openMeal();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Utensils size={16} />
        <span>Mahlzeit loggen</span>
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

// OLD SupplementMultiActions REMOVED - replaced by SupplementTimingCircles

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
