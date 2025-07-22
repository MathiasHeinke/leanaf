import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dumbbell, Plus, Edit, CheckCircle, Footprints, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PremiumGate } from "@/components/PremiumGate";
import { getCurrentDateString } from "@/utils/dateHelpers";

interface QuickWorkoutInputProps {
  onWorkoutAdded?: () => void;
  todaysWorkout?: any;
}

export const QuickWorkoutInput = ({ onWorkoutAdded, todaysWorkout }: QuickWorkoutInputProps) => {
  const [workoutType, setWorkoutType] = useState("kraft");
  const [duration, setDuration] = useState<number[]>([30]);
  const [intensity, setIntensity] = useState<number[]>([7]);
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [walkingNotes, setWalkingNotes] = useState<string>("");
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
      setDistanceKm(todaysWorkout.distance_km?.toString() || "");
      setSteps(todaysWorkout.steps?.toString() || "");
      setWalkingNotes(todaysWorkout.walking_notes || "");
    }
  }, [hasWorkoutToday, todaysWorkout, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Use timezone-aware date from dateHelpers
      const todayDateString = getCurrentDateString();

      const workoutData = {
        user_id: user.id,
        workout_type: workoutType,
        duration_minutes: workoutType === 'pause' ? 0 : duration[0],
        intensity: workoutType === 'pause' ? 0 : intensity[0],
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        steps: steps ? parseInt(steps) : null,
        walking_notes: walkingNotes || null,
        did_workout: workoutType !== 'pause',
        date: todayDateString
      };

      if (hasWorkoutToday) {
        // Update existing workout - no points awarded
        const { error } = await supabase
          .from('workouts')
          .update(workoutData)
          .eq('id', todaysWorkout.id);

        if (error) throw error;
        toast.success('Workout aktualisiert!');
      } else {
        // Create new workout with proper UPSERT
        const { error } = await supabase
          .from('workouts')
          .upsert(workoutData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          });

        if (error) throw error;

        // Award points for new workout (only for actual workouts, not rest days)
        if (workoutType !== 'pause') {
          await awardPoints('workout_completed', getPointsForActivity('workout_completed'), 'Workout abgeschlossen');
          await updateStreak('workout');
        }

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
                todaysWorkout.workout_type === 'cardio' ? 'Cardio' : 
                todaysWorkout.workout_type === 'pause' ? 'Pause/Ruhetag' : 'Anderes'} • 
               {todaysWorkout.workout_type === 'pause' ? (
                 'Regeneration ist wichtig! 🛌'
               ) : (
                 <>
                   {todaysWorkout.duration_minutes || 0} Min • 
                   Intensität: {todaysWorkout.intensity || 0}/10
                   {todaysWorkout.distance_km && (
                     <> • {todaysWorkout.distance_km} km</>
                   )}
                   {todaysWorkout.steps && (
                     <> • {todaysWorkout.steps} Schritte</>
                   )}
                 </>
               )}
             </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton
              title="Workout & Regeneration"
              description="Regelmäßiges Training ist der Schlüssel für nachhaltigen Muskelaufbau und Fettverbrennung. Aber auch Pausen sind essentiell für optimale Ergebnisse!"
              scientificBasis="Studien zeigen: 150 Min moderate oder 75 Min intensive Aktivität pro Woche plus ausreichende Regeneration reduzieren das Krankheitsrisiko um bis zu 40%."
              tips={[
                "Krafttraining 2-3x pro Woche für optimalen Muskelaufbau",
                "Cardio 4-5x pro Woche für Ausdauer und Fettverbrennung",
                "Mindestens 1-2 Ruhetage pro Woche für Regeneration",
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
            • Ruhetage sind genauso wichtig wie Training
            • Jede Bewegung zählt für deinen Erfolg
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            <strong>Nächste Eintragung:</strong> Morgen 📅
          </p>
        </div>
      </div>
    );
  }

  return (
    <PremiumGate 
      feature="workout_tracking"
      fallbackMessage="Workout-Tracking ist ein Premium Feature. Upgrade für detailliertes Training-Tracking!"
    >
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
            title="Workout & Regeneration"
            description="Regelmäßiges Training ist der Schlüssel für nachhaltigen Muskelaufbau und Fettverbrennung. Aber auch Pausen sind essentiell für optimale Ergebnisse!"
            scientificBasis="Studien zeigen: 150 Min moderate oder 75 Min intensive Aktivität pro Woche plus ausreichende Regeneration reduzieren das Krankheitsrisiko um bis zu 40%."
            tips={[
              "Krafttraining 2-3x pro Woche für optimalen Muskelaufbau",
              "Cardio 4-5x pro Woche für Ausdauer und Fettverbrennung",
              "Mindestens 1-2 Ruhetage pro Woche für Regeneration",
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
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="mb-2"><strong>Warum Ruhetage wichtig sind:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Muskeln wachsen während der Ruhephase</li>
                  <li>Verletzungsrisiko wird reduziert</li>
                  <li>Motivation und Energie werden wieder aufgeladen</li>
                  <li>Hormonhaushalt regeneriert sich optimal</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {/* Lauf/Spazier Tracking Section */}
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
    </PremiumGate>
  );
};
