/**
 * TrainingLogger - 4-Säulen Grid for RPT, Zone2, VO2max, Sauna
 * Visual selection cards with duration slider for cardio/sauna
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Activity, HeartPulse, Flame, Check, Minus, Plus } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { cn } from '@/lib/utils';
import type { TrainingType } from '@/types/training';

interface TrainingLoggerProps {
  onClose: () => void;
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

const trainingTypes = [
  { id: 'rpt' as const, label: 'Kraft (RPT)', icon: Dumbbell, color: 'bg-indigo-500', needsTime: false },
  { id: 'zone2' as const, label: 'Zone 2', icon: Activity, color: 'bg-emerald-500', needsTime: true },
  { id: 'vo2max' as const, label: 'VO2 Max', icon: HeartPulse, color: 'bg-rose-500', needsTime: true },
  { id: 'sauna' as const, label: 'Sauna', icon: Flame, color: 'bg-orange-500', needsTime: true },
];

export const TrainingLogger: React.FC<TrainingLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const [selectedType, setSelectedType] = useState<TrainingType | null>(null);
  const [duration, setDuration] = useState(45);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTypeConfig = trainingTypes.find(t => t.id === selectedType);

  const handleSave = async () => {
    if (!selectedType) return;
    
    setIsSaving(true);
    const success = await trackEvent('workout', { 
      training_type: selectedType, 
      duration_minutes: selectedTypeConfig?.needsTime ? duration : undefined 
    });
    if (success) {
      onClose();
    }
    setIsSaving(false);
  };

  const adjustDuration = (delta: number) => {
    setDuration(d => Math.max(5, Math.min(180, d + delta)));
  };

  return (
    <div className="space-y-6">
      {/* GRID SELECTION */}
      <div className="grid grid-cols-2 gap-3">
        {trainingTypes.map((t) => {
          const isSelected = selectedType === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedType(t.id)}
              className={cn(
                "relative p-4 rounded-2xl flex flex-col items-start gap-3 border-2 transition-all h-[100px]",
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted hover:bg-muted/80'
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                t.color
              )}>
                <t.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-foreground text-left">
                {t.label}
              </span>
              
              {/* Selected Indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* DURATION CONTROLS - Only for cardio/sauna */}
      <AnimatePresence>
        {selectedType && selectedTypeConfig?.needsTime && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Dauer</div>
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustDuration(-5)}
                  className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </motion.button>
                
                <div className="w-24 text-center">
                  <motion.span
                    key={duration}
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold tabular-nums text-foreground"
                  >
                    {duration}
                  </motion.span>
                  <span className="text-lg text-muted-foreground ml-1">min</span>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustDuration(5)}
                  className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SAVE BUTTON */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={!selectedType || isSaving}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors",
          selectedType
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isSaving ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check className="w-5 h-5" />
            Training speichern
          </>
        )}
      </motion.button>
    </div>
  );
};

export default TrainingLogger;
