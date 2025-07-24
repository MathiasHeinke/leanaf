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
import { PremiumGate } from "@/components/PremiumGate";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";

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

  // Check if measurements already exist for this week
  const hasMeasurementsThisWeek = todaysMeasurements && Object.keys(todaysMeasurements).some(key => 
    key !== 'id' && key !== 'user_id' && key !== 'date' && key !== 'created_at' && key !== 'updated_at' && key !== 'notes' && todaysMeasurements[key] !== null
  );

  // Calculate next measurement date (7 days from last measurement)
  const nextMeasurementDate = todaysMeasurements?.date ? 
    new Date(new Date(todaysMeasurements.date).getTime() + 7 * 24 * 60 * 60 * 1000) : 
    new Date();

  useEffect(() => {
    if (hasMeasurementsThisWeek && !isEditing) {
      // Pre-fill form with existing data
      setMeasurements({
        neck: todaysMeasurements.neck || "",
        chest: todaysMeasurements.chest || "",
        waist: todaysMeasurements.waist || "",
        belly: todaysMeasurements.belly || "",
        hips: todaysMeasurements.hips || "",
        arms: todaysMeasurements.arms || "",
        thigh: todaysMeasurements.thigh || "",
        notes: todaysMeasurements.notes || ""
      });
    }
  }, [hasMeasurementsThisWeek, todaysMeasurements, isEditing]);

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if at least one measurement is provided
    const hasAnyMeasurement = Object.entries(measurements).some(([key, value]) => 
      key !== 'notes' && value.trim() !== ''
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
        const { error } = await supabase
          .from('body_measurements')
          .update(measurementData)
          .eq('id', todaysMeasurements.id);

        if (error) throw error;
        toast.success('Körpermaße aktualisiert!');
      } else {
        // Create new measurements using UPSERT to prevent duplicates
        const { error } = await supabase
          .from('body_measurements')
          .upsert(measurementData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          });

        if (error) throw error;

        // Award points for body measurements
        await awardPoints('body_measurements', getPointsForActivity('body_measurements'), 'Körpermaße gemessen');

        toast.success('Körpermaße erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onMeasurementsAdded?.();
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Fehler beim Speichern der Körpermaße');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = hasMeasurementsThisWeek && !isEditing;

  return (
    <CollapsibleQuickInput
      title="Körpermaße"
      icon={<Ruler className="h-4 w-4 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={!isCompleted}
    >
      {hasMeasurementsThisWeek && !isEditing ? (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">Maße erfasst! 📏</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-purple-600 dark:text-purple-400">
                {todaysMeasurements?.neck && (
                  <div><strong>Hals:</strong> {todaysMeasurements.neck}cm</div>
                )}
                {todaysMeasurements?.chest && (
                  <div><strong>Brust:</strong> {todaysMeasurements.chest}cm</div>
                )}
                {todaysMeasurements?.waist && (
                  <div><strong>Taille:</strong> {todaysMeasurements.waist}cm</div>
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
            </div>
            <div className="flex items-center gap-2">
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
          
          <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-3">
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
              <strong>Tipp:</strong> Miss zur gleichen Tageszeit für beste Vergleichbarkeit!
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              • Morgens vor dem Essen für konsistente Werte
              • Maßband parallel zum Boden halten
              • Nicht zu fest anziehen, aber auch nicht zu locker
              • Wöchentliche Messungen reichen meist aus
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              <strong>Nächste Messung:</strong> {nextMeasurementDate.toLocaleDateString('de-DE')} 📅
            </p>
          </div>
        </div>
      ) : (
        <PremiumGate 
          feature="body_measurements"
          hideable={true}
          fallbackMessage="Körpermaße-Tracking ist ein Premium Feature. Upgrade für detaillierte Körpermaß-Aufzeichnung!"
        >
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200">
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
                  <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Hals (cm)</label>
                  <NumericInput
                    placeholder="32.0"
                    value={measurements.neck}
                    onChange={(value) => handleInputChange('neck', value)}
                    allowDecimals={true}
                    min={0}
                    max={100}
                    className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Brust (cm)</label>
                  <NumericInput
                    placeholder="95.0"
                    value={measurements.chest}
                    onChange={(value) => handleInputChange('chest', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Taille (cm)</label>
                  <NumericInput
                    placeholder="85.0"
                    value={measurements.waist}
                    onChange={(value) => handleInputChange('waist', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
                  />
                </div>
              
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Hüfte (cm)</label>
                  <NumericInput
                    placeholder="95.0"
                    value={measurements.hips}
                    onChange={(value) => handleInputChange('hips', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                    className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Arme (cm)</label>
                  <NumericInput
                    placeholder="35.0"
                    value={measurements.arms}
                    onChange={(value) => handleInputChange('arms', value)}
                    allowDecimals={true}
                    min={0}
                    max={100}
                    className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
                  />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Notizen</label>
                <textarea
                  value={measurements.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Zusätzliche Notizen..."
                  className="w-full p-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-purple-950/50 text-purple-900 dark:text-purple-100 placeholder-purple-400 dark:placeholder-purple-500 resize-none h-20"
                />
              </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Oberschenkel (cm)</label>
                  <NumericInput
                    placeholder="60.0"
                    value={measurements.thigh}
                    onChange={(value) => handleInputChange('thigh', value)}
                    allowDecimals={true}
                    min={0}
                    max={150}
                    className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmitting ? 'Speichere...' : (hasMeasurementsThisWeek ? 'Aktualisieren' : 'Maße hinzufügen')}
                </Button>
                
                {isEditing && (
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