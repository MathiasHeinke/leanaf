import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Scale, Activity, Calendar, TrendingUp } from "lucide-react";
import { formatNutritionalValue } from "@/utils/numberFormatting";
import { formatGermanDate } from "@/utils/formatDate";

interface GoalsData {
  currentWeight: number;
  targetWeight: number;
  currentBodyFat: number;
  targetBodyFat: number;
  currentBMI: number;
  targetBMI: number;
  targetDate: string;
  daysRemaining: number;
  weightProgress: number;
  bodyFatProgress: number;
  bmiProgress: number;
}

export const GoalsProgressWidget = () => {
  const { user } = useAuth();
  const [goalsData, setGoalsData] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadGoalsData();
    }
  }, [user?.id]);

  const calculateBMI = (weight: number, height: number): number => {
    if (height <= 0) return 0;
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const calculateProgress = (current: number, target: number, start: number): number => {
    if (start === target) return 100;
    const progress = ((current - start) / (target - start)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const loadGoalsData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get profile data with goals
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get latest weight (body_measurements doesn't have body_fat_percentage)
      const weightResult = await supabase
        .from('weight_history')
        .select('weight, body_fat_percentage')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);

      const currentWeight = weightResult.data?.[0]?.weight || profile.weight || 0;
      const currentBodyFat = weightResult.data?.[0]?.body_fat_percentage || 0;

      const targetWeight = profile.target_weight || currentWeight;
      const targetBodyFat = profile.target_body_fat_percentage || currentBodyFat;
      const height = profile.height || 170;

      const currentBMI = calculateBMI(currentWeight, height);
      const targetBMI = calculateBMI(targetWeight, height);

      // Calculate days remaining
      const targetDate = profile.target_date;
      let daysRemaining = 0;
      if (targetDate) {
        const target = new Date(targetDate);
        const today = new Date();
        daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate progress percentages
      const startWeight = profile.start_weight || currentWeight;
      const weightProgress = calculateProgress(currentWeight, targetWeight, startWeight);
      
      // For body fat, we assume starting point was higher (typical goal is reduction)
      const startBodyFat = currentBodyFat > targetBodyFat ? currentBodyFat + 5 : targetBodyFat + 5;
      const bodyFatProgress = targetBodyFat > 0 ? calculateProgress(currentBodyFat, targetBodyFat, startBodyFat) : 0;
      
      // BMI progress
      const startBMI = calculateBMI(startWeight, height);
      const bmiProgress = calculateProgress(currentBMI, targetBMI, startBMI);

      setGoalsData({
        currentWeight,
        targetWeight,
        currentBodyFat,
        targetBodyFat,
        currentBMI,
        targetBMI,
        targetDate: targetDate || '',
        daysRemaining,
        weightProgress,
        bodyFatProgress,
        bmiProgress
      });

    } catch (error) {
      console.error('Error loading goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!goalsData) {
    return (
      <Card className="glass-card shadow-lg border border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Ziele</div>
              <div className="text-sm text-muted-foreground font-normal">Fortschritt verfolgen</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Keine Ziele konfiguriert</p>
            <p className="text-sm text-muted-foreground mt-1">Setze deine Ziele im Profil</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getBMICategory = (bmi: number): { category: string; color: string } => {
    if (bmi < 18.5) return { category: "Untergewicht", color: "text-blue-600 dark:text-blue-400" };
    if (bmi < 25) return { category: "Normalgewicht", color: "text-green-600 dark:text-green-400" };
    if (bmi < 30) return { category: "Übergewicht", color: "text-orange-600 dark:text-orange-400" };
    return { category: "Adipositas", color: "text-red-600 dark:text-red-400" };
  };

  const currentBMICategory = getBMICategory(goalsData.currentBMI);
  const targetBMICategory = getBMICategory(goalsData.targetBMI);

  return (
    <Card className="glass-card shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Ziele Fortschritt</div>
            <div className="text-sm text-muted-foreground font-normal">Deine Zielerreichung</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weight Goal */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Gewichtsziel</span>
            <Badge variant="outline" className="text-xs ml-auto">
              {Math.round(goalsData.weightProgress)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aktuell</span>
              <span className="font-medium">{goalsData.currentWeight} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ziel</span>
              <span className="font-medium">{goalsData.targetWeight} kg</span>
            </div>
            <Progress 
              value={goalsData.weightProgress} 
              className="h-2 bg-orange-100 dark:bg-orange-800/50"
            />
          </div>
        </div>

        {/* Body Fat Goal */}
        {goalsData.targetBodyFat > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Körperfett-Ziel</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {Math.round(goalsData.bodyFatProgress)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktuell</span>
                <span className="font-medium">{goalsData.currentBodyFat}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ziel</span>
                <span className="font-medium">{goalsData.targetBodyFat}%</span>
              </div>
              <Progress 
                value={goalsData.bodyFatProgress} 
                className="h-2 bg-blue-100 dark:bg-blue-800/50"
              />
            </div>
          </div>
        )}

        {/* BMI Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">BMI Status</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Aktuell</div>
              <div className="text-lg font-bold">{goalsData.currentBMI.toFixed(1)}</div>
              <div className={`text-xs ${currentBMICategory.color}`}>
                {currentBMICategory.category}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Ziel</div>
              <div className="text-lg font-bold">{goalsData.targetBMI.toFixed(1)}</div>
              <div className={`text-xs ${targetBMICategory.color}`}>
                {targetBMICategory.category}
              </div>
            </div>
          </div>
        </div>

        {/* Target Date */}
        {goalsData.targetDate && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Zieldatum</span>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700/30">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {formatGermanDate(goalsData.targetDate)}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    {goalsData.daysRemaining > 0 
                      ? `Noch ${goalsData.daysRemaining} Tage`
                      : goalsData.daysRemaining === 0
                      ? "Heute ist Zieldatum!"
                      : `${Math.abs(goalsData.daysRemaining)} Tage überfällig`
                    }
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${
                    goalsData.daysRemaining > 30 
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : goalsData.daysRemaining > 0
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-red-500 text-red-600 dark:text-red-400'
                  }`}
                >
                  {goalsData.daysRemaining > 30 ? 'Im Plan' : goalsData.daysRemaining > 0 ? 'Eilig' : 'Überfällig'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};