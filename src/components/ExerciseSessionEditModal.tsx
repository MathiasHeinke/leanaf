import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ExerciseSet {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number;
  exercises: {
    name: string;
    category: string;
  };
}

interface ExerciseSession {
  id: string;
  session_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  exercise_sets: ExerciseSet[];
}

interface ExerciseSessionEditModalProps {
  session: ExerciseSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
}

export const ExerciseSessionEditModal: React.FC<ExerciseSessionEditModalProps> = ({
  session,
  isOpen,
  onClose,
  onSessionUpdated
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionName, setSessionName] = useState('');
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      setSessionName(session.session_name || '');
      setNotes(session.notes || '');
      setSets(session.exercise_sets || []);
    }
  }, [session]);

  const updateSet = (setId: string, field: keyof ExerciseSet, value: any) => {
    setSets(prev => prev.map(set => 
      set.id === setId ? { ...set, [field]: value } : set
    ));
  };

  const removeSet = (setId: string) => {
    setSets(prev => prev.filter(set => set.id !== setId));
  };

  const addSet = (exerciseId: string, exerciseName: string, exerciseCategory: string) => {
    const exerciseSets = sets.filter(set => set.exercise_id === exerciseId);
    const nextSetNumber = Math.max(...exerciseSets.map(s => s.set_number), 0) + 1;
    
    // Get default values from the last set of this exercise
    const lastSet = exerciseSets[exerciseSets.length - 1];
    
    const newSet: ExerciseSet = {
      id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID for new sets
      exercise_id: exerciseId,
      set_number: nextSetNumber,
      weight_kg: lastSet?.weight_kg || 0,
      reps: lastSet?.reps || 10,
      rpe: lastSet?.rpe,
      exercises: {
        name: exerciseName,
        category: exerciseCategory
      }
    };
    
    setSets(prev => [...prev, newSet]);
  };

  const handleSave = async () => {
    if (!user || !session) return;

    try {
      setIsLoading(true);

      // Update session details
      const { error: sessionError } = await supabase
        .from('exercise_sessions')
        .update({
          session_name: sessionName,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Handle sets (update existing, insert new)
      for (const set of sets) {
        if (set.id.startsWith('temp-')) {
          // Insert new set
          const { error: insertError } = await supabase
            .from('exercise_sets')
            .insert({
              session_id: session.id,
              exercise_id: set.exercise_id,
              user_id: user.id,
              set_number: set.set_number,
              weight_kg: set.weight_kg,
              reps: set.reps,
              rpe: set.rpe
            });

          if (insertError) throw insertError;
        } else {
          // Update existing set
          const { error: setError } = await supabase
            .from('exercise_sets')
            .update({
              weight_kg: set.weight_kg,
              reps: set.reps,
              rpe: set.rpe,
              updated_at: new Date().toISOString()
            })
            .eq('id', set.id);

          if (setError) throw setError;
        }
      }

      // Delete removed sets
      const originalSetIds = session.exercise_sets.map(s => s.id);
      const currentSetIds = sets.map(s => s.id);
      const removedSetIds = originalSetIds.filter(id => !currentSetIds.includes(id));

      if (removedSetIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('exercise_sets')
          .delete()
          .in('id', removedSetIds);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Training aktualisiert",
        description: "Deine Änderungen wurden erfolgreich gespeichert."
      });

      onSessionUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Fehler",
        description: "Training konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Training bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessionName">Trainingsname</Label>
              <Input
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="z.B. Push-Tag, Beine, etc."
              />
            </div>
            <div>
              <Label>Datum</Label>
              <Input value={session.date} disabled />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trainingsnotizen..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Übungen & Sätze</h3>
            
            {Object.entries(
              sets.reduce((acc, set) => {
                const exerciseName = set.exercises.name;
                if (!acc[exerciseName]) {
                  acc[exerciseName] = [];
                }
                acc[exerciseName].push(set);
                return acc;
              }, {} as Record<string, ExerciseSet[]>)
            ).map(([exerciseName, exerciseSets]) => (
              <div key={exerciseName} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{exerciseName}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{exerciseSets.length} Sätze</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSet(exerciseSets[0].exercise_id, exerciseName, exerciseSets[0].exercises.category)}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Satz hinzufügen
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {exerciseSets.map((set) => (
                    <div 
                      key={set.id} 
                      className={`grid grid-cols-5 gap-2 items-center ${
                        set.id.startsWith('temp-') ? 'bg-green-50 dark:bg-green-900/20 p-2 rounded' : ''
                      }`}
                    >
                      <div className="text-sm text-muted-foreground">
                        Satz {set.set_number}
                      </div>
                      
                      <div>
                        <Label className="text-xs">Gewicht (kg)</Label>
                        <NumericInput
                          value={set.weight_kg || ''}
                          onChange={(value) => updateSet(set.id, 'weight_kg', parseFloat(value) || 0)}
                          allowDecimals={true}
                          min={0}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Wiederholungen</Label>
                        <NumericInput
                          value={set.reps || ''}
                          onChange={(value) => updateSet(set.id, 'reps', parseInt(value) || 0)}
                          allowDecimals={false}
                          min={0}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">RPE</Label>
                        <NumericInput
                          value={set.rpe || ''}
                          onChange={(value) => updateSet(set.id, 'rpe', parseInt(value) || undefined)}
                          allowDecimals={false}
                          min={1}
                          max={10}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSet(set.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Speichern...' : 'Änderungen speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};