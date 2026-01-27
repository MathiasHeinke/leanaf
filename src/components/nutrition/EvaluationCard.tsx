/**
 * EvaluationCard - Displays Lester's evaluation of user's meal idea
 * Shows verdict, reason, macros, optimization tip, and save button
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ThumbsUp, AlertTriangle, Lightbulb, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RecipePopover } from './RecipePopover';
import type { MealEvaluation, Recipe } from '@/hooks/useMealAdvisor';

interface EvaluationCardProps {
  evaluation: MealEvaluation;
  onLog?: (evaluation: MealEvaluation) => void;
  className?: string;
  recipe?: Recipe;
}

const verdictConfig = {
  optimal: {
    icon: CheckCircle,
    label: 'Optimal',
    bgColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30'
  },
  ok: {
    icon: ThumbsUp,
    label: 'OK',
    bgColor: 'bg-amber-500/15',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30'
  },
  suboptimal: {
    icon: AlertTriangle,
    label: 'Suboptimal',
    bgColor: 'bg-orange-500/15',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30'
  }
};

const tagStyles: Record<string, string> = {
  'high-gi': 'bg-red-500/15 text-red-400 border-red-500/30',
  'low-gi': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'stable-glucose': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'insulin-spike': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'high-protein': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'low-protein': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'optimal': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'fallback': 'bg-muted text-muted-foreground border-border/50',
};

const tagLabels: Record<string, string> = {
  'high-gi': 'High-GI',
  'low-gi': 'Low-GI',
  'stable-glucose': 'Stabil',
  'insulin-spike': 'Spike',
  'high-protein': 'Protein+',
  'low-protein': 'Protein-',
  'optimal': 'Optimal',
  'fallback': 'Offline',
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  evaluation,
  onLog,
  className,
  recipe
}) => {
  const verdict = verdictConfig[evaluation.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
        {/* Header: User Idea + Recipe Info + Verdict Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Deine Idee:</p>
            <h4 className="font-semibold text-foreground text-base leading-tight truncate">
              {evaluation.userIdea}
            </h4>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Recipe Info Icon */}
            {recipe && (
              <RecipePopover recipe={recipe} title={evaluation.userIdea} />
            )}
            
            {/* Verdict Badge */}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
              verdict.bgColor,
              verdict.borderColor
            )}>
              <VerdictIcon className={cn("w-3.5 h-3.5", verdict.textColor)} />
              <span className={cn("text-xs font-medium", verdict.textColor)}>
                {verdict.label}
              </span>
            </div>
          </div>
        </div>

        {/* Lester's Reason */}
        <p className="text-sm text-foreground/90 leading-snug">
          {evaluation.reason}
        </p>

        {/* Macro Grid */}
        <div className="grid grid-cols-4 gap-2">
          <MacroBox label="kcal" value={evaluation.macros.kcal} color="text-foreground" />
          <MacroBox label="P" value={evaluation.macros.protein} unit="g" color="text-emerald-400" />
          <MacroBox label="C" value={evaluation.macros.carbs} unit="g" color="text-blue-400" />
          <MacroBox label="F" value={evaluation.macros.fats} unit="g" color="text-amber-400" />
        </div>

        {/* Tags */}
        {evaluation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {evaluation.tags.slice(0, 3).map(tag => (
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
        )}

        {/* Optimization Tip */}
        {evaluation.optimization && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/90">
              {evaluation.optimization}
            </p>
          </div>
        )}

        {/* Action Button */}
        {onLog && (
          <Button
            variant="default"
            size="sm"
            onClick={() => onLog(evaluation)}
            className="w-full h-9 mt-2 rounded-xl font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Als Mahlzeit speichern
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
