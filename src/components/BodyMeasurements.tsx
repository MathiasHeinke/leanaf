import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ruler, Plus, Camera, Edit, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";

interface BodyMeasurementsProps {
  onMeasurementAdded?: () => void;
  todaysMeasurements?: any;
}

export const BodyMeasurements = ({ onMeasurementAdded, todaysMeasurements }: BodyMeasurementsProps) => {
  const [measurements, setMeasurements] = useState({
    chest: '',
    waist: '',
    belly: '',
    hips: '',
    thigh: '',
    arms: '',
    neck: ''
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if measurements already exist for today
  const hasMeasurementsToday = todaysMeasurements && Object.values(todaysMeasurements).some(value => 
    value !== null && value !== undefined && value !== ''
  );

  useEffect(() => {
    if (hasMeasurementsToday && !isEditing) {
      // Pre-fill form with existing data
      setMeasurements({
        chest: todaysMeasurements.chest?.toString() || '',
        waist: todaysMeasurements.waist?.toString() || '',
        belly: todaysMeasurements.belly?.toString() || '',
        hips: todaysMeasurements.hips?.toString() || '',
        thigh: todaysMeasurements.thigh?.toString() || '',
        arms: todaysMeasurements.arms?.toString() || '',
        neck: todaysMeasurements.neck?.toString() || ''
      });
      setNotes(todaysMeasurements.notes || '');
    }
  }, [hasMeasurementsToday, todaysMeasurements, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if at least one measurement is filled
    const hasAnyMeasurement = Object.values(measurements).some(value => value !== '');
    if (!hasAnyMeasurement) {
      toast.error('Bitte mindestens eine Messung eingeben');
      return;
    }

    setIsSubmitting(true);
    try {
      const measurementData = {
        user_id: user.id,
        chest: measurements.chest ? parseFloat(measurements.chest) : null,
        waist: measurements.waist ? parseFloat(measurements.waist) : null,
        belly: measurements.belly ? parseFloat(measurements.belly) : null,
        hips: measurements.hips ? parseFloat(measurements.hips) : null,
        thigh: measurements.thigh ? parseFloat(measurements.thigh) : null,
        arms: measurements.arms ? parseFloat(measurements.arms) : null,
        neck: measurements.neck ? parseFloat(measurements.neck) : null,
        notes,
        date: new Date().toISOString().split('T')[0]
      };

      if (hasMeasurementsToday) {
        // Update existing measurements
        const { error } = await supabase
          .from('body_measurements')
          .update(measurementData)
          .eq('id', todaysMeasurements.id);

        if (error) throw error;
        toast.success('Körpermaße aktualisiert!');
      } else {
        // Create new measurements
        const { error } = await supabase
          .from('body_measurements')
          .insert(measurementData);

        if (error) throw error;

        // Award points for new measurements
        await awardPoints('body_measurements', getPointsForActivity('body_measurements'), 'Körpermaße gemessen');
        await updateStreak('body_tracking');

        toast.success('Körpermaße erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onMeasurementAdded?.();
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Fehler beim Speichern der Körpermaße');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Show read-only summary if measurements exist and not editing
  if (hasMeasurementsToday && !isEditing) {
    const activeMeasurements = Object.entries(measurements).filter(([_, value]) => value !== '');
    
    return (
      <Card className="glass-card border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">Körpermaße eingetragen! 📏</h3>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                {activeMeasurements.length} Messung{activeMeasurements.length !== 1 ? 'en' : ''} erfasst
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InfoButton
                title="Körpermaße Tracking"
                description="Körpermaße sind oft aussagekräftiger als das Gewicht, da sie Muskelaufbau und Fettabbau besser widerspiegeln. Messe immer zur gleichen Zeit."
                scientificBasis="Studien zeigen: Umfangsmessungen korrelieren stärker mit Gesundheitsrisiken als BMI. Taillenumfang ist ein starker Prädiktor für metabolische Gesundheit."
                tips={[
                  "Messe immer zur gleichen Tageszeit (morgens, nüchtern)",
                  "Achte auf korrekte Messpunkte für Vergleichbarkeit",
                  "Fortschritte zeigen sich oft früher in Maßen als auf der Waage"
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

          <div className="grid grid-cols-2 gap-2 mb-3">
            {activeMeasurements.map(([key, value]) => {
              const labels: Record<string, string> = {
                chest: 'Brust',
                waist: 'Taille',
                belly: 'Bauch',
                hips: 'Hüfte',
                thigh: 'Oberschenkel',
                arms: 'Arme',
                neck: 'Hals'
              };
              return (
                <div key={key} className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-2">
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    {labels[key]}
                  </p>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    {value} cm
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-3">
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
              <strong>Tipp:</strong> Körpermaße zeigen Fortschritte oft früher als die Waage!
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              • Muskelaufbau kann das Gewicht erhöhen, aber Umfänge reduzieren
              • Messe immer an denselben Körperstellen
              • Dokumentiere Fortschritte auch mit Fotos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-xl">
            <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200">
              {hasMeasurementsToday ? 'Körpermaße bearbeiten' : 'Körpermaße eintragen'}
            </h3>
            <p className="text-sm text-purple-600 dark:text-purple-400">Alle Angaben in cm</p>
          </div>
          <InfoButton
            title="Körpermaße Tracking"
            description="Körpermaße sind oft aussagekräftiger als das Gewicht, da sie Muskelaufbau und Fettabbau besser widerspiegeln. Messe immer zur gleichen Zeit."
            scientificBasis="Studien zeigen: Umfangsmessungen korrelieren stärker mit Gesundheitsrisiken als BMI. Taillenumfang ist ein starker Prädiktor für metabolische Gesundheit."
            tips={[
              "Messe immer zur gleichen Tageszeit (morgens, nüchtern)",
              "Achte auf korrekte Messpunkte für Vergleichbarkeit",
              "Fortschritte zeigen sich oft früher in Maßen als auf der Waage"
            ]}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Brust
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 95.5"
                value={measurements.chest}
                onChange={(e) => handleInputChange('chest', e.target.value)}
                className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Taille
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 85.0"
                value={measurements.waist}
                onChange={(e) => handleInputChange('waist', e.target.value)}
                className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Bauch
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 90.0"
                value={measurements.belly}
                onChange={(e) => handleInputChange('belly', e.target.value)}
                className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Hüfte
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 100.0"
                value={measurements.hips}
                onChange={(e) => handleInputChange('hips', e.target.value)}
                className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Oberschenkel
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 60.0"
                value={measurements.thigh}
                onChange={(e) => handleInputChange('thigh', e.target.value)}
                className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
                Arme
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="z.B. 30.0"
                value={measurements.arms}
                onChange={(e) => handleInputChange('arms', e.target.value)}
                className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 block">
              Hals
            </label>
            <Input
              type="number"
              step="0.1"
              placeholder="z.B. 38.0"
              value={measurements.neck}
              onChange={(e) => handleInputChange('neck', e.target.value)}
              className="bg-white dark:bg-purple-950/50 border-purple-200 dark:border-purple-700"
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
                  {hasMeasurementsToday ? 'Aktualisieren' : 'Speichern'}
                </div>
              )}
            </Button>
            
            {hasMeasurementsToday && isEditing && (
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
      </CardContent>
    </Card>
  );
};
