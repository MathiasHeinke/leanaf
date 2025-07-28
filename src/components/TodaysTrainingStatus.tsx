import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Plus, Clock, Target, Flame } from 'lucide-react';

interface ExerciseSession {
  id: string;
  session_name: string;
  start_time: string;
  end_time: string;
  exercise_sets: {
    weight_kg: number;
    reps: number;
    rpe: number;
    exercises: {
      name: string;
    };
  }[];
}

interface TodaysTrainingStatusProps {
  todaysSessions: ExerciseSession[];
  onStartTraining: () => void;
}

export const TodaysTrainingStatus: React.FC<TodaysTrainingStatusProps> = ({
  todaysSessions,
  onStartTraining
}) => {
  const hasTrained = todaysSessions.length > 0;
  
  const getTotalSets = () => {
    return todaysSessions.reduce((total, session) => total + session.exercise_sets.length, 0);
  };

  const getTotalVolume = () => {
    return todaysSessions.reduce((total, session) => 
      total + session.exercise_sets.reduce((sessionTotal, set) => 
        sessionTotal + (set.weight_kg * set.reps), 0
      ), 0
    );
  };

  const getAverageRPE = () => {
    const allSets = todaysSessions.flatMap(session => session.exercise_sets);
    if (allSets.length === 0) return 0;
    return allSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / allSets.length;
  };

  const getTrainingDuration = () => {
    if (todaysSessions.length === 0) return 0;
    
    const totalMinutes = todaysSessions.reduce((total, session) => {
      const start = new Date(session.start_time);
      const end = new Date(session.end_time);
      return total + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }, 0);
    
    return totalMinutes;
  };

  if (!hasTrained) {
    return (
      <Card 
        className="border-dashed border-2 border-muted-foreground/20 bg-gradient-to-br from-background to-muted/20 cursor-pointer hover:border-primary/40 transition-all group"
        onClick={onStartTraining}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Bereit für dein Training?</h3>
          <p className="text-muted-foreground mb-6">
            Du hast heute noch nicht trainiert. Starte jetzt dein Workout!
          </p>
          <Button onClick={(e) => { e.stopPropagation(); onStartTraining(); }} size="lg" className="bg-gradient-primary">
            <Plus className="h-5 w-5 mr-2" />
            Training starten
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          Heute trainiert!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{getTotalSets()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Sätze</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{Math.round(getTotalVolume())}</span>
            </div>
            <p className="text-sm text-muted-foreground">kg Volumen</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{getTrainingDuration()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Minuten</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-2xl font-bold">{getAverageRPE().toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Ø RPE</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Heutige Sessions:</h4>
          {todaysSessions.map((session, index) => (
            <div key={session.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
              <div>
                <h5 className="font-medium">{session.session_name}</h5>
                <p className="text-sm text-muted-foreground">
                  {session.exercise_sets.length} Sätze • 
                  {session.exercise_sets[0]?.exercises.name}
                  {session.exercise_sets.length > 1 && ' +' + (session.exercise_sets.length - 1) + ' weitere'}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                Abgeschlossen
              </Badge>
            </div>
          ))}
        </div>

        <Button onClick={onStartTraining} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Weiteres Training hinzufügen
        </Button>
      </CardContent>
    </Card>
  );
};