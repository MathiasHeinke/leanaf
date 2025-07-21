
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";

interface QuickWeightInputProps {
  onWeightAdded?: () => void;
  currentWeight?: number;
}

export const QuickWeightInput = ({ onWeightAdded, currentWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !user) return;

    setIsSubmitting(true);
    try {
      // Add to weight history
      const { error: historyError } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(weight),
          date: new Date().toISOString().split('T')[0]
        });

      if (historyError) throw historyError;

      // Update profile with current weight
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ weight: parseFloat(weight) })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Award points for weight tracking
      await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht gemessen');
      await updateStreak('weight_tracking');

      toast.success(t('weightInput.success'));
      setWeight("");
      onWeightAdded?.();
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error(t('weightInput.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
          <Scale className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800 dark:text-green-200">{t('weightInput.title')}</h3>
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
      
      <form onSubmit={handleSubmit} className="flex gap-2">
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
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
