import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Moon, 
  Activity,
  TrendingUp,
  Star,
  Utensils
} from 'lucide-react';
import { PerformancePattern, MetabolicProfile } from '@/hooks/useAdvancedAnalytics';

interface PerformanceOptimizationProps {
  patterns: PerformancePattern;
  metabolicProfile: MetabolicProfile;
  loading?: boolean;
}

export const PerformanceOptimization: React.FC<PerformanceOptimizationProps> = ({ 
  patterns, 
  metabolicProfile,
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Optimization
          </CardTitle>
          <CardDescription>
            Analysiere deine optimalen Trainings- und Ernährungsmuster...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDayName = (day: string) => {
    const dayMap: Record<string, string> = {
      'Monday': 'Montag',
      'Tuesday': 'Dienstag', 
      'Wednesday': 'Mittwoch',
      'Thursday': 'Donnerstag',
      'Friday': 'Freitag',
      'Saturday': 'Samstag',
      'Sunday': 'Sonntag'
    };
    return dayMap[day] || day;
  };

  const getEfficiencyColor = (efficiency: number) => {
    // 7700 cal per kg is theoretical, lower is better efficiency
    if (efficiency < 6000) return 'text-green-600 dark:text-green-400';
    if (efficiency < 8000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getEfficiencyLabel = (efficiency: number) => {
    if (efficiency < 6000) return 'Sehr effizient';
    if (efficiency < 8000) return 'Effizient';
    return 'Weniger effizient';
  };

  return (
    <div className="grid gap-6">
      {/* Training Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Trainings-Optimierung
          </CardTitle>
          <CardDescription>
            Deine besten Trainingstage und optimale Erholungsmuster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Best Training Days */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Beste Trainingstage
              </h4>
              <div className="flex flex-wrap gap-2">
                {patterns.bestTrainingDays.map((day, index) => (
                  <Badge key={index} variant="default" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {getDayName(day)}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                An diesen Tagen zeigst du die beste Trainingsperformance
              </p>
            </div>

            {/* Recovery Pattern */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Optimal Schlaf</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {patterns.recoveryPattern.avgSleepForGoodWorkout.toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Für beste Performance
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Trainingsfrequenz</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {patterns.recoveryPattern.trainingFrequency.toFixed(1)}x
                </div>
                <p className="text-xs text-muted-foreground">
                  Pro Woche optimal
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Ruhetage</span>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {patterns.recoveryPattern.optimalRestDays}
                </div>
                <p className="text-xs text-muted-foreground">
                  Zwischen Einheiten
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Timing Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Mahlzeiten-Timing
          </CardTitle>
          <CardDescription>
            Optimale Zeiten für deine Nährstoffaufnahme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patterns.optimalMealTiming.map((meal, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">{meal.time}</span>
                  <Badge variant={meal.impact >= 85 ? 'default' : 'secondary'} className="text-xs">
                    {meal.impact >= 85 ? 'Optimal' : meal.impact >= 75 ? 'Gut' : 'Okay'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={meal.impact} className="w-16 h-2" />
                  <span className="text-sm text-muted-foreground w-8">
                    {meal.impact}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metabolic Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stoffwechsel-Profil
          </CardTitle>
          <CardDescription>
            Deine individuellen metabolischen Eigenschaften
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Metabolic Efficiency */}
            <div className="p-4 border rounded-lg bg-card/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-medium">Stoffwechsel-Effizienz</span>
                </div>
                <Badge variant="outline">
                  {getEfficiencyLabel(metabolicProfile.efficiency)}
                </Badge>
              </div>
              <div className={`text-2xl font-bold mb-2 ${getEfficiencyColor(metabolicProfile.efficiency)}`}>
                {metabolicProfile.efficiency.toLocaleString()} cal/kg
              </div>
              <p className="text-sm text-muted-foreground">
                Kalorien pro kg Gewichtsveränderung. Niedriger = effizienter.
              </p>
            </div>

            {/* Macro Sensitivity */}
            <div>
              <h4 className="font-medium mb-3">Makronährstoff-Sensitivität</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {(metabolicProfile.macroSensitivity.protein * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm">Protein</div>
                  <Progress value={metabolicProfile.macroSensitivity.protein * 100} className="mt-2 h-1" />
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {(metabolicProfile.macroSensitivity.carbs * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm">Carbs</div>
                  <Progress value={metabolicProfile.macroSensitivity.carbs * 100} className="mt-2 h-1" />
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {(metabolicProfile.macroSensitivity.fats * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm">Fette</div>
                  <Progress value={metabolicProfile.macroSensitivity.fats * 100} className="mt-2 h-1" />
                </div>
              </div>
            </div>

            {/* Hydration Impact */}
            <div className="p-4 border rounded-lg bg-card/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                <span className="font-medium">Hydration Impact</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {(metabolicProfile.hydrationImpact * 100).toFixed(0)}%
                </span>
                <Progress value={metabolicProfile.hydrationImpact * 100} className="w-32 h-2" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Einfluss der Hydration auf deine Gesamtperformance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};