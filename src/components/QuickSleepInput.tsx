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
import { PremiumGate } from "@/components/PremiumGate";
import { PointsBadge } from "@/components/PointsBadge";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";

interface QuickSleepInputProps {
  onSleepAdded?: () => void;
  todaysSleep?: any;
}

export const QuickSleepInput = ({ onSleepAdded, todaysSleep }: QuickSleepInputProps) => {
  const [sleepHours, setSleepHours] = useState<number[]>([7.5]);
  const [sleepQuality, setSleepQuality] = useState<number[]>([7]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
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
      console.log('🔍 Sleep submission started', { 
        user: user.id, 
        sleepHours: sleepHours[0], 
        sleepQuality: sleepQuality[0],
        hasSleepToday,
        todaysSleepId: todaysSleep?.id
      });

      const sleepData = {
        user_id: user.id,
        sleep_hours: sleepHours[0],
        sleep_quality: sleepQuality[0],
        date: new Date().toISOString().split('T')[0]
      };

      console.log('💾 Sleep data to save:', sleepData);

      if (hasSleepToday && todaysSleep?.id) {
        // Update existing sleep entry - no points awarded
        console.log('🔄 Updating existing sleep entry with ID:', todaysSleep.id);
        const { error, data } = await supabase
          .from('sleep_tracking')
          .update({
            sleep_hours: sleepData.sleep_hours,
            sleep_quality: sleepData.sleep_quality,
            updated_at: new Date().toISOString()
          })
          .eq('id', todaysSleep.id);

        console.log('✅ Update result:', { data, error });
        if (error) throw error;
        toast.success('Schlaf aktualisiert!');
      } else {
        // Create new sleep entry using UPSERT with correct constraint reference
        console.log('➕ Creating new sleep entry');
        const { error, data } = await supabase
          .from('sleep_tracking')
          .upsert(sleepData, { 
            onConflict: 'user_id, date'  // Fixed: proper column reference
          });

        console.log('✅ Insert result:', { data, error });
        if (error) throw error;

        // Award points for sleep tracking
        await awardPoints('sleep_tracked', getPointsForActivity('sleep_tracked'), 'Schlaf eingetragen');
        await updateStreak('sleep_tracking');

        // Show points animation
        setShowPointsAnimation(true);
        setTimeout(() => setShowPointsAnimation(false), 3000);

        toast.success('Schlaf erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onSleepAdded?.();
    } catch (error) {
      console.error('❌ Error saving sleep:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error('Fehler beim Speichern der Schlafdaten: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = !!hasSleepToday;

  return (
    <CollapsibleQuickInput
      title={hasSleepToday && !isEditing ? "Schlaf erfasst! 😴" : "Schlaf & Regeneration"}
      icon={<Moon className="h-4 w-4 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={false}
      theme="purple"
    >
      {hasSleepToday && !isEditing ? (
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
          
          {/* Points badges in separate row for better responsive layout */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PointsBadge 
              points={4} 
              icon="😴"
              animated={showPointsAnimation}
              variant="secondary"
            />
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
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              <strong>Nächste Eintragung:</strong> Morgen 📅
            </p>
          </div>
        </div>
      ) : (
        <PremiumGate 
          feature="sleep_tracking"
          hideable={true}
          fallbackMessage="Schlaf-Tracking ist ein Premium Feature. Upgrade für detailliertes Schlaf-Monitoring!"
        >
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
        </PremiumGate>
      )}
    </CollapsibleQuickInput>
  );
};