import React, { useState, useEffect, useCallback } from 'react';
import { QuickCardShell } from './QuickCardShell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuickSleepInput } from '@/components/QuickSleepInput';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface TodaysSleep {
  bedtime?: string;
  wake_time?: string;
  sleep_hours?: number;
  sleep_quality?: number;
}

export const QuickSleepCard: React.FC = () => {
  const { user } = useAuth();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [todaysSleep, setTodaysSleep] = useState<TodaysSleep | null>(null);

  const loadTodaysSleep = useCallback(async () => {
    if (!user) return;

    try {
      const today = getCurrentDateString();
      const { data, error } = await supabase
        .from('sleep_tracking')
        .select('bedtime, wake_time, sleep_hours, sleep_quality')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setTodaysSleep(data);
    } catch (error) {
      console.error('Error loading today sleep:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTodaysSleep();
  }, [loadTodaysSleep]);

  const hasSleepData = todaysSleep?.sleep_hours !== null && todaysSleep?.sleep_hours !== undefined;

  const formatSleepTime = (timeString?: string) => {
    if (!timeString) return '';
    // Handle plain "HH:MM" or "H:MM"
    const match = /^(\d{1,2}):(\d{2})$/.exec(timeString);
    if (match) {
      const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      if (Number.isNaN(h) || Number.isNaN(m)) return '—';
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    // Try parsing as date/time string
    const d = new Date(timeString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return '—';
  };

  const isValidTimeDisplay = (s: string) => !!s && s !== '—';

  const getSleepQualityText = (quality?: number) => {
    if (!quality) return '';
    if (quality >= 4) return 'Sehr gut';
    if (quality >= 3) return 'Gut';
    if (quality >= 2) return 'Okay';
    return 'Schlecht';
  };

  const getSleepQualityColor = (quality?: number) => {
    if (!quality) return 'text-muted-foreground';
    if (quality >= 4) return 'text-green-600';
    if (quality >= 3) return 'text-blue-600';
    if (quality >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const sleepTarget = 8; // hours
  const currentSleep = todaysSleep?.sleep_hours || 0;
  const progressPercent = Math.min(100, (currentSleep / sleepTarget) * 100);
  const dataState = currentSleep === 0 ? 'empty' : 
                   currentSleep >= sleepTarget ? 'done' : 'partial';

  return (
    <>
      <QuickCardShell
        title="Schlaf"
        icon={<Moon className="h-4 w-4" />}
        dataState={dataState}
        progressPercent={progressPercent}
        status={hasSleepData ? `${todaysSleep?.sleep_hours}h Schlaf` : 'Noch nicht erfasst'}
        statusIcon={hasSleepData ? <Sun className="h-3 w-3" /> : undefined}
        quickActions={hasSleepData ? [] : [
          {
            label: 'Eintragen',
            onClick: () => setDetailsOpen(true),
            variant: 'default'
          }
        ]}
        detailsAction={{
          label: 'Details',
          onClick: () => setDetailsOpen(true)
        }}
      >
        {hasSleepData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Schlafdauer:</span>
              <span className="font-medium">{todaysSleep?.sleep_hours}h / {sleepTarget}h</span>
            </div>
            {(() => {
              const bedtimeStr = formatSleepTime(todaysSleep?.bedtime);
              const wakeStr = formatSleepTime(todaysSleep?.wake_time);
              const showTimeRange = isValidTimeDisplay(bedtimeStr) || isValidTimeDisplay(wakeStr);
              return showTimeRange ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Zeitraum:</span>
                  <span>
                    {isValidTimeDisplay(bedtimeStr) ? bedtimeStr : '—'} - {isValidTimeDisplay(wakeStr) ? wakeStr : '—'}
                  </span>
                </div>
              ) : null;
            })()}
            
            {todaysSleep?.sleep_quality && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Qualität:</span>
                <span className={getSleepQualityColor(todaysSleep.sleep_quality)}>
                  {getSleepQualityText(todaysSleep.sleep_quality)}
                </span>
              </div>
            )}
          </div>
        )}
      </QuickCardShell>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Schlaf Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <QuickSleepInput onSleepAdded={loadTodaysSleep} todaysSleep={todaysSleep} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};