
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Footprints
} from "lucide-react";
import { WorkoutEditModal } from "./WorkoutEditModal";
import { toast } from "sonner";
import { 
  getCurrentWeekBounds, 
  getWeekBounds, 
  getPreviousWeek, 
  getNextWeek, 
  getWeekDays,
  formatDisplayDate,
  toDateString,
  isDateToday,
  isDatePast
} from "@/utils/dateHelpers";

interface WorkoutEntry {
  id: string;
  date: string;
  did_workout: boolean;
  workout_type: string;
  duration_minutes: number;
  intensity: number;
  distance_km?: number;
  steps?: number;
  walking_notes?: string;
}

export const WorkoutCalendar = () => {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getCurrentWeekBounds().start);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutEntry | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkouts();
    }
  }, [user, currentWeekStart]);

  const loadWorkouts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const weekBounds = getWeekBounds(currentWeekStart);
      const startDate = toDateString(weekBounds.start);
      const endDate = toDateString(weekBounds.end);

      const { data, error } = await supabase
        .from('workouts')
        .select('id, date, did_workout, workout_type, duration_minutes, intensity, distance_km, steps, walking_notes')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      setWorkouts(data || []);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string, date: string) => {
    if (!confirm('Workout-Eintrag wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Workout-Eintrag gelöscht');
      loadWorkouts();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('Fehler beim Löschen des Workout-Eintrags');
    }
  };

  const getWorkoutForDate = (date: Date) => {
    const dateStr = toDateString(date);
    return workouts.find(w => w.date === dateStr);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeekStart(getPreviousWeek(currentWeekStart));
    } else {
      setCurrentWeekStart(getNextWeek(currentWeekStart));
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getCurrentWeekBounds().start);
  };

  const getWorkoutTypeEmoji = (type: string) => {
    switch (type) {
      case 'kraft': return '💪';
      case 'cardio': return '🏃';
      case 'yoga': return '🧘';
      case 'stretching': return '🤸';
      case 'pause': return '🏝️';
      default: return '🏋️';
    }
  };

  const getWorkoutTypeName = (type: string) => {
    switch (type) {
      case 'kraft': return 'Krafttraining';
      case 'cardio': return 'Cardio';
      case 'yoga': return 'Yoga';
      case 'stretching': return 'Stretching';
      case 'pause': return 'Ruhetag';
      default: return 'Training';
    }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'text-red-600';
    if (intensity >= 6) return 'text-orange-600';
    if (intensity >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleDateClick = (date: Date, workout?: WorkoutEntry) => {
    setSelectedDate(date);
    setSelectedWorkout(workout || null);
    setShowEditModal(true);
  };

  const weekDays = getWeekDays(currentWeekStart);
  const weekBounds = getWeekBounds(currentWeekStart);
  const weekRange = `${formatDisplayDate(weekBounds.start, 'd. MMM')} - ${formatDisplayDate(weekBounds.end, 'd. MMM yyyy')}`;
  
  const isCurrentWeek = () => {
    const currentWeekBounds = getCurrentWeekBounds();
    return toDateString(currentWeekStart) === toDateString(currentWeekBounds.start);
  };

  // Stats calculation - only count actual workouts
  const thisWeekActualWorkouts = workouts.filter(w => w.did_workout === true);
  const totalWorkouts = thisWeekActualWorkouts.length;
  const avgIntensity = thisWeekActualWorkouts.length > 0 
    ? Math.round(thisWeekActualWorkouts.reduce((sum, w) => sum + w.intensity, 0) / thisWeekActualWorkouts.length)
    : 0;
  const totalMinutes = thisWeekActualWorkouts.reduce((sum, w) => sum + w.duration_minutes, 0);

  return (
    <>
      <Card className="p-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Trainings-Kalender
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {!isCurrentWeek() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="text-xs px-2"
                >
                  Heute
                </Button>
              )}
              
              <span className="font-medium min-w-[160px] text-center text-sm">
                {weekRange}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Weekly Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalWorkouts}</div>
              <div className="text-sm text-muted-foreground">Workouts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{avgIntensity}</div>
              <div className="text-sm text-muted-foreground">Ø Intensität</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalMinutes}</div>
              <div className="text-sm text-muted-foreground">Minuten</div>
            </div>
          </div>

          {/* Daily List */}
          <div className="space-y-3">
            {weekDays.map((day, index) => {
              const workout = getWorkoutForDate(day);
              const isToday = isDateToday(toDateString(day));
              const isPast = isDatePast(toDateString(day));
              const canEdit = isPast || isToday;
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`
                    border rounded-lg p-4 transition-all
                    ${isToday ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                      {formatDisplayDate(day, 'EEEE, d. MMMM')}
                    </h3>
                    {isToday && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        Heute
                      </span>
                    )}
                  </div>

                  {/* Workout Content */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {workout && workout.did_workout ? (
                        <div className="space-y-2">
                          {/* Workout Info */}
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getWorkoutTypeEmoji(workout.workout_type)}</span>
                            <div>
                              <div className="font-medium">
                                {getWorkoutTypeName(workout.workout_type)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {workout.duration_minutes} Min • Intensität: <span className={getIntensityColor(workout.intensity)}>{workout.intensity}/10</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Steps & Distance */}
                          {(workout.steps || workout.distance_km) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Footprints className="h-4 w-4 text-green-600" />
                              <span>
                                {workout.steps && `${workout.steps.toLocaleString()} Schritte`}
                                {workout.steps && workout.distance_km && ' • '}
                                {workout.distance_km && `${workout.distance_km} km`}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : workout && !workout.did_workout ? (
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🏝️</span>
                          <div>
                            <div className="font-medium">Ruhetag</div>
                            {(workout.steps || workout.distance_km) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Footprints className="h-4 w-4 text-green-600" />
                                <span>
                                  {workout.steps && `${workout.steps.toLocaleString()} Schritte`}
                                  {workout.steps && workout.distance_km && ' • '}
                                  {workout.distance_km && `${workout.distance_km} km`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground italic">
                          Noch kein Eintrag
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {canEdit && (
                      <div className="flex gap-2 ml-4">
                        {workout ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDateClick(day, workout)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkout(workout.id, workout.date);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDateClick(day)}
                            className="h-8 w-8 p-0 border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                <span>Leicht (1-3)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                <span>Mittel (4-5)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                <span>Schwer (6-7)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>Extrem (8-10)</span>
              </div>
            </div>
            <p className="text-xs">
              <Plus className="h-3 w-3 inline mr-1" />
              Klicke auf vergangene/heutige Tage um Workouts einzutragen •
              <Edit className="h-3 w-3 inline mx-1" />
              Bearbeiten-Button zum Ändern bestehender Einträge
            </p>
          </div>
        </CardContent>
      </Card>

      <WorkoutEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        selectedDate={selectedDate}
        existingWorkout={selectedWorkout}
        onWorkoutSaved={loadWorkouts}
      />
    </>
  );
};
