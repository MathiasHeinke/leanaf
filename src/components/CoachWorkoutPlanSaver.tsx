import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CoachWorkoutPlanSaverProps {
  planText: string;
  coachName?: string;
  onSaved?: () => void;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rpe?: number;
  rest_seconds?: number;
  weight_kg?: number;
  notes?: string;
}

export const CoachWorkoutPlanSaver: React.FC<CoachWorkoutPlanSaverProps> = ({
  planText,
  coachName = 'Coach',
  onSaved
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [planName, setPlanName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Extract exercises from coach's text
  const parseCoachPlan = (text: string): Exercise[] => {
    const exercises: Exercise[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Look for exercise patterns like "**1. Kniebeuge**" or "1. Kniebeuge"
      const exerciseMatch = line.match(/^\*?\*?(\d+\.?\s*)(.+?)\*?\*?$/);
      if (exerciseMatch) {
        const exerciseName = exerciseMatch[2].trim();
        
        // Skip if it's a header or section title
        if (exerciseName.includes('Ganzkörper') || exerciseName.includes('Session') || 
            exerciseName.includes('Hinweise') || exerciseName.includes('Warm-up')) {
          continue;
        }
        
        const exercise: Exercise = {
          name: exerciseName,
          sets: 3, // Default
          reps: '8-10', // Default
          rest_seconds: 90
        };
        
        // Look for additional details in following lines
        const nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 6);
        for (const nextLine of nextLines) {
          if (nextLine.includes('Sätze') && nextLine.includes('Wiederholungen')) {
            const setsMatch = nextLine.match(/(\d+)\s*Sätze/);
            const repsMatch = nextLine.match(/(\d+(?:-\d+)?)\s*Wiederholungen/);
            if (setsMatch) exercise.sets = parseInt(setsMatch[1]);
            if (repsMatch) exercise.reps = repsMatch[1];
          }
          
          if (nextLine.includes('RPE')) {
            const rpeMatch = nextLine.match(/RPE:\s*(\d+)/);
            if (rpeMatch) exercise.rpe = parseInt(rpeMatch[1]);
          }
          
          if (nextLine.includes('Pause')) {
            const pauseMatch = nextLine.match(/(\d+)\s*Sekunden/);
            if (pauseMatch) exercise.rest_seconds = parseInt(pauseMatch[1]);
          }
          
          if (nextLine.includes('Fokus:')) {
            exercise.notes = nextLine.replace('Fokus:', '').trim();
          }
        }
        
        exercises.push(exercise);
      }
    }
    
    return exercises;
  };

  const handleSave = async () => {
    if (!user?.id || !planName.trim() || !category) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setIsSaving(true);
    try {
      const exercises = parseCoachPlan(planText);
      
      if (exercises.length === 0) {
        toast.error('Keine Übungen im Plan gefunden');
        return;
      }

      const estimatedDuration = exercises.length * 8; // 8 Minuten pro Übung

      const { error } = await supabase
        .from('workout_plans')
        .insert({
          name: planName,
          category: category,
          description: description || `Erstellt von ${coachName}`,
          exercises: exercises as any,
          created_by: user.id,
          estimated_duration_minutes: estimatedDuration,
          is_public: false
        });

      if (error) throw error;

      toast.success(`Trainingsplan "${planName}" gespeichert!`);
      setIsOpen(false);
      onSaved?.();
      
      // Reset form
      setPlanName('');
      setCategory('');
      setDescription('');
      
    } catch (error) {
      console.error('Error saving workout plan:', error);
      toast.error('Fehler beim Speichern des Trainingsplans');
    } finally {
      setIsSaving(false);
    }
  };

  const exercises = parseCoachPlan(planText);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="mt-2"
      >
        <Save className="h-4 w-4 mr-2" />
        Als Trainingsplan speichern
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trainingsplan speichern</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="planName">Name des Trainingsplans *</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="z.B. Ganzkörper Kraftaufbau"
              />
            </div>

            <div>
              <Label htmlFor="category">Kategorie *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Push">Push</SelectItem>
                  <SelectItem value="Pull">Pull</SelectItem>
                  <SelectItem value="Legs">Legs</SelectItem>
                  <SelectItem value="Full Body">Full Body</SelectItem>
                  <SelectItem value="Cardio">Cardio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Erstellt von ${coachName}`}
                rows={2}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>{exercises.length} Übungen</strong> erkannt:</p>
              <ul className="list-disc list-inside">
                {exercises.slice(0, 3).map((ex, i) => (
                  <li key={i}>{ex.name}</li>
                ))}
                {exercises.length > 3 && <li>...und {exercises.length - 3} weitere</li>}
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};