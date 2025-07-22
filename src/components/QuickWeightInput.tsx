
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Plus, Edit, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { Badge } from "@/components/ui/badge";

interface QuickWeightInputProps {
  onWeightAdded?: () => void;
  todaysWeight?: any;
}

export const QuickWeightInput = ({ onWeightAdded, todaysWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if weight already exists for today
  const hasWeightToday = todaysWeight && todaysWeight.weight !== null;

  useEffect(() => {
    if (hasWeightToday && !isEditing) {
      setWeight(todaysWeight.weight?.toString() || "");
    }
  }, [hasWeightToday, todaysWeight, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !weight) return;

    setIsSubmitting(true);
    try {
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        toast.error('Bitte gib ein gültiges Gewicht ein');
        return;
      }

      const weightData = {
        user_id: user.id,
        weight: weightValue,
        date: new Date().toISOString().split('T')[0]
      };

      if (hasWeightToday && todaysWeight?.id) {
        // Update existing weight entry - no points awarded
        const { error } = await supabase
          .from('weight_history')
          .update({
            weight: weightValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', todaysWeight.id);

        if (error) throw error;
        toast.success('Gewicht aktualisiert!');
      } else {
        // Create new weight entry
        const { error } = await supabase
          .from('weight_history')
          .upsert(weightData, { 
            onConflict: 'user_id, date'
          });

        if (error) throw error;

        // Award points for weight tracking
        await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht eingetragen');
        await updateStreak('weight_tracking');

        // Show points animation
        setShowPointsAnimation(true);
        setTimeout(() => setShowPointsAnimation(false), 3000);

        toast.success('Gewicht erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onWeightAdded?.();
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show read-only summary if weight exists and not editing
  if (hasWeightToday && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-200">Gewicht eingetragen! ⚖️</h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {todaysWeight.weight || 0} kg
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`bg-green-100 text-green-700 border-green-300 ${showPointsAnimation ? 'animate-pulse' : ''}`}
            >
              ⚖️ +3P
            </Badge>
            <InfoButton
              title="Gewichts-Tracking"
              description="Regelmäßiges Wiegen hilft dir dabei, deinen Fortschritt zu verfolgen und deine Ziele zu erreichen."
              scientificBasis="Studien zeigen: Tägliches Wiegen kann bei der Gewichtskontrolle helfen und die Motivation steigern."
              tips={[
                "Wiege dich immer zur gleichen Zeit",
                "Am besten morgens nach dem Aufstehen",
                "Nutze die gleiche Waage für Konsistenz"
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
        
        <div className="bg-green-100/50 dark:bg-green-900/30 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300 mb-2">
            <strong>Tipp:</strong> Konsistenz ist der Schlüssel zum Erfolg!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            • Schwankungen von ±1kg sind völlig normal
            • Der Trend über mehrere Tage ist wichtiger
            • Faktoren wie Wasserhausalt beeinflussen das Gewicht
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            <strong>Nächste Eintragung:</strong> Morgen 📅
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
          <Scale className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            {hasWeightToday ? 'Gewicht bearbeiten' : 'Gewicht eintragen'}
          </h3>
        </div>
        <InfoButton
          title="Gewichts-Tracking"
          description="Regelmäßiges Wiegen hilft dir dabei, deinen Fortschritt zu verfolgen und deine Ziele zu erreichen."
          scientificBasis="Studien zeigen: Tägliches Wiegen kann bei der Gewichtskontrolle helfen und die Motivation steigern."
          tips={[
            "Wiege dich immer zur gleichen Zeit",
            "Am besten morgens nach dem Aufstehen",
            "Nutze die gleiche Waage für Konsistenz"
          ]}
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="weight" className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
            Gewicht (kg)
          </label>
          <Input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="z.B. 75.5"
            step="0.1"
            min="1"
            max="500"
            className="bg-white dark:bg-green-950/50 border-green-200 dark:border-green-700 focus:border-green-500"
            required
          />
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isSubmitting || !weight}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Speichern...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {hasWeightToday ? 'Aktualisieren' : 'Eintragen'}
              </div>
            )}
          </Button>
          
          {hasWeightToday && isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-green-300 text-green-600"
            >
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
