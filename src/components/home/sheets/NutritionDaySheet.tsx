/**
 * NutritionDaySheet - "Layer 2" of the Three-Layer-Design
 * Premium bottom sheet showing today's nutrition details and meal timeline
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Trash2, Plus, BarChart3, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useTodaysMeals } from '@/hooks/useTodaysMeals';
import { Button } from '@/components/ui/button';

interface NutritionDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: () => void;
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

// Macro Progress Bar Component
const MacroBar: React.FC<{
  label: string;
  current: number;
  goal: number;
  gradient: string;
}> = ({ label, current, goal, gradient }) => {
  const percent = Math.min((current / goal) * 100, 100);
  const isOver = current > goal;
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          isOver ? "text-destructive" : "text-muted-foreground"
        )}>
          {Math.round(current)} / {goal}g
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={cn(
            "h-full rounded-full",
            isOver ? "bg-destructive" : gradient
          )}
        />
      </div>
    </div>
  );
};

// Meal Timeline Item
const MealItem: React.FC<{
  meal: {
    id: string;
    text: string | null;
    title: string | null;
    calories: number;
    protein: number;
    ts: string;
  };
  onDelete: (id: string) => void;
}> = ({ meal, onDelete }) => {
  const displayText = meal.text || meal.title || 'Mahlzeit';
  const time = format(new Date(meal.ts), 'HH:mm');
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0"
    >
      {/* Time */}
      <span className="text-xs text-muted-foreground font-mono w-12 flex-shrink-0">
        {time}
      </span>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate text-foreground">
          {displayText}
        </p>
        <p className="text-xs text-muted-foreground">
          {Math.round(meal.calories)} kcal • P{Math.round(meal.protein)}g
        </p>
      </div>
      
      {/* Delete */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onDelete(meal.id)}
        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
        aria-label="Mahlzeit löschen"
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};

export const NutritionDaySheet: React.FC<NutritionDaySheetProps> = ({
  isOpen,
  onClose,
  onAddMeal
}) => {
  const { data: metrics } = useDailyMetrics();
  const { meals, deleteMeal, isLoading } = useTodaysMeals();
  
  // Nutrition data from central cache
  const calories = metrics?.nutrition?.calories || 0;
  const calorieGoal = metrics?.goals?.calories || 2200;
  const protein = metrics?.nutrition?.protein || 0;
  const proteinGoal = metrics?.goals?.protein || 150;
  const carbs = metrics?.nutrition?.carbs || 0;
  const carbGoal = metrics?.goals?.carbs || 250;
  const fats = metrics?.nutrition?.fats || 0;
  const fatGoal = metrics?.goals?.fats || 65;
  
  const remaining = Math.max(0, calorieGoal - calories);
  const caloriePercent = Math.min((calories / calorieGoal) * 100, 100);

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[71] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {format(new Date(), 'EEEE', { locale: de })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'd. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* Hero Section - Calories */}
              <div className="text-center py-6 border-b border-border/30 mb-4">
                <div className="relative inline-block">
                  <span className="text-5xl font-bold tabular-nums text-foreground">
                    {Math.round(calories)}
                  </span>
                  <span className="text-lg text-muted-foreground ml-1">
                    / {calorieGoal}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Kalorien</p>
                
                {/* Calorie Progress Ring */}
                <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden mx-auto max-w-xs">
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
                
                <p className={cn(
                  "text-sm font-medium mt-3",
                  remaining > 0 ? "text-emerald-500" : "text-destructive"
                )}>
                  {remaining > 0 
                    ? `${Math.round(remaining)} kcal übrig` 
                    : `${Math.round(Math.abs(calorieGoal - calories))} kcal über Ziel`
                  }
                </p>
              </div>
              
              {/* Macro Bars */}
              <div className="space-y-4 mb-6">
                <MacroBar 
                  label="Protein" 
                  current={protein} 
                  goal={proteinGoal}
                  gradient="bg-gradient-to-r from-emerald-600 to-teal-400"
                />
                <MacroBar 
                  label="Kohlenhydrate" 
                  current={carbs} 
                  goal={carbGoal}
                  gradient="bg-gradient-to-r from-blue-600 to-cyan-400"
                />
                <MacroBar 
                  label="Fett" 
                  current={fats} 
                  goal={fatGoal}
                  gradient="bg-gradient-to-r from-amber-600 to-yellow-400"
                />
              </div>
              
              {/* Timeline Section */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Heutige Mahlzeiten
                </h3>
                
                {isLoading ? (
                  <div className="py-8 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : meals.length === 0 ? (
                  <div className="text-center py-12">
                    <Utensils className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Noch keine Mahlzeiten heute</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Tippe auf "Mahlzeit hinzufügen" um zu starten
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {meals.map((meal) => (
                      <MealItem 
                        key={meal.id} 
                        meal={meal} 
                        onDelete={deleteMeal}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/30">
              <div className="flex gap-3">
                <Button
                  onClick={onAddMeal}
                  className="flex-1 h-12 rounded-xl font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Mahlzeit hinzufügen
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-xl"
                  onClick={() => {
                    // TODO: Navigate to analytics page
                    onClose();
                  }}
                  aria-label="Detaillierte Analyse"
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
