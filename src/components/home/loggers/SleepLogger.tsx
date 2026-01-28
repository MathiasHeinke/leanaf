/**
 * SleepLogger - Sleep duration slider + quality emoji selector
 * Extended: Bedtime/wake time, interruptions, screen time, libido, motivation
 * 
 * UI Polish: Morphing hero, exclusive accordions, 5-point quality scale, sticky save
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

const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };

// 5-Point Quality Scale (compact design)
const QUALITY_SCALE = [
  { value: 1, emoji: '😫', label: 'Miserabel' },
  { value: 2, emoji: '😕', label: 'Schlecht' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '💪', label: 'Gut' },
  { value: 5, emoji: '🚀', label: 'Top' },
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

// Accordion section types
type OpenSection = 'details' | 'morningCheck' | null;

// Animation variants for morphing hero
const heroContainerVariants = {
  normal: { marginTop: 16, marginBottom: 16 },
  compact: { marginTop: 4, marginBottom: 4 }
};

const numberVariants = {
  normal: { scale: 1 },
  compact: { scale: 0.75 }
};

export const SleepLogger: React.FC<SleepLoggerProps> = ({ onClose }) => {
  const { trackEvent } = useAresEvents();
  const { data: metrics } = useDailyMetrics();
  
  // Core fields
  const [hours, setHours] = useState(metrics?.sleep?.lastHours || 7.5);
  const [quality, setQuality] = useState(3); // 1-5 scale
  const [isSaving, setIsSaving] = useState(false);
  
  // Extended fields - Sleep Details
  const [bedtime, setBedtime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [interruptions, setInterruptions] = useState(0);
  
  // Extended fields - Morning Check
  const [screenTime, setScreenTime] = useState(30);
  const [libido, setLibido] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  
  // Exclusive accordion state
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const isExpanded = openSection !== null;

  const toggleSection = (section: OpenSection) => {
    setOpenSection(current => current === section ? null : section);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await trackEvent('sleep', { 
      sleep_hours: hours, 
      sleep_quality: quality * 2, // Convert 1-5 emoji scale → 2-10 for DB consistency
      bedtime: bedtime || undefined,
      wake_time: wakeTime || undefined,
      sleep_interruptions: interruptions > 0 ? interruptions : undefined,
      screen_time_evening: screenTime > 0 ? screenTime : undefined,
      morning_libido: libido || undefined,
      motivation_level: motivation || undefined
    });
    if (success) {
      // Dispatch completion event for ActionCardStack
      window.dispatchEvent(new CustomEvent('ares-card-completed', { 
        detail: { cardType: 'sleep' }
      }));
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col min-h-[300px]">
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-24">
        {/* MORPHING HERO - HOURS DISPLAY */}
        <motion.div
          variants={heroContainerVariants}
          animate={isExpanded ? 'compact' : 'normal'}
          transition={springConfig}
          className="flex flex-col items-center"
        >
          <motion.div
            variants={numberVariants}
            animate={isExpanded ? 'compact' : 'normal'}
            transition={springConfig}
          >
            <motion.span
              key={hours}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-bold text-foreground"
            >
              {hours.toFixed(1)}h
            </motion.span>
          </motion.div>
          <div className="text-sm text-muted-foreground mt-1">Schlafdauer</div>
        </motion.div>

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

        {/* COMPACT 5-POINT QUALITY SELECTOR */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground text-center">
            Schlafqualität
          </div>
          <div className="flex justify-center gap-2">
            {QUALITY_SCALE.map((q) => (
              <motion.button
                key={q.value}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuality(q.value)}
                className={cn(
                  "w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all duration-200",
                  quality === q.value
                    ? "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                    : "bg-muted hover:bg-muted/80 opacity-50"
                )}
              >
                {q.emoji}
              </motion.button>
            ))}
          </div>
          {/* Show selected label */}
          <div className="text-center text-xs text-muted-foreground">
            {QUALITY_SCALE.find(q => q.value === quality)?.label}
          </div>
        </div>

        {/* SLEEP DETAILS ACCORDION */}
        <Collapsible open={openSection === 'details'} onOpenChange={() => toggleSection('details')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
            <span>Schlaf-Details</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              openSection === 'details' && "rotate-180"
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
        <Collapsible open={openSection === 'morningCheck'} onOpenChange={() => toggleSection('morningCheck')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
            <span>Morgen-Check</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              openSection === 'morningCheck' && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            {/* Screen Time Slider */}
            <div className="mb-3">
              <div className="flex justify-between mb-1.5">
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
            
            {/* Libido & Motivation Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Libido - Links */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 text-center">Libido</div>
                <div className="flex gap-1 justify-center flex-wrap">
                  {LIBIDO_SCALE.map((l) => (
                    <motion.button
                      key={l.value}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setLibido(l.value)}
                      className={cn(
                        "w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-colors",
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

              {/* Motivation - Rechts */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 text-center">Motivation</div>
                <div className="flex gap-1 justify-center flex-wrap">
                  {MOTIVATION_SCALE.map((m) => (
                    <motion.button
                      key={m.value}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMotivation(m.value)}
                      className={cn(
                        "w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-colors",
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
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* STICKY SAVE BUTTON */}
      <div className="sticky bottom-0 pt-4 mt-4 bg-gradient-to-t from-background via-background to-transparent">
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
    </div>
  );
};

export default SleepLogger;
