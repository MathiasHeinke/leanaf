/**
 * WeightLogger - Premium weight input with stepper controls
 * Large display, +/- 0.1kg buttons, last entry reference
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Check } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
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

  const handleSave = async () => {
    setIsSaving(true);
    const success = await trackEvent('weight', { weight_kg: weight });
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
