
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
  XCircle,
  Trash2
} from "lucide-react";
import { WorkoutEditModal } from "./WorkoutEditModal";
import { toast } from "sonner";

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutEntry | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkouts();
    }
  }, [user, currentMonth]);

  const loadWorkouts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('workouts')
        .select('id, date, did_workout, workout_type, duration_minutes, intensity, distance_km, steps, walking_notes')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      setWorkouts(data || []);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Delete workout function
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getWorkoutForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return workouts.find(w => w.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
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

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('de-DE', { 
    month: 'long', 
    year: 'numeric' 
  });

  // FIXED: Only count actual workouts (did_workout = true) for stats
  const thisMonthActualWorkouts = workouts.filter(w => w.did_workout === true);
  const totalWorkouts = thisMonthActualWorkouts.length;
  const avgIntensity = thisMonthActualWorkouts.length > 0 
    ? Math.round(thisMonthActualWorkouts.reduce((sum, w) => sum + w.intensity, 0) / thisMonthActualWorkouts.length)
    : 0;
  const totalMinutes = thisMonthActualWorkouts.reduce((sum, w) => sum + w.duration_minutes, 0);

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
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center">
                {monthYear}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats - FIXED: Only count actual workouts */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalWorkouts}</div>
              <div className="text-sm text-muted-foreground">Echte Workouts</div>
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

          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                <div key={day} className="p-2">{day}</div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-2 h-16"></div>;
                }
                
                const workout = getWorkoutForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = isPastDate(day);
                const canEdit = isPast || isToday;
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`
                      relative p-2 h-16 border rounded-lg text-center text-sm group
                      ${isToday ? 'border-primary bg-primary/10' : 'border-gray-200'}
                      ${canEdit && !workout ? 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer' : ''}
                    `}
                  >
                    <div className="font-medium">{day.getDate()}</div>
                    
                    {workout && workout.did_workout ? (
                      <div className="absolute inset-1 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs">{getWorkoutTypeEmoji(workout.workout_type)}</span>
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
                              className="h-6 w-6 p-0"
                              onClick={() => handleDateClick(day, workout)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
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
                      <div className="absolute inset-1 flex items-center justify-center">
                        <XCircle className="h-3 w-3 text-gray-400" />
                        {canEdit && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDateClick(day, workout)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
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
                      <div className="absolute inset-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-gray-300"
                          onClick={() => handleDateClick(day)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="text-xs text-muted-foreground space-y-1">
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
            <p className="text-xs text-muted-foreground mt-2">
              <Plus className="h-3 w-3 inline mr-1" />
              Klicke auf vergangene Tage um Workouts nachzutragen •
              <Trash2 className="h-3 w-3 inline mx-1" />
              Hover über Einträge zum Löschen
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
