
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dumbbell, Plus, Edit, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";

interface QuickWorkoutInputProps {
  onWorkoutAdded?: () => void;
  todaysWorkout?: any;
}

export const QuickWorkoutInput = ({ onWorkoutAdded, todaysWorkout }: QuickWorkoutInputProps) => {
  const [workoutType, setWorkoutType] = useState("kraft");
  const [duration, setDuration] = useState<number[]>([30]);
  const [intensity, setIntensity] = useState<number[]>([7]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if workout already exists for today
  const hasWorkoutToday = todaysWorkout && todaysWorkout.did_workout;

  useEffect(() => {
    if (hasWorkoutToday && !isEditing) {
      // Pre-fill form with existing data
      setWorkoutType(todaysWorkout.workout_type || "kraft");
      setDuration([todaysWorkout.duration_minutes || 30]);
      setIntensity([todaysWorkout.intensity || 7]);
    }
  }, [hasWorkoutToday, todaysWorkout, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const workoutData = {
        user_id: user.id,
        workout_type: workoutType,
        duration_minutes: duration[0],
        intensity: intensity[0],
        did_workout: true,
        date: new Date().toISOString().split('T')[0]
      };

      if (hasWorkoutToday) {
        // Update existing workout
        const { error } = await supabase
          .from('workouts')
          .update(workoutData)
          .eq('id', todaysWorkout.id);

        if (error) throw error;
        toast.success('Workout aktualisiert!');
      } else {
        // Create new workout
        const { error } = await supabase
          .from('workouts')
          .insert(workoutData);

        if (error) throw error;

        // Award points for new workout
        await awardPoints('workout_completed', getPointsForActivity('workout_completed'), 'Workout abgeschlossen');
        await updateStreak('workout');

        toast.success('Workout erfolgreich eingetragen!');
      }

      setIsEditing(false);
      onWorkoutAdded?.();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Fehler beim Speichern des Workouts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show read-only summary if workout exists and not editing
  if (hasWorkoutToday && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-xl">
            <CheckCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">Workout erledigt! 💪</h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {todaysWorkout.workout_type === 'kraft' ? 'Krafttraining' : 
               todaysWorkout.workout_type === 'cardio' ? 'Cardio' : 'Anderes'} • 
              {todaysWorkout.duration_minutes || 0} Min • 
              Intensität: {todaysWorkout.intensity || 0}/10
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton
              title="Workout Tracking"
              description="Regelmäßiges Training ist der Schlüssel für nachhaltigen Muskelaufbau und Fettverbrennung. Auch kurze, intensive Einheiten sind effektiv."
              scientificBasis="Studien zeigen: 150 Min moderate oder 75 Min intensive Aktivität pro Woche reduzieren das Krankheitsrisiko um bis zu 40%."
              tips={[
                "Krafttraining 2-3x pro Woche für optimalen Muskelaufbau",
                "Cardio verbessert Herz-Kreislauf-System und Fettverbrennung",
                "Progressive Steigerung für kontinuierliche Fortschritte"
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="bg-orange-100/50 dark:bg-orange-900/30 rounded-lg p-3">
          <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
            <strong>Tipp:</strong> Konstanz ist wichtiger als Perfektion!
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            • Krafttraining stärkt Muskeln und Knochen
            • Cardio verbessert deine Ausdauer
            • Jede Bewegung zählt für deinen Erfolg
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-xl">
          <Dumbbell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-orange-800 dark:text-orange-200">
            {hasWorkoutToday ? 'Workout bearbeiten' : 'Workout eintragen'}
          </h3>
        </div>
        <InfoButton
          title="Workout Tracking"
          description="Regelmäßiges Training ist der Schlüssel für nachhaltigen Muskelaufbau und Fettverbrennung. Auch kurze, intensive Einheiten sind effektiv."
          scientificBasis="Studien zeigen: 150 Min moderate oder 75 Min intensive Aktivität pro Woche reduzieren das Krankheitsrisiko um bis zu 40%."
          tips={[
            "Krafttraining 2-3x pro Woche für optimalen Muskelaufbau",
            "Cardio verbessert Herz-Kreislauf-System und Fettverbrennung",
            "Progressive Steigerung für kontinuierliche Fortschritte"
          ]}
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block">
            Trainingsart
          </label>
          <Select value={workoutType} onValueChange={setWorkoutType}>
            <SelectTrigger className="bg-white dark:bg-orange-950/50 border-orange-200 dark:border-orange-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kraft">Krafttraining</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="other">Anderes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block">
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
          <label className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block">
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

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Speichern...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {hasWorkoutToday ? 'Aktualisieren' : 'Eintragen'}
              </div>
            )}
          </Button>
          
          {hasWorkoutToday && isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-orange-300 text-orange-600"
            >
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
