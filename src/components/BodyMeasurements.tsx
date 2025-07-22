
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ruler, Plus, Edit, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PremiumGate } from "@/components/PremiumGate";
import { PointsDisplay } from "@/components/PointsDisplay";

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
        neck: measurements.neck ? parseFloat(measurements.neck) : null,
        chest: measurements.chest ? parseFloat(measurements.chest) : null,
        waist: measurements.waist ? parseFloat(measurements.waist) : null,
        belly: measurements.belly ? parseFloat(measurements.belly) : null,
        hips: measurements.hips ? parseFloat(measurements.hips) : null,
        arms: measurements.arms ? parseFloat(measurements.arms) : null,
        thigh: measurements.thigh ? parseFloat(measurements.thigh) : null,
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

  const getMeasurementsPoints = () => {
    return getPointsForActivity('body_measurements');
  };

  // Show read-only summary if measurements exist and not editing
  if (hasMeasurementsThisWeek && !isEditing) {
    const activeMeasurements = Object.entries(todaysMeasurements).filter(([key, value]) => 
      key !== 'id' && key !== 'user_id' && key !== 'date' && key !== 'created_at' && key !== 'updated_at' && key !== 'notes' && value !== null
    );

    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
            <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200">Körpermaße eingetragen! 📏</h3>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              {activeMeasurements.length} Messwerte erfasst
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <InfoButton
              title="Körpermaße Tracking"
              description="Körpermaße sind oft aussagekräftiger als das Gewicht allein. Muskeln sind schwerer als Fett - der Umfang zeigt deinen wahren Fortschritt."
              scientificBasis="Studien zeigen: Bauchumfang ist ein besserer Prädiktor für Gesundheitsrisiken als BMI. Reduktion um 5cm senkt kardiovaskuläre Risiken um 20%."
              tips={[
                "Immer zur gleichen Tageszeit messen (morgens, nüchtern)",
                "Bauchumfang auf Höhe des Nabels messen",
                "Monatliche Messungen reichen für gute Trends"
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
        
        {/* Points display moved to bottom */}
        <div className="mt-3 mb-3">
          <PointsDisplay 
            basePoints={getMeasurementsPoints()} 
            bonusPoints={0}
            reason="Körpermaße getrackt"
          />
        </div>
        
        <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-3">
          <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
            <strong>Tipp:</strong> Körpermaße zeigen oft Fortschritte, die die Waage nicht anzeigt!
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-purple-600 dark:text-purple-400 mb-2">
            {activeMeasurements.map(([key, value]) => (
              <div key={key}>
                <strong>{key === 'neck' ? 'Hals' : key === 'chest' ? 'Brust' : key === 'waist' ? 'Taille' : key === 'belly' ? 'Bauch' : key === 'hips' ? 'Hüfte' : key === 'arms' ? 'Arme' : 'Oberschenkel'}:</strong> {String(value)}cm
              </div>
            ))}
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            <strong>Nächste Messung:</strong> {nextMeasurementDate.toLocaleDateString('de-DE')} 📅
          </p>
        </div>
      </div>
    );
  }

  return (
    <PremiumGate 
      feature="body_measurements"
      fallbackMessage="Körpermaße-Tracking ist ein Premium Feature. Upgrade für detaillierte Körpermaß-Aufzeichnung!"
    >
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
            <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200">
              {hasMeasurementsThisWeek ? 'Körpermaße bearbeiten' : 'Körpermaße eintragen'}
            </h3>
          </div>
          <InfoButton
            title="Körpermaße Tracking"
            description="Körpermaße sind oft aussagekräftiger als das Gewicht allein. Muskeln sind schwerer als Fett - der Umfang zeigt deinen wahren Fortschritt."
            scientificBasis="Studien zeigen: Bauchumfang ist ein besserer Prädiktor für Gesundheitsrisiken als BMI. Reduktion um 5cm senkt kardiovaskuläre Risiken um 20%."
            tips={[
              "Immer zur gleichen Tageszeit messen (morgens, nüchtern)",
              "Bauchumfang auf Höhe des Nabels messen",
              "Monatliche Messungen reichen für gute Trends"
            ]}
          />
        </div>
        
        {/* Points display moved to bottom */}
        <div className="mb-3">
          <PointsDisplay 
            basePoints={getMeasurementsPoints()} 
            bonusPoints={0}
            reason="Körpermaße tracken"
          />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Hals (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="32.0"
                value={measurements.neck}
                onChange={(e) => handleInputChange('neck', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Brust (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="95.0"
                value={measurements.chest}
                onChange={(e) => handleInputChange('chest', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Taille (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="85.0"
                value={measurements.waist}
                onChange={(e) => handleInputChange('waist', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Bauch (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="90.0"
                value={measurements.belly}
                onChange={(e) => handleInputChange('belly', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Hüfte (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="95.0"
                value={measurements.hips}
                onChange={(e) => handleInputChange('hips', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Arme (cm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="30.0"
                value={measurements.arms}
                onChange={(e) => handleInputChange('arms', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
              Oberschenkel (cm)
            </label>
            <Input
              type="number"
              step="0.1"
              placeholder="55.0"
              value={measurements.thigh}
              onChange={(e) => handleInputChange('thigh', e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 block">
              Notizen (optional)
            </label>
            <Input
              placeholder="z.B. Messzeit, Besonderheiten..."
              value={measurements.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="text-sm"
            />
          </div>

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
                  {hasMeasurementsThisWeek ? 'Aktualisieren' : 'Eintragen'}
                </div>
              )}
            </Button>
            
            {hasMeasurementsThisWeek && isEditing && (
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
  );
};
