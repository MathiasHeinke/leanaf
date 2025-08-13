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
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { InfoButton } from "@/components/InfoButton";
import { PointsBadge } from "@/components/PointsBadge";
import { getCurrentDateString } from "@/utils/dateHelpers";
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
  const [createNewEntry, setCreateNewEntry] = useState(false);
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

  // One-off restore of body measurements for 2025-08-03 from screenshot
  useEffect(() => {
    const key = 'bm_restore_2025-08-03_v1';
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(key)) return;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { restoreBodyMeasurements } = await import('@/utils/restoreBodyMeasurements');
        const res = await restoreBodyMeasurements(user.id, '2025-08-03', {
          neck: 41.5,
          chest: 113,
          waist: 103,
          belly: 105,
          hips: 101,
          arms: 36.5,
          thigh: 61.5,
          notes: 'Aus Screenshot (manuelle Wiederherstellung)'
        });
        console.log('[OneOffRestore] Body measurements 2025-08-03', res);
        localStorage.setItem(key, 'done');
      } catch (err) {
        console.error('[OneOffRestore] Failed to restore 2025-08-03', err);
      }
    })();
  }, []);

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
      key !== 'notes' && value && String(value).trim() !== ''
    );

    if (!hasAnyMeasurement) {
      toast.error('Bitte mindestens einen Messwert eingeben');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build base payload WITHOUT date (never update date to avoid overwrites)
      const baseData = {
        user_id: user.id,
        neck: measurements.neck ? parseLocaleFloat(measurements.neck) : null,
        chest: measurements.chest ? parseLocaleFloat(measurements.chest) : null,
        waist: measurements.waist ? parseLocaleFloat(measurements.waist) : null,
        belly: measurements.belly ? parseLocaleFloat(measurements.belly) : null,
        hips: measurements.hips ? parseLocaleFloat(measurements.hips) : null,
        arms: measurements.arms ? parseLocaleFloat(measurements.arms) : null,
        thigh: measurements.thigh ? parseLocaleFloat(measurements.thigh) : null,
        notes: measurements.notes || null
      };

      // Decide path: update existing of the day/week OR create new today
      const mustInsert = createNewEntry || !hasMeasurementsThisWeek;

      if (mustInsert) {
        console.log('[BodyMeasurements] Creating NEW entry for today');
        const { error } = await supabase
          .from('body_measurements')
          .insert({
            ...baseData,
            date: getCurrentDateString(),
          });

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate')) {
            toast.error('Körpermaße für heute bereits vorhanden. Bitte lade die Seite neu.');
            setCreateNewEntry(false);
            setIsEditing(false);
            return;
          }
          throw error;
        }

        // Award points for body measurements
        await awardPoints('body_measurements', getPointsForActivity('body_measurements'), 'Körpermaße gemessen');
        toast.success('Körpermaße erfolgreich eingetragen!');
      } else {
        console.log('[BodyMeasurements] UPDATING existing entry (date will not be modified)');
        const { error } = await supabase
          .from('body_measurements')
          .update(baseData) // no date field here
          .eq('id', todaysMeasurements.id);

        if (error) throw error;
        toast.success('Körpermaße aktualisiert!');
      }

      setIsEditing(false);
      setCreateNewEntry(false);
      onMeasurementsAdded?.();
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Fehler beim Speichern der Körpermaße');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = !!hasMeasurementsThisWeek;

  return (
    <CollapsibleQuickInput
      title="Körpermaße"
      icon={<Ruler className="h-5 w-5 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={false}
      theme="cyan"
      completedText={isCompleted ? "✓ Erledigt" : undefined}
    >
      {hasMeasurementsThisWeek && !isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">Maße erfasst! 📏</h3>
            </div>
            <div className="flex items-center gap-2">
              <InfoButton
                title="Körpermaße - Messanleitung"
                description="Schritt-für-Schritt-Anleitung für korrekte Körpermaße-Messungen. Jede Messung sollte waagerecht und bei normaler Atmung durchgeführt werden."
                scientificBasis="Körperumfänge sind oft bessere Indikatoren für Körperzusammensetzung als nur das Körpergewicht, da sie Muskelaufbau und Fettabbau separat erfassen."
                tips={[
                  "🦢 **Halsumfang:** Miss direkt unterhalb des Adamsapfels, etwa auf Höhe des siebten Halswirbels.",
                  "💪 **Oberarmumfang:** Miss in der Mitte des Oberarmes, zwischen Schulterknochen und Ellenbogen.",
                  "🫀 **Brustumfang:** Miss waagerecht um die breiteste Stelle der Brust.",
                  "🎯 **Taillenumfang:** Miss an der schlanksten Stelle, meist 2-5cm über dem Bauchnabel. Bauch nicht einziehen!",
                  "🔄 **Bauchumfang:** Miss waagerecht genau auf Höhe des Bauchnabels nach normaler Ausatmung.",
                  "🍑 **Hüftumfang:** Miss waagerecht am weitesten Punkt des Hinterns.",
                  "🦵 **Oberschenkelumfang:** Miss auf halber Strecke zwischen Kniescheiben-Mittelpunkt und Leistenkanal.",
                  "",
                  "⏰ **Wichtige Tipps:**",
                  "• Miss zur gleichen Tageszeit (am besten morgens)",
                  "• Maßband parallel zum Boden halten",
                  "• Nicht zu fest anziehen, aber auch nicht zu locker",
                  "• Bei normaler Atmung messen, Bauch nicht anspannen",
                  "• Wöchentliche Messungen für beste Trends"
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
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
                  setCreateNewEntry(true);
                  setIsEditing(true);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <PointsBadge 
            points={5} 
            icon="📏"
            animated={false}
            variant="secondary"
          />
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
          
          <CoachFeedbackCard 
            coachName="Lucy"
            coachAvatar="/coach-images/fa6fb4d0-0626-4ff4-a5c2-552d0e3d9bbb.png"
            measurementData={todaysMeasurements}
            userId={user?.id}
            type="measurement"
          />
          
          <div className="bg-card rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Tipp:</strong> Miss zur gleichen Zeit für beste Vergleichbarkeit!
            </p>
            <p className="text-xs text-muted-foreground">
              • Morgens vor dem Essen für konsistente Werte
              • Maßband parallel zum Boden halten
              • Immer an derselben Körperstelle messen
              • Wöchentlich messen für langfristige Trends
            </p>
            <p className="text-xs text-muted-foreground mt-2">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">
                {hasMeasurementsThisWeek && !createNewEntry ? 'Maße bearbeiten' : 'Körpermaße erfassen'}
              </h3>
              <InfoButton
                title="Körpermaße - Messanleitung"
                description="Schritt-für-Schritt-Anleitung für korrekte Körpermaße-Messungen. Jede Messung sollte waagerecht und bei normaler Atmung durchgeführt werden."
                scientificBasis="Körperumfänge sind oft bessere Indikatoren für Körperzusammensetzung als nur das Körpergewicht, da sie Muskelaufbau und Fettabbau separat erfassen."
                tips={[
                  "🦢 **Halsumfang:** Miss direkt unterhalb des Adamsapfels, etwa auf Höhe des siebten Halswirbels.",
                  "💪 **Oberarmumfang:** Miss in der Mitte des Oberarmes, zwischen Schulterknochen und Ellenbogen.",
                  "🫀 **Brustumfang:** Miss waagerecht um die breiteste Stelle der Brust.",
                  "🎯 **Taillenumfang:** Miss an der schlanksten Stelle, meist 2-5cm über dem Bauchnabel. Bauch nicht einziehen!",
                  "🔄 **Bauchumfang:** Miss waagerecht genau auf Höhe des Bauchnabels nach normaler Ausatmung.",
                  "🍑 **Hüftumfang:** Miss waagerecht am weitesten Punkt des Hinterns.",
                  "🦵 **Oberschenkelumfang:** Miss auf halber Strecke zwischen Kniescheiben-Mittelpunkt und Leistenkanal.",
                  "",
                  "⏰ **Wichtige Tipps:**",
                  "• Miss zur gleichen Tageszeit (am besten morgens)",
                  "• Maßband parallel zum Boden halten",
                  "• Nicht zu fest anziehen, aber auch nicht zu locker",
                  "• Bei normaler Atmung messen, Bauch nicht anspannen",
                  "• Wöchentliche Messungen für beste Trends"
                ]}
              />
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Hals (cm)</label>
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
                  <label className="text-sm font-medium text-muted-foreground">Brust (cm)</label>
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
                  <label className="text-sm font-medium text-muted-foreground">Taille (cm)</label>
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
                  <label className="text-sm font-medium text-muted-foreground">Bauch (cm)</label>
                  <NumericInput
                    placeholder="90.0"
                    value={measurements.belly}
                    onChange={(value) => handleInputChange('belly', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                  />
                </div>
              
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Hüfte (cm)</label>
                  <NumericInput
                    placeholder="95.0"
                    value={measurements.hips}
                    onChange={(value) => handleInputChange('hips', value)}
                    allowDecimals={true}
                    min={0}
                    max={200}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Arme (cm)</label>
                  <NumericInput
                    placeholder="35.0"
                    value={measurements.arms}
                    onChange={(value) => handleInputChange('arms', value)}
                    allowDecimals={true}
                    min={0}
                    max={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Oberschenkel (cm)</label>
                  <NumericInput
                    placeholder="60.0"
                    value={measurements.thigh}
                    onChange={(value) => handleInputChange('thigh', value)}
                    allowDecimals={true}
                    min={0}
                    max={150}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Notizen</label>
                <textarea
                  value={measurements.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Zusätzliche Notizen..."
                  className="w-full p-2 rounded-lg border bg-background text-foreground placeholder-muted-foreground resize-none h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Speichere...' : (hasMeasurementsThisWeek && !createNewEntry ? 'Aktualisieren' : 'Maße hinzufügen')}
                </Button>
                
                {isEditing && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setCreateNewEntry(false);
                    }}
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
