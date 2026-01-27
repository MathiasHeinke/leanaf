import React from 'react';
import { motion } from 'framer-motion';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';

interface MacroProgressBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
}

const MacroProgressBar: React.FC<MacroProgressBarProps> = ({ label, current, goal, color }) => {
  const percent = Math.min((current / goal) * 100, 100);
  const isOver = current > goal;
  
  // Gradient-Farben für smoothen Fade-Look
  const gradientClasses: Record<string, string> = {
    emerald: 'bg-gradient-to-r from-emerald-600 to-teal-400',
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-400',
    amber: 'bg-gradient-to-r from-amber-600 to-yellow-400',
    orange: 'bg-gradient-to-r from-orange-600 to-amber-400',
    purple: 'bg-gradient-to-r from-purple-600 to-violet-400',
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-14">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(
            "h-full rounded-full",
            isOver ? "bg-destructive" : (gradientClasses[color] || 'bg-primary')
          )}
        />
      </div>
      <span className={cn(
        "text-xs font-medium w-16 text-right",
        isOver && "text-destructive"
      )}>{Math.round(current)}/{goal}g</span>
    </div>
  );
};

interface NutritionWidgetProps {
  size: WidgetSize;
  onOpenDaySheet?: () => void;
}

export const NutritionWidget: React.FC<NutritionWidgetProps> = ({ size, onOpenDaySheet }) => {
  const { data: metrics } = useDailyMetrics();
  
  // UNIFIED: Now uses central useDailyMetrics cache
  const calories = metrics?.nutrition?.calories || 0;
  const calorieGoal = metrics?.goals?.calories || 2200;
  const protein = metrics?.nutrition?.protein || 0;
  const proteinGoal = metrics?.goals?.protein || 150;
  const carbs = metrics?.nutrition?.carbs || 0;
  const carbGoal = metrics?.goals?.carbs || 250;
  const fats = metrics?.nutrition?.fats || 0;
  const fatGoal = metrics?.goals?.fats || 65;
  
  const caloriePercent = Math.min((calories / calorieGoal) * 100, 100);
  const isOver = calories > calorieGoal;

  // FLAT: Horizontaler kompakter Streifen mit Kalorien + Makros
  if (size === 'flat') {
    // Helper für Makro-Prozent
    const proteinPercent = Math.min((protein / proteinGoal) * 100, 100);
    const carbsPercent = Math.min((carbs / carbGoal) * 100, 100);
    const fatsPercent = Math.min((fats / fatGoal) * 100, 100);
    
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => onOpenDaySheet?.()}
        className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
      >
        {/* Background Fill basierend auf Kalorien-Fortschritt */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${caloriePercent}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={cn(
            "absolute inset-0",
            isOver 
              ? "bg-gradient-to-r from-destructive/20 to-destructive/10" 
              : "bg-gradient-to-r from-purple-600/20 to-violet-400/10"
          )}
        />
        
        {/* Icon */}
        <div className="relative z-10 p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          <Utensils className="w-5 h-5" />
        </div>
        
        {/* Label */}
        <span className="relative z-10 text-sm font-medium text-foreground shrink-0">Ernährung</span>
        
        {/* Mini Makro Bars */}
        <div className="relative z-10 flex items-center gap-2 flex-1 justify-center">
          {/* Protein */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">P</span>
            <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${proteinPercent}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={cn(
                  "h-full rounded-full",
                  protein > proteinGoal ? "bg-destructive" : "bg-emerald-500"
                )}
              />
            </div>
          </div>
          
          {/* Carbs */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">C</span>
            <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${carbsPercent}%` }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={cn(
                  "h-full rounded-full",
                  carbs > carbGoal ? "bg-destructive" : "bg-blue-500"
                )}
              />
            </div>
          </div>
          
          {/* Fats */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">F</span>
            <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${fatsPercent}%` }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className={cn(
                  "h-full rounded-full",
                  fats > fatGoal ? "bg-destructive" : "bg-amber-500"
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Kalorien Counter */}
        <span className={cn(
          "relative z-10 text-sm font-bold shrink-0",
          isOver ? "text-destructive" : "text-purple-600 dark:text-violet-400"
        )}>
          {Math.round(calories)} / {calorieGoal} kcal
        </span>
      </motion.div>
    );
  }

  // WIDE: Volle Breite mit horizontalen Makro-Bars
  if (size === 'wide' || size === 'large') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => onOpenDaySheet?.()}
        className="col-span-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-semibold text-foreground">Ernährung</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{Math.round(calories)}</span>
            <span className="text-sm text-muted-foreground">/{calorieGoal} kcal</span>
          </div>
        </div>
        
        {/* Calorie Progress Bar - Purple, Red when over */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-4">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${caloriePercent}%` }}
            transition={{ duration: 0.6 }}
            className={cn(
              "h-full rounded-full",
              calories > calorieGoal 
                ? "bg-destructive" 
                : "bg-gradient-to-r from-purple-600 to-violet-400"
            )}
          />
        </div>
        
        {/* Macro Bars */}
        <div className="space-y-2">
          <MacroProgressBar label="Protein" current={protein} goal={proteinGoal} color="emerald" />
          <MacroProgressBar label="Carbs" current={carbs} goal={carbGoal} color="blue" />
          <MacroProgressBar label="Fett" current={fats} goal={fatGoal} color="amber" />
        </div>
      </motion.div>
    );
  }

  // MEDIUM: Kompaktere Ansicht
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => onOpenDaySheet?.()}
      className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[140px] flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          <Utensils className="w-5 h-5" />
        </div>
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full",
          caloriePercent >= 100 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" :
          caloriePercent >= 70 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
          "bg-muted text-muted-foreground"
        )}>
          {Math.round(caloriePercent)}%
        </span>
      </div>
      
      <div>
        <p className="text-2xl font-bold text-foreground">{Math.round(calories)}</p>
        <p className="text-xs text-muted-foreground">von {calorieGoal} kcal</p>
      </div>
    </motion.div>
  );
};
