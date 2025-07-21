
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Clock, Zap, CheckCircle2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePointsSystem } from "@/hooks/usePointsSystem";

export const QuickWorkoutInput = () => {
  const { user } = useAuth();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();
  const [didWorkout, setDidWorkout] = useState<boolean | null>(null);
  const [workoutType, setWorkoutType] = useState<string>('kraft');
  const [duration, setDuration] = useState<string>('');
  const [intensity, setIntensity] = useState<string>('3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingWorkout, setExistingWorkout] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkExistingWorkout();
    }
  }, [user]);

  const checkExistingWorkout = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing workout:', error);
        return;
      }

      if (data) {
        setExistingWorkout(data);
        setDidWorkout(data.did_workout);
        setWorkoutType(data.workout_type || 'kraft');
        setDuration(data.duration_minutes?.toString() || '');
        setIntensity(data.intensity?.toString() || '3');
      }
    } catch (error) {
      console.error('Error checking existing workout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || didWorkout === null) return;

    setIsSubmitting(true);
    console.log('💪 Starting workout tracking submission...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const workoutData = {
        user_id: user.id,
        date: today,
        did_workout: didWorkout,
        workout_type: didWorkout ? workoutType : null,
        duration_minutes: didWorkout && duration ? parseInt(duration) : null,
        intensity: didWorkout ? parseInt(intensity) : null
      };

      console.log('💾 Saving workout data:', workoutData);

      const { error } = await supabase
        .from('workouts')
        .upsert(workoutData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('❌ Error saving workout data:', error);
        throw error;
      }

      console.log('✅ Workout data saved successfully');

      // Award points for workout completion
      if (didWorkout) {
        const workoutPoints = getPointsForActivity('workout_completed', { intensity: parseInt(intensity) });
        console.log(`🎯 Awarding ${workoutPoints} points for workout (intensity: ${intensity})`);
        
        const pointsResult = await awardPoints(
          'workout_completed', 
          workoutPoints, 
          `${workoutType} Training (Intensität ${intensity})`
        );
        
        console.log('🎉 Points awarded result:', pointsResult);
        
        const streakResult = await updateStreak('workout');
        console.log('🔥 Streak updated result:', streakResult);

        toast.success(`Training erfasst! 💪 (+${workoutPoints} Punkte)`, {
          duration: 4000,
          position: "top-center",
        });
      } else {
        toast.success('Ruhetag notiert 😌', {
          duration: 3000,
          position: "top-center",
        });
      }
      
      // Update existing workout state
      setExistingWorkout({
        ...workoutData,
        duration_minutes: workoutData.duration_minutes,
        intensity: workoutData.intensity
      });
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Error in workout tracking:', error);
      toast.error('Fehler beim Speichern des Trainings', {
        duration: 4000,
        position: "top-center",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50/50 via-emerald-25/30 to-emerald-50/20 dark:from-emerald-950/20 dark:via-emerald-950/10 dark:to-emerald-950/5 border-emerald-200/30 dark:border-emerald-800/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-emerald-200/50 rounded w-32"></div>
          <div className="h-12 bg-emerald-200/50 rounded"></div>
        </div>
      </Card>
    );
  }

  // Show read-only summary if workout already exists and not editing
  if (existingWorkout && !isEditing) {
    const getTip = () => {
      if (existingWorkout.did_workout) {
        const tips = [
          "Großartig! Konsistenz ist der Schlüssel zum Erfolg! 💪",
          "Super! Dein Körper wird es dir danken! 🌟",
          "Fantastisch! Jedes Training bringt dich näher an dein Ziel! 🎯"
        ];
        return tips[Math.floor(Math.random() * tips.length)];
      } else {
        return "Ruhetage sind genauso wichtig wie Trainingstage! 😌 Dein Körper regeneriert sich.";
      }
    };

    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50/50 via-emerald-25/30 to-emerald-50/20 dark:from-emerald-950/20 dark:via-emerald-950/10 dark:to-emerald-950/5 border-emerald-200/30 dark:border-emerald-800/30">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Dumbbell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-lg">Training heute</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Bearbeiten
            </Button>
          </div>

          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-medium">
                {existingWorkout.did_workout ? 'Training absolviert!' : 'Ruhetag'}
              </span>
            </div>
            
            {existingWorkout.did_workout && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Art: {existingWorkout.workout_type === 'kraft' ? '💪 Kraft' : existingWorkout.workout_type === 'cardio' ? '🏃 Cardio' : '🔀 Mix'}</div>
                {existingWorkout.duration_minutes && <div>Dauer: {existingWorkout.duration_minutes} Min</div>}
                <div>Intensität: {existingWorkout.intensity}/5</div>
              </div>
            )}
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              💡 {getTip()}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-50/50 via-emerald-25/30 to-emerald-50/20 dark:from-emerald-950/20 dark:via-emerald-950/10 dark:to-emerald-950/5 border-emerald-200/30 dark:border-emerald-800/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Dumbbell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-lg">{existingWorkout ? 'Training bearbeiten' : 'Heute trainiert?'}</h3>
          </div>
          {existingWorkout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Abbrechen
            </Button>
          )}
        </div>

        {/* Quick Yes/No Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={didWorkout === true ? "default" : "outline"}
            onClick={() => setDidWorkout(true)}
            className={`h-12 font-medium ${
              didWorkout === true 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/20'
            }`}
            disabled={isSubmitting}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Ja! 💪
          </Button>
          <Button
            variant={didWorkout === false ? "default" : "outline"}
            onClick={() => setDidWorkout(false)}
            className={`h-12 font-medium ${
              didWorkout === false 
                ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-950/20'
            }`}
            disabled={isSubmitting}
          >
            Ruhetag 😌
          </Button>
        </div>

        {/* Training Details (only if they worked out) */}
        {didWorkout === true && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2 block">
                  Art des Trainings
                </label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger className="h-10 border-emerald-200 dark:border-emerald-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kraft">💪 Kraft</SelectItem>
                    <SelectItem value="cardio">🏃 Cardio</SelectItem>
                    <SelectItem value="mix">🔀 Mix</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2 block">
                  Dauer (Min)
                </label>
                <Input
                  type="number"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-10 border-emerald-200 dark:border-emerald-800"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2 block flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Intensität (1-5)
              </label>
              <Select value={intensity} onValueChange={setIntensity}>
                <SelectTrigger className="border-emerald-200 dark:border-emerald-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Sehr leicht 😌</SelectItem>
                  <SelectItem value="2">2 - Leicht 🙂</SelectItem>
                  <SelectItem value="3">3 - Moderat 💪</SelectItem>
                  <SelectItem value="4">4 - Intensiv 🔥</SelectItem>
                  <SelectItem value="5">5 - Extrem 💀</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {didWorkout !== null && (
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium animate-in slide-in-from-bottom-2 duration-300"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Speichere...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Training speichern
              </div>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};
