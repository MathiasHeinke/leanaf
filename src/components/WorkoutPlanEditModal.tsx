import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Minus, Save, X, Dumbbell, Clock, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  rpe?: number;
  rest_seconds?: number;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
  main_exercises?: string[];
  rep_range?: string;
  rest_between_sets?: string;
}

interface WorkoutPlanEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: any) => void;
  planData: {
    id: string;
    name: string;
    goal: string;
    days_per_wk: number;
    structure?: {
      weekly_structure?: WorkoutDay[];
      principles?: string[];
      markus_rules?: string[];
    };
  };
}

export const WorkoutPlanEditModal: React.FC<WorkoutPlanEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  planData
}) => {
  const [editedPlan, setEditedPlan] = useState({
    name: planData.name,
    goal: planData.goal,
    days_per_wk: planData.days_per_wk,
    structure: planData.structure || { weekly_structure: [] }
  });

  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  useEffect(() => {
    setEditedPlan({
      name: planData.name,
      goal: planData.goal,
      days_per_wk: planData.days_per_wk,
      structure: planData.structure || { weekly_structure: [] }
    });
  }, [planData]);

  const addExercise = (dayIndex: number) => {
    const newStructure = { ...editedPlan.structure };
    if (!newStructure.weekly_structure) newStructure.weekly_structure = [];
    
    if (!newStructure.weekly_structure[dayIndex]) {
      newStructure.weekly_structure[dayIndex] = {
        day: `Tag ${dayIndex + 1}`,
        focus: '',
        exercises: []
      };
    }

        newStructure.weekly_structure[dayIndex].exercises.push({
          name: '',
          sets: 3,
          reps: '8-12',
          weight: '',
          rpe: 8,
          rest_seconds: 120
        } as Exercise);

    setEditedPlan({ ...editedPlan, structure: newStructure });
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newStructure = { ...editedPlan.structure };
    if (newStructure.weekly_structure?.[dayIndex]) {
      newStructure.weekly_structure[dayIndex].exercises.splice(exerciseIndex, 1);
      setEditedPlan({ ...editedPlan, structure: newStructure });
    }
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: keyof Exercise, value: any) => {
    const newStructure = { ...editedPlan.structure };
    if (newStructure.weekly_structure?.[dayIndex]?.exercises[exerciseIndex]) {
      newStructure.weekly_structure[dayIndex].exercises[exerciseIndex][field] = value;
      setEditedPlan({ ...editedPlan, structure: newStructure });
    }
  };

  const updateDayInfo = (dayIndex: number, field: 'day' | 'focus', value: string) => {
    const newStructure = { ...editedPlan.structure };
    if (!newStructure.weekly_structure) newStructure.weekly_structure = [];
    
    if (!newStructure.weekly_structure[dayIndex]) {
      newStructure.weekly_structure[dayIndex] = {
        day: `Tag ${dayIndex + 1}`,
        focus: '',
        exercises: []
      };
    }

    newStructure.weekly_structure[dayIndex][field] = value;
    setEditedPlan({ ...editedPlan, structure: newStructure });
  };

  const handleSave = () => {
    // Validate plan
    if (!editedPlan.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Namen für den Trainingsplan ein.",
        variant: "destructive"
      });
      return;
    }

    if (!editedPlan.structure.weekly_structure || editedPlan.structure.weekly_structure.length === 0) {
      toast({
        title: "Fehler", 
        description: "Der Trainingsplan muss mindestens einen Trainingstag enthalten.",
        variant: "destructive"
      });
      return;
    }

    // Validate each day has exercises
    const invalidDays = editedPlan.structure.weekly_structure.filter(day => 
      !day.exercises || day.exercises.length === 0 || day.exercises.some(ex => !ex.name.trim())
    );

    if (invalidDays.length > 0) {
      toast({
        title: "Fehler",
        description: "Alle Trainingstage müssen gültige Übungen enthalten.",
        variant: "destructive"
      });
      return;
    }

    onSave({
      ...planData,
      ...editedPlan
    });

    toast({
      title: "Trainingsplan aktualisiert",
      description: "Deine Änderungen wurden gespeichert.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Trainingsplan bearbeiten
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Basics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={editedPlan.name}
                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                placeholder="z.B. Push/Pull/Legs"
              />
            </div>
            <div>
              <Label htmlFor="plan-goal">Trainingsziel</Label>
              <Input
                id="plan-goal"
                value={editedPlan.goal}
                onChange={(e) => setEditedPlan({ ...editedPlan, goal: e.target.value })}
                placeholder="z.B. Muskelaufbau, Kraft"
              />
            </div>
            <div>
              <Label htmlFor="days-per-week">Tage pro Woche</Label>
              <Input
                id="days-per-week"
                type="number"
                min="1"
                max="7"
                value={editedPlan.days_per_wk}
                onChange={(e) => setEditedPlan({ ...editedPlan, days_per_wk: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Training Days */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Trainingstage</h3>
            
            {editedPlan.structure.weekly_structure?.map((day, dayIndex) => (
              <Card key={dayIndex} className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tag Name</Label>
                      <Input
                        value={day.day}
                        onChange={(e) => updateDayInfo(dayIndex, 'day', e.target.value)}
                        placeholder="z.B. Push Tag, Brust/Trizeps"
                      />
                    </div>
                    <div>
                      <Label>Fokus</Label>
                      <Input
                        value={day.focus}
                        onChange={(e) => updateDayInfo(dayIndex, 'focus', e.target.value)}
                        placeholder="z.B. Brust, Schultern, Trizeps"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Übungen
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addExercise(dayIndex)}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Übung hinzufügen
                      </Button>
                    </div>

                    {day.exercises?.map((exercise, exerciseIndex) => (
                      <div key={exerciseIndex} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 bg-background/50 rounded border">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Übung</Label>
                          <Input
                            size="sm"
                            value={exercise.name}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'name', e.target.value)}
                            placeholder="z.B. Bankdrücken"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sätze</Label>
                          <Input
                            size="sm"
                            type="number"
                            min="1"
                            max="10"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'sets', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Wiederholungen</Label>
                          <Input
                            size="sm"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'reps', e.target.value)}
                            placeholder="8-12"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Gewicht (kg)</Label>
                          <Input
                            size="sm"
                            value={exercise.weight || ''}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'weight', e.target.value)}
                            placeholder="80"
                          />
                        </div>
                        <div className="flex items-end gap-1">
                          <div className="flex-1">
                            <Label className="text-xs">RPE</Label>
                            <Input
                              size="sm"
                              type="number"
                              min="1"
                              max="10"
                              value={exercise.rpe || ''}
                              onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'rpe', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="8"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeExercise(dayIndex, exerciseIndex)}
                            className="p-1 h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {(!day.exercises || day.exercises.length === 0) && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Noch keine Übungen hinzugefügt</p>
                        <p className="text-sm">Klicke auf "Übung hinzufügen" um zu starten</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Day Button */}
            <Button
              variant="outline"
              onClick={() => {
                const newStructure = { ...editedPlan.structure };
                if (!newStructure.weekly_structure) newStructure.weekly_structure = [];
                newStructure.weekly_structure.push({
                  day: `Tag ${newStructure.weekly_structure.length + 1}`,
                  focus: '',
                  exercises: []
                });
                setEditedPlan({ ...editedPlan, structure: newStructure });
              }}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Trainingstag hinzufügen
            </Button>
          </div>

          {/* Plan Principles (Read-only) */}
          {editedPlan.structure.principles && (
            <div>
              <h4 className="font-medium mb-2">Trainingsprinzipien</h4>
              <div className="space-y-1">
                {editedPlan.structure.principles.map((principle, index) => (
                  <Badge key={index} variant="secondary" className="mr-2 mb-1">
                    {principle}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Änderungen speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};