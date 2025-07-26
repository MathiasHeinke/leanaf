import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DayCard } from '@/components/DayCard';
import { MonthCard } from '@/components/MonthCard';
import { ExerciseSessionEditModal } from '@/components/ExerciseSessionEditModal';
import { X, Calendar, RotateCcw } from 'lucide-react';
import { format, startOfMonth, subMonths, isThisMonth, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExerciseSession {
  id: string;
  session_name: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  exercise_sets: {
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
  }[];
}

interface GroupedSessions {
  currentWeek: Record<string, ExerciseSession[]>;
  previousWeeks: Record<string, ExerciseSession[]>;
  completeMonths: Record<string, Record<string, ExerciseSession[]>>;
}

interface TrainingHistoryProps {
  sessions: ExerciseSession[];
  onClose: () => void;
  onSessionUpdated: () => void;
}

export const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, 
  onClose, 
  onSessionUpdated 
}) => {
  const [editingSession, setEditingSession] = useState<ExerciseSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  const groupSessionsByTime = (sessionsData: ExerciseSession[]): GroupedSessions => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    
    const twoWeeksAgo = new Date(currentWeekStart);
    twoWeeksAgo.setDate(currentWeekStart.getDate() - 14);

    const grouped: GroupedSessions = {
      currentWeek: {},
      previousWeeks: {},
      completeMonths: {}
    };

    sessionsData.forEach(session => {
      const sessionDate = new Date(session.date);
      const dateKey = session.date;
      
      if (sessionDate >= currentWeekStart) {
        // Current week
        if (!grouped.currentWeek[dateKey]) {
          grouped.currentWeek[dateKey] = [];
        }
        grouped.currentWeek[dateKey].push(session);
      } else if (sessionDate >= twoWeeksAgo) {
        // Previous 2 weeks
        if (!grouped.previousWeeks[dateKey]) {
          grouped.previousWeeks[dateKey] = [];
        }
        grouped.previousWeeks[dateKey].push(session);
      } else {
        // Older data - group by months
        const monthKey = format(sessionDate, 'yyyy-MM');
        if (!grouped.completeMonths[monthKey]) {
          grouped.completeMonths[monthKey] = {};
        }
        if (!grouped.completeMonths[monthKey][dateKey]) {
          grouped.completeMonths[monthKey][dateKey] = [];
        }
        grouped.completeMonths[monthKey][dateKey].push(session);
      }
    });

    return grouped;
  };

  const groupedSessions = groupSessionsByTime(sessions);

  const totalSessions = sessions.length;
  const totalSets = sessions.reduce((sum, session) => sum + session.exercise_sets.length, 0);
  const totalVolume = sessions.reduce((sum, session) => 
    sum + session.exercise_sets.reduce((sessionSum, set) => 
      sessionSum + (set.weight_kg * set.reps), 0
    ), 0
  );

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Trainingshistorie
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{totalSessions}</div>
                  <p className="text-sm text-muted-foreground">Sessions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-secondary">{totalSets}</div>
                  <p className="text-sm text-muted-foreground">Sätze</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{Math.round(totalVolume).toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">kg Volumen</p>
                </CardContent>
              </Card>
            </div>

            {/* History Content */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Verlauf</CardTitle>
                  {sessions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllExpanded(!allExpanded)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Noch keine Trainings</h3>
                    <p>Starte mit deinem ersten Training, um deine Historie aufzubauen!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Current Week */}
                    {Object.keys(groupedSessions.currentWeek).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-primary">Diese Woche</h3>
                          <Badge variant="outline">
                            {Object.keys(groupedSessions.currentWeek).length} Tage
                          </Badge>
                        </div>
                        {Object.keys(groupedSessions.currentWeek)
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                          .map(date => (
                            <DayCard
                              key={date}
                              date={date}
                              sessions={groupedSessions.currentWeek[date]}
                              onEditSession={(session) => {
                                setEditingSession(session);
                                setIsEditModalOpen(true);
                              }}
                              onSessionUpdated={onSessionUpdated}
                            />
                          ))}
                      </div>
                    )}

                    {/* Previous Weeks */}
                    {Object.keys(groupedSessions.previousWeeks).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-secondary">Letzte Wochen</h3>
                          <Badge variant="outline">
                            {Object.keys(groupedSessions.previousWeeks).length} Tage
                          </Badge>
                        </div>
                        {Object.keys(groupedSessions.previousWeeks)
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                          .map(date => (
                            <DayCard
                              key={date}
                              date={date}
                              sessions={groupedSessions.previousWeeks[date]}
                              onEditSession={(session) => {
                                setEditingSession(session);
                                setIsEditModalOpen(true);
                              }}
                              onSessionUpdated={onSessionUpdated}
                            />
                          ))}
                      </div>
                    )}

                    {/* Complete Months */}
                    {Object.keys(groupedSessions.completeMonths).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-accent">Ältere Monate</h3>
                          <Badge variant="outline">
                            {Object.keys(groupedSessions.completeMonths).length} Monate
                          </Badge>
                        </div>
                        {Object.keys(groupedSessions.completeMonths)
                          .sort((a, b) => b.localeCompare(a))
                          .map(monthKey => (
                            <MonthCard
                              key={monthKey}
                              month={monthKey}
                              sessionsByDay={groupedSessions.completeMonths[monthKey]}
                              onEditSession={(session) => {
                                setEditingSession(session);
                                setIsEditModalOpen(true);
                              }}
                              onSessionUpdated={onSessionUpdated}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseSessionEditModal
        session={editingSession}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSession(null);
        }}
        onSessionUpdated={onSessionUpdated}
      />
    </>
  );
};