import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Edit, Copy, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExerciseSet {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
  user_id?: string;
  rest_seconds?: number;
  notes?: string;
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
  onDuplicateSession?: (session: ExerciseSession) => void;
  onSessionUpdated?: () => void;
}

interface DayStats {
  totalExercises: number;
  totalWeight: number;
  averageRPE: number;
  totalDuration: number;
  sessionCount: number;
}

export const DayCard: React.FC<DayCardProps> = ({ 
  date, 
  sessions, 
  onEditSession, 
  onDuplicateSession,
  onSessionUpdated 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleSessionNameEdit = (session: ExerciseSession) => {
    setEditingSessionId(session.id);
    setEditingName(session.session_name);
  };

  const handleSessionNameSave = async () => {
    if (!editingSessionId || !editingName.trim()) return;

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('exercise_sessions')
        .update({ session_name: editingName.trim() })
        .eq('id', editingSessionId);

      if (error) throw error;

      toast({
        title: "Session name updated",
        description: "Session name was successfully updated.",
      });

      setEditingSessionId(null);
      setEditingName('');
      onSessionUpdated?.();
    } catch (error) {
      console.error('Error updating session name:', error);
      toast({
        title: "Error",
        description: "Failed to update session name.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSessionNameCancel = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleDuplicateSession = async (session: ExerciseSession) => {
    try {
      setIsDuplicating(session.id);
      
      // Get user_id from the session sets or use current user
      const userId = session.exercise_sets[0]?.user_id;
      if (!userId) {
        throw new Error('Unable to determine user ID for duplication');
      }

      // Create new session with copied data
      const newSessionData = {
        user_id: userId,
        session_name: `${session.session_name} (Kopie)`,
        date: new Date().toISOString().split('T')[0], // Today's date
        start_time: null,
        end_time: null,
        notes: session.notes,
        workout_type: 'strength'
      };

      const { data: newSession, error: sessionError } = await supabase
        .from('exercise_sessions')
        .insert(newSessionData)
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Copy all exercise sets
      for (const set of session.exercise_sets) {
        const newSetData = {
          user_id: userId,
          session_id: newSession.id,
          exercise_id: set.exercise_id,
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe,
          rest_seconds: set.rest_seconds || null,
          notes: set.notes || null
        };

        const { error: setError } = await supabase
          .from('exercise_sets')
          .insert(newSetData);

        if (setError) throw setError;
      }

      toast({
        title: "Session duplicated",
        description: `"${session.session_name}" was successfully duplicated for today.`,
      });

      onSessionUpdated?.();
    } catch (error) {
      console.error('Error duplicating session:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate session.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleDeleteSession = async (session: ExerciseSession) => {
    if (!confirm(`Möchtest du die Session "${session.session_name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      setIsDeleting(session.id);
      
      // First delete all exercise sets for this session
      const { error: setsError } = await supabase
        .from('exercise_sets')
        .delete()
        .eq('session_id', session.id);

      if (setsError) throw setsError;

      // Then delete the session itself
      const { error: sessionError } = await supabase
        .from('exercise_sessions')
        .delete()
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      toast({
        title: "Session gelöscht",
        description: `"${session.session_name}" wurde erfolgreich gelöscht.`,
      });

      onSessionUpdated?.();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Fehler",
        description: "Session konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

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
            <div className="flex-1">
              <h3 className="font-semibold">
                {format(new Date(date), 'EEEE, d. MMMM yyyy', { locale: de })}
              </h3>
            </div>
          </div>
          
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
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 animate-accordion-down">
            {sessions.map((session) => (
              <Card key={session.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSessionNameSave();
                              } else if (e.key === 'Escape') {
                                handleSessionNameCancel();
                              }
                            }}
                            className="text-sm font-semibold"
                            autoFocus
                            disabled={isUpdating}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSessionNameSave}
                            disabled={isUpdating || !editingName.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSessionNameCancel}
                            disabled={isUpdating}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <h4 
                          className="font-semibold cursor-pointer hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSessionNameEdit(session);
                          }}
                        >
                          {session.session_name}
                        </h4>
                      )}
                      {session.start_time && session.end_time && (
                        <p className="text-sm text-muted-foreground">
                          Dauer: {Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60))} Min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSession(session);
                        }}
                        disabled={isDuplicating === session.id}
                      >
                        {isDuplicating === session.id ? (
                          <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
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
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session);
                        }}
                        disabled={isDeleting === session.id}
                      >
                        {isDeleting === session.id ? (
                          <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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