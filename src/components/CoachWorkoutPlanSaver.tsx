import React, { useState, useEffect } from 'react';
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

  // Enhanced parsing for various workout plan formats
  const parseCoachPlan = (text: string): Exercise[] => {
    const exercises: Exercise[] = [];
    const lines = text.split('\n');
    
    // Multiple pattern matching for different coach styles
    const patterns = [
      // Standard numbered list: "1. Exercise" or "**1. Exercise**"
      /^\*?\*?(\d+\.?\s*)(.+?)\*?\*?$/,
      // Bullet points: "- Exercise" or "• Exercise"
      /^[-•]\s*(.+)$/,
      // German style: "Übung 1: Name"
      /^Übung\s*\d+:\s*(.+)$/i,
      // Bold exercise names without numbers
      /^\*\*([^*]+)\*\*$/
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      let exerciseName = '';
      let matched = false;
      
      // Try each pattern
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          exerciseName = (match[2] || match[1]).trim();
          matched = true;
          break;
        }
      }
      
      if (!matched) continue;
      
      // Skip headers, sections, and non-exercise content
      const skipTerms = [
        'ganzkörper', 'session', 'hinweise', 'warm-up', 'cooldown', 'cool-down',
        'aufwärmen', 'dehnen', 'stretching', 'plan', 'training', 'workout',
        'übersicht', 'programm', 'woche', 'tag', 'montag', 'dienstag', 'mittwoch',
        'donnerstag', 'freitag', 'samstag', 'sonntag', 'ruhetag', 'pause'
      ];
      
      const shouldSkip = skipTerms.some(term => 
        exerciseName.toLowerCase().includes(term) || 
        exerciseName.length < 3 ||
        exerciseName.length > 50
      );
      
      if (shouldSkip) continue;
      
      // Create exercise with intelligent defaults
      const exercise: Exercise = {
        name: exerciseName,
        sets: 3,
        reps: '8-12',
        rest_seconds: 90
      };
      
      // Look ahead for exercise details in next 8 lines
      const lookAheadLines = lines.slice(i + 1, i + 8);
      
      for (const nextLine of lookAheadLines) {
        const lower = nextLine.toLowerCase();
        
        // Parse sets and reps patterns
        if (lower.includes('sätze') || lower.includes('sets')) {
          const setsMatch = nextLine.match(/(\d+)\s*(?:sätze|sets)/i);
          if (setsMatch) exercise.sets = parseInt(setsMatch[1]);
          
          // Also look for reps in same line
          const repsMatch = nextLine.match(/(\d+(?:[-–]\d+)?)\s*(?:wiederholungen|wdh|reps)/i);
          if (repsMatch) exercise.reps = repsMatch[1];
        }
        
        // Parse standalone reps
        if ((lower.includes('wiederholungen') || lower.includes('reps')) && !exercise.reps.includes('-')) {
          const repsMatch = nextLine.match(/(\d+(?:[-–]\d+)?)\s*(?:wiederholungen|wdh|reps)/i);
          if (repsMatch) exercise.reps = repsMatch[1];
        }
        
        // Parse RPE
        if (lower.includes('rpe')) {
          const rpeMatch = nextLine.match(/rpe:\s*(\d+(?:[.,]\d+)?)/i);
          if (rpeMatch) exercise.rpe = parseFloat(rpeMatch[1].replace(',', '.'));
        }
        
        // Parse rest time
        if (lower.includes('pause') || lower.includes('rest')) {
          const restMatch = nextLine.match(/(\d+)\s*(?:sekunden|sek|sec|s|minuten|min|m)/i);
          if (restMatch) {
            const time = parseInt(restMatch[1]);
            const unit = nextLine.match(/(?:minuten|min|m)/i) ? 'min' : 'sec';
            exercise.rest_seconds = unit === 'min' ? time * 60 : time;
          }
        }
        
        // Parse focus/notes
        if (lower.includes('fokus:') || lower.includes('note:') || lower.includes('hinweis:')) {
          exercise.notes = nextLine.replace(/^.*?(?:fokus|note|hinweis):\s*/i, '').trim();
        }
        
        // Parse weight
        if (lower.includes('gewicht') || lower.includes('kg')) {
          const weightMatch = nextLine.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
          if (weightMatch) exercise.weight_kg = parseFloat(weightMatch[1].replace(',', '.'));
        }
      }
      
      exercises.push(exercise);
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

  // Auto-suggest plan name and category from text content
  const getSuggestedPlanName = () => {
    const text = planText.toLowerCase();
    if (text.includes('oberkörper') || text.includes('upper')) return 'Oberkörper Training';
    if (text.includes('unterkörper') || text.includes('lower')) return 'Unterkörper Training';
    if (text.includes('push')) return 'Push Training';
    if (text.includes('pull')) return 'Pull Training';
    if (text.includes('legs') || text.includes('beine')) return 'Bein Training';
    if (text.includes('ganzkörper') || text.includes('full body')) return 'Ganzkörper Training';
    if (text.includes('kraft')) return 'Krafttraining';
    return `${coachName} Trainingsplan`;
  };

  const getSuggestedCategory = () => {
    const text = planText.toLowerCase();
    if (text.includes('push')) return 'Push';
    if (text.includes('pull')) return 'Pull';
    if (text.includes('legs') || text.includes('beine')) return 'Legs';
    if (text.includes('ganzkörper') || text.includes('full body')) return 'Full Body';
    if (text.includes('cardio') || text.includes('ausdauer')) return 'Cardio';
    return 'Full Body';
  };

  // Auto-fill suggestions when modal opens
  useEffect(() => {
    if (isOpen && !planName && !category) {
      setPlanName(getSuggestedPlanName());
      setCategory(getSuggestedCategory());
    }
  }, [isOpen]);

  if (exercises.length === 0) {
    return null; // Don't show button if no exercises detected
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="mt-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200"
      >
        <Save className="h-4 w-4 mr-2" />
        Als Trainingsplan speichern ({exercises.length} Übungen)
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