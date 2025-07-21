
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Save, X, Footprints, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePointsSystem } from "@/hooks/usePointsSystem";

interface WorkoutEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  existingWorkout?: any;
  onWorkoutSaved: () => void;
}

export const WorkoutEditModal = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  existingWorkout,
  onWorkoutSaved 
}: WorkoutEditModalProps) => {
  const [workoutType, setWorkoutType] = useState("kraft");
  const [duration, setDuration] = useState<number[]>([30]);
  const [intensity, setIntensity] = useState<number[]>([7]);
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [walkingNotes, setWalkingNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingWorkout) {
        // Pre-fill with existing data
        setWorkoutType(existingWorkout.workout_type || "kraft");
        setDuration([existingWorkout.duration_minutes || 30]);
        setIntensity([existingWorkout.intensity ?? 7]);
        setDistanceKm(existingWorkout.distance_km?.toString() || "");
        setSteps(existingWorkout.steps?.toString() || "");
        setWalkingNotes(existingWorkout.walking_notes || "");
      } else {
        // Reset to defaults for new workout
        setWorkoutType("kraft");
        setDuration([30]);
        setIntensity([7]);
        setDistanceKm("");
        setSteps("");
        setWalkingNotes("");
      }
    }
  }, [isOpen, existingWorkout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate) return;

    setIsSubmitting(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const workoutData = {
        user_id: user.id,
        workout_type: workoutType,
        duration_minutes: workoutType === 'pause' ? 0 : duration[0],
        intensity: workoutType === 'pause' ? null : intensity[0],
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        steps: steps ? parseInt(steps) : null,
        walking_notes: walkingNotes || null,
        did_workout: true,
        date: dateStr
      };

      if (existingWorkout) {
        // Update existing workout
        const { error } = await supabase
          .from('workouts')
          .update(workoutData)
          .eq('id', existingWorkout.id);

        if (error) throw error;
        toast.success('Workout aktualisiert!');
      } else {
        // Create new workout using UPSERT to prevent duplicates
        const { error } = await supabase
          .from('workouts')
          .upsert(workoutData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          });

        if (error) throw error;

        // Award points for new workout (only for new entries)
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        if (!isToday) {
          // For past dates, still award points but with lower multiplier
          await awardPoints('workout_completed', getPointsForActivity('workout_completed'), 'Nachträgliches Workout eingetragen', 0.8);
        } else {
          await awardPoints('workout_completed', getPointsForActivity('workout_completed'), 'Workout abgeschlossen');
        }
        await updateStreak('workout');

        toast.success('Workout erfolgreich eingetragen!');
      }

      onWorkoutSaved();
      onClose();
    } catch (error) {
      console.error('Error saving workout:', error);
      if (error instanceof Error && error.message.includes('check constraint')) {
        toast.error('Ungültige Workout-Daten. Bitte überprüfe deine Eingaben.');
      } else {
        toast.error('Fehler beim Speichern des Workouts');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {existingWorkout ? (
              <>
                <Save className="h-5 w-5" />
                Workout bearbeiten
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Workout eintragen
              </>
            )}
          </DialogTitle>
          {selectedDate && (
            <p className="text-sm text-muted-foreground">
              {formatDate(selectedDate)}
            </p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Trainingsart
            </label>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kraft">Krafttraining</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="pause">Pause/Ruhetag</SelectItem>
                <SelectItem value="other">Anderes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {workoutType === 'pause' ? (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
                  <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Perfekte Entscheidung! 🌙</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Regeneration ist genauso wichtig wie Training
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Dauer: {duration[0]} Minuten
                </label>
                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  max={180}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Intensität: {intensity[0]}/10
                </label>
                <Slider
                  value={intensity}
                  onValueChange={setIntensity}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </>
          )}

          {/* Zusätzliche Bewegung Section */}
          <div className="border-t border-green-200 dark:border-green-800 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Footprints className="h-4 w-4 text-green-600 dark:text-green-400" />
              <h4 className="text-sm font-medium text-green-700 dark:text-green-300">
                Zusätzliche Bewegung (optional)
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-green-700 dark:text-green-300 mb-1 block">
                  Distanz (km)
                </label>
                <Input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="z.B. 3.5"
                  step="0.1"
                  min="0"
                  className="text-sm border-green-300 focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-green-700 dark:text-green-300 mb-1 block">
                  Schritte
                </label>
                <Input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="z.B. 8000"
                  min="0"
                  className="text-sm border-green-300 focus:border-green-500"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-green-700 dark:text-green-300 mb-1 block">
                Notizen zur Bewegung
              </label>
              <Textarea
                value={walkingNotes}
                onChange={(e) => setWalkingNotes(e.target.value)}
                placeholder="z.B. Morgens spaziert, Treppe statt Aufzug..."
                className="text-sm border-green-300 focus:border-green-500 resize-none h-16"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Speichern...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {existingWorkout ? 'Aktualisieren' : 'Eintragen'}
                </div>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
