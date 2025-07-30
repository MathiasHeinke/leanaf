import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Save, Dumbbell, ArrowLeft, ArrowRight, X, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';

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

interface TrainingQuickAddProps {
  onClose: () => void;
  onSessionSaved?: () => void;
}

type Step = 'exercise' | 'session' | 'sets' | 'review';

export const TrainingQuickAdd: React.FC<TrainingQuickAddProps> = ({ onClose, onSessionSaved }) => {
  const { user } = useAuth();
  const { stopTimer, hasActiveTimer, currentSessionId } = useWorkoutTimer();
  const [currentStep, setCurrentStep] = useState<Step>('exercise');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);
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
    loadRecentExercises();
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

  const loadRecentExercises = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          exercises (
            id,
            name,
            category,
            muscle_groups,
            is_compound,
            created_by
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const uniqueExercises = new Map();
      data?.forEach(set => {
        if (set.exercises && !uniqueExercises.has(set.exercises.id)) {
          uniqueExercises.set(set.exercises.id, set.exercises);
        }
      });
      
      setRecentExercises(Array.from(uniqueExercises.values()).slice(0, 5));
    } catch (error) {
      console.error('Error loading recent exercises:', error);
    }
  };

  const workoutTypes = [
    { value: 'strength', label: 'Krafttraining', emoji: '💪' },
    { value: 'cardio', label: 'Cardio', emoji: '❤️' },
    { value: 'stretching', label: 'Stretching', emoji: '🧘' },
    { value: 'functional', label: 'Functional Training', emoji: '⚡' },
    { value: 'custom', label: 'Sonstiges', emoji: '🎯' }
  ];

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSet: ExerciseSet = {
      exercise_id: selectedExercise,
      set_number: sets.length + 1,
      weight_kg: lastSet?.weight_kg || null,
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

  const nextStep = () => {
    if (currentStep === 'exercise' && !selectedExercise) {
      toast.error('Bitte wähle eine Übung aus');
      return;
    }
    
    const steps: Step[] = ['exercise', 'session', 'sets', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['exercise', 'session', 'sets', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
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

      // Check if timer is running and create a timer session if needed
      let sessionId: string;
      
      if (hasActiveTimer && currentSessionId) {
        // Timer is running - add exercise sets directly to temporary session
        // They will be collected when timer stops
        const setsToInsert = sets.map((set, index) => ({
          session_id: currentSessionId, // Use temporary session ID
          exercise_id: selectedExercise,
          user_id: user.id,
          set_number: index + 1,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe,
          notes: set.notes
        }));

        // Insert sets with the current timer session ID
        const { error: setsError } = await supabase
          .from('exercise_sets')
          .insert(setsToInsert);

        if (setsError) throw setsError;

        toast.success('Übung zu laufendem Workout hinzugefügt!');
        onSessionSaved?.();
        onClose();
        return;
      }

      // No timer running - create standalone session
      const startTime = new Date();
      const endTime = new Date();

      // Create exercise session
      const { data: sessionData, error: sessionError } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName || 'Quick Training',
          workout_type: workoutType,
          date: new Date().toISOString().split('T')[0],
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
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
      onSessionSaved?.();

    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Fehler beim Speichern des Trainings');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedExerciseData = exercises.find(ex => ex.id === selectedExercise);
  const selectedWorkoutType = workoutTypes.find(type => type.value === workoutType);

  const renderStepIndicator = () => {
    const steps = [
      { key: 'exercise', label: 'Übung' },
      { key: 'session', label: 'Session' },
      { key: 'sets', label: 'Sätze' },
      { key: 'review', label: 'Überprüfung' }
    ];
    
    const currentIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className="flex items-center justify-center space-x-2 mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              index <= currentIndex 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 transition-colors",
                index < currentIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderExerciseStep = () => (
    <div className="space-y-6">
      {recentExercises.length > 0 && (
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Zuletzt verwendet
          </h3>
          <div className="grid gap-2">
            {recentExercises.map((exercise) => (
              <Button
                key={exercise.id}
                variant={selectedExercise === exercise.id ? "default" : "outline"}
                className="justify-start h-auto p-4"
                onClick={() => setSelectedExercise(exercise.id)}
              >
                <div className="text-left">
                  <div className="font-medium">{exercise.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {exercise.category} • {exercise.muscle_groups.join(', ')}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-3">Alle Übungen</h3>
        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
          <SelectTrigger>
            <SelectValue placeholder="Übung wählen" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.created_by && <span className="text-primary">★ </span>}
                {exercise.name} ({exercise.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedExerciseData && (
        <div className="p-4 bg-secondary/10 rounded-lg border">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium">{selectedExerciseData.name}</h4>
            {selectedExerciseData.is_compound && (
              <Badge variant="secondary">Grundübung</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Kategorie:</strong> {selectedExerciseData.category}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Muskelgruppen:</strong> {selectedExerciseData.muscle_groups.join(', ')}
          </p>
        </div>
      )}
    </div>
  );

  const renderSessionStep = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium mb-4 block">Trainingstyp wählen</Label>
        <div className="grid gap-3">
          {workoutTypes.map((type) => (
            <Button
              key={type.value}
              variant={workoutType === type.value ? "default" : "outline"}
              className="justify-start h-auto p-4"
              onClick={() => setWorkoutType(type.value)}
            >
              <span className="text-lg mr-3">{type.emoji}</span>
              <span className="font-medium">{type.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sessionName">Trainingsname (optional)</Label>
        <Input
          id="sessionName"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="z.B. Push Day, Beine, oder leer lassen"
          className="text-base"
        />
        <p className="text-sm text-muted-foreground">
          Wenn leer, wird automatisch "Quick Training" verwendet
        </p>
      </div>
    </div>
  );

  const renderSetsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Sätze eingeben</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addSet}
        >
          <Plus className="h-4 w-4 mr-1" />
          Satz hinzufügen
        </Button>
      </div>

      <div className="space-y-4">
        {sets.map((set, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Satz {index + 1}</h4>
              {sets.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSet(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gewicht (kg)</Label>
                <NumericInput
                  value={set.weight_kg || ''}
                  onChange={(value) => updateSet(index, 'weight_kg', parseFloat(value) || null)}
                  allowDecimals={true}
                  min={0}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
              
              <div>
                <Label>Wiederholungen</Label>
                <NumericInput
                  value={set.reps || ''}
                  onChange={(value) => updateSet(index, 'reps', parseInt(value) || null)}
                  allowDecimals={false}
                  min={0}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
              
              <div>
                <Label>RPE (1-10)</Label>
                <Select
                  value={set.rpe?.toString() || ''}
                  onValueChange={(value) => updateSet(index, 'rpe', parseInt(value) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="RPE" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} - {i + 1 <= 6 ? 'Leicht' : i + 1 <= 8 ? 'Mittel' : 'Schwer'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Notiz (optional)</Label>
                <Input
                  value={set.notes}
                  onChange={(e) => updateSet(index, 'notes', e.target.value)}
                  placeholder="z.B. zu leicht"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">RPE Skala (Rate of Perceived Exertion)</p>
            <p>1-6: Leicht bis moderat • 7-8: Anstrengend • 9-10: Maximal</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h3 className="font-medium">Training überprüfen</h3>
      
      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-medium mb-2">Übung</h4>
          <p>{selectedExerciseData?.name}</p>
          <p className="text-sm text-muted-foreground">
            {selectedExerciseData?.category} • {selectedExerciseData?.muscle_groups.join(', ')}
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Session</h4>
          <p>{selectedWorkoutType?.emoji} {selectedWorkoutType?.label}</p>
          {sessionName && (
            <p className="text-sm text-muted-foreground">Name: {sessionName}</p>
          )}
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3">Sätze ({sets.length})</h4>
          <div className="space-y-2">
            {sets.map((set, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>Satz {index + 1}:</span>
                <span>{set.weight_kg}kg × {set.reps} (RPE {set.rpe})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Training hinzufügen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {renderStepIndicator()}

          <div className="min-h-[300px]">
            {currentStep === 'exercise' && renderExerciseStep()}
            {currentStep === 'session' && renderSessionStep()}
            {currentStep === 'sets' && renderSetsStep()}
            {currentStep === 'review' && renderReviewStep()}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 'exercise' ? onClose : prevStep}
              disabled={isSaving}
            >
              {currentStep === 'exercise' ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </>
              )}
            </Button>

            {currentStep === 'review' ? (
              <Button onClick={saveSession} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Speichere...' : 'Training speichern'}
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={isLoading}>
                Weiter
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};