/**
 * MealSuggestionCard - Premium card for AI-generated meal suggestions
 * Shows title, reason, macros, prep time, and tags with action button
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { MealSuggestion } from '@/hooks/useMealAdvisor';

interface MealSuggestionCardProps {
  meal: MealSuggestion;
  onLog?: (meal: MealSuggestion) => void;
  className?: string;
}

const tagStyles: Record<string, string> = {
  'quick': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'high-protein': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'glp1-friendly': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'post-workout': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'optimal': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'creative': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'snack': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'deficit-friendly': 'bg-green-500/15 text-green-400 border-green-500/30',
  'low-carb': 'bg-red-500/15 text-red-400 border-red-500/30',
  'omega-3': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'muscle-building': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'evening': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const tagLabels: Record<string, string> = {
  'quick': 'Schnell',
  'high-protein': 'Protein+',
  'glp1-friendly': 'GLP-1',
  'post-workout': 'Post-Workout',
  'optimal': 'Optimal',
  'creative': 'Kreativ',
  'snack': 'Snack',
  'deficit-friendly': 'Defizit',
  'low-carb': 'Low-Carb',
  'omega-3': 'Omega-3',
  'muscle-building': 'Aufbau',
  'evening': 'Abends',
};

export const MealSuggestionCard: React.FC<MealSuggestionCardProps> = ({
  meal,
  onLog,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-2xl p-4 overflow-hidden",
        "bg-gradient-to-br from-card/90 via-card/80 to-card/70",
        "border border-border/40 backdrop-blur-sm",
        "shadow-lg shadow-black/10",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Header: Title + Prep Time */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-foreground text-base leading-tight flex-1">
            {meal.title}
          </h4>
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full shrink-0">
            <Clock className="w-3 h-3" />
            {meal.prepTime}
          </span>
        </div>

        {/* Reason - italic, context-aware */}
        <p className="text-sm text-muted-foreground italic leading-snug">
          "{meal.reason}"
        </p>

        {/* Macro Grid */}
        <div className="grid grid-cols-4 gap-2">
          <MacroBox label="kcal" value={meal.macros.kcal} color="text-foreground" />
          <MacroBox label="P" value={meal.macros.protein} unit="g" color="text-emerald-400" />
          <MacroBox label="C" value={meal.macros.carbs} unit="g" color="text-blue-400" />
          <MacroBox label="F" value={meal.macros.fats} unit="g" color="text-amber-400" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {meal.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                tagStyles[tag] || "bg-muted/50 text-muted-foreground border-border/50"
              )}
            >
              {tagLabels[tag] || tag}
            </span>
          ))}
        </div>

        {/* Action Button */}
        {onLog && (
          <Button
            variant="default"
            size="sm"
            onClick={() => onLog(meal)}
            className="w-full h-9 mt-2 rounded-xl font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Als Mahlzeit loggen
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// Macro display box
const MacroBox: React.FC<{
  label: string;
  value: number;
  unit?: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <div className="text-center py-1.5 px-1 rounded-lg bg-muted/30">
    <p className={cn("text-sm font-bold tabular-nums", color)}>
      {Math.round(value)}{unit}
    </p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
      {label}
    </p>
  </div>
);
