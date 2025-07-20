
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Target, Scale, Calendar, Clock, Zap } from "lucide-react";
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
        const averageDaily = totalCalories / 7;
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
    const dailyCalorieBalance = averageCalorieIntake - dailyGoals.tdee;
    const caloriesPerKg = 7700;
    
    let daysToTarget = 0;
    let prognosisType = '';
    
    if (targetWeight < currentWeight) {
      prognosisType = 'loss';
      if (dailyCalorieBalance < 0) {
        const dailyWeightLoss = Math.abs(dailyCalorieBalance) / caloriesPerKg;
        daysToTarget = weightDifference / dailyWeightLoss;
      } else {
        return {
          type: 'warning',
          message: 'Aktuelle Kalorienzufuhr führt zur Gewichtszunahme',
          suggestion: `Reduziere um ${Math.round(dailyCalorieBalance + 300)} kcal/Tag`
        };
      }
    } else if (targetWeight > currentWeight) {
      prognosisType = 'gain';
      if (dailyCalorieBalance > 0) {
        const dailyWeightGain = dailyCalorieBalance / caloriesPerKg;
        daysToTarget = weightDifference / dailyWeightGain;
      } else {
        return {
          type: 'warning',
          message: 'Aktuelle Kalorienzufuhr führt zur Gewichtsabnahme',
          suggestion: `Erhöhe um ${Math.round(Math.abs(dailyCalorieBalance) + 300)} kcal/Tag`
        };
      }
    } else {
      return {
        type: 'maintain',
        message: 'Zielgewicht erreicht!',
        suggestion: 'Halte deine aktuelle Kalorienzufuhr bei'
      };
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToTarget);
    const monthsToTarget = Math.ceil(daysToTarget / 30);

    return {
      type: prognosisType,
      daysToTarget: Math.round(daysToTarget),
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

  const prognosis = calculateWeightPrognosis();
  const trend = getWeightTrend();

  return (
    <div className="space-y-6">
      {/* Weight Input - Compact Design */}
      <Card className="glass-card hover-scale">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-medium text-foreground">Gewicht eintragen</h4>
          </div>
          
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
              className="flex-1"
              step="0.1"
            />
            <Button 
              onClick={handleAddWeight} 
              disabled={!newWeight}
              size="sm"
              className="px-4"
            >
              <Plus className="h-4 w-4 mr-1" />
              Hinzufügen
            </Button>
          </div>
          
          {/* Trend Badge */}
          {trend && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className={`${trend.color} border-current`}>
                <trend.icon className="h-3 w-3 mr-1" />
                {trend.text}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Weight Prognosis with Prominent Target Date */}
      {prognosis && (
        <Card className="glass-card hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Gewichtsprognose</h4>
                <p className="text-xs text-muted-foreground">Basierend auf aktuellen Gewohnheiten</p>
              </div>
            </div>
            
            {prognosis.type === 'warning' ? (
              <div className="space-y-3">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/30">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 text-sm">⚠️</span>
                    <div className="flex-1">
                      <div className="font-medium text-orange-700 dark:text-orange-300 text-sm mb-1">
                        {prognosis.message}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        💡 {prognosis.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : prognosis.type === 'maintain' ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-sm">✅</span>
                  <div className="flex-1">
                    <div className="font-medium text-green-700 dark:text-green-300 text-sm mb-1">
                      {prognosis.message}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      💡 {prognosis.suggestion}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prominent Target Date Display */}
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700/30 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      Zielgewicht erreicht am
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                    {prognosis.targetDate}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Das sind noch ca. {prognosis.monthsToTarget > 1 
                      ? `${prognosis.monthsToTarget} Monate` 
                      : `${Math.ceil(prognosis.daysToTarget / 7)} Wochen`
                    }
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-primary mb-1">
                      {prognosis.weightDifference.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">kg verbleibend</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className={`text-lg font-bold mb-1 ${
                      prognosis.dailyCalorieBalance < 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-500 dark:text-red-400'
                    }`}>
                      {prognosis.dailyCalorieBalance > 0 ? '+' : ''}{Math.round(prognosis.dailyCalorieBalance)}
                    </div>
                    <div className={`text-xs ${
                      prognosis.dailyCalorieBalance < 0 
                        ? 'text-green-600/80 dark:text-green-400/80' 
                        : 'text-red-500/80 dark:text-red-400/80'
                    }`}>
                      kcal {prognosis.dailyCalorieBalance > 0 ? 'Überschuss' : 'Defizit'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-700/20">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    {prognosis.type === 'loss' ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {prognosis.type === 'loss' ? 'Abnehmen' : 'Zunehmen'} - auf Kurs zum Ziel
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
