/**
 * TrainingLogger - Cross-Morphing + Multi-Select Design
 * Premium Apple Health-style with bidirectional morphing between sections
 * 
 * Features:
 * - Cross-Morphing: Selecting a workout shrinks activity section & vice versa
 * - Multi-Select Dropdowns: Kraft (splits), Zone 2 (cardio types)
 * - Single-Select: VO2 Max protocols
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Activity, HeartPulse, Flame, Check, Minus, Plus, Footprints, Moon, LucideIcon, ChevronDown } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { NumericInput } from '@/components/ui/numeric-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { TrainingType, SplitType, CardioType, Vo2Protocol } from '@/types/training';
import { CARDIO_TYPE_OPTIONS, VO2_PROTOCOL_OPTIONS, SAUNA_TEMP_OPTIONS, SPLIT_TYPE_LABELS } from '@/types/training';

interface TrainingLoggerProps {
  onClose: () => void;
}

// Spring config for smooth animations
const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };

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

// Only the main split types (excluding 'cardio' which is a separate category)
type MainSplitType = Exclude<SplitType, 'cardio'>;

const SPLIT_OPTIONS: { id: MainSplitType; label: string }[] = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' },
  { id: 'full', label: 'Full' },
];

// Reusable Round Button with Morphing
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
  isCompact: boolean;
  onSelect: (id: TrainingType) => void;
}

const RoundTypeButton: React.FC<RoundTypeButtonProps> = ({ 
  type, 
  isSelected, 
  isDisabled,
  isCompact,
  onSelect 
}) => (
  <motion.button
    layout
    whileTap={!isDisabled ? { scale: 0.95 } : undefined}
    onClick={() => !isDisabled && onSelect(type.id)}
    disabled={isDisabled}
    className="flex flex-col items-center gap-1"
    transition={springConfig}
  >
    {/* Round Icon Button - smaller when compact */}
    <motion.div 
      layout
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200",
        isCompact ? "w-10 h-10" : "w-16 h-16",
        isSelected && `${type.color} ring-2 ring-offset-2 ring-primary`,
        !isSelected && !isDisabled && !isCompact && "bg-muted hover:bg-muted/80",
        !isSelected && !isDisabled && isCompact && "bg-muted/60",
        isDisabled && "opacity-40 grayscale cursor-not-allowed bg-muted"
      )}
      transition={springConfig}
    >
      <type.icon className={cn(
        "transition-all duration-200",
        isCompact ? "w-4 h-4" : "w-7 h-7",
        isSelected ? "text-white" : "text-foreground"
      )} />
    </motion.div>
    
    {/* Label - hidden when compact */}
    <AnimatePresence mode="wait">
      {!isCompact && (
        <motion.span
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "text-xs font-medium",
            isDisabled ? "text-muted-foreground/50" : "text-foreground"
          )}
        >
          {type.label}
        </motion.span>
      )}
    </AnimatePresence>
  </motion.button>
);

