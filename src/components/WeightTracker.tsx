
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Target, Clock, Calendar, Scale, Zap } from "lucide-react";
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
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil', bgColor: 'bg-gray-100' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg`, bgColor: 'bg-red-50' };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg`, bgColor: 'bg-green-50' };
  };

  return (
    <div className="space-y-6">
      {/* Weight Input Section */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
        <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Gewicht eintragen
        </h4>
        <div className="flex gap-3">
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
            className="flex-1 bg-background/60 border-primary/20 focus:border-primary/40"
            step="0.1"
          />
          <Button 
            onClick={handleAddWeight} 
            disabled={!newWeight}
            className="bg-primary/90 hover:bg-primary text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-1" />
            Hinzufügen
          </Button>
        </div>
        
        {/* Weight Trend Indicator */}
        {(() => {
          const trend = getWeightTrend();
          if (!trend) return null;
          const IconComponent = trend.icon;
          return (
            <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg ${trend.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${trend.color}`} />
              <span className={`text-sm font-medium ${trend.color}`}>
                Letzte Änderung: {trend.text}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Weight Prognosis Section */}
      {(() => {
        const prognosis = calculateWeightPrognosis();
        if (!prognosis) {
          return (
            <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-6 border border-border/30">
              <div className="text-center">
                <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h4 className="font-medium text-muted-foreground mb-2">Prognose wird geladen...</h4>
                <p className="text-sm text-muted-foreground">
                  Stelle sicher, dass dein Profil und deine Ziele vollständig ausgefüllt sind.
                </p>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-emerald-200/30 dark:border-emerald-700/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Intelligente Gewichtsprognose</h4>
                <p className="text-sm text-muted-foreground">Basierend auf deinen aktuellen Gewohnheiten</p>
              </div>
            </div>
            
            {prognosis.type === 'warning' ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-4 border border-orange-200/30">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-orange-600 text-sm">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-orange-700 dark:text-orange-300 mb-1">
                        Achtung: Ziel nicht erreichbar
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        {prognosis.message}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg p-4 border border-blue-200/30">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 text-sm">💡</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                        Empfehlung
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {prognosis.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : prognosis.type === 'maintain' ? (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-200/30">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-green-700 dark:text-green-300 mb-1">
                      Ziel erreicht!
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 mb-2">
                      {prognosis.message}
                    </div>
                    <div className="text-xs text-green-500 dark:text-green-400">
                      💡 {prognosis.suggestion}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main Prediction */}
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-5 border border-indigo-200/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                      {prognosis.type === 'loss' ? (
                        <TrendingDown className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-indigo-700 dark:text-indigo-300">
                        {prognosis.type === 'loss' ? '📉 Abnehmen' : '📈 Zunehmen'}
                      </div>
                      <div className="text-sm text-indigo-600 dark:text-indigo-400">
                        Zielgewicht in ca.{' '}
                        {prognosis.monthsToTarget > 1 
                          ? `${prognosis.monthsToTarget} Monaten` 
                          : prognosis.weeksToTarget > 1 
                            ? `${prognosis.weeksToTarget} Wochen`
                            : `${prognosis.daysToTarget} Tagen`
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Voraussichtlich am {prognosis.targetDate}</span>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-xs text-indigo-500 dark:text-indigo-400">
                    📊 Basierend auf deiner aktuellen Kalorienzufuhr von durchschnittlich {Math.round(averageCalorieIntake)} kcal/Tag
                  </div>
                </div>
                
                {/* Progress Visualization */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-border/30">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {prognosis.weightDifference.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">kg verbleibend</div>
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-border/30">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary mb-1">
                        {Math.abs(prognosis.dailyCalorieBalance)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        kcal {prognosis.dailyCalorieBalance > 0 ? 'Überschuss' : 'Defizit'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
