
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Plus, CheckCircle, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";

interface QuickWeightInputProps {
  onWeightAdded?: () => void;
  currentWeight?: number;
  todaysWeight?: any;
}

export const QuickWeightInput = ({ onWeightAdded, currentWeight, todaysWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Verbesserte Logik für hasWeightToday - prüft auf gültigen Gewichtswert
  const hasWeightToday = todaysWeight && 
    todaysWeight.weight !== null && 
    todaysWeight.weight !== undefined && 
    todaysWeight.weight > 0;

  console.log('QuickWeightInput - Debug Info:');
  console.log('- todaysWeight object:', todaysWeight);
  console.log('- todaysWeight.weight value:', todaysWeight?.weight);
  console.log('- hasWeightToday result:', hasWeightToday);
  console.log('- isEditing:', isEditing);

  useEffect(() => {
    if (hasWeightToday && !isEditing) {
      setWeight(todaysWeight.weight.toString());
    }
  }, [hasWeightToday, todaysWeight, isEditing]);

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !user) return;

    setIsSubmitting(true);
    try {
      const weightData = {
        user_id: user.id,
        weight: parseFloat(weight),
        date: new Date().toISOString().split('T')[0]
      };

      console.log('Submitting weight data:', weightData);

      if (hasWeightToday) {
        // Update existing weight - no points awarded
        console.log('Updating existing weight entry with ID:', todaysWeight.id);
        const { error: historyError } = await supabase
          .from('weight_history')
          .update(weightData)
          .eq('id', todaysWeight.id);

        if (historyError) throw historyError;
        toast.success('Gewicht aktualisiert!');
        console.log('Weight updated successfully');
      } else {
        // Create new weight entry using UPSERT with proper constraint name
        console.log('Creating new weight entry');
        const { error: historyError } = await supabase
          .from('weight_history')
          .upsert(weightData, { 
            onConflict: 'weight_history_user_id_date_unique',
            ignoreDuplicates: false 
          });

        if (historyError) throw historyError;
        console.log('New weight entry created');

        // Award points for weight tracking
        await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht gemessen');
        await updateStreak('weight_tracking');

        toast.success(t('weightInput.success'));
      }

      // Update profile with current weight
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ weight: parseFloat(weight) })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      setIsEditing(false);
      console.log('Calling onWeightAdded callback');
      onWeightAdded?.();
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error(t('weightInput.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show read-only summary if weight exists and not editing
  if (hasWeightToday && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/70 dark:from-green-950/25 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200/60 dark:border-green-800/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100/80 dark:bg-green-900/60 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-200">Gewicht eingetragen! ⚖️</h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {todaysWeight.weight}kg erfasst am {new Date().toLocaleDateString('de-DE')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton
              title="Gewicht Tracking"
              description="Regelmäßiges Wiegen hilft dabei, Fortschritte zu verfolgen und Trends zu erkennen. Schwankungen sind normal und durch viele Faktoren bedingt."
              scientificBasis="Studien zeigen: Tägliches Wiegen zur gleichen Zeit (morgens, nüchtern) liefert die genauesten und vergleichbarsten Daten für Langzeittrends."
              tips={[
                "Wiege dich täglich zur gleichen Zeit (morgens, nüchtern)",
                "Achte auf Wochentrends statt tägliche Schwankungen",
                "Wasser, Salz und Hormone beeinflussen das Tagesgewicht"
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="bg-green-100/60 dark:bg-green-900/40 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300">
            <strong>Nächste Eintragung:</strong> {getTomorrowDate()}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            <strong>Tipp:</strong> Tägliches Wiegen zur gleichen Zeit hilft, Trends zu erkennen!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/70 dark:from-green-950/25 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200/60 dark:border-green-800/60">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-green-100/80 dark:bg-green-900/60 rounded-xl">
          <Scale className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            {hasWeightToday ? 'Gewicht bearbeiten' : t('weightInput.title')}
          </h3>
          {currentWeight && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('weightInput.current').replace('{weight}', currentWeight.toString())}
            </p>
          )}
        </div>
        <InfoButton
          title="Gewicht Tracking"
          description="Regelmäßiges Wiegen hilft dabei, Fortschritte zu verfolgen und Trends zu erkennen. Schwankungen sind normal und durch viele Faktoren bedingt."
          scientificBasis="Studien zeigen: Tägliches Wiegen zur gleichen Zeit (morgens, nüchtern) liefert die genauesten und vergleichbarsten Daten für Langzeittrends."
          tips={[
            "Wiege dich täglich zur gleichen Zeit (morgens, nüchtern)",
            "Achte auf Wochentrends statt tägliche Schwankungen",
            "Wasser, Salz und Hormone beeinflussen das Tagesgewicht"
          ]}
        />
      </div>
      
      <div className="flex gap-2">
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
          <Input
            type="number"
            step="0.1"
            placeholder={t('weightInput.placeholder')}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!weight || isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {hasWeightToday && isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
            className="border-green-300 text-green-600"
          >
            Abbrechen
          </Button>
        )}
      </div>

      {!hasWeightToday && (
        <div className="mt-3 bg-green-100/60 dark:bg-green-900/40 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300">
            <strong>Heute:</strong> Erstes Gewicht eintragen für Tracking-Start
          </p>
        </div>
      )}
    </div>
  );
};
