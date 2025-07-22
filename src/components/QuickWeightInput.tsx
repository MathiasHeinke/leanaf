
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Plus, Edit, CheckCircle, TrendingUp, TrendingDown, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PointsDisplay } from "@/components/PointsDisplay";

interface QuickWeightInputProps {
  currentWeight?: number;
  onWeightAdded?: (newWeightData?: any) => void;
  todaysWeight?: any;
}

export const QuickWeightInput = ({ currentWeight, onWeightAdded, todaysWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, getPointsForActivity } = usePointsSystem();

  // Check if weight already exists for today
  const hasWeightToday = todaysWeight && todaysWeight.weight !== null;

  useEffect(() => {
    if (hasWeightToday && !isEditing) {
      setWeight(todaysWeight.weight?.toString() || '');
    }
  }, [hasWeightToday, todaysWeight, isEditing]);

  // Calculate weight trend
  const getWeightTrend = () => {
    if (!hasWeightToday || !currentWeight) return null;
    const current = todaysWeight.weight;
    const previous = currentWeight;
    const diff = current - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil', bgColor: 'bg-gray-100' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg`, bgColor: 'bg-red-50' };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg`, bgColor: 'bg-green-50' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !weight) return;

    setIsSubmitting(true);
    try {
      const weightValue = parseFloat(weight);
      const weightData = {
        user_id: user.id,
        weight: weightValue,
        date: new Date().toISOString().split('T')[0]
      };

      let newWeightData;
      
      if (hasWeightToday) {
        // Update existing weight - no points awarded
        const { error, data } = await supabase
          .from('weight_history')
          .update({ weight: weightValue, updated_at: new Date().toISOString() })
          .eq('id', todaysWeight.id)
          .select()
          .single();

        if (error) throw error;
        newWeightData = data;
        toast.success('Gewicht aktualisiert!');
      } else {
        // Create new weight entry
        const { error, data } = await supabase
          .from('weight_history')
          .upsert(weightData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (error) throw error;
        newWeightData = data;

        // Award points for weight measurement
        await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht gemessen');

        toast.success('Gewicht erfolgreich eingetragen!');
      }

      // Update profile with current weight
      await supabase
        .from('profiles')
        .update({ weight: weightValue })
        .eq('user_id', user.id);

      setIsEditing(false);
      onWeightAdded?.(newWeightData);
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trend = getWeightTrend();

  // Show read-only summary if weight exists and not editing
  if (hasWeightToday && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-green-800 dark:text-green-200">Gewicht eingetragen! ⚖️</h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {todaysWeight.weight || 0} kg
              {trend && (
                <>
                  {' • '}
                  <span className={trend.color}>{trend.text}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <InfoButton
              title="Gewichts-Tracking"
              description="Regelmäßiges Wiegen hilft dabei, deine Fortschritte zu verfolgen und deine Ziele zu erreichen. Schwankungen sind völlig normal!"
              scientificBasis="Studien zeigen: Tägliches Wiegen kann beim Abnehmen helfen, aber wöchentliche Durchschnitte sind aussagekräftiger als Einzelmessungen."
              tips={[
                "Immer zur gleichen Tageszeit wiegen (morgens, nach dem Toilettengang)",
                "Nackt oder in derselben Kleidung wiegen",
                "Wöchentliche Trends sind wichtiger als tägliche Schwankungen"
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
        
        {/* Points display moved to bottom */}
        <div className="mt-3 mb-3">
          <PointsDisplay 
            basePoints={getPointsForActivity('weight_measured')} 
            bonusPoints={0}
            reason="Gewicht getrackt"
          />
        </div>
        
        <div className="bg-green-100/50 dark:bg-green-900/30 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300 mb-2">
            <strong>Tipp:</strong> Gewichtsschwankungen sind normal!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            • Salzige Mahlzeiten können zu Wassereinlagerungen führen
            • Hormonelle Schwankungen beeinflussen das Gewicht
            • Der Wochentrend ist wichtiger als der tägliche Wert
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            <strong>Nächste Messung:</strong> Morgen 📅
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
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            {hasWeightToday ? 'Gewicht bearbeiten' : 'Gewicht eintragen'}
          </h3>
        </div>
        <InfoButton
          title="Gewichts-Tracking"
          description="Regelmäßiges Wiegen hilft dabei, deine Fortschritte zu verfolgen und deine Ziele zu erreichen. Schwankungen sind völlig normal!"
          scientificBasis="Studien zeigen: Tägliches Wiegen kann beim Abnehmen helfen, aber wöchentliche Durchschnitte sind aussagekräftiger als Einzelmessungen."
          tips={[
            "Immer zur gleichen Tageszeit wiegen (morgens, nach dem Toilettengang)",
            "Nackt oder in derselben Kleidung wiegen",
            "Wöchentliche Trends sind wichtiger als tägliche Schwankungen"
          ]}
        />
      </div>
      
      {/* Points display moved to bottom */}
      <div className="mb-3">
        <PointsDisplay 
          basePoints={getPointsForActivity('weight_measured')} 
          bonusPoints={0}
          reason="Gewicht tracken"
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
            Aktuelles Gewicht (kg)
          </label>
          <Input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="z.B. 72.5"
            className="bg-white dark:bg-green-950/50 border-green-200 dark:border-green-700"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={!weight || isSubmitting}
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
