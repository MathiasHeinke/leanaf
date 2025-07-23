import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface WorkoutEntry {
  id: string;
  date: string;
  did_workout: boolean;
  workout_type: string;
  duration_minutes: number;
  intensity: number;
  distance_km?: number;
  steps?: number;
  walking_notes?: string;
  notes?: string;
}

interface WorkoutEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  existingWorkout: WorkoutEntry | null;
  onWorkoutSaved: () => Promise<void>;
}

export const WorkoutEditModal: React.FC<WorkoutEditModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  existingWorkout,
  onWorkoutSaved
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [didWorkout, setDidWorkout] = useState(false);
  const [workoutType, setWorkoutType] = useState('kraft');
  const [duration, setDuration] = useState<number>(0);
  const [intensity, setIntensity] = useState<number>(5);
  const [distance, setDistance] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [walkingNotes, setWalkingNotes] = useState('');
  const [notes, setNotes] = useState('');

  const workoutTypes = [
    { value: 'kraft', label: 'Krafttraining' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'walking', label: 'Spazieren' },
    { value: 'running', label: 'Laufen' },
    { value: 'cycling', label: 'Radfahren' },
    { value: 'swimming', label: 'Schwimmen' },
    { value: 'yoga', label: 'Yoga' },
    { value: 'other', label: 'Sonstiges' }
  ];

  useEffect(() => {
    if (existingWorkout) {
      setDidWorkout(existingWorkout.did_workout);
      setWorkoutType(existingWorkout.workout_type);
      setDuration(existingWorkout.duration_minutes);
      setIntensity(existingWorkout.intensity);
      setDistance(existingWorkout.distance_km || 0);
      setSteps(existingWorkout.steps || 0);
      setWalkingNotes(existingWorkout.walking_notes || '');
      setNotes(existingWorkout.notes || '');
    } else {
      // Reset form for new workout
      setDidWorkout(true);
      setWorkoutType('kraft');
      setDuration(0);
      setIntensity(5);
      setDistance(0);
      setSteps(0);
      setWalkingNotes('');
      setNotes('');
    }
  }, [existingWorkout, isOpen]);

  const handleSave = async () => {
    if (!user || !selectedDate) return;

    try {
      setIsLoading(true);
      
      const workoutData = {
        user_id: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        did_workout: didWorkout,
        workout_type: workoutType,
        duration_minutes: duration,
        intensity: intensity,
        distance_km: workoutType === 'walking' || workoutType === 'running' || workoutType === 'cycling' ? distance : null,
        steps: workoutType === 'walking' ? steps : null,
        walking_notes: workoutType === 'walking' ? walkingNotes : null,
        notes: notes || null
      };

      if (existingWorkout) {
        // Update existing workout
        const { error } = await supabase
          .from('workouts')
          .update(workoutData)
          .eq('id', existingWorkout.id);

        if (error) throw error;
        
        toast({
          title: "Workout aktualisiert",
          description: "Dein Workout wurde erfolgreich aktualisiert."
        });
      } else {
        // Create new workout
        const { error } = await supabase
          .from('workouts')
          .insert([workoutData]);

        if (error) throw error;
        
        toast({
          title: "Workout gespeichert",
          description: "Dein Workout wurde erfolgreich gespeichert."
        });
      }

      await onWorkoutSaved();
      onClose();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: "Fehler",
        description: "Workout konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !existingWorkout) return;

    if (!confirm('Möchtest du dieses Workout wirklich löschen?')) return;

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', existingWorkout.id);

      if (error) throw error;
      
      toast({
        title: "Workout gelöscht",
        description: "Dein Workout wurde erfolgreich gelöscht."
      });

      await onWorkoutSaved();
      onClose();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast({
        title: "Fehler",
        description: "Workout konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if selectedDate is null
  if (!selectedDate) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingWorkout ? 'Workout bearbeiten' : 'Neues Workout'} - {format(selectedDate, 'dd.MM.yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="did_workout"
              checked={didWorkout}
              onCheckedChange={setDidWorkout}
            />
            <Label htmlFor="did_workout">Workout absolviert</Label>
          </div>

          {didWorkout && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workout_type">Workout-Art</Label>
                  <Select value={workoutType} onValueChange={setWorkoutType}>
                    <SelectTrigger>
                      <SelectValue />
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

                <div>
                  <Label htmlFor="duration">Dauer (Minuten)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="intensity">Intensität (1-10)</Label>
                <Select value={intensity.toString()} onValueChange={(v) => setIntensity(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} - {i < 3 ? 'Leicht' : i < 7 ? 'Mittel' : 'Intensiv'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(workoutType === 'walking' || workoutType === 'running' || workoutType === 'cycling') && (
                <div>
                  <Label htmlFor="distance">Distanz (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    value={distance}
                    onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              )}

              {workoutType === 'walking' && (
                <>
                  <div>
                    <Label htmlFor="steps">Schritte</Label>
                    <Input
                      id="steps"
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="walking_notes">Spazier-Notizen</Label>
                    <Textarea
                      id="walking_notes"
                      value={walkingNotes}
                      onChange={(e) => setWalkingNotes(e.target.value)}
                      placeholder="Wo warst du spazieren? Wie war es?"
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="notes">Allgemeine Notizen</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zusätzliche Notizen zum Workout..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t">
            <div>
              {existingWorkout && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  Löschen
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
