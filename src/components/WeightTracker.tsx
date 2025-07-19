import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Target, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

interface WeightTrackerProps {
  weightHistory: WeightEntry[];
  onWeightAdded: () => void;
}

export const WeightTracker = ({ weightHistory, onWeightAdded }: WeightTrackerProps) => {
  const [newWeight, setNewWeight] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [averageCalorieIntake, setAverageCalorieIntake] = useState<number>(0);
  const { user } = useAuth();

  // Load profile and goals data for prognosis
  useEffect(() => {
    if (user) {
      loadProfileData();
      loadDailyGoals();
      calculateAverageCalorieIntake();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadDailyGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setDailyGoals(data);
    } catch (error) {
      console.error('Error loading daily goals:', error);
    }
  };

  const calculateAverageCalorieIntake = async () => {
    try {
      // Get last 7 days of meals to calculate average intake
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('meals')
        .select('calories, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error) throw error;

      if (data && data.length > 0) {
        const totalCalories = data.reduce((sum, meal) => sum + (meal.calories || 0), 0);
        const averageDaily = totalCalories / 7; // Average over 7 days
        setAverageCalorieIntake(averageDaily);
      }
    } catch (error) {
      console.error('Error calculating average calorie intake:', error);
    }
  };

  const calculateWeightPrognosis = () => {
    if (!profileData?.target_weight || !profileData?.weight || !dailyGoals?.tdee || !averageCalorieIntake) {
      return null;
    }

    const currentWeight = profileData.weight;
    const targetWeight = profileData.target_weight;
    const weightDifference = Math.abs(targetWeight - currentWeight);
    
    // Calculate daily calorie surplus/deficit
    const dailyCalorieBalance = averageCalorieIntake - dailyGoals.tdee;
    
    // 1kg = approximately 7700 calories
    const caloriesPerKg = 7700;
    
    // Calculate days needed to reach target
    let daysToTarget = 0;
    let prognosisType = '';
    
    if (targetWeight < currentWeight) {
      // Weight loss goal
      prognosisType = 'loss';
      if (dailyCalorieBalance < 0) {
        // In calorie deficit - losing weight
        const dailyWeightLoss = Math.abs(dailyCalorieBalance) / caloriesPerKg;
        daysToTarget = weightDifference / dailyWeightLoss;
      } else {
        // In calorie surplus - gaining weight (opposite of goal)
        return {
          type: 'warning',
          message: 'Mit aktueller Kalorienzufuhr nimmst du zu statt ab',
          suggestion: 'Reduziere deine täglichen Kalorien um etwa ' + Math.round(dailyCalorieBalance + 300) + ' kcal'
        };
      }
    } else if (targetWeight > currentWeight) {
      // Weight gain goal
      prognosisType = 'gain';
      if (dailyCalorieBalance > 0) {
        // In calorie surplus - gaining weight
        const dailyWeightGain = dailyCalorieBalance / caloriesPerKg;
        daysToTarget = weightDifference / dailyWeightGain;
      } else {
        // In calorie deficit - losing weight (opposite of goal)
        return {
          type: 'warning',
          message: 'Mit aktueller Kalorienzufuhr nimmst du ab statt zu',
          suggestion: 'Erhöhe deine täglichen Kalorien um etwa ' + Math.round(Math.abs(dailyCalorieBalance) + 300) + ' kcal'
        };
      }
    } else {
      // Maintain weight
      prognosisType = 'maintain';
      return {
        type: 'maintain',
        message: 'Du hast bereits dein Zielgewicht erreicht!',
        suggestion: 'Halte deine aktuelle Kalorienzufuhr bei, um das Gewicht zu halten'
      };
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToTarget);

    const weeksToTarget = Math.ceil(daysToTarget / 7);
    const monthsToTarget = Math.ceil(daysToTarget / 30);

    return {
      type: prognosisType,
      daysToTarget: Math.round(daysToTarget),
      weeksToTarget,
      monthsToTarget,
      targetDate: targetDate.toLocaleDateString('de-DE'),
      weightDifference,
      dailyCalorieBalance
    };
  };

  const handleAddWeight = async () => {
    if (!user || !newWeight) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(newWeight),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update current weight in profile
      await supabase
        .from('profiles')
        .update({ weight: parseFloat(newWeight) })
        .eq('user_id', user.id);

      setNewWeight('');
      toast.success('Gewicht erfolgreich hinzugefügt!');
      onWeightAdded();
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Fehler beim Hinzufügen des Gewichts');
    }
  };

  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg` };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg` };
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Aktuelles Gewicht</h3>
      <div className="flex gap-2">
        <Input
          type="number"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddWeight();
            }
          }}
          placeholder="z.B. 72.5"
          className="flex-1"
          step="0.1"
        />
        <Button 
          onClick={handleAddWeight} 
          disabled={!newWeight}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Eintragen
        </Button>
      </div>
      
      {(() => {
        const trend = getWeightTrend();
        if (!trend) return null;
        const IconComponent = trend.icon;
        return (
          <div className={`flex items-center gap-1 ${trend.color} text-sm`}>
            <IconComponent className="h-4 w-4" />
            <span>{trend.text}</span>
          </div>
        );
      })()}

      {/* Weight Prognosis */}
      {(() => {
        const prognosis = calculateWeightPrognosis();
        if (!prognosis) return null;

        return (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Gewichtsprognose</span>
            </div>
            
            {prognosis.type === 'warning' ? (
              <div className="space-y-2">
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  ⚠️ {prognosis.message}
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 {prognosis.suggestion}
                </div>
              </div>
            ) : prognosis.type === 'maintain' ? (
              <div className="space-y-2">
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✅ {prognosis.message}
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 {prognosis.suggestion}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-foreground">
                  {prognosis.type === 'loss' ? '📉' : '📈'} 
                  {` Zielgewicht in ca. `}
                  {prognosis.monthsToTarget > 1 
                    ? `${prognosis.monthsToTarget} Monaten` 
                    : prognosis.weeksToTarget > 1 
                      ? `${prognosis.weeksToTarget} Wochen`
                      : `${prognosis.daysToTarget} Tagen`
                  }
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Voraussichtlich am {prognosis.targetDate}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  📊 Basierend auf deiner aktuellen Kalorienzufuhr von durchschnittlich {Math.round(averageCalorieIntake)} kcal/Tag
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};