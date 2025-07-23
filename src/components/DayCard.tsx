import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Edit, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

interface DayCardProps {
  date: string;
  sessions: ExerciseSession[];
  onEditSession: (session: ExerciseSession) => void;
}

interface DayStats {
  totalExercises: number;
  totalWeight: number;
  averageRPE: number;
  totalDuration: number;
  sessionCount: number;
}

export const DayCard: React.FC<DayCardProps> = ({ date, sessions, onEditSession }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateDayStats = (): DayStats => {
    const allSets = sessions.flatMap(session => session.exercise_sets);
    const totalWeight = allSets.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0);
    const uniqueExercises = new Set(allSets.map(set => set.exercise_id));
    const averageRPE = allSets.length > 0 
      ? allSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / allSets.length 
      : 0;
    
    // Calculate total duration from all sessions
    const totalDuration = sessions.reduce((sum, session) => {
      if (session.start_time && session.end_time) {
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
      return sum;
    }, 0);

    return {
      totalExercises: uniqueExercises.size,
      totalWeight: Math.round(totalWeight),
      averageRPE: Math.round(averageRPE * 10) / 10,
      totalDuration,
      sessionCount: sessions.length
    };
  };

  const stats = calculateDayStats();

  const renderExerciseDetails = (session: ExerciseSession) => {
    return Object.entries(
      session.exercise_sets.reduce((acc, set) => {
        const exerciseName = set.exercises.name;
        if (!acc[exerciseName]) {
          acc[exerciseName] = [];
        }
        acc[exerciseName].push(set);
        return acc;
      }, {} as Record<string, ExerciseSet[]>)
    ).map(([exerciseName, sets]) => (
      <div key={exerciseName} className="p-3 bg-secondary/20 rounded-lg">
        <h5 className="font-medium mb-2">{exerciseName}</h5>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {sets.map((set) => (
            <div key={set.id} className="text-center">
              <span className="text-muted-foreground">Satz {set.set_number}: </span>
              <span className="font-medium">
                {set.weight_kg}kg × {set.reps}
                {set.rpe && ` (RPE: ${set.rpe})`}
              </span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
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
                <Dumbbell className="h-4 w-4 text-primary" />
                {format(new Date(date), 'EEEE, d. MMMM yyyy', { locale: de })}
              </h3>
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
                {stats.totalDuration > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {stats.totalDuration} Min
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {sessions.reduce((sum, s) => sum + s.exercise_sets.length, 0)} Sätze
            </Badge>
            {stats.sessionCount > 1 && (
              <Badge variant="outline">
                {stats.sessionCount} Sessions
              </Badge>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 animate-accordion-down">
            {sessions.map((session) => (
              <Card key={session.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{session.session_name}</h4>
                      {session.start_time && session.end_time && (
                        <p className="text-sm text-muted-foreground">
                          Dauer: {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} Min
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSession(session);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {renderExerciseDetails(session)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};