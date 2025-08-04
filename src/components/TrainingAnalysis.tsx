import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dumbbell, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  Calendar,
  BarChart3,
  Trophy,
  Activity,
  Footprints,
  Heart
} from "lucide-react";
import { useUnifiedWorkoutData } from "@/hooks/useUnifiedWorkoutData";
import { calculateTrainingPrognosis, type TrainingPrognosisData } from "@/utils/trainingPrognosis";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface TrainingAnalysisProps {
  timeRange?: 'week' | 'month' | 'year';
}

export const TrainingAnalysis = ({ timeRange = 'month' }: TrainingAnalysisProps) => {
  const { user } = useAuth();
  const { workoutData, loading } = useUnifiedWorkoutData(timeRange);
  const [profileData, setProfileData] = useState<any>(null);
  const [stepsData, setStepsData] = useState<any[]>([]);
  const [activityScore, setActivityScore] = useState<number>(0);

  useEffect(() => {
    if (user) {
      loadProfileData();
      loadStepsData();
    }
  }, [user, timeRange]);

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

  const loadStepsData = async () => {
    if (!user) return;

    try {
      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setStepsData(data || []);
    } catch (error) {
      console.error('Error loading steps data:', error);
      setStepsData([]);
    }
  };

  // Calculate training prognosis first (before any hooks)
  const trainingPrognosis = loading ? null : calculateTrainingPrognosis({
    workoutData,
    timeRange,
    profileData
  });

  // Calculate activity score when data is available
  useEffect(() => {
    if (trainingPrognosis && stepsData.length >= 0) {
      const avgSteps = stepsData.reduce((sum, day) => sum + (day.steps || 0), 0) / stepsData.length;
      const workoutScore = (trainingPrognosis.weeklyWorkouts / 4) * 50; // Max 50 points for workouts
      const stepsScore = Math.min((avgSteps / 10000) * 50, 50); // Max 50 points for steps
      
      const totalScore = Math.round(workoutScore + stepsScore);
      setActivityScore(totalScore);
    }
  }, [trainingPrognosis, stepsData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!trainingPrognosis) {
    return (
      <Card className="glass-card shadow-lg border border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">Training & Kraft</div>
              <div className="text-sm text-muted-foreground font-normal">Noch keine Trainingsdaten vorhanden</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Starte dein erstes Workout um deine Trainingsanalyse zu sehen!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'volume': return BarChart3;
      case 'rpe': return Zap;
      case 'strength': return Dumbbell;
      case 'discrepancy': return AlertTriangle;
      case 'progression': return TrendingUp;
      case 'correlation': return Activity;
      case 'habit': return Calendar;
      case 'trend': return TrendingUp;
      default: return Activity;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 dark:border-red-700/30 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-orange-200 dark:border-orange-700/30 bg-orange-50 dark:bg-orange-900/20';
      case 'low': return 'border-blue-200 dark:border-blue-700/30 bg-blue-50 dark:bg-blue-900/20';
      default: return 'border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <Card className="glass-card shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Training & Kraft</div>
            <div className="text-sm text-muted-foreground font-normal">Deine Trainingsauswertung</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Training Overview */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Trainingsübersicht ({timeRange === 'week' ? 'Woche' : timeRange === 'month' ? 'Monat' : 'Jahr'})
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Weekly Workouts */}
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/30">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 truncate">Workouts/Woche</div>
              <div className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-300">
                {trainingPrognosis.weeklyWorkouts.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="hidden md:inline">
                  {trainingPrognosis.weeklyWorkouts >= 3 ? '💪 Sehr gut' : trainingPrognosis.weeklyWorkouts >= 2 ? '👍 Gut' : '⚠️ Zu wenig'}
                </span>
                <span className="md:hidden">
                  {trainingPrognosis.weeklyWorkouts >= 3 ? '💪' : trainingPrognosis.weeklyWorkouts >= 2 ? '👍' : '⚠️'}
                </span>
              </div>
            </div>

            {/* Average RPE */}
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1 truncate">Ø RPE</div>
              <div className="text-lg md:text-xl font-bold text-green-700 dark:text-green-300">
                {trainingPrognosis.averageRPE.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="hidden md:inline">
                  {trainingPrognosis.averageRPE >= 8 ? '🔥 Sehr hart' : trainingPrognosis.averageRPE >= 6.5 ? '💪 Hart' : '📈 Moderat'}
                </span>
                <span className="md:hidden">
                  {trainingPrognosis.averageRPE >= 8 ? '🔥' : trainingPrognosis.averageRPE >= 6.5 ? '💪' : '📈'}
                </span>
              </div>
            </div>

            {/* Total Volume */}
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700/30">
              <div className="text-xs text-purple-600 dark:text-purple-400 mb-1 truncate">Volumen</div>
              <div className="text-lg md:text-xl font-bold text-purple-700 dark:text-purple-300">
                <span className="hidden md:inline">{Math.round(trainingPrognosis.totalVolume)}kg</span>
                <span className="md:hidden">{(trainingPrognosis.totalVolume / 1000).toFixed(1)}t</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                {trainingPrognosis.volumeTrend === 'up' ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 hidden md:inline">Steigend</span>
                    <span className="text-green-600 md:hidden">↗</span>
                  </>
                ) : trainingPrognosis.volumeTrend === 'down' ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-600 hidden md:inline">Sinkend</span>
                    <span className="text-red-600 md:hidden">↘</span>
                  </>
                ) : (
                  <>
                    <span className="text-blue-600 hidden md:inline">Stabil</span>
                    <span className="text-blue-600 md:hidden">→</span>
                  </>
                )}
              </div>
            </div>

            {/* Discrepancies */}
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/30">
              <div className="text-xs text-orange-600 dark:text-orange-400 mb-1 truncate">Diskrepanzen</div>
              <div className="text-lg md:text-xl font-bold text-orange-700 dark:text-orange-300">
                {trainingPrognosis.discrepancies.length}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="hidden md:inline">
                  {trainingPrognosis.discrepancies.length === 0 ? '✅ Keine' : trainingPrognosis.discrepancies.length <= 2 ? '⚠️ Wenige' : '🚨 Viele'}
                </span>
                <span className="md:hidden">
                  {trainingPrognosis.discrepancies.length === 0 ? '✅' : trainingPrognosis.discrepancies.length <= 2 ? '⚠️' : '🚨'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Score - Integration von Training + Schritte */}
        {activityScore > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Gesamtaktivität Score
            </h4>
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activityScore}/100</div>
                    <div className="text-sm text-muted-foreground">
                      {activityScore >= 80 ? '🏆 Hervorragend' : activityScore >= 60 ? '💪 Sehr gut' : activityScore >= 40 ? '👍 Gut' : '📈 Verbesserbar'}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                  {stepsData.length > 0 ? `Ø ${Math.round(stepsData.reduce((sum, day) => sum + (day.steps || 0), 0) / stepsData.length).toLocaleString()} Schritte` : 'Keine Schrittdaten'}
                </Badge>
              </div>
              <Progress value={activityScore} className="h-3" />
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-orange-500" />
                  <span>Training: {Math.round((trainingPrognosis.weeklyWorkouts / 4) * 50)}/50</span>
                </div>
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-blue-500" />
                  <span>Schritte: {Math.round(Math.min((stepsData.reduce((sum, day) => sum + (day.steps || 0), 0) / stepsData.length / 10000) * 50, 50))}/50</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Korrelations-Analyse zwischen Training und Schritten */}
        {stepsData.length > 0 && trainingPrognosis.weeklyWorkouts > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Training & Schritte Korrelation
            </h4>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Trainingstage</div>
                  <div className="text-lg font-bold text-blue-600">
                    {Math.round(trainingPrognosis.weeklyWorkouts * (timeRange === 'week' ? 1 : timeRange === 'month' ? 4 : 52))}
                  </div>
                  <div className="text-xs text-muted-foreground">pro {timeRange === 'week' ? 'Woche' : timeRange === 'month' ? 'Monat' : 'Jahr'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Ø Schritte an Trainingstagen</div>
                  <div className="text-lg font-bold text-green-600">
                    {stepsData.length > 0 ? Math.round(stepsData.reduce((sum, day) => sum + (day.steps || 0), 0) / stepsData.length).toLocaleString() : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Schritte/Tag</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Aktivitätslevel</div>
                  <div className="text-lg font-bold text-purple-600">
                    {stepsData.reduce((sum, day) => sum + (day.steps || 0), 0) / stepsData.length >= 10000 ? 'Aktiv' : 
                     stepsData.reduce((sum, day) => sum + (day.steps || 0), 0) / stepsData.length >= 7500 ? 'Moderat' : 'Niedrig'}
                  </div>
                  <div className="text-xs text-muted-foreground">WHO Klassifikation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training Insights */}
        {trainingPrognosis.insights.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Trainings-Insights
            </h4>
            <div className="space-y-3">
              {trainingPrognosis.insights.map((insight, index) => {
                const IconComponent = getInsightIcon(insight.type);
                return (
                  <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(insight.priority)}`}>
                    <div className="flex items-start gap-3">
                      <IconComponent className={`h-5 w-5 mt-0.5 ${insight.color || 'text-gray-600'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{insight.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {insight.priority === 'high' ? 'Wichtig' : insight.priority === 'medium' ? 'Normal' : 'Info'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.value && insight.type === 'rpe' && (
                          <Progress 
                            value={(insight.value / 10) * 100} 
                            className="h-2 mt-2" 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Progressions */}
        {trainingPrognosis.topProgressions.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Top Fortschritte
            </h4>
            <div className="grid gap-3 sm:gap-4">
              {trainingPrognosis.topProgressions.map((progression, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-700/30 gap-2 sm:gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300 truncate">{progression.exercise}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs">
                      {progression.improvement}
                    </Badge>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discrepancy Details */}
        {trainingPrognosis.discrepancies.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Wahrnehmungs-Diskrepanzen
            </h4>
            <div className="space-y-3">
              {trainingPrognosis.discrepancies.slice(0, 3).map((discrepancy, index) => (
                <div key={index} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-orange-600 shrink-0" />
                      <span className="text-sm font-medium">{new Date(discrepancy.date).toLocaleDateString('de-DE')}</span>
                    </div>
                    <span className="text-xs text-orange-600 font-semibold">Δ {discrepancy.difference}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Gefühlt</div>
                      <Badge variant="outline" className="border-blue-500 text-blue-600 w-full justify-center">
                        {discrepancy.quickIntensity}/10
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Tatsächlich</div>
                      <Badge variant="outline" className="border-green-500 text-green-600 w-full justify-center">
                        {discrepancy.actualRPE} RPE
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {trainingPrognosis.discrepancies.length > 3 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{trainingPrognosis.discrepancies.length - 3} weitere Diskrepanzen
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};