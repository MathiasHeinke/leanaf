/**
 * TrainingLogger - Round & Grouped Design
 * Apple Health-style with round buttons and logical grouping
 * 
 * Groups:
 * - WORKOUTS: Kraft, Zone 2, VO2 Max
 * - AKTIVITÄT & ERHOLUNG: Sauna, Bewegung, Ruhetag
 * 
 * Rest Day Logic: Grays out workout buttons when "Ruhetag" is selected
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Activity, HeartPulse, Flame, Check, Minus, Plus, Footprints, Moon, LucideIcon } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';
import type { TrainingType, SplitType, CardioType, Vo2Protocol } from '@/types/training';
import { CARDIO_TYPE_OPTIONS, VO2_PROTOCOL_OPTIONS, SAUNA_TEMP_OPTIONS } from '@/types/training';

interface TrainingLoggerProps {
  onClose: () => void;
}

// Grouped training types
const workoutTypes = [
  { id: 'rpt' as const, label: 'Kraft', icon: Dumbbell, color: 'bg-indigo-500', needsTime: false },
  { id: 'zone2' as const, label: 'Zone 2', icon: Activity, color: 'bg-emerald-500', needsTime: true },
  { id: 'vo2max' as const, label: 'VO2 Max', icon: HeartPulse, color: 'bg-rose-500', needsTime: true },
];

const activityTypes = [
  { id: 'sauna' as const, label: 'Sauna', icon: Flame, color: 'bg-orange-500', needsTime: true },
  { id: 'movement' as const, label: 'Bewegung', icon: Footprints, color: 'bg-teal-500', needsTime: false },
  { id: 'rest' as const, label: 'Ruhetag', icon: Moon, color: 'bg-slate-400', needsTime: false },
];

const allTypes = [...workoutTypes, ...activityTypes];

const SPLIT_OPTIONS: { id: SplitType; label: string }[] = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' },
  { id: 'full', label: 'Full' },
];

// Reusable Round Button Component
interface RoundTypeButtonProps {
  type: {
    id: TrainingType;
    label: string;
    icon: LucideIcon;
    color: string;
    needsTime: boolean;
  };
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: TrainingType) => void;
}

const RoundTypeButton: React.FC<RoundTypeButtonProps> = ({ 
  type, 
  isSelected, 
  isDisabled, 
  onSelect 
}) => (
  <motion.button
    whileTap={!isDisabled ? { scale: 0.95 } : undefined}
    onClick={() => !isDisabled && onSelect(type.id)}
    disabled={isDisabled}
    className="flex flex-col items-center gap-2"
  >
    {/* Round Icon Button */}
    <div className={cn(
      "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
      isSelected && `${type.color} ring-2 ring-offset-2 ring-primary`,
      !isSelected && !isDisabled && "bg-muted hover:bg-muted/80",
      isDisabled && "opacity-40 grayscale cursor-not-allowed bg-muted"
    )}>
      <type.icon className={cn(
        "w-7 h-7 transition-colors",
        isSelected ? "text-white" : "text-foreground"
      )} />
    </div>
    
    {/* Label */}
    <span className={cn(
      "text-xs font-medium transition-colors",
      isDisabled ? "text-muted-foreground/50" : "text-foreground"
    )}>
      {type.label}
    </span>
  </motion.button>
);

