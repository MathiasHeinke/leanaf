import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Calendar, TrendingUp, Target } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DayCard } from './DayCard';

interface ExerciseSet {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
  exercises: {
    name: string;
    category: string;
  };
}

interface ExerciseSession {
  id: string;
  session_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  exercise_sets: ExerciseSet[];
}

interface MonthCardProps {
  month: string; // YYYY-MM format
  sessionsByDay: Record<string, ExerciseSession[]>;
  onEditSession: (session: ExerciseSession) => void;
}

interface MonthStats {
  totalWorkoutDays: number;
  totalExercises: number;
  totalWeight: number;
  averageRPE: number;
  totalSessions: number;
}

export const MonthCard: React.FC<MonthCardProps> = ({ month, sessionsByDay, onEditSession }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateMonthStats = (): MonthStats => {
    const allSessions = Object.values(sessionsByDay).flat();
    const allSets = allSessions.flatMap(session => session.exercise_sets);
    const totalWeight = allSets.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0);
    const uniqueExercises = new Set(allSets.map(set => set.exercise_id));
    const averageRPE = allSets.length > 0 
      ? allSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / allSets.length 
      : 0;

    return {
      totalWorkoutDays: Object.keys(sessionsByDay).length,
      totalExercises: uniqueExercises.size,
      totalWeight: Math.round(totalWeight),
      averageRPE: Math.round(averageRPE * 10) / 10,
      totalSessions: allSessions.length
    };
  };

  const stats = calculateMonthStats();
  const monthDate = new Date(month + '-01');
  const sortedDays = Object.keys(sessionsByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <Card className="border-l-4 border-l-secondary hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary" />
                {format(monthDate, 'MMMM yyyy', { locale: de })}
              </h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>{stats.totalWorkoutDays} Trainingstage</span>
                <span>•</span>
                <span>{stats.totalExercises} Übungen</span>
                <span>•</span>
                <span>{stats.totalWeight.toLocaleString()} kg</span>
                {stats.averageRPE > 0 && (
                  <>
                    <span>•</span>
                    <span>Ø RPE: {stats.averageRPE}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-secondary/20">
              {stats.totalSessions} Sessions
            </Badge>
            <div className="flex gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>{Object.values(sessionsByDay).flat().reduce((sum, s) => sum + s.exercise_sets.length, 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 animate-accordion-down">
            {sortedDays.map((date) => (
              <DayCard
                key={date}
                date={date}
                sessions={sessionsByDay[date]}
                onEditSession={onEditSession}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};