import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Plus, Edit, CheckCircle, Footprints, Moon, Trash2, ChevronDown, ChevronUp, Edit2, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";

import { PointsBadge } from "@/components/PointsBadge";
import { getCurrentDateString } from "@/utils/dateHelpers";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { cn } from "@/lib/utils";

function formatNumber(n: number) {
  return Math.max(0, Math.round(n));
}

function WorkoutPill({ label, value, max, unit = "", pillType }: { label: string; value: number; max?: number; unit?: string; pillType?: 'intensity' | 'duration' | 'count' }) {
  const colorClass = pillType ? {
    intensity: "text-primary border-primary/20 bg-primary/10",
    duration: "text-carbs border-carbs/20 bg-carbs/10", 
    count: "text-fats border-fats/20 bg-fats/10"
  }[pillType] : "";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-md border bg-card px-3 py-2",
      colorClass
    )}>
      <div className="text-xs text-muted-foreground/80">{label}</div>
      <div className="text-sm font-semibold">
        {formatNumber(value)}{unit}
        {typeof max === 'number' ? (
          <span className="text-muted-foreground ml-1">/ {formatNumber(max)}{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

function SmartChip({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border bg-secondary/50 hover:bg-secondary px-3 py-1 text-xs transition-colors"
    >
      <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
      <span className="truncate max-w-[10rem]">{text}</span>
    </button>
  );
}

function WorkoutRow({
  workout,
  onEditWorkout,
  onDeleteWorkout,
  isExpanded,
}: {
  workout: any;
  onEditWorkout?: (workout: any) => void;
  onDeleteWorkout?: (workout: any) => void;
  isExpanded: boolean;
}) {
  const [open, setOpen] = useState(false);
  const workoutTypeLabel = workout.workout_type === 'kraft' ? '💪 Krafttraining' : 
    workout.workout_type === 'cardio' ? '🏃 Cardio' : 
    workout.workout_type === 'pause' ? '🛌 Pause/Ruhetag' : '📝 Anderes';

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-medium truncate">
            {workoutTypeLabel} • {workout.duration_minutes || 0} Min
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          Intensität: {workout.intensity || 0}/10
          {(onEditWorkout || onDeleteWorkout) && (
            <div className="flex items-center gap-1 ml-1">
              {onEditWorkout && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditWorkout(workout);
                  }}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
              {onDeleteWorkout && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWorkout(workout);
                  }}
                  className="p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {open ? <ChevronDown className="inline h-4 w-4 ml-1 rotate-180" /> : <ChevronDown className="inline h-4 w-4 ml-1" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="mt-3">
            <h4 className="font-semibold text-base">{workoutTypeLabel}</h4>
          </div>
          
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Dauer:</span>
              <span className="ml-1 font-medium">{workout.duration_minutes || 0} Minuten</span>
            </div>
            <div>
              <span className="text-muted-foreground">Intensität:</span>
              <span className="ml-1 font-medium">{workout.intensity || 0}/10</span>
            </div>
            {workout.distance_km && (
              <div>
                <span className="text-muted-foreground">Distanz:</span>
                <span className="ml-1 font-medium">{workout.distance_km} km</span>
              </div>
            )}
            {workout.steps && (
              <div>
                <span className="text-muted-foreground">Schritte:</span>
                <span className="ml-1 font-medium">{workout.steps.toLocaleString()}</span>
              </div>
            )}
          </div>

          {workout.walking_notes && (
            <div className="mt-2">
              <span className="text-muted-foreground text-sm">Notizen:</span>
              <p className="text-sm mt-1">{workout.walking_notes}</p>
            </div>
          )}

          {(onEditWorkout || onDeleteWorkout) && (
            <div className="flex items-center gap-2 pt-3">
              {onEditWorkout && (
                <button 
                  type="button" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
                  onClick={() => onEditWorkout(workout)}
                >
                  <Edit2 className="h-3 w-3" />
                  Bearbeiten
                </button>
              )}
              {onDeleteWorkout && (
                <button 
                  type="button" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => onDeleteWorkout(workout)}
                >
                  <Trash2 className="h-3 w-3" />
                  Löschen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface QuickWorkoutInputProps {
  onWorkoutAdded?: () => void;
  todaysWorkout?: any;
  todaysWorkouts?: any[]; // Array of all workouts for today
  asCard?: boolean; // renders as stand-alone card without collapsible/header
}

export const QuickWorkoutInput = ({ onWorkoutAdded, todaysWorkout, todaysWorkouts = [], asCard = false }: QuickWorkoutInputProps) => {
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
  const [showWorkouts, setShowWorkouts] = useState(false);
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
      // Ensure we have an authenticated session for RLS
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error('Bitte melde dich erneut an, um Workouts zu speichern.');
        return;
      }
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
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Calculate workout stats
  const completedWorkouts = todaysWorkouts.filter(w => w.did_workout);
  const restDays = todaysWorkouts.filter(w => !w.did_workout);
  const totalDuration = completedWorkouts.reduce((total, w) => total + (w.duration_minutes || 0), 0);
  const weeklyTarget = 150; // 150 min weekly goal
  const progressPercent = Math.min((totalDuration / weeklyTarget) * 100, 100);

  // Smart chip actions - quick workout types
  const smartChips = [
    { label: "💪 Krafttraining", emoji: "💪", action: () => { setWorkoutType("kraft"); setDuration([45]); setIntensity([7]); setIsEditing(true); } },
    { label: "🏃 Cardio", emoji: "🏃", action: () => { setWorkoutType("cardio"); setDuration([30]); setIntensity([6]); setIsEditing(true); } },
    { label: "🚶 Spaziergang", emoji: "🚶", action: () => { setWorkoutType("cardio"); setDuration([20]); setDistanceKm("2"); setIntensity([4]); setIsEditing(true); } },
    { label: "🛌 Ruhetag", emoji: "🛌", action: () => { setWorkoutType("pause"); setDuration([0]); setIntensity([0]); setIsEditing(true); } }
  ];

  if (asCard) {
    return (
      <div className="space-y-4">
        {hasWorkoutToday && !isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className={`h-5 w-5 ${asCard ? "text-foreground/70" : "text-cyan-600"}`} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
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
                variant={asCard ? "secondary" : "outline"}
                size="sm"
                onClick={handleAddNewWorkout}
                className={asCard ? undefined : "text-cyan-600 border-cyan-300 hover:bg-cyan-50"}
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
          
          <div className="space-y-2">
              {todaysWorkouts.map((workout, index) => (
                <div key={workout.id} className={`flex items-center justify-between rounded-lg p-3 ${asCard ? "bg-muted/20" : "bg-card border"}`}>
                <div className="flex-1">
                  <p className={`text-sm ${asCard ? "text-foreground" : "text-cyan-600"}`}>
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
                    className={`p-1 h-auto ${asCard ? "text-foreground/70 hover:bg-muted/20" : "text-cyan-600 hover:bg-cyan-100"}`}
                    title="Workout bearbeiten"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWorkout(workout)}
                    className={`p-1 h-auto ${asCard ? "text-foreground/70 hover:bg-muted/20" : "text-red-600 hover:bg-red-100"}`}
                    title="Workout löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Tips in matching cyan theme */}
          <div className={`rounded-lg p-3 ${asCard ? "bg-muted/30" : "bg-cyan-100/50 border border-cyan-200"}`}>
            <p className={`text-xs mb-2 ${asCard ? "text-muted-foreground" : "text-cyan-700"}`}>
              <strong>Tipp:</strong> Effektives Training braucht die richtige Balance!
            </p>
            <p className={`text-xs ${asCard ? "text-muted-foreground" : "text-cyan-600"}`}>
              • Krafttraining 2-3x pro Woche für optimalen Muskelaufbau
              • Cardio 4-5x pro Woche für Ausdauer und Fettverbrennung
              • Mindestens 1-2 Ruhetage pro Woche für Regeneration
              • Progressive Steigerung für kontinuierliche Fortschritte
            </p>
            <p className={`text-xs mt-2 ${asCard ? "text-muted-foreground" : "text-cyan-600"}`}>
              <strong>Nächstes Training:</strong> Morgen 💪
            </p>
          </div>
        </div>
        ) : (
          <div className="p-4 bg-card rounded-2xl border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-muted rounded-xl">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
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
              <div className={`rounded-lg p-4 ${asCard ? "bg-muted/20" : "border"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-muted rounded-xl">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Perfekte Entscheidung! 🌙</h4>
                    <p className="text-sm text-muted-foreground">
                      Regeneration ist genauso wichtig wie Training
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
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

            {/* Lauf/Spazier Tracking Section */}
            <div className={`${asCard ? "pt-4" : "border-t pt-4"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Footprints className="h-4 w-4" />
                <h4 className="text-sm font-medium">
                  Zusätzliche Bewegung (optional)
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Distanz (km)
                  </label>
                  <NumericInput
                    value={distanceKm}
                    onChange={(value) => setDistanceKm(value)}
                    placeholder="z.B. 3,5"
                    step={0.1}
                    min={0}
                    allowDecimals={true}
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Schritte
                  </label>
                  <NumericInput
                    value={steps}
                    onChange={(value) => setSteps(value)}
                    placeholder="z.B. 8000"
                    min={0}
                    allowDecimals={false}
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium mb-1 block">
                  Notizen zur Bewegung
                </label>
                <Textarea
                  value={walkingNotes}
                  onChange={(e) => setWalkingNotes(e.target.value)}
                  placeholder="z.B. Morgens spaziert, Treppe statt Aufzug..."
                  className="text-sm resize-none h-16"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" />
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
                >
                  Abbrechen
                </Button>
              )}
            </div>
          </form>
        </div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Workout & Training</h2>
          </div>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              {!isCollapsed ? (
                <>
                  Einklappen <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Ausklappen <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsed summary when card is closed */}
        {isCollapsed && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-3">
              <div className="font-semibold">
                {completedWorkouts.length} / {completedWorkouts.length + restDays.length} Workouts • {totalDuration} Min
              </div>
              <Progress
                className="h-2 w-24 md:w-32"
                value={(completedWorkouts.length / Math.max(1, completedWorkouts.length + restDays.length)) * 100}
                aria-label="Workout-Fortschritt"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-primary">
                Intensität: {Math.round(completedWorkouts.reduce((sum, w) => sum + (w.intensity || 0), 0) / Math.max(1, completedWorkouts.length))}/10
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium text-secondary-foreground">
                Wochenziel: {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        )}

        {/* Smart Chips for quick workouts - visible in both collapsed and expanded states */}
        {(!hasWorkoutToday || isCollapsed) && (
          <div className="mt-3 flex flex-wrap gap-3">
            {smartChips.slice(0, 3).map((chip, index) => (
              <button
                key={index}
                type="button"
                onClick={() => { 
                  chip.action(); 
                  setIsCollapsed(false); 
                }}
                className="inline-flex items-center rounded-full border bg-secondary/50 hover:bg-secondary px-3 py-1 text-xs transition-colors"
              >
                <span className="mr-1.5">{chip.emoji}</span>
                <span className="truncate max-w-[10rem]">{chip.label.replace(/^.+?\s/, '')}</span>
              </button>
            ))}
          </div>
        )}

        <CollapsibleContent>
        {/* Header numbers - similar to CaloriesCard */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Abgeschlossen</div>
            <div className="text-lg font-semibold">{completedWorkouts.length} / {completedWorkouts.length + restDays.length} Workouts</div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Dauer heute</div>
            <div className="text-lg font-semibold">{totalDuration} Min</div>
          </div>
        </div>

        {/* Workout Pills with colors - similar to MacroPills */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <WorkoutPill label="Intensität" value={Math.round(completedWorkouts.reduce((sum, w) => sum + (w.intensity || 0), 0) / Math.max(1, completedWorkouts.length))} max={10} unit="/10" pillType="intensity" />
          <WorkoutPill label="Wochenziel" value={totalDuration} max={weeklyTarget} unit="min" pillType="duration" />
          <WorkoutPill label="Workouts" value={completedWorkouts.length} max={completedWorkouts.length + restDays.length} unit="" pillType="count" />
        </div>

            {hasWorkoutToday && !isEditing ? (
              <div className="space-y-4">
                {/* Summary header with progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Heutiges Training
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {completedWorkouts.length} von {completedWorkouts.length + restDays.length} Workouts • {totalDuration} Minuten
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
                        onClick={handleAddNewWorkout}
                        className="text-primary border-primary/30 hover:bg-primary/10"
                        title="Weiteres Workout hinzufügen"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Workouts</span>
                        <span className="font-medium">{Math.round((completedWorkouts.length / Math.max(1, completedWorkouts.length + restDays.length)) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(completedWorkouts.length / Math.max(1, completedWorkouts.length + restDays.length)) * 100} 
                        className="h-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Wochenziel ({weeklyTarget} Min)</span>
                        <span className="font-medium">{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </div>
                </div>

                {/* Smart Chips - using CaloriesCard style */}
                {!isEditing && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {smartChips.map((chip, index) => (
                      <SmartChip 
                        key={index}
                        text={chip.label} 
                        onClick={() => chip.action()}
                      />
                    ))}
                  </div>
                )}

                {/* Workouts list toggle - similar to CaloriesCard meals toggle */}
                <div className="mt-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between rounded-md border bg-card px-3 py-2 hover:bg-muted/50"
                    onClick={() => setShowWorkouts(!showWorkouts)}
                  >
                    <div className="text-sm font-medium">Workouts anzeigen</div>
                    {showWorkouts ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showWorkouts && (
                    <div className="mt-3 space-y-2">
                      {todaysWorkouts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Keine Workouts erfasst.</div>
                      ) : (
                        todaysWorkouts.map((workout) => (
                          <WorkoutRow
                            key={workout.id}
                            workout={workout}
                            onEditWorkout={handleEditWorkout}
                            onDeleteWorkout={handleDeleteWorkout}
                            isExpanded={!isCollapsed}
                          />
                        ))
                      )}
                    </div>
                   )}
                 </div>
               </div>
             ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
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
                      <div className="rounded-lg p-4 border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-muted rounded-xl">
                            <Moon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Perfekte Entscheidung! 🌙</h4>
                            <p className="text-sm text-muted-foreground">
                              Regeneration ist genauso wichtig wie Training
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
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

                    {/* Lauf/Spazier Tracking Section */}
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Footprints className="h-4 w-4" />
                        <h4 className="text-sm font-medium">
                          Zusätzliche Bewegung (optional)
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">
                            Distanz (km)
                          </label>
                          <NumericInput
                            value={distanceKm}
                            onChange={(value) => setDistanceKm(value)}
                            placeholder="z.B. 3,5"
                            step={0.1}
                            min={0}
                            allowDecimals={true}
                            className="text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium mb-1 block">
                            Schritte
                          </label>
                          <NumericInput
                            value={steps}
                            onChange={(value) => setSteps(value)}
                            placeholder="z.B. 8000"
                            min={0}
                            allowDecimals={false}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Notizen zur Bewegung
                        </label>
                        <Textarea
                          value={walkingNotes}
                          onChange={(e) => setWalkingNotes(e.target.value)}
                          placeholder="z.B. Morgens spaziert, Treppe statt Aufzug..."
                          className="text-sm resize-none h-16"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2" />
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
                        >
                          Abbrechen
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};