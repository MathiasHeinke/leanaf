import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Ruler, Plus, Edit, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PointsBadge } from "@/components/PointsBadge";
import { PremiumGate } from "@/components/PremiumGate";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";
import { CoachFeedbackCard } from "./CoachFeedbackCard";

interface BodyMeasurementsProps {
  onMeasurementsAdded?: () => void;
  todaysMeasurements?: any;
}

export const BodyMeasurements = ({ onMeasurementsAdded, todaysMeasurements }: BodyMeasurementsProps) => {
  const [measurements, setMeasurements] = useState({
    neck: "",
    chest: "",
    waist: "",
    belly: "",
    hips: "",
    arms: "",
    thigh: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, getPointsForActivity } = usePointsSystem();

  // Check if measurements already exist for this week - simplified logic
  const hasMeasurementsThisWeek = todaysMeasurements && todaysMeasurements.id;

  // Calculate next measurement date - special case for 28.07.2025, then back to 7 days
  const nextMeasurementDate = todaysMeasurements?.date ? 
    (() => {
      const lastMeasureDate = new Date(todaysMeasurements.date);
      const today = new Date();
      // Special case: if last measurement was on 24.07.2025, next should be 28.07.2025 (4 days)
      if (lastMeasureDate.toISOString().split('T')[0] === '2025-07-24') {
        return new Date(lastMeasureDate.getTime() + 4 * 24 * 60 * 60 * 1000);
      }
      // Otherwise normal 7-day rhythm
      return new Date(lastMeasureDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    })() : 
    new Date();

  useEffect(() => {
    // Only load measurements when data actually changes, not on every keystroke
    if (todaysMeasurements && !isEditing) {
      // Pre-fill form with existing data
      setMeasurements({
        neck: todaysMeasurements.neck?.toString() || "",
        chest: todaysMeasurements.chest?.toString() || "",
        waist: todaysMeasurements.waist?.toString() || "",
        belly: todaysMeasurements.belly?.toString() || "",
        hips: todaysMeasurements.hips?.toString() || "",
        arms: todaysMeasurements.arms?.toString() || "",
        thigh: todaysMeasurements.thigh?.toString() || "",
        notes: todaysMeasurements.notes || ""
      });
    }
  }, [todaysMeasurements?.id, isEditing]); // Only depend on measurement ID, not the whole object

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Starting form submission
    if (!user) return;

    // Check if at least one measurement is provided
    const hasAnyMeasurement = Object.entries(measurements).some(([key, value]) => 
      key !== 'notes' && value && String(value).trim() !== ''
    );

    if (!hasAnyMeasurement) {
      toast.error('Bitte mindestens einen Messwert eingeben');
      return;
    }

    setIsSubmitting(true);
    try {
      const measurementData = {
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        neck: measurements.neck ? parseLocaleFloat(measurements.neck) : null,
        chest: measurements.chest ? parseLocaleFloat(measurements.chest) : null,
        waist: measurements.waist ? parseLocaleFloat(measurements.waist) : null,
        belly: measurements.belly ? parseLocaleFloat(measurements.belly) : null,
        hips: measurements.hips ? parseLocaleFloat(measurements.hips) : null,
        arms: measurements.arms ? parseLocaleFloat(measurements.arms) : null,
        thigh: measurements.thigh ? parseLocaleFloat(measurements.thigh) : null,
        notes: measurements.notes || null
      };

      if (hasMeasurementsThisWeek) {
        // Update existing measurements - no points awarded
        // Updating existing measurements
        const { error } = await supabase
          .from('body_measurements')
          .update(measurementData)
          .eq('id', todaysMeasurements.id);

        if (error) throw error;
        // Update successful
        toast.success('Körpermaße aktualisiert!');
      } else {
        // Create new measurements using UPSERT to prevent duplicates
        // Creating new measurements
        const { error } = await supabase
          .from('body_measurements')
          .upsert(measurementData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          });

        if (error) throw error;
        // Creation successful

        // Award points for body measurements
        await awardPoints('body_measurements', getPointsForActivity('body_measurements'), 'Körpermaße gemessen');

        toast.success('Körpermaße erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onMeasurementsAdded?.();
      // Measurements saved successfully, editing mode closed
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Fehler beim Speichern der Körpermaße');
    } finally {
      setIsSubmitting(false);
      // Form submission completed
    }
  };

  const isCompleted = !!hasMeasurementsThisWeek;

  return (
    <CollapsibleQuickInput
      title={hasMeasurementsThisWeek && !isEditing ? "Maße erfasst! 📏" : "Körpermaße"}
      icon={<Ruler className="h-4 w-4 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={false}
      theme="sky"
    >
      {hasMeasurementsThisWeek && !isEditing ? (
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20 p-4 rounded-2xl border border-sky-200 dark:border-sky-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900 rounded-xl">
              <CheckCircle className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sky-800 dark:text-sky-200">Maße erfasst! 📏</h3>
            </div>
            <div className="flex items-center gap-2">
              <InfoButton
                title="Körpermaße"
                description="Regelmäßige Körpermaße-Messungen helfen dir, Fortschritte zu verfolgen, die die Waage nicht anzeigt. Besonders beim Muskelaufbau!"
                scientificBasis="Studien zeigen: Körperumfänge sind oft bessere Indikatoren für Körperzusammensetzung als nur das Körpergewicht."
                tips={[
                  "Miss zur gleichen Tageszeit für beste Vergleichbarkeit!",
                  "Morgens vor dem Essen für konsistente Werte",
                  "Maßband parallel zum Boden halten",
                  "Nicht zu fest anziehen, aber auch nicht zu locker",
                  "Wöchentliche Messungen reichen meist aus"
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-sky-600 border-sky-300 hover:bg-sky-50"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMeasurements({
                    neck: "",
                    chest: "",
                    waist: "",
                    belly: "",
                    hips: "",
                    arms: "",
                    thigh: "",
                    notes: ""
                  });
                  setIsEditing(true);
                  toast.success("Feld für neue Messung freigebeben! 📏");
                }}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Points badges directly under title */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PointsBadge 
              points={5} 
              icon="📏"
              animated={false}
              variant="secondary"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-sky-600 dark:text-sky-400 mb-3">
            {todaysMeasurements?.neck && (
              <div><strong>Hals:</strong> {todaysMeasurements.neck}cm</div>
            )}
            {todaysMeasurements?.chest && (
              <div><strong>Brust:</strong> {todaysMeasurements.chest}cm</div>
            )}
            {todaysMeasurements?.waist && (
              <div><strong>Taille:</strong> {todaysMeasurements.waist}cm</div>
            )}
            {todaysMeasurements?.belly && (
              <div><strong>Bauch:</strong> {todaysMeasurements.belly}cm</div>
            )}
            {todaysMeasurements?.hips && (
              <div><strong>Hüfte:</strong> {todaysMeasurements.hips}cm</div>
            )}
            {todaysMeasurements?.arms && (
              <div><strong>Arme:</strong> {todaysMeasurements.arms}cm</div>
            )}
            {todaysMeasurements?.thigh && (
              <div><strong>Oberschenkel:</strong> {todaysMeasurements.thigh}cm</div>
            )}
          </div>
          
          {/* Coach Feedback First */}
          <div className="mb-3">
            <CoachFeedbackCard 
              coachName="Lucy"
              coachAvatar="/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png"
              measurementData={todaysMeasurements}
              userId={user?.id}
              type="measurement"
            />
          </div>
          
          {/* Tips in matching sky theme */}
          <div className="bg-sky-100/50 dark:bg-sky-900/30 rounded-lg p-3 border border-sky-200 dark:border-sky-700">
            <p className="text-xs text-sky-700 dark:text-sky-300 mb-2">
              <strong>Tipp:</strong> Miss zur gleichen Zeit für beste Vergleichbarkeit!
            </p>
            <p className="text-xs text-sky-600 dark:text-sky-400">
              • Morgens vor dem Essen für konsistente Werte
              • Maßband parallel zum Boden halten
              • Immer an derselben Körperstelle messen
              • Wöchentlich messen für langfristige Trends
            </p>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-2">
              <strong>Nächste Messung:</strong> Nächste Woche 📏
            </p>
          </div>
        </div>
      ) : (
        <PremiumGate 
          feature="body_measurements"
          hideable={true}
          fallbackMessage="Körpermaße-Tracking ist ein Premium Feature. Upgrade für detaillierte Körpermaß-Aufzeichnung!"
        >
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20 p-4 rounded-2xl border border-sky-200 dark:border-sky-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-900 rounded-xl">
                <Ruler className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sky-800 dark:text-sky-200">
                  {hasMeasurementsThisWeek ? 'Maße bearbeiten' : 'Körpermaße erfassen'}
                </h3>
              </div>
              <InfoButton
                title="Körpermaß-Tracking"
                description="Körpermaße geben dir einen detaillierten Einblick in deine körperlichen Veränderungen, auch wenn sich das Gewicht nicht verändert."
                scientificBasis="Körpermaße sind oft aussagekräftiger als das Gewicht, da sie Muskelaufbau und Fettabbau separat erfassen können."
                tips={[
                  "Miss immer zur gleichen Tageszeit",
                  "Halte das Maßband parallel zum Boden",
                  "Nicht zu fest anziehen, aber auch nicht zu locker",
                  "Wöchentliche Messungen reichen meist aus"
                ]}
              />
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-sky-700 dark:text-sky-300">Hals (cm)</label>
                  <NumericInput
                    placeholder="32.0"
                    value={measurements.neck}
                    onChange={(value) => handleInputChange('neck', value)}
                    allowDecimals={true}
                    min={0}
                    max={100}
                    className="bg-white dark:bg-sky-950/50 border-sky-200 dark:border-sky-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Brust (cm)</label>
                  <NumericInput
                    placeholder="95.0"
                    value={measurements.chest}
                    onChange={(value) => handleInputChange('chest', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-teal-950/50 border-teal-200 dark:border-teal-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Taille (cm)</label>
                  <NumericInput
                    placeholder="85.0"
                    value={measurements.waist}
                    onChange={(value) => handleInputChange('waist', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-teal-950/50 border-teal-200 dark:border-teal-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Bauch (cm)</label>
                  <NumericInput
                    placeholder="90.0"
                    value={measurements.belly}
                    onChange={(value) => handleInputChange('belly', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-teal-950/50 border-teal-200 dark:border-teal-700"
                  />
                </div>
              
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Hüfte (cm)</label>
                  <NumericInput
                    placeholder="95.0"
                    value={measurements.hips}
                    onChange={(value) => handleInputChange('hips', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-teal-950/50 border-teal-200 dark:border-teal-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Arme (cm)</label>
                  <NumericInput
                    placeholder="35.0"
                    value={measurements.arms}
                    onChange={(value) => handleInputChange('arms', value)}
                    allowDecimals={true}
                    min={0}
                    max={100}
                    className="bg-white dark:bg-teal-950/50 border-teal-200 dark:border-teal-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Oberschenkel (cm)</label>
                  <NumericInput
                    placeholder="60.0"
                    value={measurements.thigh}
                    onChange={(value) => handleInputChange('thigh', value)}
                    allowDecimals={true}
                    min={0}
                    max={150}
                    className="bg-white dark:bg-teal-950/50 border-teal-200 dark:border-teal-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-700 dark:text-teal-300">Notizen</label>
                <textarea
                  value={measurements.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Zusätzliche Notizen..."
                  className="w-full p-2 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-teal-950/50 text-teal-900 dark:text-teal-100 placeholder-teal-400 dark:placeholder-teal-500 resize-none h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? 'Speichere...' : (hasMeasurementsThisWeek ? 'Aktualisieren' : 'Maße hinzufügen')}
                </Button>
                
                {isEditing && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="border-teal-300 text-teal-600"
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