export const TrainingLogger: React.FC<TrainingLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const [selectedType, setSelectedType] = useState<TrainingType | null>(null);
  const [duration, setDuration] = useState(45);
  const [isSaving, setIsSaving] = useState(false);
  
  // Multi-select states for workouts
  const [selectedSplits, setSelectedSplits] = useState<MainSplitType[]>([]);
  const [selectedCardioTypes, setSelectedCardioTypes] = useState<CardioType[]>([]);
  const [selectedVo2Protocols, setSelectedVo2Protocols] = useState<Vo2Protocol[]>([]);
  
  // Sauna fields
  const [saunaTemp, setSaunaTemp] = useState<80 | 90 | 100>(80);
  const [saunaRounds, setSaunaRounds] = useState(3);
  const [totalVolume, setTotalVolume] = useState<string>('');
  
  // Movement fields
  const [steps, setSteps] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('');

  const selectedTypeConfig = allTypes.find(t => t.id === selectedType);
  
  // Cross-Morphing Logic
  const isWorkoutSelected = selectedType && ['rpt', 'zone2', 'vo2max'].includes(selectedType);
  const isActivitySelected = selectedType && ['sauna', 'movement', 'rest'].includes(selectedType);
  
  // Compact states based on opposite section selection
  const isWorkoutSectionCompact = isActivitySelected;
  const isActivitySectionCompact = isWorkoutSelected;
  
  // Rest day disables workouts (from original logic)
  const isRestDaySelected = selectedType === 'rest';

  // Toggle functions for multi-select
  const toggleSplit = (split: MainSplitType) => {
    setSelectedSplits(prev => 
      prev.includes(split)
        ? prev.filter(s => s !== split)
        : [...prev, split]
    );
  };

  const toggleCardioType = (type: CardioType) => {
    setSelectedCardioTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleVo2Protocol = (protocol: Vo2Protocol) => {
    setSelectedVo2Protocols(prev =>
      prev.includes(protocol)
        ? prev.filter(p => p !== protocol)
        : [...prev, protocol]
    );
  };

  const handleSave = async () => {
    if (!selectedType) return;
    
    setIsSaving(true);
    
    // Build session_data based on type
    const sessionData: Record<string, unknown> = {};
    
    // Kraft: Multiple splits
    if (selectedType === 'rpt' && selectedSplits.length > 0) {
      sessionData.splits = selectedSplits;
    }
    
    // Zone 2: Multiple cardio types
    if (selectedType === 'zone2' && selectedCardioTypes.length > 0) {
      sessionData.cardio_types = selectedCardioTypes;
    }
    
    // VO2 Max: Multiple protocols
    if (selectedType === 'vo2max' && selectedVo2Protocols.length > 0) {
      sessionData.protocols = selectedVo2Protocols;
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
      split_type: selectedSplits[0] || undefined, // Primary split for compatibility
      duration_minutes: selectedTypeConfig?.needsTime ? duration : undefined,
      total_volume_kg: totalVolume ? parseFloat(totalVolume.replace(',', '.')) : undefined,
      session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined,
      did_workout: selectedType !== 'rest'
    });
    
    if (success) {
      // Dispatch completion event for ActionCardStack
      window.dispatchEvent(new CustomEvent('ares-card-completed', { 
        detail: { cardType: 'training' }
      }));
      onClose();
    }
    setIsSaving(false);
  };

  const adjustDuration = (delta: number) => {
    setDuration(d => Math.max(5, Math.min(180, d + delta)));
  };

  return (
    <div className="flex flex-col min-h-[300px]">
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        
        {/* WORKOUTS SECTION - Compact when activity selected */}
        <motion.div 
          layout
          className="space-y-3"
          animate={{ 
            opacity: isWorkoutSectionCompact ? 0.6 : 1 
          }}
          transition={springConfig}
        >
          {!isWorkoutSectionCompact && (
            <motion.h3 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1"
            >
              Workouts
            </motion.h3>
          )}
          <div className="flex justify-around">
            {workoutTypes.map((type) => (
              <RoundTypeButton
                key={type.id}
                type={type}
                isSelected={selectedType === type.id}
                isDisabled={isRestDaySelected}
                isCompact={isWorkoutSectionCompact || false}
                onSelect={setSelectedType}
              />
            ))}
          </div>
        </motion.div>

        {/* ACTIVITY & RECOVERY SECTION - Compact when workout selected */}
        <motion.div 
          layout
          className="space-y-3"
          animate={{ 
            opacity: isActivitySectionCompact ? 0.6 : 1 
          }}
          transition={springConfig}
        >
          {!isActivitySectionCompact && (
            <motion.h3 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1"
            >
              Aktivität & Erholung
            </motion.h3>
          )}
          <div className="flex justify-around">
            {activityTypes.map((type) => (
              <RoundTypeButton
                key={type.id}
                type={type}
                isSelected={selectedType === type.id}
                isDisabled={false}
                isCompact={isActivitySectionCompact || false}
                onSelect={setSelectedType}
              />
            ))}
          </div>
        </motion.div>

        {/* TYPE-SPECIFIC DETAILS */}
        <AnimatePresence mode="wait">
          {selectedType && (
            <motion.div
              key={selectedType}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-4">
                {/* RPT: Multi-Select Split Dropdown + Volume */}
                {selectedType === 'rpt' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Trainierte Splits</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                          <span className="text-sm">
                            {selectedSplits.length > 0 
                              ? selectedSplits.map(s => SPLIT_TYPE_LABELS[s]).join(', ')
                              : 'Splits auswählen...'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-popover" align="start">
                        {SPLIT_OPTIONS.map((split) => (
                          <label
                            key={split.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
                          >
                            <Checkbox 
                              checked={selectedSplits.includes(split.id)}
                              onCheckedChange={() => toggleSplit(split.id)}
                            />
                            <span className="text-sm">{split.label}</span>
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                    
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

                {/* Zone2: Multi-Select Cardio Type Dropdown */}
                {selectedType === 'zone2' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Cardio-Arten</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                          <span className="text-sm">
                            {selectedCardioTypes.length > 0 
                              ? selectedCardioTypes.map(c => {
                                  const option = CARDIO_TYPE_OPTIONS.find(o => o.id === c);
                                  return option ? `${option.emoji} ${option.label}` : c;
                                }).join(', ')
                              : 'Cardio auswählen...'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-popover" align="start">
                        {CARDIO_TYPE_OPTIONS.map((cardio) => (
                          <label
                            key={cardio.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
                          >
                            <Checkbox 
                              checked={selectedCardioTypes.includes(cardio.id)}
                              onCheckedChange={() => toggleCardioType(cardio.id)}
                            />
                            <span className="text-sm">{cardio.emoji} {cardio.label}</span>
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </>
                )}

                {/* VO2max: Multi-Select Protocol Dropdown */}
                {selectedType === 'vo2max' && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">Protokolle & Aktivitäten</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                          <span className="text-sm">
                            {selectedVo2Protocols.length > 0 
                              ? selectedVo2Protocols.map(p => {
                                  const option = VO2_PROTOCOL_OPTIONS.find(o => o.id === p);
                                  return option ? `${option.emoji} ${option.label}` : p;
                                }).join(', ')
                              : 'Protokolle auswählen...'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2 bg-popover" align="start">
                        {VO2_PROTOCOL_OPTIONS.map((protocol) => (
                          <label
                            key={protocol.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
                          >
                            <Checkbox 
                              checked={selectedVo2Protocols.includes(protocol.id)}
                              onCheckedChange={() => toggleVo2Protocol(protocol.id)}
                            />
                            <span className="text-sm">{protocol.emoji} {protocol.label}</span>
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
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
