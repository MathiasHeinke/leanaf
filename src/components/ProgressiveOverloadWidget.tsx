import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, ArrowRight, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProgressiveOverloadData {
  exercise: string;
  lastWeek: {
    weight: number;
    reps: number;
    sets: number;
  };
  suggestion: {
    weight: number;
    reps: number;
    type: 'weight' | 'reps' | 'sets';
    increase: number;
  };
}

export const ProgressiveOverloadWidget: React.FC = () => {
  const { user } = useAuth();
  const [overloadData, setOverloadData] = useState<ProgressiveOverloadData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgressiveOverloadData();
    }
  }, [user]);

  const loadProgressiveOverloadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get data from last 2 weeks to compare
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: recentSets, error } = await supabase
        .from('exercise_sets')
        .select(`
          weight_kg,
          reps,
          created_at,
          exercises (
            name,
            category
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group exercises and calculate suggestions
      const exerciseGroups = recentSets?.reduce((acc: any, set: any) => {
        const exerciseName = set.exercises?.name;
        if (!exerciseName) return acc;

        if (!acc[exerciseName]) {
          acc[exerciseName] = [];
        }
        acc[exerciseName].push({
          weight: set.weight_kg || 0,
          reps: set.reps || 0,
          date: new Date(set.created_at)
        });
        return acc;
      }, {});

      // Calculate progressive overload suggestions
      const suggestions: ProgressiveOverloadData[] = [];
      
      Object.entries(exerciseGroups || {}).forEach(([exercise, sets]: [string, any]) => {
        if (sets.length < 2) return;

        // Get last week's best performance
        const lastWeekSets = sets.filter((set: any) => set.date >= oneWeekAgo);
        const previousWeekSets = sets.filter((set: any) => set.date < oneWeekAgo && set.date >= twoWeeksAgo);
        
        if (lastWeekSets.length === 0 || previousWeekSets.length === 0) return;

        // Find best set from last week
        const bestLastWeek = lastWeekSets.reduce((best: any, current: any) => {
          const currentVolume = current.weight * current.reps;
          const bestVolume = best.weight * best.reps;
          return currentVolume > bestVolume ? current : best;
        });

        // Create suggestion based on progression pattern
        let suggestion = { ...bestLastWeek };
        let type: 'weight' | 'reps' | 'sets' = 'weight';
        let increase = 0;

        if (bestLastWeek.weight >= 20) {
          // For heavier weights, increase weight by 2.5kg
          suggestion.weight = Math.round((bestLastWeek.weight + 2.5) * 2) / 2;
          increase = 2.5;
          type = 'weight';
        } else if (bestLastWeek.reps < 12) {
          // For lighter weights or high rep ranges, increase reps
          suggestion.reps = bestLastWeek.reps + 1;
          increase = 1;
          type = 'reps';
        } else {
          // Fallback to small weight increase
          suggestion.weight = Math.round((bestLastWeek.weight + 1.25) * 4) / 4;
          increase = 1.25;
          type = 'weight';
        }

        suggestions.push({
          exercise,
          lastWeek: {
            weight: bestLastWeek.weight,
            reps: bestLastWeek.reps,
            sets: 1 // Simplified for now
          },
          suggestion: {
            weight: suggestion.weight,
            reps: suggestion.reps,
            type,
            increase
          }
        });
      });

      setOverloadData(suggestions.slice(0, 3)); // Show top 3 suggestions
    } catch (error) {
      console.error('Error loading progressive overload data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <TrendingUp className="h-4 w-4" />
            Progressive Overload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Analysiere Trainingsfortschritt...</div>
        </CardContent>
      </Card>
    );
  }

  if (overloadData.length === 0) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <TrendingUp className="h-4 w-4" />
            Progressive Overload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            Trainiere mindestens 2 Wochen regelmäßig für Steigerungsvorschläge.
          </div>
          <Badge variant="outline" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Mehr Daten benötigt
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <TrendingUp className="h-4 w-4" />
          Progressive Overload
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            {overloadData.length} Vorschläge
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overloadData.map((data, index) => (
          <div key={index} className="bg-background/50 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm truncate">{data.exercise}</h4>
              <Badge 
                variant={data.suggestion.type === 'weight' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                +{data.suggestion.type === 'weight' ? `${data.suggestion.increase}kg` : `${data.suggestion.increase} reps`}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                Letzte Woche: {data.lastWeek.weight}kg × {data.lastWeek.reps}
              </span>
              <ArrowRight className="h-3 w-3 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                Diese Woche: {data.suggestion.weight}kg × {data.suggestion.reps}
              </span>
            </div>
          </div>
        ))}
        
        <div className="text-xs text-muted-foreground mt-2 text-center">
          💡 Steigere schrittweise für optimale Fortschritte
        </div>
      </CardContent>
    </Card>
  );
};