import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Dumbbell, 
  Activity, 
  Target,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface ExerciseSet {
  id: string;
  weight_kg: number;
  reps: number;
  rpe: number;
  exercises: {
    name: string;
    category: string;
  };
}

interface AdvancedSession {
  id: string;
  session_name: string;
  start_time: string;
  end_time: string;
  exercise_sets: ExerciseSet[];
}

interface QuickWorkout {
  id: string;
  workout_type: string;
  duration_minutes: number;
  intensity: number;
  did_workout: boolean;
  distance_km?: number;
  steps?: number;
}

interface UnifiedWorkoutCardProps {
  date: string;
  quickWorkouts: QuickWorkout[];
  advancedSessions: AdvancedSession[];
  onEdit?: (workout: QuickWorkout | AdvancedSession) => void;
}

export const UnifiedWorkoutCard = ({ 
  date, 
  quickWorkouts, 
  advancedSessions, 
  onEdit 
}: UnifiedWorkoutCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const calculateAdvancedStats = (sessions: AdvancedSession[]) => {
    const allSets = sessions.flatMap(s => s.exercise_sets);
    const totalVolume = allSets.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0);
    const averageRPE = allSets.length > 0 
      ? allSets.reduce((sum, set) => sum + set.rpe, 0) / allSets.length 
      : 0;
    const uniqueExercises = new Set(allSets.map(set => set.exercises.name));
    
    return {
      totalVolume: Math.round(totalVolume),
      averageRPE: Math.round(averageRPE * 10) / 10,
      exerciseCount: uniqueExercises.size,
      setCount: allSets.length
    };
  };

  const calculateDuration = (session: AdvancedSession) => {
    if (!session.start_time || !session.end_time) return 0;
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const getWorkoutTypeEmoji = (type: string) => {
    switch (type) {
      case 'kraft': return '💪';
      case 'cardio': return '🏃';
      case 'yoga': return '🧘';
      case 'stretching': return '🤸';
      case 'pause': return '🏝️';
      default: return '🏋️';
    }
  };

  const getIntensityDiscrepancy = (quickIntensity: number, advancedRPE: number) => {
    const discrepancy = Math.abs(quickIntensity - advancedRPE);
    if (discrepancy >= 2) {
      return {
        level: 'high',
        message: `Wahrnehmung (${quickIntensity}/10) vs. tatsächliche RPE (${advancedRPE}) weichen stark ab`,
        color: 'text-red-600'
      };
    } else if (discrepancy >= 1) {
      return {
        level: 'medium',
        message: `Leichte Abweichung: Wahrnehmung ${quickIntensity}/10, RPE ${advancedRPE}`,
        color: 'text-yellow-600'
      };
    }
    return null;
  };

  const hasWorkouts = quickWorkouts.length > 0 || advancedSessions.length > 0;
  
  if (!hasWorkouts) return null;

  const stats = calculateAdvancedStats(advancedSessions);
  const actualWorkouts = quickWorkouts.filter(w => w.did_workout);
  const restDays = quickWorkouts.filter(w => !w.did_workout);

  // Check for intensity discrepancies
  const discrepancy = actualWorkouts.length > 0 && advancedSessions.length > 0 
    ? getIntensityDiscrepancy(
        actualWorkouts.reduce((sum, w) => sum + w.intensity, 0) / actualWorkouts.length,
        stats.averageRPE
      )
    : null;

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{formatDate(date)}</h3>
                  {discrepancy && (
                    <Badge variant="outline" className={`${discrepancy.color} border-current`}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      RPE-Abweichung
                    </Badge>
                  )}
                </div>
                
                {/* Compact Summary */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {actualWorkouts.map((workout, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      <span>{getWorkoutTypeEmoji(workout.workout_type)}</span>
                      {workout.duration_minutes}min ({workout.intensity}/10)
                    </Badge>
                  ))}
                  
                  {advancedSessions.map((session, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {session.session_name} - {stats.exerciseCount} Übungen (ø RPE {stats.averageRPE})
                    </Badge>
                  ))}
                  
                  {restDays.map((_, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      🏝️ Ruhetag
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {advancedSessions.length > 0 && (
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{stats.totalVolume.toLocaleString()}kg Volumen</div>
                    <div>{stats.setCount} Sätze</div>
                  </div>
                )}
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-4">
              {/* Intensity Discrepancy Alert */}
              {discrepancy && (
                <div className={`p-3 rounded-lg border ${
                  discrepancy.level === 'high' 
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' 
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${discrepancy.color}`} />
                    <p className={`text-sm font-medium ${discrepancy.color}`}>
                      Intensitäts-Diskrepanz erkannt
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {discrepancy.message}
                  </p>
                </div>
              )}

              {/* Quick Workouts Details */}
              {actualWorkouts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Allgemeines Training
                  </h4>
                  {actualWorkouts.map((workout, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getWorkoutTypeEmoji(workout.workout_type)}</span>
                            <span className="font-medium">
                              {workout.workout_type === 'kraft' ? 'Krafttraining' : 
                               workout.workout_type === 'cardio' ? 'Cardio' : 'Training'}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {workout.duration_minutes} Min • Intensität: {workout.intensity}/10
                            {workout.distance_km && ` • ${workout.distance_km}km`}
                            {workout.steps && ` • ${workout.steps.toLocaleString()} Schritte`}
                          </div>
                        </div>
                        {onEdit && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(workout)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Advanced Sessions Details */}
              {advancedSessions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Detailliertes Krafttraining
                  </h4>
                  {advancedSessions.map((session, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{session.session_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {calculateDuration(session)} Min • {session.exercise_sets.length} Sätze
                          </div>
                        </div>
                        {onEdit && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(session)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Exercise breakdown */}
                      <div className="space-y-2">
                        {Object.entries(
                          session.exercise_sets.reduce((acc, set) => {
                            const name = set.exercises.name;
                            if (!acc[name]) {
                              acc[name] = {
                                sets: [],
                                category: set.exercises.category
                              };
                            }
                            acc[name].sets.push(set);
                            return acc;
                          }, {} as Record<string, { sets: ExerciseSet[], category: string }>)
                        ).map(([exerciseName, data]) => {
                          const avgRPE = data.sets.reduce((sum, set) => sum + set.rpe, 0) / data.sets.length;
                          const totalVolume = data.sets.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0);
                          
                          return (
                            <div key={exerciseName} className="text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{exerciseName}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{data.sets.length} Sätze</span>
                                  <span>•</span>
                                  <span>{Math.round(totalVolume)}kg</span>
                                  <span>•</span>
                                  <span className={`font-medium ${
                                    avgRPE >= 8 ? 'text-red-600' :
                                    avgRPE >= 6 ? 'text-orange-600' :
                                    avgRPE >= 4 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    ø RPE {Math.round(avgRPE * 10) / 10}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rest Days */}
              {restDays.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    🏝️ Regeneration
                  </h4>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Ruhetag eingetragen - Regeneration ist genauso wichtig wie Training! 💪
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};