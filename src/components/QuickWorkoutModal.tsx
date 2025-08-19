import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Footprints, Moon, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { parseLocaleFloat } from '@/utils/localeNumberHelpers';

interface QuickWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    profileData?: any;
    lastWorkout?: any;
    workoutStreak?: number;
    recommendedType?: string;
    activityLevel?: string;
    restDay?: boolean;
  };
}

const workoutTypes = [
  { value: 'kraft', label: 'Krafttraining', icon: Dumbbell, description: 'Muskelaufbau & Kraft' },
  { value: 'cardio', label: 'Cardio', icon: Zap, description: 'Ausdauer & Fettverbrennung' },
  { value: 'walking', label: 'Spazieren/Gehen', icon: Footprints, description: 'Leichte Bewegung' },
  { value: 'pause', label: 'Pause/Ruhetag', icon: Moon, description: 'Aktive Regeneration' },
  { value: 'other', label: 'Anderes', icon: Dumbbell, description: 'Sonstige Aktivität' }
];

export const QuickWorkoutModal = ({ isOpen, onClose, contextData }: QuickWorkoutModalProps) => {
  const [workoutType, setWorkoutType] = useState("kraft");
  const [duration, setDuration] = useState<number[]>([30]);
  const [intensity, setIntensity] = useState<number[]>([7]);
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [steps, setSteps] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Pre-fill with context recommendations
  useEffect(() => {
    if (contextData?.recommendedType) {
      setWorkoutType(contextData.recommendedType);
    }
    if (contextData?.lastWorkout) {
      // Pre-fill similar values from last workout
      setDuration([contextData.lastWorkout.duration_minutes || 30]);
      setIntensity([contextData.lastWorkout.intensity || 7]);
    }
  }, [contextData]);

  const handleSubmit = async (e: React.FormEvent, retryCount = 0) => {
    e.preventDefault();
    
    // Validation: Check required data
    if (!user?.id) {
      toast.error('Benutzer nicht authentifiziert. Bitte erneut anmelden.');
      return;
    }

    if (!workoutType) {
      toast.error('Bitte Trainingsart auswählen');
      return;
    }

    setIsSubmitting(true);
    const maxRetries = 3;

    try {
      console.log('💾 Saving quick workout...', { 
        userId: user.id,
        workoutType,
        duration: duration[0],
        intensity: intensity[0]
      });

      const todayDateString = getCurrentDateString();

      const workoutData = {
        user_id: user.id, // Ensure user_id is properly set
        workout_type: workoutType,
        duration_minutes: workoutType === 'pause' ? 0 : duration[0],
        intensity: workoutType === 'pause' ? 0 : intensity[0],
        distance_km: distanceKm ? parseLocaleFloat(distanceKm) : null,
        steps: steps ? parseInt(steps) : null,
        walking_notes: notes || null,
        did_workout: workoutType !== 'pause',
        date: todayDateString
      };

      const { error } = await supabase
        .from('workouts')
        .insert(workoutData);

      if (error) {
        console.error('❌ Quick workout insert error:', error);
        throw new Error(`Workout speichern fehlgeschlagen: ${error.message}`);
      }

      console.log('✅ Quick workout saved successfully');

      // Award points for actual workouts
      if (workoutType !== 'pause') {
        try {
          await awardPoints('workout_completed', getPointsForActivity('workout_completed'), 'Workout abgeschlossen');
          await updateStreak('workout');
        } catch (pointsError) {
          console.warn('⚠️ Points/streak update failed:', pointsError);
          // Don't fail the whole operation for points errors
        }
      }

      toast.success('Workout erfolgreich eingetragen!');
      triggerDataRefresh();
      onClose();

    } catch (error: any) {
      console.error('💥 Quick workout error:', error);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries && (
        error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('connection')
      )) {
        console.log(`🔄 Retrying quick workout save ${retryCount + 1}/${maxRetries}`);
        setTimeout(() => handleSubmit(e, retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      // User-friendly error messages
      let friendlyMessage = 'Fehler beim Speichern des Workouts';
      
      if (error?.message?.includes('row-level security')) {
        friendlyMessage = 'Zugriffsberechtigung fehlt. Bitte erneut anmelden.';
      } else if (error?.message?.includes('not authenticated')) {
        friendlyMessage = 'Anmeldung erforderlich. Bitte erneut anmelden.';
      } else if (error?.message?.includes('duplicate key')) {
        friendlyMessage = 'Workout für heute bereits vorhanden. Bitte bestehenden Eintrag bearbeiten.';
      } else if (error?.message) {
        friendlyMessage = `Speichern fehlgeschlagen: ${error.message}`;
      }

      // Local storage backup for recovery
      try {
        const backupData = {
          workoutType,
          duration: duration[0],
          intensity: intensity[0],
          distanceKm,
          steps,
          notes,
          timestamp: Date.now()
        };
        localStorage.setItem('quick_workout_backup', JSON.stringify(backupData));
        console.log('💾 Quick workout data backed up locally');
      } catch (backupError) {
        console.warn('⚠️ Could not backup quick workout data:', backupError);
      }

      toast.error(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWorkoutTypeInfo = (type: string) => {
    return workoutTypes.find(t => t.value === type) || workoutTypes[0];
  };

  const getIntensityLabel = (value: number) => {
    if (value <= 3) return 'Sehr leicht';
    if (value <= 5) return 'Leicht';
    if (value <= 7) return 'Moderat';
    if (value <= 9) return 'Intensiv';
    return 'Maximal';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Workout eintragen
            {contextData?.workoutStreak && contextData.workoutStreak > 1 && (
              <Badge variant="secondary" className="ml-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                {contextData.workoutStreak} Tage Serie
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Context Summary */}
        {contextData && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="text-sm space-y-2">
              {contextData.recommendedType && (
                <div className="flex items-center gap-2">
                  <span>Empfohlen:</span>
                  <Badge variant="default">
                    {getWorkoutTypeInfo(contextData.recommendedType).label}
                  </Badge>
                </div>
              )}
              {contextData.lastWorkout && (
                <p>Letztes Workout: <span className="font-semibold">
                  {getWorkoutTypeInfo(contextData.lastWorkout.workout_type).label} 
                  ({contextData.lastWorkout.duration_minutes || 0} Min)
                </span></p>
              )}
              {contextData.restDay && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Moon className="h-4 w-4" />
                  <span>Ruhetag empfohlen für optimale Regeneration</span>
                </div>
              )}
              {contextData.activityLevel && (
                <p>Aktivitätslevel: <span className="font-semibold">{contextData.activityLevel}</span></p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workout Type */}
          <div className="space-y-2">
            <Label>Trainingsart</Label>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workoutTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {workoutType === 'pause' ? (
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
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
              {/* Duration */}
              <div className="space-y-2">
                <Label>Dauer: {duration[0]} Minuten</Label>
                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  max={180}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Intensity */}
              <div className="space-y-2">
                <Label>Intensität: {intensity[0]}/10 ({getIntensityLabel(intensity[0])})</Label>
                <Slider
                  value={intensity}
                  onValueChange={setIntensity}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Distance (for cardio/walking) */}
              {(workoutType === 'cardio' || workoutType === 'walking') && (
                <div className="space-y-2">
                  <Label htmlFor="distance">Distanz (km, optional)</Label>
                  <NumericInput
                    id="distance"
                    value={distanceKm}
                    onChange={(value) => setDistanceKm(value)}
                    placeholder="z.B. 5.2"
                  />
                </div>
              )}

              {/* Steps (for walking) */}
              {workoutType === 'walking' && (
                <div className="space-y-2">
                  <Label htmlFor="steps">Schritte (optional)</Label>
                  <NumericInput
                    id="steps"
                    value={steps}
                    onChange={(value) => setSteps(value)}
                    placeholder="z.B. 8000"
                  />
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Übungen, Gefühl, Besonderheiten..."
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Speichern...' : 'Workout speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};