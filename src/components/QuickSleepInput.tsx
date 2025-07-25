import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Plus, Edit, CheckCircle, ChevronDown, Clock, Smartphone, Heart, Zap, Utensils } from "lucide-react";
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
  // Zeit-Schieberegler: Bedtime (22:00) bis Wake time (10:00)
  const [bedtime, setBedtime] = useState<number[]>([22.5]); // 22:30 in Stunden
  const [wakeTime, setWakeTime] = useState<number[]>([7.5]); // 07:30 in Stunden
  const [sleepQuality, setSleepQuality] = useState<number[]>([7]);
  
  // Neue optionale Felder
  const [sleepInterruptions, setSleepInterruptions] = useState<number[]>([0]);
  const [screenTimeEvening, setScreenTimeEvening] = useState<number[]>([60]);
  const [morningLibido, setMorningLibido] = useState<number[]>([5]);
  const [motivationLevel, setMotivationLevel] = useState<number[]>([7]);
  const [lastMealTime, setLastMealTime] = useState<number[]>([19.5]); // 19:30
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Berechne Schlafdauer basierend auf Einschlaf- und Aufwachzeit
  const calculateSleepDuration = (bedtimeHours: number, waketimeHours: number) => {
    let duration = waketimeHours - bedtimeHours;
    if (duration < 0) duration += 24; // Übernacht-Berechnung
    return Math.round(duration * 2) / 2; // Auf halbe Stunden runden
  };

  const sleepDuration = calculateSleepDuration(bedtime[0], wakeTime[0]);

  // Hilfsfunktionen für Zeit-Formatierung
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Check if sleep already exists for today
  const hasSleepToday = todaysSleep && (todaysSleep.sleep_hours !== null || todaysSleep.bedtime !== null);

  useEffect(() => {
    if (hasSleepToday && !isEditing) {
      // Pre-fill form with existing data
      if (todaysSleep.bedtime) setBedtime([parseFloat(todaysSleep.bedtime.split(':')[0]) + parseFloat(todaysSleep.bedtime.split(':')[1]) / 60]);
      if (todaysSleep.wake_time) setWakeTime([parseFloat(todaysSleep.wake_time.split(':')[0]) + parseFloat(todaysSleep.wake_time.split(':')[1]) / 60]);
      setSleepQuality([todaysSleep.sleep_quality || 7]);
      setSleepInterruptions([todaysSleep.sleep_interruptions || 0]);
      setScreenTimeEvening([todaysSleep.screen_time_evening || 60]);
      setMorningLibido([todaysSleep.morning_libido || 5]);
      setMotivationLevel([todaysSleep.motivation_level || 7]);
      if (todaysSleep.last_meal_time) setLastMealTime([parseFloat(todaysSleep.last_meal_time.split(':')[0]) + parseFloat(todaysSleep.last_meal_time.split(':')[1]) / 60]);
    }
  }, [hasSleepToday, todaysSleep, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Sleep submission started

      const sleepData = {
        user_id: user.id,
        sleep_hours: sleepDuration,
        sleep_quality: sleepQuality[0],
        bedtime: formatTime(bedtime[0]),
        wake_time: formatTime(wakeTime[0]),
        sleep_interruptions: sleepInterruptions[0],
        screen_time_evening: screenTimeEvening[0],
        morning_libido: morningLibido[0],
        motivation_level: motivationLevel[0],
        last_meal_time: formatTime(lastMealTime[0]),
        date: new Date().toISOString().split('T')[0]
      };

      // Sleep data prepared for save

      if (hasSleepToday && todaysSleep?.id) {
        // Update existing sleep entry - no points awarded
        // Updating existing sleep entry
        const { error, data } = await supabase
          .from('sleep_tracking')
          .update({
            sleep_hours: sleepData.sleep_hours,
            sleep_quality: sleepData.sleep_quality,
            bedtime: sleepData.bedtime,
            wake_time: sleepData.wake_time,
            sleep_interruptions: sleepData.sleep_interruptions,
            screen_time_evening: sleepData.screen_time_evening,
            morning_libido: sleepData.morning_libido,
            motivation_level: sleepData.motivation_level,
            last_meal_time: sleepData.last_meal_time,
            updated_at: new Date().toISOString()
          })
          .eq('id', todaysSleep.id);

        // Sleep update completed
        if (error) throw error;
        toast.success('Schlaf aktualisiert!');
      } else {
        // Create new sleep entry using UPSERT with correct constraint reference
        // Creating new sleep entry
        const { error, data } = await supabase
          .from('sleep_tracking')
          .upsert(sleepData, { 
            onConflict: 'user_id, date'  // Fixed: proper column reference
          });

        // Sleep insert completed
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
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">Schlaf eingetragen! 😴</h3>
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
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Points badges directly under title */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PointsBadge 
              points={4} 
              icon="😴"
              animated={showPointsAnimation}
              variant="secondary"
            />
          </div>
          
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-3">
            {todaysSleep.bedtime && todaysSleep.wake_time 
              ? `${todaysSleep.bedtime} - ${todaysSleep.wake_time}` 
              : `${todaysSleep.sleep_hours || 0} Stunden`
            } • 
            Qualität: {todaysSleep.sleep_quality || 0}/10
            {todaysSleep.sleep_interruptions > 0 && ` • ${todaysSleep.sleep_interruptions}x unterbrochen`}
          </p>
          
          {/* Erweiterte Infos wenn verfügbar */}
          {(todaysSleep.screen_time_evening || todaysSleep.morning_libido || todaysSleep.motivation_level) && (
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-3 space-y-1">
              {todaysSleep.screen_time_evening > 0 && (
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Handyzeit: {todaysSleep.screen_time_evening} min
                </div>
              )}
              {todaysSleep.morning_libido && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Libido: {todaysSleep.morning_libido}/10
                </div>
              )}
              {todaysSleep.motivation_level && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Motivation: {todaysSleep.motivation_level}/10
                </div>
              )}
              {todaysSleep.last_meal_time && (
                <div className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  Letzte Mahlzeit: {todaysSleep.last_meal_time}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-3">
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
              <strong>Tipp:</strong> Guter Schlaf = bessere Fettverbrennung!
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              • Während des Schlafs produziert dein Körper Wachstumshormone
              • Schlechter Schlaf erhöht Cortisol und Heißhunger
              • 7-9 Stunden sind optimal für die Regeneration
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
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
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <Moon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200">
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
              {/* Haupt-Slider: Einschlaf- und Aufwachzeit */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-purple-700 dark:text-purple-300 block">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Schlafzeiten: {formatTime(bedtime[0])} bis {formatTime(wakeTime[0])} ({sleepDuration}h)
                </label>
                
                {/* Bedtime Slider */}
                <div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                    Einschlafzeit: {formatTime(bedtime[0])}
                  </div>
                  <Slider
                    value={bedtime}
                    onValueChange={setBedtime}
                    max={26} // Bis 02:00 (26 = 2:00 am next day)
                    min={20} // Ab 20:00
                    step={0.5}
                    className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                  />
                </div>

                {/* Wake time Slider */}
                <div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                    Aufwachzeit: {formatTime(wakeTime[0])}
                  </div>
                  <Slider
                    value={wakeTime}
                    onValueChange={setWakeTime}
                    max={12} // Bis 12:00
                    min={5}  // Ab 05:00
                    step={0.5}
                    className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                  Schlafqualität: {sleepQuality[0]}/10
                </label>
                <Slider
                  value={sleepQuality}
                  onValueChange={setSleepQuality}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                />
              </div>

              {/* Aufklappbare weitere Details */}
              <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Weitere Details (optional)
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showOptionalFields ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 mt-3">
                  {/* Schlafunterbrechungen */}
                  <div>
                    <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                      <Moon className="inline h-4 w-4 mr-1" />
                      Schlafunterbrechungen: {sleepInterruptions[0]}x
                    </label>
                    <Slider
                      value={sleepInterruptions}
                      onValueChange={setSleepInterruptions}
                      max={10}
                      min={0}
                      step={1}
                      className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                    />
                  </div>

                  {/* Abendliche Handyzeit */}
                  <div>
                    <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                      <Smartphone className="inline h-4 w-4 mr-1" />
                      Abendliche Handyzeit: {screenTimeEvening[0]} min
                    </label>
                    <Slider
                      value={screenTimeEvening}
                      onValueChange={setScreenTimeEvening}
                      max={300}
                      min={0}
                      step={15}
                      className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                    />
                  </div>

                  {/* Letzte Mahlzeit */}
                  <div>
                    <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                      <Utensils className="inline h-4 w-4 mr-1" />
                      Letzte Mahlzeit: {formatTime(lastMealTime[0])}
                    </label>
                    <Slider
                      value={lastMealTime}
                      onValueChange={setLastMealTime}
                      max={23.5} // 23:30
                      min={16}   // 16:00
                      step={0.5}
                      className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                    />
                  </div>

                  {/* Libido am Morgen */}
                  <div>
                    <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                      <Heart className="inline h-4 w-4 mr-1" />
                      Libido am Morgen: {morningLibido[0]}/10
                    </label>
                    <Slider
                      value={morningLibido}
                      onValueChange={setMorningLibido}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                    />
                  </div>

                  {/* Motivations-Level */}
                  <div>
                    <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 block">
                      <Zap className="inline h-4 w-4 mr-1" />
                      Motivations-Level: {motivationLevel[0]}/10
                    </label>
                    <Slider
                      value={motivationLevel}
                      onValueChange={setMotivationLevel}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full [&>*]:bg-muted [&_[role=slider]]:border-purple-600 [&_[role=slider]]:bg-background [&>span>span]:bg-purple-600"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
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
                    className="border-purple-300 text-purple-600"
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