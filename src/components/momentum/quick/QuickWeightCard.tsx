import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuickWeightInput } from '@/components/QuickWeightInput';
import { NumericInput } from '@/components/ui/numeric-input';
import { Button } from '@/components/ui/button';
import { Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface TodaysWeight {
  weight: number | null;
  body_fat_percentage: number | null;
  created_at: string;
}

export const QuickWeightCard: React.FC = () => {
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [todaysWeight, setTodaysWeight] = useState<TodaysWeight | null>(null);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickBodyFat, setQuickBodyFat] = useState('');
  const [loading, setLoading] = useState(false);
  const weightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showQuickForm) {
      // Focus the weight input shortly after render
      setTimeout(() => weightInputRef.current?.focus(), 0);
    }
  }, [showQuickForm]);
  const loadTodaysWeight = useCallback(async () => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      const { data, error } = await supabase
        .from('weight_history')
        .select('weight, body_fat_percentage, created_at')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setTodaysWeight(data);
    } catch (error) {
      console.error('Error loading today weight:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTodaysWeight();
  }, [loadTodaysWeight]);

  const saveQuickWeight = async () => {
    if (!user || !quickWeight) {
      toast.error('Bitte Gewicht eingeben');
      return;
    }

    const weightValue = parseFloat(quickWeight);
    if (isNaN(weightValue)) {
      toast.error('Ungültiger Gewichtswert');
      return;
    }

    setLoading(true);
    try {
      const today = getCurrentDateString();
      const weightData = {
        user_id: user.id,
        weight: weightValue,
        body_fat_percentage: quickBodyFat ? parseFloat(quickBodyFat) : null,
        date: today
      };

      const { error } = await supabase
        .from('weight_history')
        .upsert(weightData, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast.success('Gewicht gespeichert');
      setQuickWeight('');
      setQuickBodyFat('');
      setShowQuickForm(false);
      loadTodaysWeight();
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const hasWeightToday = todaysWeight?.weight !== null;

  return (
    <>
      <QuickCardShell
        title="Gewicht"
        icon={<Scale className="h-4 w-4" />}
        status={hasWeightToday ? `${todaysWeight?.weight} kg` : 'Noch nicht erfasst'}
        statusIcon={hasWeightToday ? <TrendingUp className="h-3 w-3" /> : undefined}
          quickActions={hasWeightToday ? [] : [
            {
              label: 'Gewicht eintragen',
              onClick: () => setShowQuickForm(true),
              variant: 'default'
            }
          ]}
        detailsAction={{
          label: 'Details',
          onClick: () => setDetailsOpen(true)
        }}
      >
        {showQuickForm && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Gewicht (kg)</label>
                <NumericInput
                  ref={weightInputRef}
                  value={quickWeight}
                  onChange={setQuickWeight}
                  placeholder="75.5"
                  className="h-8"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Körperfett (%)</label>
                <NumericInput
                  value={quickBodyFat}
                  onChange={setQuickBodyFat}
                  placeholder="15.0"
                  className="h-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveQuickWeight}
                disabled={loading || !quickWeight}
                className="flex-1"
              >
                Speichern
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQuickForm(false)}
                className="flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {hasWeightToday && todaysWeight?.body_fat_percentage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Körperfett: {todaysWeight.body_fat_percentage}%</span>
          </div>
        )}
      </QuickCardShell>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gewicht Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickWeightInput onWeightAdded={loadTodaysWeight} todaysWeight={todaysWeight} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};