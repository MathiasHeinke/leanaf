/**
 * WeightLogger - Premium weight input with stepper controls
 * Large display, +/- 0.1kg buttons, last entry reference
 * Extended: Body fat %, Muscle mass %, Notes via Collapsible
 * 
 * UI Polish: Morphing hero, exclusive accordions, sticky save
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

const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };

const CONTEXT_TAG_OPTIONS = [
  { id: 'fasted', label: 'Nüchtern' },
  { id: 'post_workout', label: 'Nach Training' },
  { id: 'post_cheat', label: 'Nach Cheat-Meal' },
  { id: 'creatine', label: 'Kreatin geladen' },
  { id: 'salty', label: 'Salzig gegessen' },
  { id: 'dehydrated', label: 'Dehydriert' },
];

// Accordion section types
type OpenSection = 'details' | 'tags' | null;

// Animation variants for morphing hero
const heroContainerVariants = {
  normal: { marginTop: 24, marginBottom: 24 },
  compact: { marginTop: 8, marginBottom: 8 }
};

const numberVariants = {
  normal: { scale: 1 },
  compact: { scale: 0.75 }
};

const stepperVariants = {
  normal: { scale: 1 },
  compact: { scale: 0.85 }
};

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
  const [contextTags, setContextTags] = useState<string[]>([]);
  
  // Exclusive accordion state
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const isExpanded = openSection !== null;

  const toggleSection = (section: OpenSection) => {
    setOpenSection(current => current === section ? null : section);
  };

  const toggleTag = (tagId: string) => {
    setContextTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Combine context tags with notes
    const tagString = contextTags.length > 0 
      ? `[${contextTags.map(t => CONTEXT_TAG_OPTIONS.find(o => o.id === t)?.label).join(', ')}]`
      : '';
    const finalNotes = tagString 
      ? `${tagString}${notes ? ' ' + notes : ''}`
      : notes || undefined;

    const success = await trackEvent('weight', { 
      weight_kg: weight,
      body_fat_percentage: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : undefined,
      muscle_percentage: muscleMass ? parseFloat(muscleMass.replace(',', '.')) : undefined,
      notes: finalNotes
    });
    if (success) {
      // Dispatch completion event for ActionCardStack
      window.dispatchEvent(new CustomEvent('ares-card-completed', { 
        detail: { cardType: 'weight' }
      }));
      onClose();
    }
    setIsSaving(false);
  };

  const adjustWeight = (delta: number) => {
    setWeight(w => Number((w + delta).toFixed(1)));
  };

  return (
    <div className="flex flex-col min-h-[300px]">
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* MORPHING HERO */}
        <motion.div
          variants={heroContainerVariants}
          animate={isExpanded ? 'compact' : 'normal'}
          transition={springConfig}
          className="flex flex-col items-center"
        >
          {/* BIG DISPLAY */}
          <motion.div
            variants={numberVariants}
            animate={isExpanded ? 'compact' : 'normal'}
            transition={springConfig}
            className="flex items-baseline gap-2"
          >
            <motion.span
              key={weight}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold tabular-nums text-foreground"
            >
              {weight.toFixed(1)}
            </motion.span>
            <span className="text-2xl font-medium text-muted-foreground">kg</span>
          </motion.div>

          {/* STEPPER CONTROLS */}
          <motion.div
            variants={stepperVariants}
            animate={isExpanded ? 'compact' : 'normal'}
            transition={springConfig}
            className="flex items-center justify-center gap-6 mt-4"
          >
            <StepperButton 
              icon={Minus} 
              onClick={() => adjustWeight(-0.1)} 
              label="-0.1"
              compact={isExpanded}
            />
            <div className="w-px h-8 bg-border" />
            <StepperButton 
              icon={Plus} 
              onClick={() => adjustWeight(0.1)} 
              label="+0.1"
              compact={isExpanded}
            />
          </motion.div>
        </motion.div>

        {/* LAST ENTRY REFERENCE */}
        {metrics?.weight?.date && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              Letzter Eintrag: {metrics.weight.latest?.toFixed(1)} kg
            </div>
          </div>
        )}

        {/* BODY COMPOSITION ACCORDION */}
        <Collapsible open={openSection === 'details'} onOpenChange={() => toggleSection('details')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
            <span>Körperkomposition</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              openSection === 'details' && "rotate-180"
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
                  max={85}
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

        {/* CONTEXT TAGS ACCORDION */}
        <Collapsible open={openSection === 'tags'} onOpenChange={() => toggleSection('tags')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
            <span>Kontext-Tags</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              openSection === 'tags' && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="flex flex-wrap gap-2">
              {CONTEXT_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    contextTags.includes(tag.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Hilft ARES, Gewichtsschwankungen zu verstehen
            </p>
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
              Speichern
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

interface StepperButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  label: string;
  compact?: boolean;
}

const StepperButton: React.FC<StepperButtonProps> = ({ icon: Icon, onClick, label, compact }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    whileHover={{ scale: 1.05 }}
    transition={springConfig}
    onClick={onClick}
    className="flex flex-col items-center gap-1"
  >
    <div className={cn(
      "rounded-2xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-all",
      compact ? "w-12 h-12" : "w-14 h-14"
    )}>
      <Icon className={cn("text-foreground", compact ? "w-5 h-5" : "w-6 h-6")} />
    </div>
    <span className="text-xs text-muted-foreground">{label}</span>
  </motion.button>
);

export default WeightLogger;
