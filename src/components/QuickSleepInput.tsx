
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Moon, Plus, Edit, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";

interface QuickSleepInputProps {
  onSleepAdded?: () => void;
  todaysSleep?: any;
}

export const QuickSleepInput = ({ onSleepAdded, todaysSleep }: QuickSleepInputProps) => {
  const [sleepHours, setSleepHours] = useState<number[]>([7.5]);
  const [sleepQuality, setSleepQuality] = useState<number[]>([7]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if sleep already exists for today
  const hasSleepToday = todaysSleep && todaysSleep.sleep_hours !== null;

  useEffect(() => {
    if (hasSleepToday && !isEditing) {
      // Pre-fill form with existing data
      setSleepHours([todaysSleep.sleep_hours || 7.5]);
      setSleepQuality([todaysSleep.sleep_quality || 7]);
    }
  }, [hasSleepToday, todaysSleep, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const sleepData = {
        user_id: user.id,
        sleep_hours: sleepHours[0],
        sleep_quality: sleepQuality[0],
        date: new Date().toISOString().split('T')[0]
      };

      if (hasSleepToday) {
        // Update existing sleep entry - no points awarded
        const { error } = await supabase
          .from('sleep_tracking')
          .update(sleepData)
          .eq('id', todaysSleep.id);

        if (error) throw error;
        toast.success('Schlaf aktualisiert!');
      } else {
        // Create new sleep entry using UPSERT to prevent duplicates
        const { error } = await supabase
          .from('sleep_tracking')
          .upsert(sleepData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          });

        if (error) throw error;

        // Award points for sleep tracking
        await awardPoints('sleep_tracked', getPointsForActivity('sleep_tracked'), 'Schlaf eingetragen');
        await updateStreak('sleep_tracking');

        toast.success('Schlaf erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onSleepAdded?.();
    } catch (error) {
      console.error('Error saving sleep:', error);
      toast.error('Fehler beim Speichern der Schlafdaten');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show read-only summary if sleep exists and not editing
  if (hasSleepToday && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Schlaf eingetragen! 😴</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {todaysSleep.sleep_hours || 0} Stunden • 
              Qualität: {todaysSleep.sleep_quality || 0}/10
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton
              title="Schlaf Tracking"
              description="Qualitätsvollser Schlaf ist essentiell für Regeneration, Hormonbalance und erfolgreiche Gewichtsabnahme. 7-9 Stunden sind optimal."
              scientificBasis="Studien belegen: Weniger als 6 Stunden Schlaf erhöhen das Risiko für Gewichtszunahme um 30% und verschlechtern die Insulinresistenz."
              tips={[
                "7-9 Stunden Schlaf für optimale Regeneration",
                "Feste Schlafzeiten unterstützen den Biorhythmus",
                "Bildschirme 1h vor dem Schlafen vermeiden"
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-100/50 dark:bg-blue-900/30 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
            <strong>Tipp:</strong> Guter Schlaf = bessere Fettverbrennung!
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            • Während des Schlafs produziert dein Körper Wachstumshormone
            • Schlechter Schlaf erhöht Cortisol und Heißhunger
            • 7-9 Stunden sind optimal für die Regeneration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
          <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200">
            {hasSleepToday ? 'Schlaf bearbeiten' : 'Schlaf eintragen'}
          </h3>
        </div>
        <InfoButton
          title="Schlaf Tracking"
          description="Qualitätsvollser Schlaf ist essentiell für Regeneration, Hormonbalance und erfolgreiche Gewichtsabnahme. 7-9 Stunden sind optimal."
          scientificBasis="Studien belegen: Weniger als 6 Stunden Schlaf erhöhen das Risiko für Gewichtszunahme um 30% und verschlechtern die Insulinresistenz."
          tips={[
            "7-9 Stunden Schlaf für optimale Regeneration",
            "Feste Schlafzeiten unterstützen den Biorhythmus",
            "Bildschirme 1h vor dem Schlafen vermeiden"
          ]}
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">
            Schlafdauer: {sleepHours[0]} Stunden
          </label>
          <Slider
            value={sleepHours}
            onValueChange={setSleepHours}
            max={12}
            min={3}
            step={0.5}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">
            Schlafqualität: {sleepQuality[0]}/10
          </label>
          <Slider
            value={sleepQuality}
            onValueChange={setSleepQuality}
            max={10}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Speichern...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {hasSleepToday ? 'Aktualisieren' : 'Eintragen'}
              </div>
            )}
          </Button>
          
          {hasSleepToday && isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-blue-300 text-blue-600"
            >
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
