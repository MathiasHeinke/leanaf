/**
 * SleepLogger - Sleep duration slider + quality emoji selector
 * Simple but effective sleep tracking
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface SleepLoggerProps {
  onClose: () => void;
}

const qualityLevels = [
  { id: 'low' as const, label: 'Schlecht', emoji: '😫', value: 1, bg: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-500' },
  { id: 'med' as const, label: 'Okay', emoji: '😐', value: 3, bg: 'bg-amber-100 dark:bg-amber-900/20', border: 'border-amber-500' },
  { id: 'high' as const, label: 'Super', emoji: '🤩', value: 5, bg: 'bg-emerald-100 dark:bg-emerald-900/20', border: 'border-emerald-500' },
];

export const SleepLogger: React.FC<SleepLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const { data: metrics } = useDailyMetrics();
  
  // Initialize with last sleep or defaults
  const [hours, setHours] = useState(metrics?.sleep?.lastHours || 7.5);
  const [quality, setQuality] = useState<'low' | 'med' | 'high'>('med');
  const [isSaving, setIsSaving] = useState(false);

  const selectedQuality = qualityLevels.find(q => q.id === quality);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await trackEvent('sleep', { 
      sleep_hours: hours, 
      sleep_quality: selectedQuality?.value || 3 
    });
    if (success) {
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* HOURS DISPLAY */}
      <div className="flex flex-col items-center py-4">
        <motion.div
          key={hours}
          initial={{ scale: 0.95, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-bold text-foreground"
        >
          {hours.toFixed(1)}h
        </motion.div>
        <div className="text-sm text-muted-foreground mt-1">Schlafdauer</div>
      </div>

      {/* HOURS SLIDER */}
      <div className="px-2">
        <Slider
          value={[hours]}
          onValueChange={([val]) => setHours(Number(val.toFixed(1)))}
          min={3}
          max={12}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>3h</span>
          <span>12h</span>
        </div>
      </div>

      {/* QUALITY SELECTOR */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Schlafqualität</div>
        <div className="grid grid-cols-3 gap-3">
          {qualityLevels.map((q) => {
            const isSelected = quality === q.id;
            return (
              <motion.button
                key={q.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuality(q.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                  isSelected
                    ? `${q.border} ${q.bg}`
                    : 'border-transparent bg-muted hover:bg-muted/80'
                )}
              >
                <span className="text-3xl">{q.emoji}</span>
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {q.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

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
            Schlaf speichern
          </>
        )}
      </motion.button>
    </div>
  );
};

export default SleepLogger;
