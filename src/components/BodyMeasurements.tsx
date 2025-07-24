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
      <PremiumGate 
        feature="body_measurements"
        hideable={true}
        fallbackMessage="Körpermaße-Tracking ist ein Premium Feature. Upgrade für detaillierte Körpermaß-Aufzeichnung!"
      >
        {hasMeasurementsThisWeek && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-800 mb-2">✅ Körpermaße bereits eingetragen</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-purple-700">
                {todaysMeasurements?.neck && (
                  <div><strong>Hals:</strong> {todaysMeasurements.neck} cm</div>
                )}
                {todaysMeasurements?.chest && (
                  <div><strong>Brust:</strong> {todaysMeasurements.chest} cm</div>
                )}
                {todaysMeasurements?.waist && (
                  <div><strong>Taille:</strong> {todaysMeasurements.waist} cm</div>
                )}
                {todaysMeasurements?.hips && (
                  <div><strong>Hüfte:</strong> {todaysMeasurements.hips} cm</div>
                )}
                {todaysMeasurements?.thigh && (
                  <div><strong>Oberschenkel:</strong> {todaysMeasurements.thigh} cm</div>
                )}
                {todaysMeasurements?.arms && (
                  <div><strong>Arme:</strong> {todaysMeasurements.arms} cm</div>
                )}
              </div>
              <div className="mt-3 text-xs text-purple-600">
                Nächste Messung: {nextMeasurementDate.toLocaleDateString('de-DE')}
              </div>
            </div>
            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hals (cm)</label>
                <NumericInput
                  placeholder="32.0"
                  value={measurements.neck}
                  onChange={(value) => handleInputChange('neck', value)}
                  allowDecimals={true}
                  min={0}
                  max={100}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Brust (cm)</label>
                <NumericInput
                  placeholder="95.0"
                  value={measurements.chest}
                  onChange={(value) => handleInputChange('chest', value)}
                  allowDecimals={true}
                  min={0}
                  max={200}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Taille (cm)</label>
                <NumericInput
                  placeholder="85.0"
                  value={measurements.waist}
                  onChange={(value) => handleInputChange('waist', value)}
                  allowDecimals={true}
                  min={0}
                  max={200}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Hüfte (cm)</label>
                <NumericInput
                  placeholder="95.0"
                  value={measurements.hips}
                  onChange={(value) => handleInputChange('hips', value)}
                  allowDecimals={true}
                  min={0}
                  max={200}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Speichere...' : (hasMeasurementsThisWeek ? 'Aktualisieren' : 'Maße hinzufügen')}
              </Button>
              
              {isEditing && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Abbrechen
                </Button>
              )}
            </div>
          </form>
        )}
      </PremiumGate>
    </CollapsibleQuickInput>
  );
};