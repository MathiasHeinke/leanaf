/**
 * TrainingNotesInput - Quick Training Logger with Live Preview
 * Allows free-text training input with real-time parsing and volume calculation
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Heart, Zap, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseExercisesFromText, type ParsedExercise } from '@/tools/set-parser';

export interface ParsedTrainingResult {
  rawText: string;
  trainingType: 'strength' | 'cardio' | 'hybrid';
  exercises: ParsedExercise[];
  totalVolume: number;
  totalSets: number;
}

interface TrainingNotesInputProps {
  onSubmit: (result: ParsedTrainingResult) => Promise<void>;
  isLoading: boolean;
  onCancel?: () => void;
}

const TRAINING_TYPES = [
  { id: 'strength' as const, label: 'Kraft', icon: Dumbbell, emoji: '💪' },
  { id: 'cardio' as const, label: 'Cardio', icon: Heart, emoji: '❤️' },
  { id: 'hybrid' as const, label: 'Hybrid', icon: Zap, emoji: '⚡' },
];

const PLACEHOLDER_TEXT = `Bankdrücken 4x10 80kg @7
Rudern 3x12 60kg @8
Schulterdrücken 3x10 40kg @7

Tipps:
• Format: Übung Sets×Wdh Gewicht @RPE
• Beispiel: "Bank 3x8 100kg @8"
• RPE ist optional`;

export const TrainingNotesInput: React.FC<TrainingNotesInputProps> = ({
  onSubmit,
  isLoading,
  onCancel
}) => {
  const [rawText, setRawText] = useState('');
  const [trainingType, setTrainingType] = useState<'strength' | 'cardio' | 'hybrid'>('strength');

  // Parse exercises in real-time
  const parsedData = useMemo(() => {
    if (!rawText.trim()) {
      return { exercises: [] as ParsedExercise[], totalVolume: 0, totalSets: 0 };
    }
    
    const exercises = parseExercisesFromText(rawText);
    const totalVolume = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0);
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    
    return { exercises, totalVolume, totalSets };
  }, [rawText]);

  const handleSubmit = useCallback(async () => {
    if (parsedData.exercises.length === 0) return;
    
    await onSubmit({
      rawText,
      trainingType,
      exercises: parsedData.exercises,
      totalVolume: parsedData.totalVolume,
      totalSets: parsedData.totalSets
    });
  }, [rawText, trainingType, parsedData, onSubmit]);

  const hasContent = rawText.trim().length > 0;
  const hasValidExercises = parsedData.exercises.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <h3 className="font-semibold text-foreground">Schnelles Training loggen</h3>
      </div>

      {/* Textarea */}
      <Textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={PLACEHOLDER_TEXT}
        className="min-h-[140px] resize-none bg-muted/30 border-border/50 focus:border-primary/50 text-sm font-mono"
        disabled={isLoading}
      />

      {/* Training Type Buttons */}
      <div className="flex gap-2">
        {TRAINING_TYPES.map((type) => (
          <Button
            key={type.id}
            variant={trainingType === type.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTrainingType(type.id)}
            disabled={isLoading}
            className={cn(
              "flex-1 h-9 rounded-lg text-xs font-medium transition-all",
              trainingType === type.id 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/30 border-border/50 hover:bg-muted/50"
            )}
          >
            <span className="mr-1.5">{type.emoji}</span>
            {type.label}
          </Button>
        ))}
      </div>

      {/* Live Preview */}
      <AnimatePresence mode="wait">
        {hasContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/20 rounded-xl border border-border/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>📊</span>
                <span>Erkannt:</span>
              </div>

              {hasValidExercises ? (
                <>
                  <div className="space-y-2">
                    {parsedData.exercises.map((exercise, idx) => (
                      <motion.div
                        key={`${exercise.name}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          {exercise.name}:
                        </span>
                        <span className="text-muted-foreground">
                          {exercise.sets.length}×{exercise.sets[0]?.reps || 0}×{exercise.sets[0]?.weight || 0}kg
                        </span>
                        <span className="text-xs text-muted-foreground/70">
                          ({exercise.totalVolume.toLocaleString('de-DE')}kg)
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Total Volume */}
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gesamt:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">
                        {parsedData.totalVolume.toLocaleString('de-DE')} kg
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {parsedData.totalSets} Sets
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  <span>Keine gültigen Übungen erkannt. Format: "Übung 3x10 80kg"</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl"
          >
            Abbrechen
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !hasValidExercises}
          className="flex-1 h-11 rounded-xl font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Workout speichern
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