export const TrainingLogger: React.FC<TrainingLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const [selectedType, setSelectedType] = useState<TrainingType | null>(null);
  const [duration, setDuration] = useState(45);
  const [isSaving, setIsSaving] = useState(false);
  
  // Extended fields
  const [splitType, setSplitType] = useState<SplitType | null>(null);
  const [cardioType, setCardioType] = useState<CardioType | null>(null);
  const [vo2Protocol, setVo2Protocol] = useState<Vo2Protocol | null>(null);
  const [saunaTemp, setSaunaTemp] = useState<80 | 90 | 100>(80);
  const [saunaRounds, setSaunaRounds] = useState(3);
  const [totalVolume, setTotalVolume] = useState<string>('');
  
  // Movement fields
  const [steps, setSteps] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('');

  const selectedTypeConfig = allTypes.find(t => t.id === selectedType);
  
  // Rest day disables workouts
  const isRestDaySelected = selectedType === 'rest';

  const handleSave = async () => {
    if (!selectedType) return;
    
    setIsSaving(true);
    
    // Build session_data based on type
    const sessionData: Record<string, unknown> = {};
    
    if (selectedType === 'zone2' && cardioType) {
      sessionData.cardio_type = cardioType;
    }
    if (selectedType === 'vo2max' && vo2Protocol) {
      sessionData.protocol = vo2Protocol;
    }
    if (selectedType === 'sauna') {
      sessionData.temperature = saunaTemp;
      sessionData.rounds = saunaRounds;
    }
    if (selectedType === 'movement') {
      if (steps) sessionData.steps = parseInt(steps);
      if (distanceKm) sessionData.distance_km = parseFloat(distanceKm.replace(',', '.'));
    }
    
    const success = await trackEvent('workout', { 
      training_type: selectedType,
      split_type: selectedType === 'rpt' ? (splitType as any) : undefined,
      duration_minutes: selectedTypeConfig?.needsTime ? duration : undefined,
      total_volume_kg: totalVolume ? parseFloat(totalVolume.replace(',', '.')) : undefined,
      session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined,
      did_workout: selectedType !== 'rest'
    });
    
    if (success) onClose();
    setIsSaving(false);
  };

  const adjustDuration = (delta: number) => {
    setDuration(d => Math.max(5, Math.min(180, d + delta)));
  };

  return (
    <div className="flex flex-col min-h-[300px]">
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        
        {/* WORKOUTS SECTION */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Workouts
          </h3>
          <div className="flex justify-around">
            {workoutTypes.map((type) => (
              <RoundTypeButton
                key={type.id}
                type={type}
                isSelected={selectedType === type.id}
                isDisabled={isRestDaySelected}
                onSelect={setSelectedType}
              />
            ))}
          </div>
        </div>

        {/* ACTIVITY & RECOVERY SECTION */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Aktivität & Erholung
          </h3>
          <div className="flex justify-around">
            {activityTypes.map((type) => (
              <RoundTypeButton
                key={type.id}
                type={type}
                isSelected={selectedType === type.id}
                isDisabled={false}
                onSelect={setSelectedType}
              />
            ))}
          </div>
        </div>

        {/* TYPE-SPECIFIC DETAILS */}
        <AnimatePresence mode="wait">
          {selectedType && (
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-4">
                {/* RPT: Split Selection + Volume */}
                {selectedType === 'rpt' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Split</div>
                    <div className="flex flex-wrap gap-2">
                      {SPLIT_OPTIONS.map((s) => (
                        <motion.button
                          key={s.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSplitType(s.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            splitType === s.id
                              ? "bg-indigo-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {s.label}
                        </motion.button>
                      ))}
                    </div>
                    {/* Volume Input */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground">Volumen</label>
                      <NumericInput
                        placeholder="8500"
                        value={totalVolume}
                        onChange={setTotalVolume}
                        allowDecimals={false}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                  </>
                )}

                {/* Zone2: Cardio Type */}
                {selectedType === 'zone2' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Art</div>
                    <div className="flex flex-wrap gap-2">
                      {CARDIO_TYPE_OPTIONS.map((c) => (
                        <motion.button
                          key={c.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCardioType(c.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
                            cardioType === c.id
                              ? "bg-emerald-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <span>{c.emoji}</span>
                          {c.label}
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}

                {/* VO2max: Protocol */}
                {selectedType === 'vo2max' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Protokoll</div>
                    <div className="flex flex-wrap gap-2">
                      {VO2_PROTOCOL_OPTIONS.map((v) => (
                        <motion.button
                          key={v.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setVo2Protocol(v.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            vo2Protocol === v.id
                              ? "bg-rose-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {v.label}
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}

                {/* Sauna: Temp + Rounds */}
                {selectedType === 'sauna' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Temperatur</div>
                    <div className="flex gap-2">
                      {SAUNA_TEMP_OPTIONS.map((t) => (
                        <motion.button
                          key={t}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSaunaTemp(t)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            saunaTemp === t
                              ? "bg-orange-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {t}°C
                        </motion.button>
                      ))}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">Gänge</div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((r) => (
                        <motion.button
                          key={r}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSaunaRounds(r)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                            saunaRounds === r
                              ? "bg-orange-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {r}
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}

                {/* Movement: Steps + Distance */}
                {selectedType === 'movement' && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Schritte (optional)</div>
                      <NumericInput
                        placeholder="8500"
                        value={steps}
                        onChange={setSteps}
                        allowDecimals={false}
                        className="w-32"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Distanz (optional)</div>
                      <div className="flex items-center gap-2">
                        <NumericInput
                          placeholder="5,2"
                          value={distanceKm}
                          onChange={setDistanceKm}
                          allowDecimals={true}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">km</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rest Day: Simple message */}
                {selectedType === 'rest' && (
                  <div className="p-4 bg-muted/50 rounded-xl text-center">
                    <span className="text-4xl">😴</span>
                    <p className="text-sm text-muted-foreground mt-2">
                      Aktive Regeneration – auch Ruhe ist Training!
                    </p>
                  </div>
                )}

                {/* DURATION CONTROLS - Only for cardio/sauna */}
                {selectedTypeConfig?.needsTime && (
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
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* STICKY SAVE BUTTON */}
      <div className="sticky bottom-0 pt-4 mt-4 bg-gradient-to-t from-background via-background to-transparent">
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
    </div>
  );
};

export default TrainingLogger;
