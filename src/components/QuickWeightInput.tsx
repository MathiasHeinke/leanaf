
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
  onWeightAdded?: (weightData: any) => void;
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

  // Improved logic for hasWeightToday - checks for valid weight value
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

  const isDateInFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  const isDateToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !user) return;

    // Prevent duplicate submissions if weight already exists for today and not editing
    if (hasWeightToday && !isEditing) {
      toast.error('Gewicht für heute bereits eingetragen. Verwende den Bearbeiten-Button.');
      return;
    }

    setIsSubmitting(true);
    try {
      const weightValue = parseFloat(weight);
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      // Validate that we're not trying to enter weight for future dates
      if (isDateInFuture(today)) {
        toast.error('Gewicht kann nicht für zukünftige Daten eingetragen werden.');
        setIsSubmitting(false);
        return;
      }

      console.log('Starting weight submission process...');
      console.log('- Weight value:', weightValue);
      console.log('- Date:', dateStr);
      console.log('- User ID:', user.id);
      console.log('- Has existing weight today:', hasWeightToday);
      console.log('- Is editing mode:', isEditing);

      let resultData = null;

      if (hasWeightToday && todaysWeight?.id && isEditing) {
        // Update existing weight entry
        console.log('Updating existing weight entry with ID:', todaysWeight.id);
        const { data, error: historyError } = await supabase
          .from('weight_history')
          .update({ 
            weight: weightValue,
            date: dateStr 
          })
          .eq('id', todaysWeight.id)
          .select()
          .single();

        if (historyError) {
          console.error('Error updating weight:', historyError);
          throw historyError;
        }
        
        resultData = data;
        console.log('Weight updated successfully:', data);
        toast.success('Gewicht aktualisiert!');
      } else if (!hasWeightToday) {
        // Create new weight entry - but first double-check no entry exists
        console.log('Creating new weight entry');
        
        const { data: existingData, error: checkError } = await supabase
          .from('weight_history')
          .select('id, weight')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing entry:', checkError);
          throw checkError;
        }

        if (existingData) {
          // Found existing entry - this shouldn't happen but handle it gracefully
          console.log('Found unexpected existing entry, updating instead:', existingData.id);
          const { data, error: updateError } = await supabase
            .from('weight_history')
            .update({ weight: weightValue })
            .eq('id', existingData.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating existing entry:', updateError);
            throw updateError;
          }
          
          resultData = data;
          console.log('Existing entry updated:', data);
          toast.success('Gewicht aktualisiert!');
        } else {
          // Safe to insert new entry
          const { data, error: insertError } = await supabase
            .from('weight_history')
            .insert({
              user_id: user.id,
              weight: weightValue,
              date: dateStr
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting new weight:', insertError);
            throw insertError;
          }
          
          resultData = data;
          console.log('New weight entry created:', data);

          // Only award points and update streak for today's entries
          if (isDateToday(today)) {
            await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht gemessen');
            await updateStreak('weight_tracking');
          }

          toast.success(t('weightInput.success'));
        }
      } else {
        // This case shouldn't happen - hasWeightToday is true but not in editing mode
        toast.error('Unerwarteter Zustand. Bitte versuche es erneut.');
        setIsSubmitting(false);
        return;
      }

      // Update profile with current weight and set start_weight if first entry
      console.log('Updating profile weight...');
      
      // Check if this is the first weight entry (no start_weight set)
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('start_weight')
        .eq('user_id', user.id)
        .single();

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
        throw profileCheckError;
      }

      // If no start_weight is set, set it to this weight
      const updateData: any = { weight: weightValue };
      if (!profileData.start_weight) {
        updateData.start_weight = weightValue;
        console.log('Setting start_weight to:', weightValue);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      console.log('Profile weight updated successfully');
      setIsEditing(false);
      console.log('Calling onWeightAdded callback with data:', resultData);
      onWeightAdded?.(resultData);
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts: ' + (error as any)?.message || 'Unbekannter Fehler');
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
          <p className="text-xs text-green-700 dark:text-green-300 mb-2">
            <strong>Tipp:</strong> Tägliches Wiegen = bessere Trends erkennen!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            • Schwankungen sind völlig normal (Wasser, Salz, Hormone)
            • Wochentrends sind wichtiger als Tagesschwankungen
            • Morgens wiegen für beste Vergleichbarkeit
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            <strong>Nächste Eintragung:</strong> Morgen 📅
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
