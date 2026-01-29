/**
 * LiveExerciseCard
 * 
 * Compact, mobile-first interactive card for live workout tracking.
 * Features touch-optimized steppers and inline inputs.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Check, SkipForward, Minus, Plus, Dumbbell, TrendingUp } from 'lucide-react';
import type { LiveExercise, ExerciseResult } from '@/hooks/useLiveWorkout';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LiveExerciseCardProps {
  exercise: LiveExercise;
  exerciseNumber: number;
  totalExercises: number;
  onComplete: (result: ExerciseResult) => void;
  onSkip: () => void;
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER STEPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  label?: string;
  disabled?: boolean;
}

function NumberStepper({ 
  value, 
  onChange, 
  min = 0, 
  max = 999, 
  step = 1, 
  suffix,
  label,
  disabled 
}: NumberStepperProps) {
  const decrement = useCallback(() => {
    onChange(Math.max(min, value - step));
  }, [value, min, step, onChange]);
  
  const increment = useCallback(() => {
    onChange(Math.min(max, value + step));
  }, [value, max, step, onChange]);
  
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-muted/50 hover:bg-muted active:scale-95 transition-all",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "touch-manipulation"
          )}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        
        <div className={cn(
          "min-w-[60px] h-10 rounded-lg flex items-center justify-center",
          "bg-background border border-border/50 font-semibold text-lg"
        )}>
          {value}
          {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
        </div>
        
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-muted/50 hover:bg-muted active:scale-95 transition-all",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "touch-manipulation"
          )}
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LiveExerciseCard({
  exercise,
  exerciseNumber,
  totalExercises,
  onComplete,
  onSkip,
  disabled
}: LiveExerciseCardProps) {
  // State for inputs (pre-filled with planned values)
  const [weight, setWeight] = useState(exercise.planned_weight_kg);
  const [reps, setReps] = useState(exercise.planned_reps);
  const [sets, setSets] = useState(exercise.planned_sets);
  const [rpe, setRpe] = useState(exercise.planned_rpe);
  
  const handleComplete = useCallback(() => {
    onComplete({
      actual_sets: sets,
      actual_reps: reps,
      actual_weight_kg: weight,
      actual_rpe: rpe
    });
  }, [onComplete, sets, reps, weight, rpe]);

  const hasProgression = exercise.progression_hint && exercise.last_performance;
  const isPositiveProgression = hasProgression && weight > (exercise.last_performance?.weight_kg || 0);

  return (
    <div className={cn(
      "rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50",
      "shadow-lg overflow-hidden",
      "animate-in slide-in-from-bottom-4 duration-300"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground leading-tight">
              {exercise.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {exercise.planned_sets} × {exercise.planned_reps} @ {exercise.planned_weight_kg}kg
            </p>
          </div>
        </div>
        
        <Badge variant="secondary" className="text-xs font-medium">
          {exerciseNumber}/{totalExercises}
        </Badge>
      </div>
      
      {/* Last Performance + Progression Hint */}
      {exercise.last_performance && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Letztes Mal: {exercise.last_performance.weight_kg}kg × {exercise.last_performance.reps}
              {exercise.last_performance.rpe && (
                <span className="ml-1 text-xs">(RPE {exercise.last_performance.rpe})</span>
              )}
            </span>
            {hasProgression && (
            <span className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositiveProgression ? "text-primary" : "text-muted-foreground"
            )}>
              {isPositiveProgression && <TrendingUp className="w-3 h-3" />}
              {exercise.progression_hint}
            </span>
          )}
          </div>
        </div>
      )}
      
      {/* Input Section */}
      <div className="p-4 space-y-4">
        {/* Steppers Row */}
        <div className="grid grid-cols-3 gap-3">
          <NumberStepper
            label="Gewicht"
            value={weight}
            onChange={setWeight}
            min={0}
            max={500}
            step={2.5}
            suffix="kg"
            disabled={disabled}
          />
          
          <NumberStepper
            label="Wdh"
            value={reps}
            onChange={setReps}
            min={1}
            max={100}
            step={1}
            disabled={disabled}
          />
          
          <NumberStepper
            label="Sets"
            value={sets}
            onChange={setSets}
            min={1}
            max={20}
            step={1}
            disabled={disabled}
          />
        </div>
        
        {/* RPE Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              RPE (Anstrengung)
            </span>
            <span className={cn(
              "text-sm font-semibold px-2 py-0.5 rounded",
              rpe >= 9 ? "bg-destructive/20 text-destructive" :
              rpe >= 7 ? "bg-accent text-accent-foreground" :
              "bg-primary/20 text-primary"
            )}>
              {rpe}
            </span>
          </div>
          <Slider
            value={[rpe]}
            onValueChange={([val]) => setRpe(val)}
            min={5}
            max={10}
            step={0.5}
            disabled={disabled}
            className="touch-manipulation"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>Leicht</span>
            <span>Moderat</span>
            <span>Maximal</span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 p-4 pt-0">
        <Button
          onClick={handleComplete}
          disabled={disabled}
          className={cn(
            "flex-1 h-12 text-base font-semibold",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "active:scale-[0.98] transition-transform"
          )}
        >
          <Check className="w-5 h-5 mr-2" />
          Fertig
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={disabled}
          className="h-12 px-4"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
