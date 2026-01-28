/**
 * SmartActions - Context-specific action buttons for ActionCards
 * Extracted from SmartFocusCard for modularity
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Droplets, Coffee, Pill, Camera, BrainCircuit, Moon, Dumbbell, LucideIcon, GlassWater, Milk, PenTool, Scale, Utensils, Target, Footprints } from 'lucide-react';
import { openJournal, openSleep, openTraining, openWeight, openMeal } from '@/components/quick/quickAddBus';
import { cn } from '@/lib/utils';
import { SupplementTimingCircles } from './SupplementTimingCircles';
import { PeptideTimingCircles } from './PeptideFocusCard';

// --- TYPES ---
export interface SmartTask {
  id: string;
  type: 'hydration' | 'supplement' | 'supplements' | 'peptide' | 'food' | 'workout' | 'sleep' | 'protein' | 'insight' | 'epiphany' | 'profile' | 'journal' | 'sleep_fix' | 'training' | 'weight' | 'sleep_log' | 'nutrition' | 'morning_journal' | 'morning_hydration' | 'movement';
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

// --- MICRO ACTION BUTTON (Bounce & Reset) ---
interface MicroActionButtonProps {
  action: { id: string; label: string; icon: LucideIcon };
  onTrigger: (id: string) => void;
}

export const MicroActionButton: React.FC<MicroActionButtonProps> = ({ action, onTrigger }) => {
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

export const HydrationMicroActions: React.FC<HydrationMicroActionsProps> = ({ onAction }) => {
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

// --- GENERIC ACTION BUTTON ---
interface ActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon: Icon, label, primary = false }) => (
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

// --- MAIN SMART ACTIONS COMPONENT ---
interface SmartActionsProps {
  task: SmartTask;
  onAction: (action?: string) => void;
  onOpenChat?: (prompt: string) => void;
  onSupplementAction?: (timing: string) => void;
  onHydrationAction?: (action: string) => void;
}

export const SmartActions: React.FC<SmartActionsProps> = ({ 
  task, 
  onAction, 
  onOpenChat, 
  onSupplementAction, 
  onHydrationAction 
}) => {
  
  // SUPPLEMENTS: Visual timing circles
  if (task.type === 'supplement' || task.type === 'supplements') {
    return (
      <SupplementTimingCircles 
        onComplete={() => onAction()} 
        compact={false}
      />
    );
  }

  // PEPTIDES: Visual protocol circles
  if (task.type === 'peptide') {
    return (
      <PeptideTimingCircles 
        onComplete={() => onAction()} 
      />
    );
  }

  // HYDRATION: Icon-based micro-actions with bounce & reset
  if (task.type === 'hydration' || task.type === 'morning_hydration') {
    // If dedicated hydration handler exists -> multi-tap without closing card
    if (onHydrationAction) {
      return <HydrationMicroActions onAction={onHydrationAction} />;
    }
    // Morning hydration: Single 500ml button
    if (task.type === 'morning_hydration') {
      return (
        <div className="flex gap-2">
          <MicroActionButton action={{ id: '500ml_water', label: '+500ml', icon: Droplets }} onTrigger={onAction} />
        </div>
      );
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
  if (task.type === 'journal' || task.type === 'morning_journal') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openJournal();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        {task.type === 'morning_journal' ? (
          <>
            <Target size={16} />
            <span>Intention setzen</span>
          </>
        ) : (
          <>
            <PenTool size={16} />
            <span>Journal schreiben</span>
          </>
        )}
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

  // MOVEMENT: Open Training Logger with movement focus
  if (task.type === 'movement') {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          openTraining();
        }}
        className="w-full py-3 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
      >
        <Footprints size={16} />
        <span>Bewegung loggen</span>
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
