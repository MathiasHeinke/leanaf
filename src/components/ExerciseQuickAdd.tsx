import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Save, Dumbbell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomExerciseManager } from './CustomExerciseManager';

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  is_compound: boolean;
  created_by?: string;
}

interface ExerciseSet {
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string;
}

interface ExerciseQuickAddProps {
  onSessionSaved?: () => void;
}

export const ExerciseQuickAdd: React.FC<ExerciseQuickAddProps> = ({ onSessionSaved }) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [workoutType, setWorkoutType] = useState<string>('strength');
  const [sessionName, setSessionName] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([
    { exercise_id: '', set_number: 1, weight_kg: null, reps: null, rpe: null, notes: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Fehler beim Laden der Übungen');
    } finally {
      setIsLoading(false);
    }
  };

  const workoutTypes = [
    { value: 'strength', label: 'Krafttraining' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'stretching', label: 'Stretching' },
    { value: 'functional', label: 'Functional Training' },
    { value: 'custom', label: 'Sonstiges' }
  ];

  const addSet = () => {
    const newSet: ExerciseSet = {
      exercise_id: selectedExercise,
      set_number: sets.length + 1,
      weight_kg: sets[sets.length - 1]?.weight_kg || null,
      reps: null,
      rpe: null,
      notes: ''
    };
    setSets([...sets, newSet]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: keyof ExerciseSet, value: any) => {
    const updatedSets = sets.map((set, i) => {
      if (i === index) {
        return { ...set, [field]: value };
      }
      return set;
    });
    setSets(updatedSets);
  };

  const saveSession = async () => {
    if (!user || !selectedExercise) {
      toast.error('Bitte wähle eine Übung aus');
      return;
    }

    if (sets.some(set => !set.reps || !set.weight_kg)) {
      toast.error('Bitte fülle alle Sätze aus');
      return;
    }

    try {
      setIsSaving(true);

      // Create exercise session
      const { data: sessionData, error: sessionError } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName || 'Quick Training',
          workout_type: workoutType,
          date: new Date().toISOString().split('T')[0],
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create exercise sets
      const setsToInsert = sets.map((set, index) => ({
        session_id: sessionData.id,
        exercise_id: selectedExercise,
        user_id: user.id,
        set_number: index + 1,
        weight_kg: set.weight_kg,
        reps: set.reps,
        rpe: set.rpe,
        notes: set.notes
      }));

      const { error: setsError } = await supabase
        .from('exercise_sets')
        .insert(setsToInsert);

      if (setsError) throw setsError;

      toast.success('Training erfolgreich gespeichert!');
      
      // Reset form
      setSelectedExercise('');
      setWorkoutType('strength');
      setSessionName('');
      setSets([{ exercise_id: '', set_number: 1, weight_kg: null, reps: null, rpe: null, notes: '' }]);
      
      onSessionSaved?.();

    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Fehler beim Speichern des Trainings');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedExerciseData = exercises.find(ex => ex.id === selectedExercise);

  // Group exercises by type
  const systemExercises = exercises.filter(ex => !ex.created_by);
  const customExercises = exercises.filter(ex => ex.created_by);

  return (
    <Card className="border-gradient-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Übung hinzufügen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="workoutType">Trainingstyp</Label>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger>
                <SelectValue placeholder="Typ wählen" />
              </SelectTrigger>
              <SelectContent>
                {workoutTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionName">Trainingsname (optional)</Label>
            <Input
              id="sessionName"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="z.B. Push Day"
            />
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <Label htmlFor="exercise">Übung</Label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger>
                <SelectValue placeholder="Übung wählen" />
              </SelectTrigger>
              <SelectContent>
                {systemExercises.length > 0 && (
                  <>
                    {systemExercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        {exercise.name} ({exercise.category})
                      </SelectItem>
                    ))}
                  </>
                )}
                {customExercises.length > 0 && (
                  <>
                    {systemExercises.length > 0 && <Separator className="my-1" />}
                    {customExercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        <span className="text-primary">★</span> {exercise.name} ({exercise.category})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          {selectedExerciseData && (
            <div className="p-3 bg-secondary/20 rounded-lg flex-1 mr-4">
              <p className="text-sm text-muted-foreground">
                <strong>Muskelgruppen:</strong> {selectedExerciseData.muscle_groups.join(', ')}
              </p>
              {selectedExerciseData.is_compound && (
                <p className="text-sm text-primary font-medium">✓ Grundübung</p>
              )}
              {selectedExerciseData.created_by && (
                <p className="text-sm text-primary font-medium">★ Eigene Übung</p>
              )}
            </div>
          )}
          <CustomExerciseManager onExerciseAdded={loadExercises} />
        </div>

        {selectedExercise && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sätze</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSet}
                className="h-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {sets.map((set, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 items-center">
                <div className="text-sm font-medium text-center">
                  {index + 1}.
                </div>
                <div>
                  <NumericInput
                    placeholder="kg"
                    value={set.weight_kg || ''}
                    onChange={(value) => updateSet(index, 'weight_kg', parseFloat(value) || null)}
                    allowDecimals={true}
                    min={0}
                    className="text-center"
                  />
                </div>
                <div>
                  <NumericInput
                    placeholder="Wdh"
                    value={set.reps || ''}
                    onChange={(value) => updateSet(index, 'reps', parseInt(value) || null)}
                    allowDecimals={false}
                    min={0}
                    className="text-center"
                  />
                </div>
                <div>
                  <Select
                    value={set.rpe?.toString() || ''}
                    onValueChange={(value) => updateSet(index, 'rpe', parseInt(value) || null)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="RPE" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    placeholder="Notiz"
                    value={set.notes}
                    onChange={(e) => updateSet(index, 'notes', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSet(index)}
                    disabled={sets.length === 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground">
              <div></div>
              <div className="text-center">Gewicht</div>
              <div className="text-center">Wdh.</div>
              <div className="text-center">RPE</div>
              <div className="text-center">Notiz</div>
              <div></div>
            </div>
          </div>
        )}

        <Button
          onClick={saveSession}
          disabled={!selectedExercise || isSaving || isLoading}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Speichere...' : 'Training speichern'}
        </Button>
      </CardContent>
    </Card>
  );
};