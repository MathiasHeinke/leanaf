/**
 * WeightLogger - Premium weight input with stepper controls
 * Large display, +/- 0.1kg buttons, last entry reference
 * Extended: Body fat %, Muscle mass %, Notes via Collapsible
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Check, ChevronDown } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NumericInput } from '@/components/ui/numeric-input';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface WeightLoggerProps {
  onClose: () => void;
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export const WeightLogger: React.FC<WeightLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const { data: metrics } = useDailyMetrics();
  
  // Initialize with last known weight or default
  const lastWeight = metrics?.weight?.latest || 80.0;
  const [weight, setWeight] = useState(lastWeight);
  const [isSaving, setIsSaving] = useState(false);
  
  // Extended fields
  const [bodyFat, setBodyFat] = useState<string>('');
  const [muscleMass, setMuscleMass] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await trackEvent('weight', { 
      weight_kg: weight,
      body_fat_percentage: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : undefined,
      muscle_percentage: muscleMass ? parseFloat(muscleMass.replace(',', '.')) : undefined,
      notes: notes || undefined
    });
    if (success) {
      onClose();
    }
    setIsSaving(false);
  };

  const adjustWeight = (delta: number) => {
    setWeight(w => Number((w + delta).toFixed(1)));
  };

  return (
    <div className="space-y-6">
      {/* BIG DISPLAY */}
      <div className="flex flex-col items-center py-6">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={weight}
            initial={{ scale: 0.95, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-bold tabular-nums text-foreground"
          >
            {weight.toFixed(1)}
          </motion.span>
          <span className="text-2xl font-medium text-muted-foreground">kg</span>
        </div>
      </div>

      {/* STEPPER CONTROLS */}
      <div className="flex items-center justify-center gap-6">
        <StepperButton 
          icon={Minus} 
          onClick={() => adjustWeight(-0.1)} 
          label="-0.1"
        />
        <div className="w-px h-8 bg-border" />
        <StepperButton 
          icon={Plus} 
          onClick={() => adjustWeight(0.1)} 
          label="+0.1"
        />
      </div>

      {/* LAST ENTRY REFERENCE */}
      {metrics?.weight?.date && (
        <div className="flex justify-center">
          <div className="px-4 py-2 rounded-xl bg-muted/50 text-sm text-muted-foreground">
            Letzter Eintrag: {metrics.weight.latest?.toFixed(1)} kg
          </div>
        </div>
      )}

      {/* BODY COMPOSITION ACCORDION */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
          <span>Körperkomposition</span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            detailsOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* KFA Input */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground w-24">KFA</label>
            <div className="relative flex-1">
              <NumericInput
                placeholder="18,5"
                value={bodyFat}
                onChange={setBodyFat}
                min={0}
                max={50}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          {/* Muscle Mass Input */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground w-24">Muskeln</label>
            <div className="relative flex-1">
              <NumericInput
                placeholder="42,0"
                value={muscleMass}
                onChange={setMuscleMass}
                min={0}
                max={70}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          {/* Notes */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground w-24">Notizen</label>
            <Input
              placeholder="Optional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* SAVE BUTTON */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={isSaving}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors",
          "bg-primary text-primary-foreground",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isSaving ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check className="w-5 h-5" />
            Speichern
          </>
        )}
      </motion.button>
    </div>
  );
};

interface StepperButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  label: string;
}

const StepperButton: React.FC<StepperButtonProps> = ({ icon: Icon, onClick, label }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    whileHover={{ scale: 1.05 }}
    transition={springConfig}
    onClick={onClick}
    className="flex flex-col items-center gap-1"
  >
    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
      <Icon className="w-6 h-6 text-foreground" />
    </div>
    <span className="text-xs text-muted-foreground">{label}</span>
  </motion.button>
);

export default WeightLogger;
