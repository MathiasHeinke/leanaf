import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Clock, Target, Zap, Calendar, Dumbbell } from 'lucide-react';
import type { EnhancedTrainingPlan } from '@/types/enhanced-training-plan';

interface EnhancedTrainingPlanCardProps {
  plan: EnhancedTrainingPlan;
  onAccept?: (planId: string) => void;
  onCustomize?: (planId: string) => void;
  onDecline?: (planId: string) => void;
  className?: string;
}

export const EnhancedTrainingPlanCard: React.FC<EnhancedTrainingPlanCardProps> = ({
  plan,
  onAccept,
  onCustomize,
  onDecline,
  className = ''
}) => {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [isMainExpanded, setIsMainExpanded] = useState(false);

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  const activeDays = plan.days.filter(day => !day.isRestDay);
  const totalExercises = activeDays.reduce((sum, day) => sum + day.exercises.length, 0);
  const avgExercisesPerDay = Math.round(totalExercises / activeDays.length);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-primary mb-2">
              🏋️ {plan.name}
            </CardTitle>
            <p className="text-muted-foreground text-sm mb-3">
              {plan.description}
            </p>
            
            {/* Plan Metadata */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {plan.durationWeeks} Wochen
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                {plan.targetFrequency}x/Woche
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Dumbbell className="w-3 h-3 mr-1" />
                {totalExercises} Übungen
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {plan.planType}
              </Badge>
            </div>

            {/* Scientific Basis */}
            {plan.scientificBasis.methodology && (
              <div className="text-xs text-green-600 dark:text-green-400 mb-2">
                🔬 Basiert auf: {plan.scientificBasis.methodology}
              </div>
            )}

            {/* Goals */}
            <div className="flex flex-wrap gap-1 mb-3">
              {plan.goals.map((goal, index) => (
                <Badge key={index} variant="default" className="text-xs">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>

          {/* Main Expand/Collapse */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMainExpanded(!isMainExpanded)}
            className="ml-2"
          >
            {isMainExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {onAccept && (
            <Button 
              onClick={() => onAccept(plan.id)}
              variant="default"
              size="sm"
              className="flex-1"
            >
              ✅ Plan aktivieren
            </Button>
          )}
          {onCustomize && (
            <Button 
              onClick={() => onCustomize(plan.id)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              🛠️ Anpassen
            </Button>
          )}
          {onDecline && (
            <Button 
              onClick={() => onDecline(plan.id)}
              variant="destructive"
              size="sm"
            >
              🗑️
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Collapsible Content */}
      <Collapsible open={isMainExpanded} onOpenChange={setIsMainExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Training Days */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                Trainingsplan ({plan.days.length} Tage)
              </h4>
              
              {plan.days.map((day) => (
                <div key={day.dayId} className="border rounded-lg p-3">
                  <Collapsible 
                    open={expandedDays[day.dayId]}
                    onOpenChange={() => toggleDay(day.dayId)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded -m-2">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            {day.dayName}
                          </div>
                          {day.isRestDay ? (
                            <Badge variant="outline" className="text-xs">
                              Ruhetag
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {day.focus}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {day.exercises.length} Übungen
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!day.isRestDay && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              ~{day.exercises.length * 8}min
                            </div>
                          )}
                          {expandedDays[day.dayId] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-3">
                      {!day.isRestDay && (
                        <div className="space-y-2">
                          {day.exercises.map((exercise, exerciseIndex) => (
                            <div key={exerciseIndex} className="bg-background/50 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-sm">{exercise.exerciseName}</div>
                                {exercise.isSuperset && (
                                  <Badge variant="outline" className="text-xs">
                                    Superset
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Exercise Sets */}
                              <div className="space-y-1">
                                {exercise.sets.map((set, setIndex) => (
                                  <div key={setIndex} className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="w-8">S{set.setNumber}:</span>
                                    {set.targetReps && (
                                      <span>{set.targetReps} Wdh</span>
                                    )}
                                    {set.targetRepsRange && (
                                      <span>{set.targetRepsRange} Wdh</span>
                                    )}
                                    {set.targetLoadKg && (
                                      <span>{set.targetLoadKg}kg</span>
                                    )}
                                    {set.targetPct1RM && (
                                      <span>{set.targetPct1RM}% 1RM</span>
                                    )}
                                    {set.targetRPE && (
                                      <span>RPE {set.targetRPE}</span>
                                    )}
                                    {set.targetRIR && (
                                      <span>RIR {set.targetRIR}</span>
                                    )}
                                    <span>• {Math.round(set.restSeconds / 60)}min Pause</span>
                                  </div>
                                ))}
                              </div>

                              {/* Exercise Notes */}
                              {exercise.notes && (
                                <div className="text-xs text-muted-foreground mt-2 italic">
                                  💡 {exercise.notes}
                                </div>
                              )}

                              {/* Muscle Groups */}
                              {exercise.muscleGroups.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {exercise.muscleGroups.map((muscle, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {muscle}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>

            {/* Progression Scheme */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h5 className="font-semibold text-sm mb-2">📈 Progressionsschema</h5>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Typ: {plan.progressionScheme.type}</div>
                {plan.progressionScheme.volumeProgression && (
                  <div>✓ Volumen-Progression aktiviert</div>
                )}
                {plan.progressionScheme.intensityProgression && (
                  <div>✓ Intensitäts-Progression aktiviert</div>
                )}
                {plan.progressionScheme.frequencyAdjustment && (
                  <div>✓ Frequenz-Anpassung aktiviert</div>
                )}
              </div>
            </div>

            {/* Scientific Basis Details */}
            {plan.scientificBasis.appliedPrinciples.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h5 className="font-semibold text-sm text-green-700 dark:text-green-300 mb-2">
                  🔬 Angewandte Trainingsprinzipien
                </h5>
                <div className="flex flex-wrap gap-1">
                  {plan.scientificBasis.appliedPrinciples.map((principle, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-green-600 border-green-200">
                      {principle}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};