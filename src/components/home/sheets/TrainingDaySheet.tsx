/**
 * TrainingDaySheet - Layer 2 Training Overlay
 * Shows today's training status, weekly overview, recent sessions, and quick logging
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Dumbbell, Check, Settings, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentDateString, getLast7DaysWithLabels } from '@/utils/dateHelpers';
import { createTimezoneHeaders } from '@/utils/timezone-backend-helper';
import { QUERY_KEYS, invalidateCategory } from '@/constants/queryKeys';
import { 
  TRAINING_TYPE_LABELS, 
  TRAINING_TYPE_ICONS, 
  SPLIT_TYPE_LABELS,
  type TrainingType,
  type SplitType
} from '@/types/training';
import { TrainingNotesInput, type ParsedTrainingResult } from '@/components/training/TrainingNotesInput';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TrainingDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogger: () => void;
}

export const TrainingDaySheet: React.FC<TrainingDaySheetProps> = ({
  isOpen,
  onClose,
  onOpenLogger
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const todayStr = getCurrentDateString();
  const workoutTarget = 4;
  
  // Quick log state
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query: Today's session
  const { data: todaySession, refetch: refetchToday } = useQuery({
    queryKey: ['training-session-today', todayStr],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_date', todayStr)
        .maybeSingle();
      
      return data;
    },
    enabled: isOpen
  });

  // Handle quick log submission
  const handleQuickLogSubmit = async (result: ParsedTrainingResult) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Nicht eingeloggt');
        return;
      }

      const response = await supabase.functions.invoke('training-ai-parser', {
        body: {
          raw_text: result.rawText,
          training_type: result.trainingType,
          persist: true
        },
        headers: createTimezoneHeaders()
      });

      if (response.error) {
        throw new Error(response.error.message || 'Parsing fehlgeschlagen');
      }

      // Invalidate all workout-related queries (including Home Screen widget)
      invalidateCategory(queryClient, 'workout');
      
      // Also invalidate local sheet-specific queries
      await queryClient.invalidateQueries({ queryKey: ['training-session-today'] });
      await queryClient.invalidateQueries({ queryKey: ['training-recent-sessions'] });
      
      // Close the quick log panel
      setIsQuickLogOpen(false);
      
      // Show success toast
      toast.success(`${response.data.exercises?.length || 0} Übungen gespeichert`, {
        description: `${(response.data.session_meta?.total_volume_kg || 0).toLocaleString('de-DE')} kg Volumen`
      });

      // Refetch today's session
      await refetchToday();
    } catch (error) {
      console.error('[TrainingDaySheet] Quick log error:', error);
      toast.error('Speichern fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Query: Weekly overview (last 7 days) - uses unified query key for cache sync
  const { data: weekData } = useQuery({
    queryKey: QUERY_KEYS.TRAINING_WEEKLY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { count: 0, days: [] as boolean[], labels: ['Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi', 'Do'] };
      
      // Use timezone-aware date helper with dynamic labels
      const { dates, labels } = getLast7DaysWithLabels();
      
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('session_date')
        .eq('user_id', user.id)
        .in('session_date', dates);
      
      const sessionDates = new Set(sessions?.map(s => s.session_date) || []);
      
      return {
        count: sessionDates.size,
        days: dates.map(d => sessionDates.has(d)),
        labels
      };
    },
    enabled: isOpen
  });

  // Query: Recent sessions (last 7)
  const { data: recentSessions } = useQuery({
    queryKey: ['training-recent-sessions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(7);
      
      return data || [];
    },
    enabled: isOpen
  });

  const weeklyCount = weekData?.count || 0;
  const weekDays = weekData?.days || [false, false, false, false, false, false, false];
  const dayLabels = weekData?.labels || ['Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi', 'Do'];

  // Helper: Get display label for training type
  const getTypeLabel = (trainingType: TrainingType | null, splitType: SplitType | null): string => {
    if (splitType && SPLIT_TYPE_LABELS[splitType]) {
      return SPLIT_TYPE_LABELS[splitType];
    }
    if (trainingType && TRAINING_TYPE_LABELS[trainingType]) {
      return TRAINING_TYPE_LABELS[trainingType];
    }
    return 'Training';
  };

  // Helper: Get icon for training type
  const getTypeIcon = (trainingType: TrainingType | null): string => {
    if (trainingType && TRAINING_TYPE_ICONS[trainingType]) {
      return TRAINING_TYPE_ICONS[trainingType];
    }
    return '🏋️';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[60] h-[85vh] bg-background rounded-t-3xl border-t border-border/50 flex flex-col overflow-hidden"
          >
            {/* Handle Bar */}
            <div className="flex-none flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex-none flex items-center justify-between px-5 pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Training heute</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full h-10 w-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 space-y-6 pb-4">
              
              {/* Hero Section */}
              <div className={cn(
                "p-5 rounded-2xl border",
                todaySession 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-muted/30 border-border/50"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl",
                    todaySession 
                      ? "bg-emerald-500/20" 
                      : "bg-muted"
                  )}>
                    {todaySession ? (
                      <Check className="w-7 h-7 text-emerald-500" />
                    ) : (
                      <span>{getTypeIcon(null)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    {todaySession ? (
                      <>
                        <h3 className="font-bold text-lg text-foreground">
                          {getTypeLabel(todaySession.training_type as TrainingType, todaySession.split_type as SplitType)}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {todaySession.total_duration_minutes && (
                            <span>{todaySession.total_duration_minutes} min</span>
                          )}
                          {todaySession.total_volume_kg && (
                            <>
                              <span>•</span>
                              <span>{todaySession.total_volume_kg.toLocaleString('de-DE')} kg</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                          ✓ Training abgeschlossen
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-foreground">
                          Noch kein Training heute
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Zeit für ein Workout?
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                {!todaySession && (
                  <Button
                    onClick={() => setIsQuickLogOpen(true)}
                    className="w-full mt-4 h-11 rounded-xl"
                  >
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Jetzt loggen
                  </Button>
                )}
              </div>

              {/* Quick Log Section */}
              <Collapsible open={isQuickLogOpen} onOpenChange={setIsQuickLogOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between py-3 px-4 h-auto rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      <span className="font-medium text-sm">Schnell loggen</span>
                    </div>
                    {isQuickLogOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <TrainingNotesInput
                    onSubmit={handleQuickLogSubmit}
                    isLoading={isSubmitting}
                    onCancel={() => setIsQuickLogOpen(false)}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Weekly Overview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Diese Woche
                  </h3>
                  <span className={cn(
                    "text-sm font-bold",
                    weeklyCount >= workoutTarget 
                      ? "text-emerald-500" 
                      : weeklyCount >= 2 
                        ? "text-orange-500" 
                        : "text-destructive"
                  )}>
                    {weeklyCount}/{workoutTarget} Sessions
                  </span>
                </div>

                <div className="flex gap-2 justify-between">
                  {weekDays.map((done, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.03 }}
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center",
                          done 
                            ? "bg-emerald-500 text-white" 
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="w-4 h-4" /> : null}
                      </motion.div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {dayLabels[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Sessions */}
              {recentSessions && recentSessions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    Letzte Sessions
                  </h3>

                  <div className="bg-muted/20 rounded-2xl border border-border/30 overflow-hidden">
                    {recentSessions.map((session, idx) => {
                      const sessionDate = format(new Date(session.session_date), 'dd.MM', { locale: de });
                      const typeIcon = getTypeIcon(session.training_type as TrainingType);
                      const typeLabel = getTypeLabel(
                        session.training_type as TrainingType, 
                        session.split_type as SplitType
                      );

                      return (
                        <div 
                          key={session.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3",
                            idx !== recentSessions.length - 1 && "border-b border-border/30"
                          )}
                        >
                          <span className="text-xs text-muted-foreground w-12 font-medium">
                            {sessionDate}
                          </span>
                          <span className="text-lg">{typeIcon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm text-foreground truncate block">
                              {typeLabel}
                            </span>
                          </div>
                          {session.total_duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {session.total_duration_minutes}min
                            </span>
                          )}
                          {session.total_volume_kg && (
                            <span className="text-xs font-semibold text-foreground">
                              {session.total_volume_kg.toLocaleString('de-DE')}kg
                            </span>
                          )}
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state for no sessions */}
              {(!recentSessions || recentSessions.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Dumbbell className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Noch keine Trainings-Sessions vorhanden
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Starte jetzt dein erstes Workout!
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex-none px-5 py-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/30">
              <div className="flex gap-3">
                <Button
                  onClick={onOpenLogger}
                  className="flex-1 h-12 rounded-xl font-semibold"
                >
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Workout loggen
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-xl"
                  onClick={() => {
                    onClose();
                    navigate('/training');
                  }}
                  aria-label="Trainingspläne verwalten"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
