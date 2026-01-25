/**
 * BentoStatsGrid - Apple-style stats grid
 * Nutrition card + Protocol + Training cards
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Flame, AlertTriangle } from 'lucide-react';
import { MacroBar } from './MacroBar';
import { cn } from '@/lib/utils';

interface BentoStatsGridProps {
  // Nutrition
  calories?: { current: number; target: number };
  protein?: { current: number; target: number };
  carbs?: { current: number; target: number };
  fats?: { current: number; target: number };
  // Protocol
  protocolPhase?: number;
  protocolProgress?: { completed: number; total: number };
  // Training
  weeklyWorkouts?: { completed: number; target: number };
  onNavigateToDashboard?: () => void;
}

export const BentoStatsGrid: React.FC<BentoStatsGridProps> = ({
  calories = { current: 0, target: 2000 },
  protein = { current: 0, target: 150 },
  carbs = { current: 0, target: 200 },
  fats = { current: 0, target: 65 },
  protocolPhase = 0,
  protocolProgress = { completed: 0, total: 9 },
  weeklyWorkouts = { completed: 0, target: 4 },
  onNavigateToDashboard
}) => {
  const protocolPercent = (protocolProgress.completed / protocolProgress.total) * 100;
  const workoutStatus = weeklyWorkouts.completed < weeklyWorkouts.target * 0.5 ? 'low' : 
                        weeklyWorkouts.completed >= weeklyWorkouts.target ? 'good' : 'ok';

  const phaseNames: Record<number, string> = {
    0: 'Fundament',
    1: 'Rekomposition',
    2: 'Fine-tuning',
    3: 'Longevity'
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      
      {/* Nutrition Card - Full Width */}
      <motion.div 
        className="col-span-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground">Ernährung</h3>
          <span className="text-xs text-muted-foreground">
            {calories.current} / {calories.target} kcal
          </span>
        </div>
        
        <div className="space-y-2.5">
          <MacroBar 
            label="Protein" 
            current={protein.current} 
            target={protein.target} 
            color="bg-[hsl(var(--protein))]"
            warning={protein.current < protein.target * 0.5}
          />
          <MacroBar 
            label="Carbs" 
            current={carbs.current} 
            target={carbs.target} 
            color="bg-[hsl(var(--carbs))]"
          />
          <MacroBar 
            label="Fette" 
            current={fats.current} 
            target={fats.target} 
            color="bg-[hsl(var(--fats))]"
          />
        </div>
      </motion.div>

      {/* Protocol Phase Card */}
      <motion.div 
        className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col justify-between min-h-[140px]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
            ARES Protokoll
          </p>
          <p className="text-lg font-bold text-foreground">Phase {protocolPhase}</p>
          <p className="text-xs text-muted-foreground">{phaseNames[protocolPhase]}</p>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-[10px] font-medium mb-1.5 text-primary/80">
            <span>Progress</span>
            <span>{protocolProgress.completed}/{protocolProgress.total}</span>
          </div>
          <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${protocolPercent}%` }}
              transition={{ delay: 0.5, duration: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Training Status Card */}
      <motion.div 
        className={cn(
          "bg-card/80 backdrop-blur-sm border rounded-2xl p-4 flex flex-col justify-between min-h-[140px] cursor-pointer hover:bg-accent/50 transition-colors",
          workoutStatus === 'low' ? "border-destructive/30" : "border-border/50"
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onNavigateToDashboard}
      >
        <div className="flex justify-between items-start">
          <div className={cn(
            "p-2 rounded-xl",
            workoutStatus === 'good' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
            workoutStatus === 'low' ? "bg-destructive/10 text-destructive" :
            "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          )}>
            <Dumbbell className="w-5 h-5" />
          </div>
          
          {/* Status Indicator */}
          <span className={cn(
            "w-2 h-2 rounded-full",
            workoutStatus === 'good' ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" :
            workoutStatus === 'low' ? "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.6)]" :
            "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
          )} />
        </div>
        
        <div>
          <p className="text-2xl font-bold text-foreground">
            {weeklyWorkouts.completed}/{weeklyWorkouts.target}
          </p>
          <p className="text-xs text-muted-foreground">Workouts / Woche</p>
          
          {workoutStatus === 'low' && (
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-destructive" />
              <span className="text-[10px] text-destructive font-medium">Zu wenig</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
