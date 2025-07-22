
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
  Trash2
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

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'bg-red-500';
    if (intensity >= 6) return 'bg-orange-500';
    if (intensity >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getWorkoutTypeEmoji = (type: string) => {
    switch (type) {
      case 'kraft': return '💪';
      case 'cardio': return '🏃';
      case 'yoga': return '🧘';
      case 'stretching': return '🤸';
      case 'pause': return '😴';
      default: return '🏋️';
    }
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

          {/* Weekly Calendar Grid */}
          <div className="space-y-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                <div key={day} className="p-2">{day}</div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => {
                const workout = getWorkoutForDate(day);
                const isToday = isDateToday(toDateString(day));
                const isPast = isDatePast(toDateString(day));
                const canEdit = isPast || isToday;
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`
                      relative p-3 h-20 border rounded-xl text-center text-sm group transition-all
                      ${isToday ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300'}
                      ${canEdit && !workout ? 'hover:bg-gray-50 cursor-pointer' : ''}
                    `}
                  >
                    <div className={`font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {day.getDate()}
                    </div>
                    
                    {workout && workout.did_workout ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-lg">{getWorkoutTypeEmoji(workout.workout_type)}</span>
                          {workout.workout_type !== 'pause' && (
                            <div 
                              className={`w-2 h-2 rounded-full ${getIntensityColor(workout.intensity)}`}
                            />
                          )}
                        </div>
                        
                        {canEdit && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                              onClick={() => handleDateClick(day, workout)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkout(workout.id, workout.date);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : workout && !workout.did_workout ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <span className="text-lg">🏝️</span>
                        {canEdit && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                              onClick={() => handleDateClick(day, workout)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkout(workout.id, workout.date);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : canEdit ? (
                      <div className="flex items-center justify-center h-full">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5"
                          onClick={() => handleDateClick(day)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        {formatDisplayDate(day, 'd')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Leicht (1-3)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Mittel (4-5)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>Schwer (6-7)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Extrem (8-10)</span>
              </div>
            </div>
            <p className="text-xs">
              <Plus className="h-3 w-3 inline mr-1" />
              Klicke auf vergangene/heutige Tage um Workouts einzutragen •
              <Edit className="h-3 w-3 inline mx-1" />
              Hover über Einträge zum Bearbeiten
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
