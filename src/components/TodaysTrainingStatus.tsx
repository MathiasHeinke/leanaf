import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, Plus, Clock, Target, Flame, Edit, Trash2, Copy, MoreHorizontal, Calendar, Dumbbell } from 'lucide-react';
import { ProgressiveOverloadWidget } from './ProgressiveOverloadWidget';

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
  onStartWorkoutPlan?: () => void;
  onEditSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDuplicateSession?: (sessionId: string) => void;
}

export const TodaysTrainingStatus: React.FC<TodaysTrainingStatusProps> = ({
  todaysSessions,
  onStartTraining,
  onStartWorkoutPlan,
  onEditSession,
  onDeleteSession,
  onDuplicateSession
}) => {
  const [deleteSessionId, setDeleteSessionId] = React.useState<string | null>(null);
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
    if (todaysSessions.length === 0) return null;
    
    let totalMinutes = 0;
    let hasValidTiming = false;
    
    todaysSessions.forEach(session => {
      if (session.start_time && session.end_time) {
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        if (duration > 0 && duration < 600) { // Reasonable duration (0-10 hours)
          totalMinutes += duration;
          hasValidTiming = true;
        }
      }
    });
    
    return hasValidTiming ? totalMinutes : null;
  };

  if (!hasTrained) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Bereit für dein Training?</h3>
          <p className="text-muted-foreground mb-4">
            Du hast heute noch nicht trainiert. Starte jetzt dein Workout!
          </p>
          <div className="space-y-2 w-full max-w-xs mx-auto">
            {onStartWorkoutPlan && (
              <Button 
                onClick={onStartWorkoutPlan} 
                size="lg" 
                className="w-full bg-green-600 hover:bg-green-700 text-white hover-scale transition-all"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Trainings-Plan starten
              </Button>
            )}
            <Button 
              onClick={onStartTraining} 
              size="lg" 
              variant="outline"
              className="w-full"
            >
              <Plus className="h-5 w-5 mr-2" />
              Individuelles Workout
            </Button>
          </div>
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
              <span className="text-2xl font-bold">{Math.round(getTotalVolume()).toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">kg Volumen</p>
          </div>
          
          {getTrainingDuration() !== null && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{getTrainingDuration()}</span>
              </div>
              <p className="text-sm text-muted-foreground">Minuten</p>
            </div>
          )}
          
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
              <div className="flex-1">
                <h5 className="font-medium">{session.session_name}</h5>
                <p className="text-sm text-muted-foreground">
                  {session.exercise_sets.length} Sätze • 
                  {session.exercise_sets[0]?.exercises.name}
                  {session.exercise_sets.length > 1 && ' +' + (session.exercise_sets.length - 1) + ' weitere'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                  Abgeschlossen
                </Badge>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEditSession && (
                      <DropdownMenuItem onClick={() => onEditSession(session.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                    )}
                    {onDuplicateSession && (
                      <DropdownMenuItem onClick={() => onDuplicateSession(session.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplizieren
                      </DropdownMenuItem>
                    )}
                    {onDeleteSession && (
                      <DropdownMenuItem 
                        onClick={() => setDeleteSessionId(session.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onStartTraining} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Weiteres Training hinzufügen
        </Button>

        {/* Progressive Overload Widget */}
        <div className="mt-4">
          <ProgressiveOverloadWidget />
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Training löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Bist du sicher, dass du dieses Training löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (deleteSessionId && onDeleteSession) {
                    onDeleteSession(deleteSessionId);
                    setDeleteSessionId(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};