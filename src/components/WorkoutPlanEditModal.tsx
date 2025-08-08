import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Save, X, Dumbbell, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '@/integrations/supabase/client';

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
  const [exerciseOptions, setExerciseOptions] = useState<{ name: string }[]>([]);

  useEffect(() => {
    setEditedPlan({
      name: planData.name,
      goal: planData.goal,
      days_per_wk: planData.days_per_wk,
      structure: planData.structure || { weekly_structure: [] }
    });
  }, [planData]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('exercises')
          .select('name')
          .order('name', { ascending: true })
          .limit(300);
        const unique = Array.from(new Map((data || []).map((x: any) => [x.name, { name: x.name }])).values());
        setExerciseOptions(unique);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

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
    });

    setEditedPlan({ ...editedPlan, structure: newStructure });
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newStructure = { ...editedPlan.structure };
    if (newStructure.weekly_structure?.[dayIndex]) {
      newStructure.weekly_structure[dayIndex].exercises.splice(exerciseIndex, 1);
      setEditedPlan({ ...editedPlan, structure: newStructure });
    }
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<Exercise>) => {
    const newStructure = { ...editedPlan.structure };
    if (newStructure.weekly_structure?.[dayIndex]?.exercises[exerciseIndex]) {
      newStructure.weekly_structure[dayIndex].exercises[exerciseIndex] = {
        ...newStructure.weekly_structure[dayIndex].exercises[exerciseIndex],
        ...updates
      };
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
    if (!editedPlan.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Namen für den Trainingsplan ein.",
        variant: "destructive"
      });
      return;
    }

    onSave({ ...planData, ...editedPlan });
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
                value={editedPlan.days_per_wk.toString()}
                onChange={(e) => setEditedPlan({ ...editedPlan, days_per_wk: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

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
                          <Select
                            value={exercise.name || undefined}
                            onValueChange={(val) => {
                              if (val === '__manual__') {
                                const custom = window.prompt('Übung manuell eingeben');
                                if (custom && custom.trim()) updateExercise(dayIndex, exerciseIndex, { name: custom.trim() });
                              } else {
                                updateExercise(dayIndex, exerciseIndex, { name: val });
                              }
                            }}
                          >
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue placeholder={exercise.name || 'Übung auswählen'} />
                            </SelectTrigger>
                            <SelectContent className="z-[60]">
                              <SelectItem value="__manual__">Freitext eingeben…</SelectItem>
                              {exerciseOptions.map((opt) => (
                                <SelectItem key={opt.name} value={opt.name}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Sätze</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={exercise.sets.toString()}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { sets: parseInt(e.target.value) || 1 })}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Wiederholungen</Label>
                          <Input
                            value={exercise.reps}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { reps: e.target.value })}
                            placeholder="8-12"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Gewicht (kg)</Label>
                          <Input
                            value={exercise.weight || ''}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { weight: e.target.value })}
                            placeholder="80"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-end gap-1">
                          <div className="flex-1">
                            <Label className="text-xs">RPE</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={exercise.rpe?.toString() || ''}
                              onChange={(e) => updateExercise(dayIndex, exerciseIndex, { rpe: e.target.value ? parseInt(e.target.value) : undefined })}
                              placeholder="8"
                              className="text-sm"
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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