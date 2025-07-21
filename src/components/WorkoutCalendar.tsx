
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Clock,
  Zap,
  CheckCircle,
  XCircle
} from "lucide-react";

interface WorkoutEntry {
  date: string;
  did_workout: boolean;
  workout_type: string;
  duration_minutes: number;
  intensity: number;
}

export const WorkoutCalendar = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select('*')
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
      default: return '🏋️';
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('de-DE', { 
    month: 'long', 
    year: 'numeric' 
  });

  const thisMonth = workouts.filter(w => w.did_workout);
  const totalWorkouts = thisMonth.length;
  const avgIntensity = thisMonth.length > 0 
    ? Math.round(thisMonth.reduce((sum, w) => sum + w.intensity, 0) / thisMonth.length)
    : 0;
  const totalMinutes = thisMonth.reduce((sum, w) => sum + w.duration_minutes, 0);

  return (
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
        {/* Stats */}
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
                return <div key={index} className="p-2 h-12"></div>;
              }
              
              const workout = getWorkoutForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`
                    relative p-2 h-12 border rounded-lg text-center text-sm
                    ${isToday ? 'border-primary bg-primary/10' : 'border-gray-200'}
                  `}
                >
                  <div className="font-medium">{day.getDate()}</div>
                  
                  {workout && (
                    <div className="absolute top-0 right-0 w-full h-full flex items-center justify-center">
                      {workout.did_workout ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{getWorkoutTypeEmoji(workout.workout_type)}</span>
                          <div 
                            className={`w-2 h-2 rounded-full ${getIntensityColor(workout.intensity)}`}
                          />
                        </div>
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-4">
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
        </div>
      </CardContent>
    </Card>
  );
};
