import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Badge } from '@/components/ui/badge';
import { Pill, Check, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface TodayIntake {
  [supplementId: string]: {
    [timing: string]: boolean;
  };
}

interface UserSupplement {
  id: string;
  supplement_name?: string;
  custom_name?: string;
  timing: string[];
  dosage: string;
  unit: string;
}

export const QuickSupplementsCardV2: React.FC = () => {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todayIntake, setTodayIntake] = useState<TodayIntake>({});
  const [loading, setLoading] = useState(false);
  const [expandedTimings, setExpandedTimings] = useState<Set<string>>(new Set());

  const getCurrentTimeSlot = (): 'morning' | 'noon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'noon';
    return 'evening';
  };

  const currentTimeSlot = getCurrentTimeSlot();

  const loadSupplements = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_supplements')
        .select(`
          id,
          custom_name,
          timing,
          dosage,
          unit,
          supplement_id,
          supplement_database!left(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      const supplementsWithNames = data?.map(supplement => ({
        ...supplement,
        supplement_name: supplement.supplement_database?.name || supplement.custom_name || 'Unbekanntes Supplement'
      })) || [];

      setSupplements(supplementsWithNames);
    } catch (error) {
      console.error('Error loading supplements:', error);
    }
  }, [user]);

  const loadTodayIntake = useCallback(async () => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      const { data, error } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, timing, taken')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;

      const intakeMap: TodayIntake = {};
      data?.forEach(record => {
        if (!intakeMap[record.user_supplement_id]) {
          intakeMap[record.user_supplement_id] = {};
        }
        intakeMap[record.user_supplement_id][record.timing] = record.taken === true;
      });

      setTodayIntake(intakeMap);
    } catch (error) {
      console.error('Error loading today intake:', error);
    }
  }, [user]);

  useEffect(() => {
    loadSupplements();
    loadTodayIntake();
  }, [loadSupplements, loadTodayIntake]);

  const toggleIntake = async (supplementId: string, timing: string, taken: boolean) => {
    if (!user) return;

    setLoading(true);
    
    // Optimistic update
    setTodayIntake(prev => ({
      ...prev,
      [supplementId]: {
        ...prev[supplementId],
        [timing]: taken
      }
    }));

    try {
      const today = getCurrentDateString();
      
      if (taken) {
        const { error } = await supabase
          .from('supplement_intake_log')
          .upsert({
            user_id: user.id,
            user_supplement_id: supplementId,
            date: today,
            timing,
            taken: true
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplement_intake_log')
          .update({ taken: false })
          .eq('user_id', user.id)
          .eq('user_supplement_id', supplementId)
          .eq('date', today)
          .eq('timing', timing);

        if (error) throw error;
      }

      toast.success(taken ? 'Als genommen markiert' : 'Einnahme entfernt');
    } catch (error) {
      console.error('Error updating intake:', error);
      toast.error('Fehler beim Aktualisieren');
      
      // Rollback optimistic update
      setTodayIntake(prev => ({
        ...prev,
        [supplementId]: {
          ...prev[supplementId],
          [timing]: !taken
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const getSupplementsForTiming = (timing: string) => {
    return supplements.filter(supplement => supplement.timing.includes(timing));
  };

  const getTimingLabel = (timing: string) => {
    switch (timing) {
      case 'morning': return 'Morgens';
      case 'noon': return 'Mittags';
      case 'evening': return 'Abends';
      default: return timing;
    }
  };

  const getAllTimingsWithSupplements = () => {
    const allTimings: ('morning' | 'noon' | 'evening')[] = ['morning', 'noon', 'evening'];
    return allTimings.filter(timing => getSupplementsForTiming(timing).length > 0);
  };

  const getVisibleTimings = () => {
    const allTimings = getAllTimingsWithSupplements();
    const currentIndex = allTimings.indexOf(currentTimeSlot);
    
    if (currentIndex === -1) return allTimings;
    
    // Start with current timing
    const visibleTimings = [currentTimeSlot];
    
    // Check if current timing supplements are all taken
    const currentSupplements = getSupplementsForTiming(currentTimeSlot);
    const currentAllTaken = currentSupplements.every(supplement => 
      supplement.timing.every(timing => 
        timing === currentTimeSlot ? todayIntake[supplement.id]?.[timing] : true
      )
    );
    
    // If current timing is done or user manually expanded, show more
    if (currentAllTaken || expandedTimings.has(currentTimeSlot)) {
      // Add next timings
      const nextTimings = allTimings.slice(currentIndex + 1);
      visibleTimings.push(...nextTimings);
      
      // Add previous timings if it's evening
      if (currentTimeSlot === 'evening') {
        const prevTimings = allTimings.slice(0, currentIndex);
        visibleTimings.unshift(...prevTimings);
      }
    }
    
    return [...new Set(visibleTimings)]; // Remove duplicates
  };

  const getTotalTaken = () => {
    return Object.values(todayIntake).reduce((sum, timings) => {
      return sum + Object.values(timings || {}).filter(Boolean).length;
    }, 0);
  };

  const getTotalRequired = () => {
    return supplements.reduce((sum, supplement) => {
      return sum + supplement.timing.length;
    }, 0);
  };

  const takenCount = getTotalTaken();
  const requiredCount = getTotalRequired();
  const progressPercent = requiredCount > 0 ? (takenCount / requiredCount) * 100 : 0;
  const dataState = requiredCount === 0 ? 'empty' : 
                   takenCount === requiredCount ? 'done' : 
                   takenCount > 0 ? 'partial' : 'empty';

  const visibleTimings = getVisibleTimings();
  const currentSupplements = getSupplementsForTiming(currentTimeSlot);
  const pendingSupplements = currentSupplements.filter(supplement => 
    !todayIntake[supplement.id]?.[currentTimeSlot]
  );
  const pendingCount = pendingSupplements.length;

  const markAllForCurrentSlot = async () => {
    if (!user || pendingCount === 0) return;
    setLoading(true);

    // Optimistic update for all pending
    setTodayIntake(prev => {
      const updated = { ...prev } as TodayIntake;
      pendingSupplements.forEach(s => {
        updated[s.id] = { ...(updated[s.id] || {}), [currentTimeSlot]: true };
      });
      return updated;
    });

    try {
      const today = getCurrentDateString();
      const rows = pendingSupplements.map(s => ({
        user_id: user.id,
        user_supplement_id: s.id,
        date: today,
        timing: currentTimeSlot,
        taken: true
      }));
      const { error } = await supabase
        .from('supplement_intake_log')
        .upsert(rows);
      if (error) throw error;
      const slotLabel = currentTimeSlot === 'morning' ? 'Morgens' : currentTimeSlot === 'noon' ? 'Mittags' : 'Abends';
      toast.success(`${slotLabel} erledigt ✓`);
    } catch (e) {
      console.error('markAllForCurrentSlot failed', e);
      // Rollback
      setTodayIntake(prev => {
        const updated = { ...prev } as TodayIntake;
        pendingSupplements.forEach(s => {
          updated[s.id] = { ...(updated[s.id] || {}), [currentTimeSlot]: false };
        });
        return updated;
      });
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = pendingCount > 0 
    ? [
        {
          label: (currentTimeSlot === 'morning' ? 'Morgens' : currentTimeSlot === 'noon' ? 'Mittags' : 'Abends') + ' erledigt',
          onClick: markAllForCurrentSlot,
          variant: 'default' as const,
          disabled: loading
        },
        ...pendingSupplements.slice(0, 3).map(supplement => ({
          label: supplement.supplement_name || 'Unbekannt',
          onClick: () => toggleIntake(supplement.id, currentTimeSlot, true),
          variant: 'outline' as const,
          disabled: loading
        }))
      ]
    : [];

  const expandAction = visibleTimings.length < getAllTimingsWithSupplements().length ? {
    label: 'Mehr anzeigen',
    onClick: () => setExpandedTimings(prev => new Set([...prev, currentTimeSlot]))
  } : undefined;

  return (
    <QuickCardShell
      title="Supplemente"
      icon={<Pill className="h-4 w-4" />}
      dataState={dataState}
      progressPercent={progressPercent}
      status={`${takenCount} / ${requiredCount} heute`}
      quickActions={quickActions}
      detailsAction={expandAction}
    >
      <div className="space-y-4">
        {visibleTimings.map(timing => {
          const timingSupplements = getSupplementsForTiming(timing);
          if (timingSupplements.length === 0) return null;

          return (
            <div key={timing} className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {getTimingLabel(timing)}
              </div>
              <div className="flex flex-wrap gap-2">
                {timingSupplements.map(supplement => {
                  const isTaken = todayIntake[supplement.id]?.[timing];
                  return (
                    <Badge
                      key={`${supplement.id}-${timing}`}
                      variant={isTaken ? 'default' : 'secondary'}
                      className={`cursor-pointer transition-all duration-200 ${
                        isTaken 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-primary hover:text-primary-foreground'
                      }`}
                      onClick={() => toggleIntake(supplement.id, timing, !isTaken)}
                    >
                      <span className="mr-1">
                        {supplement.supplement_name}
                      </span>
                      {isTaken ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {supplements.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Keine Supplemente konfiguriert
          </div>
        )}
      </div>
    </QuickCardShell>
  );
};