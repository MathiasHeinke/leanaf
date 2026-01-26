/**
 * SleepLogger - Sleep duration slider + quality emoji selector
 * Extended: Bedtime/wake time, interruptions, screen time, libido, motivation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { useAresEvents } from '@/hooks/useAresEvents';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SleepLoggerProps {
  onClose: () => void;
}

const qualityLevels = [
  { id: 'low' as const, label: 'Schlecht', emoji: '😫', value: 1, bg: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-500' },
  { id: 'med' as const, label: 'Okay', emoji: '😐', value: 3, bg: 'bg-amber-100 dark:bg-amber-900/20', border: 'border-amber-500' },
  { id: 'high' as const, label: 'Super', emoji: '🤩', value: 5, bg: 'bg-emerald-100 dark:bg-emerald-900/20', border: 'border-emerald-500' },
];

const LIBIDO_SCALE = [
  { value: 1, emoji: '😴' },
  { value: 2, emoji: '😐' },
  { value: 3, emoji: '😊' },
  { value: 4, emoji: '😍' },
  { value: 5, emoji: '🔥' },
];

const MOTIVATION_SCALE = [
  { value: 1, emoji: '😫' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '💪' },
  { value: 5, emoji: '🚀' },
];

export const SleepLogger: React.FC<SleepLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const { data: metrics } = useDailyMetrics();
  
  // Core fields
  const [hours, setHours] = useState(metrics?.sleep?.lastHours || 7.5);
  const [quality, setQuality] = useState<'low' | 'med' | 'high'>('med');
  const [isSaving, setIsSaving] = useState(false);
  
  // Extended fields - Sleep Details
  const [bedtime, setBedtime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [interruptions, setInterruptions] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Extended fields - Morning Check
  const [screenTime, setScreenTime] = useState(30);
  const [libido, setLibido] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [morningCheckOpen, setMorningCheckOpen] = useState(false);

  const selectedQuality = qualityLevels.find(q => q.id === quality);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await trackEvent('sleep', { 
      sleep_hours: hours, 
      sleep_quality: selectedQuality?.value || 3,
      bedtime: bedtime || undefined,
      wake_time: wakeTime || undefined,
      sleep_interruptions: interruptions > 0 ? interruptions : undefined,
      screen_time_evening: screenTime > 0 ? screenTime : undefined,
      morning_libido: libido || undefined,
      motivation_level: motivation || undefined
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

      {/* SLEEP DETAILS ACCORDION */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
          <span>Schlaf-Details</span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            detailsOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Eingeschlafen</label>
              <Input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Aufgewacht</label>
              <Input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
          </div>
          {/* Interruptions Stepper */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Unterbrechungen</span>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setInterruptions(i => Math.max(0, i - 1))}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70"
              >
                <Minus className="w-4 h-4" />
              </motion.button>
              <span className="w-6 text-center font-medium tabular-nums">{interruptions}</span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setInterruptions(i => Math.min(10, i + 1))}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* MORNING CHECK ACCORDION */}
      <Collapsible open={morningCheckOpen} onOpenChange={setMorningCheckOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
          <span>Morgen-Check</span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            morningCheckOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          {/* Screen Time Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Bildschirmzeit gestern Abend</span>
              <span className="text-sm font-medium tabular-nums">{screenTime} min</span>
            </div>
            <Slider
              value={[screenTime]}
              onValueChange={([val]) => setScreenTime(val)}
              min={0}
              max={180}
              step={15}
            />
          </div>
          
          {/* Libido Scale */}
          <div>
            <div className="text-sm mb-2">Libido am Morgen</div>
            <div className="flex gap-2 justify-center">
              {LIBIDO_SCALE.map((l) => (
                <motion.button
                  key={l.value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLibido(l.value)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xl transition-colors",
                    libido === l.value
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {l.emoji}
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Motivation Scale */}
          <div>
            <div className="text-sm mb-2">Motivation</div>
            <div className="flex gap-2 justify-center">
              {MOTIVATION_SCALE.map((m) => (
                <motion.button
                  key={m.value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMotivation(m.value)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xl transition-colors",
                    motivation === m.value
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {m.emoji}
                </motion.button>
              ))}
            </div>
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
            Schlaf speichern
          </>
        )}
      </motion.button>
    </div>
  );
};

export default SleepLogger;
