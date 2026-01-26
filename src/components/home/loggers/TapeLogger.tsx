/**
 * TapeLogger - Body measurements tracking
 * Beginner: Bauchumfang (most important health marker)
 * Expert: Full body measurements accordion
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Check, ChevronDown, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TapeLoggerProps {
  onClose: () => void;
}

interface BodyMeasurements {
  belly: number | null;
  waist: number | null;
  neck: number | null;
  chest: number | null;
  hips: number | null;
  arms: number | null;
  thigh: number | null;
}

const MEASUREMENT_INFO: Record<string, string> = {
  belly: 'Auf Bauchnabelhöhe, entspannt',
  waist: 'Schmalste Stelle zwischen Rippen und Hüfte',
  neck: 'Unterhalb des Kehlkopfes',
  chest: 'Auf Höhe der Brustwarzen, ausgeatmet',
  hips: 'Breiteste Stelle der Hüfte',
  arms: 'Mitte Oberarm, angespannt',
  thigh: 'Mitte Oberschenkel, entspannt',
};

const MEASUREMENT_LABELS: Record<string, string> = {
  neck: 'Hals',
  chest: 'Brust',
  waist: 'Taille',
  belly: 'Bauchumfang',
  hips: 'Hüfte',
  arms: 'Arme (Bizeps)',
  thigh: 'Oberschenkel',
};

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export const TapeLogger: React.FC<TapeLoggerProps> = ({ onClose }) => {
  const [belly, setBelly] = useState(90);
  const [lastBelly, setLastBelly] = useState<number | null>(null);
  const [fullBodyOpen, setFullBodyOpen] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Additional measurements (expert)
  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    belly: null,
    waist: null,
    neck: null,
    chest: null,
    hips: null,
    arms: null,
    thigh: null,
  });

  // Fetch last measurements on mount
  useEffect(() => {
    const fetchLastMeasurements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          if (data.belly) {
            setBelly(data.belly);
            setLastBelly(data.belly);
          }
          setMeasurements({
            belly: data.belly,
            waist: data.waist,
            neck: data.neck,
            chest: data.chest,
            hips: data.hips,
            arms: data.arms,
            thigh: data.thigh,
          });
        }
      } catch (err) {
        console.error('Error fetching measurements:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastMeasurements();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().slice(0, 10);

      const { error } = await supabase.from('body_measurements').upsert({
        user_id: user.id,
        date: today,
        belly: belly,
        waist: measurements.waist,
        neck: measurements.neck,
        chest: measurements.chest,
        hips: measurements.hips,
        arms: measurements.arms,
        thigh: measurements.thigh,
      }, { onConflict: 'user_id,date' });

      if (error) throw error;

      toast.success('Maße gespeichert');
      onClose();
    } catch (err) {
      console.error('Error saving measurements:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const adjustBelly = (delta: number) => {
    setBelly(v => Number((v + delta).toFixed(1)));
  };

  const updateMeasurement = (key: keyof BodyMeasurements, value: string) => {
    const numValue = value ? parseFloat(value.replace(',', '.')) : null;
    setMeasurements(prev => ({ ...prev, [key]: numValue }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BIG DISPLAY - Bauchumfang */}
      <div className="flex flex-col items-center py-6">
        <p className="text-sm text-muted-foreground mb-2">🎯 Bauchumfang</p>
        <div className="flex items-baseline gap-2">
          <motion.span
            key={belly}
            initial={{ scale: 0.95, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-bold tabular-nums text-foreground"
          >
            {belly.toFixed(1)}
          </motion.span>
          <span className="text-2xl font-medium text-muted-foreground">cm</span>
        </div>
      </div>

      {/* STEPPER CONTROLS */}
      <div className="flex items-center justify-center gap-6">
        <StepperButton
          icon={Minus}
          onClick={() => adjustBelly(-0.5)}
          label="-0.5"
        />
        <div className="w-px h-8 bg-border" />
        <StepperButton
          icon={Plus}
          onClick={() => adjustBelly(0.5)}
          label="+0.5"
        />
      </div>

      {/* LAST ENTRY REFERENCE */}
      {lastBelly && (
        <div className="flex justify-center">
          <div className="px-4 py-2 rounded-xl bg-muted/50 text-sm text-muted-foreground">
            Letzter Eintrag: {lastBelly.toFixed(1)} cm
          </div>
        </div>
      )}

      {/* INFO HINT */}
      <button
        onClick={() => setInfoKey(infoKey === 'belly' ? null : 'belly')}
        className="flex items-center gap-2 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3 h-3" />
        <span>Wo messe ich?</span>
      </button>
      {infoKey === 'belly' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-muted-foreground px-4"
        >
          {MEASUREMENT_INFO.belly}
        </motion.div>
      )}

      {/* FULL BODY ACCORDION (Expert) */}
      <Collapsible open={fullBodyOpen} onOpenChange={setFullBodyOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
          <span>Ganzkörper-Maße</span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            fullBodyOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {(['neck', 'chest', 'waist', 'hips', 'arms', 'thigh'] as const).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground w-28">
                    {MEASUREMENT_LABELS[key]}
                  </label>
                  <button
                    onClick={() => setInfoKey(infoKey === key ? null : key)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                {infoKey === key && (
                  <p className="text-xs text-muted-foreground mt-1 ml-1">
                    {MEASUREMENT_INFO[key]}
                  </p>
                )}
              </div>
              <div className="relative w-24">
                <NumericInput
                  placeholder="--"
                  value={measurements[key]?.toString() || ''}
                  onChange={(v) => updateMeasurement(key, v)}
                  min={0}
                  max={200}
                  className="pr-8 text-right"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  cm
                </span>
              </div>
            </div>
          ))}
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

export default TapeLogger;
