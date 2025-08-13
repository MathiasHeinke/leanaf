import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuickSupplementInput } from '@/components/QuickSupplementInput';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pill } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
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

export const QuickSupplementsCard: React.FC = () => {
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todayIntake, setTodayIntake] = useState<TodayIntake>({});
  const [loading, setLoading] = useState(false);

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
        .limit(5);

      if (error) throw error;

      const supplementsWithNames = data?.map(supplement => ({
        ...supplement,
        supplement_name: supplement.supplement_database?.name || supplement.custom_name
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

      toast.success(taken ? 'Einnahme markiert' : 'Einnahme entfernt');
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

  return (
    <>
      <QuickCardShell
        title="Supplemente"
        icon={<Pill className="h-4 w-4" />}
        dataState={dataState}
        progressPercent={progressPercent}
        status={`${takenCount} / ${requiredCount} heute`}
        detailsAction={{
          label: 'Details',
          onClick: () => setDetailsOpen(true)
        }}
      >
        <div className="space-y-3">
          {supplements.slice(0, 3).map(supplement => {
            const supplementIntake = todayIntake[supplement.id] || {};
            const takenTimings = Object.entries(supplementIntake).filter(([_, taken]) => taken).length;
            const totalTimings = supplement.timing.length;
            
            return (
              <div key={supplement.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{supplement.supplement_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {supplement.dosage} {supplement.unit}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={takenTimings === totalTimings ? 'default' : 'secondary'} className="text-xs">
                    {takenTimings}/{totalTimings}
                  </Badge>
                  {supplement.timing.slice(0, 2).map(timing => (
                    <Checkbox
                      key={timing}
                      checked={supplementIntake[timing] || false}
                      onCheckedChange={(checked) => toggleIntake(supplement.id, timing, checked as boolean)}
                      disabled={loading}
                      className="h-4 w-4"
                    />
                  ))}
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

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Supplemente Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickSupplementInput />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};