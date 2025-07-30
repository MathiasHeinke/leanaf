import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dumbbell, Plus, Edit, CheckCircle, Footprints, Moon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PremiumGate } from "@/components/PremiumGate";
import { PointsBadge } from "@/components/PointsBadge";
import { getCurrentDateString } from "@/utils/dateHelpers";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";
import { CoachFeedbackCard } from "./CoachFeedbackCard";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";

interface QuickWorkoutInputProps {
  onWorkoutAdded?: () => void;
  todaysWorkout?: any;
  todaysWorkouts?: any[]; // Array of all workouts for today
}

export const QuickWorkoutInput = ({ onWorkoutAdded, todaysWorkout, todaysWorkouts = [] }: QuickWorkoutInputProps) => {
  const [workoutType, setWorkoutType] = useState("kraft");
  const [duration, setDuration] = useState<number[]>([30]);
  const [intensity, setIntensity] = useState<number[]>([7]);
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [walkingNotes, setWalkingNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if ANY workout entry exists for today (including rest days)
  const hasWorkoutToday = todaysWorkouts.length > 0;

  useEffect(() => {
    if (editingWorkoutId && !isAddingNew) {
      // Pre-fill form when editing specific workout
      const editingWorkout = todaysWorkouts.find(w => w.id === editingWorkoutId);
      if (editingWorkout) {
        setWorkoutType(editingWorkout.workout_type || "kraft");
        setDuration([editingWorkout.duration_minutes || 30]);
        setIntensity([editingWorkout.intensity || 7]);
        setDistanceKm(editingWorkout.distance_km?.toString() || "");
        setSteps(editingWorkout.steps?.toString() || "");
        setWalkingNotes(editingWorkout.walking_notes || "");
      }
    } else if (!isAddingNew && !editingWorkoutId) {
      // Reset form for new workout
      setWorkoutType("kraft");
      setDuration([30]);
      setIntensity([7]);
      setDistanceKm("");
      setSteps("");
      setWalkingNotes("");
    }
  }, [editingWorkoutId, isAddingNew, todaysWorkouts]);

  const resetForm = () => {
    setWorkoutType("kraft");
    setDuration([30]);
    setIntensity([7]);
    setDistanceKm("");
    setSteps("");
    setWalkingNotes("");
    setIsEditing(false);
    setIsAddingNew(false);
    setEditingWorkoutId(null);
  };

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
        distance_km: distanceKm ? parseLocaleFloat(distanceKm) : null,
        steps: steps ? parseInt(steps) : null,
        walking_notes: walkingNotes || null,
        did_workout: workoutType !== 'pause',
        date: todayDateString
      };

      if (editingWorkoutId) {
        // Update existing workout - no points awarded
        const { error } = await supabase
          .from('workouts')
          .update(workoutData)
          .eq('id', editingWorkoutId);

        if (error) throw error;
        // UI-Feedback bereits durch direkte Anzeige der Änderung
      } else {
        // Create new workout using INSERT (not UPSERT to allow multiple workouts per day)
        const { error } = await supabase
          .from('workouts')
          .insert(workoutData);

        if (error) throw error;

        // Award points for new workout (only for actual workouts, not rest days)
        if (workoutType !== 'pause') {
          await awardPoints('workout_completed', getPointsForActivity('workout_completed'), 'Workout abgeschlossen');
          await updateStreak('workout');
          
          // Show points animation
          setShowPointsAnimation(true);
          setTimeout(() => setShowPointsAnimation(false), 3000);
        }

        toast.success('Workout erfolgreich eingetragen!');
      }

      triggerDataRefresh();
      resetForm();
      onWorkoutAdded?.();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Fehler beim Speichern des Workouts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditWorkout = (workout: any) => {
    setEditingWorkoutId(workout.id);
    setIsEditing(true);
    setIsAddingNew(false);
  };

  const handleAddNewWorkout = () => {
    setIsAddingNew(true);
    setIsEditing(true);
    setEditingWorkoutId(null);
  };

  const handleDeleteWorkout = async (workout: any) => {
    // Bestätigung anfordern
    const confirmed = window.confirm(
      `Möchtest du dieses Workout wirklich löschen?\n\n${
        workout.workout_type === 'kraft' ? 'Krafttraining' : 
        workout.workout_type === 'cardio' ? 'Cardio' : 
        workout.workout_type === 'pause' ? 'Pause/Ruhetag' : 'Anderes'
      } (${workout.duration_minutes || 0} Min)`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workout.id);

      if (error) throw error;

      toast.success('Workout gelöscht!');
      onWorkoutAdded?.(); // Refresh the data
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('Fehler beim Löschen des Workouts');
    }
  };

  const isCompleted = !!hasWorkoutToday;

  return (
    <CollapsibleQuickInput
      title={hasWorkoutToday && !isEditing ? "Workout erledigt! 💪" : "Training & Bewegung"}
      icon={<Dumbbell className="h-4 w-4 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={false}
      theme="purple"
    >
      {hasWorkoutToday && !isEditing ? (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/20 p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-xl">
              <CheckCircle className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-cyan-800 dark:text-cyan-200">
                {todaysWorkouts.length === 1 ? 'Workout erledigt! 💪' : `${todaysWorkouts.length} Workouts erledigt! 💪`}
              </h3>
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
                onClick={handleAddNewWorkout}
                className="text-cyan-600 border-cyan-300 hover:bg-cyan-50"
                title="Weiteres Workout hinzufügen"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Points badges directly under title */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PointsBadge 
              points={3 * todaysWorkouts.filter(w => w.workout_type !== 'pause').length} 
              bonusPoints={todaysWorkouts.reduce((sum, w) => sum + (w.bonus_points || 0), 0)}
              icon="💪"
              animated={false}
              variant="secondary"
            />
          </div>
          
          {/* Display all workouts */}
          <div className="space-y-2 mb-3">
            {todaysWorkouts.map((workout, index) => (
              <div key={workout.id} className="flex items-center justify-between bg-white/50 dark:bg-cyan-900/20 rounded-lg p-2">
                <div className="flex-1">
                  <p className="text-sm text-cyan-600 dark:text-cyan-400">
                    <span className="font-medium">
                      {workout.workout_type === 'kraft' ? 'Krafttraining' : 
                       workout.workout_type === 'cardio' ? 'Cardio' : 
                       workout.workout_type === 'pause' ? 'Pause/Ruhetag' : 'Anderes'}
                    </span>
                    {workout.workout_type === 'pause' ? (
                      <span className="ml-2">🛌 Regeneration</span>
                    ) : (
                      <>
                        <span className="ml-2">{workout.duration_minutes || 0} Min</span>
                        <span className="mx-1">•</span>
                        <span>Intensität: {workout.intensity || 0}/10</span>
                      </>
                    )}
                    {workout.distance_km > 0 && (
                      <span className="ml-2">• {workout.distance_km} km</span>
                    )}
                    {workout.steps > 0 && (
                      <span className="ml-2">• {workout.steps.toLocaleString()} Schritte</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditWorkout(workout)}
                    className="text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 p-1 h-auto"
                    title="Workout bearbeiten"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWorkout(workout)}
                    className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 p-1 h-auto"
                    title="Workout löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Coach Feedback First */}
          <div className="mb-3">
            <CoachFeedbackCard 
              coachName="Markus"
              coachAvatar="/coach-images/markus-ruehl.jpg"
              workoutData={todaysWorkouts}
              userId={user?.id}
              type="workout"
            />
          </div>
          
          {/* Tips in matching cyan theme */}
          <div className="bg-cyan-100/50 dark:bg-cyan-900/30 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
            <p className="text-xs text-cyan-700 dark:text-cyan-300 mb-2">
              <strong>Tipp:</strong> Effektives Training braucht die richtige Balance!
            </p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400">
              • Krafttraining 2-3x pro Woche für optimalen Muskelaufbau
              • Cardio 4-5x pro Woche für Ausdauer und Fettverbrennung
              • Mindestens 1-2 Ruhetage pro Woche für Regeneration
              • Progressive Steigerung für kontinuierliche Fortschritte
            </p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">
              <strong>Nächstes Training:</strong> Morgen 💪
            </p>
          </div>
        </div>
      ) : (
        <PremiumGate 
          feature="workout_tracking"
          hideable={true}
          fallbackMessage="Workout-Tracking ist ein Premium Feature. Upgrade für detailliertes Training-Tracking!"
        >
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/20 p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-xl">
                <Dumbbell className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-cyan-800 dark:text-cyan-200">
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
                <label className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-2 block">
                  Trainingsart
                </label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger className="bg-white dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-700">
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
                    <NumericInput
                      value={distanceKm}
                      onChange={(value) => setDistanceKm(value)}
                      placeholder="z.B. 3,5"
                      step={0.1}
                      min={0}
                      allowDecimals={true}
                      className="text-sm border-green-300 focus:border-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-green-700 dark:text-green-300 mb-1 block">
                      Schritte
                    </label>
                    <NumericInput
                      value={steps}
                      onChange={(value) => setSteps(value)}
                      placeholder="z.B. 8000"
                      min={0}
                      allowDecimals={false}
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
                
                {(editingWorkoutId || isAddingNew) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-orange-300 text-orange-600"
                  >
                    Abbrechen
                  </Button>
                )}
              </div>
            </form>
          </div>
        </PremiumGate>
      )}
    </CollapsibleQuickInput>
  );
};