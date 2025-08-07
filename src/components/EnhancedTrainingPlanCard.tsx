import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Clock, Target, Zap, Calendar, Dumbbell, TrendingUp, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExerciseWithDetails {
  name: string;
  sets: string;
  reps: string;
  rpe?: string;
  weight?: string;
  rest?: string;
  notes?: string;
}

interface TrainingDay {
  day: string;
  focus: string;
  exercises: ExerciseWithDetails[];
}

interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  favoriteExercises: Array<{ name: string; volume: number }>;
  strengthEstimates: Record<string, number>;
  experienceLevel: string;
  weeklyFrequency: number;
}

interface CoachStyle {
  id: string;
  name: string;
  style: string;
  focus: string;
}

interface EnhancedTrainingPlanCardProps {
  name: string;
  plan: TrainingDay[];
  goal: string;
  daysPerWeek: number;
  description?: string;
  principles?: string[];
  userStats?: UserStats;
  coachStyle?: CoachStyle;
  progressionPlan?: any;
  savedPlanId?: string;
  className?: string;
}

export const EnhancedTrainingPlanCard: React.FC<EnhancedTrainingPlanCardProps> = ({
  name,
  plan,
  goal,
  daysPerWeek,
  description,
  principles = [],
  userStats,
  coachStyle,
  progressionPlan,
  savedPlanId,
  className = ''
}) => {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [showUserStats, setShowUserStats] = useState(false);
  const navigate = useNavigate();

  const toggleDay = (dayIndex: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
  };

  const handleOpenInTrainingPlus = () => {
    if (savedPlanId) {
      navigate('/training', { 
        state: { 
          activePlanId: savedPlanId,
          autoStart: true 
        } 
      });
    }
  };

  const goalIcons = {
    strength: '💪',
    hypertrophy: '🏗️',
    endurance: '🏃',
    general: '⚡'
  };

  const goalColors = {
    strength: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    hypertrophy: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    endurance: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    general: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
  };

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{goalIcons[goal] || '🏋️'}</span>
              {name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={goalColors[goal] || goalColors.general}>
                {goal === 'hypertrophy' ? 'Muskelaufbau' : 
                 goal === 'strength' ? 'Kraftaufbau' :
                 goal === 'endurance' ? 'Ausdauer' : 'Fitness'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {daysPerWeek} Tage/Woche
              </Badge>
              {coachStyle && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Coach {coachStyle.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground mt-2">
            {description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        {userStats && userStats.totalWorkouts > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Basierend auf deinen Daten:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserStats(!showUserStats)}
                className="h-6 px-2 text-xs"
              >
                {showUserStats ? 'Weniger' : 'Details'}
                {showUserStats ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{userStats.totalWorkouts}</div>
                <div className="text-muted-foreground">Workouts</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{Math.round(userStats.totalVolume)}kg</div>
                <div className="text-muted-foreground">Volume</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{userStats.experienceLevel}</div>
                <div className="text-muted-foreground">Level</div>
              </div>
            </div>

            {showUserStats && (
              <div className="mt-3 space-y-2 border-t pt-2">
                {userStats.favoriteExercises.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1">Deine Top-Übungen:</div>
                    {userStats.favoriteExercises.slice(0, 3).map((ex, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {i + 1}. {ex.name} ({Math.round(ex.volume)}kg)
                      </div>
                    ))}
                  </div>
                )}
                
                {Object.keys(userStats.strengthEstimates).length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1">Geschätzte 1RM:</div>
                    {Object.entries(userStats.strengthEstimates).slice(0, 3).map(([exercise, weight]) => (
                      <div key={exercise} className="text-xs text-muted-foreground">
                        {exercise}: {weight}kg
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Training Days */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Trainingsplan ({plan.length} Tage)</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMainExpanded(!isMainExpanded)}
              className="h-6 px-2 text-xs"
            >
              {isMainExpanded ? 'Einklappen' : 'Alle anzeigen'}
              {isMainExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          </div>

          {plan.slice(0, isMainExpanded ? plan.length : 2).map((day, dayIndex) => (
            <Collapsible key={dayIndex}>
              <CollapsibleTrigger
                className="flex items-center justify-between w-full p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                onClick={() => toggleDay(dayIndex.toString())}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
                    {dayIndex + 1}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{day.day}</div>
                    <div className="text-xs text-muted-foreground">{day.focus}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {day.exercises?.length || 0} Übungen
                  </Badge>
                  {expandedDays[dayIndex.toString()] ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2">
                <div className="space-y-2 pl-11">
                  {day.exercises?.map((exercise, exIndex) => (
                    <div key={exIndex} className="bg-background border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{exercise.name}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" />
                              {exercise.sets} x {exercise.reps}
                            </span>
                            {exercise.rpe && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                RPE {exercise.rpe}
                              </span>
                            )}
                            {exercise.rest && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exercise.rest}
                              </span>
                            )}
                          </div>
                          {exercise.weight && (
                            <div className="text-xs text-primary mt-1 font-medium">
                              Empfohlenes Gewicht: {exercise.weight}
                            </div>
                          )}
                          {exercise.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {exercise.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {!isMainExpanded && plan.length > 2 && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMainExpanded(true)}
                className="text-xs text-muted-foreground"
              >
                +{plan.length - 2} weitere Trainingstage anzeigen
              </Button>
            </div>
          )}
        </div>

        {/* Coaching Principles */}
        {principles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Trainingsprinzipien</h4>
            <div className="space-y-1">
              {principles.slice(0, 3).map((principle, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{principle}</span>
                </div>
              ))}
              {principles.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{principles.length - 3} weitere Prinzipien
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 border-t">
          <Button 
            onClick={handleOpenInTrainingPlus}
            className="w-full"
            size="sm"
          >
            <Target className="mr-2 h-4 w-4" />
            In Training+ öffnen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};