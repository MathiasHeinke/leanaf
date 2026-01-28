/**
 * SleepDaySheet - Layer 2 Sleep Analysis Overlay
 * Shows today's sleep score, timing, factors, and weekly trend
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Moon, 
  X, 
  Settings, 
  Clock, 
  Sunrise, 
  AlertCircle,
  Smartphone,
  Battery,
  Flame,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse, differenceInMinutes, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SleepDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogger: () => void;
}

// Score mapping (1-5 scale)
const QUALITY_LABELS: Record<number, { emoji: string; label: string; colorClass: string }> = {
  1: { emoji: '😫', label: 'Miserabel', colorClass: 'text-red-500 bg-red-500/10' },
  2: { emoji: '😕', label: 'Schlecht', colorClass: 'text-orange-500 bg-orange-500/10' },
  3: { emoji: '😐', label: 'Okay', colorClass: 'text-yellow-500 bg-yellow-500/10' },
  4: { emoji: '💪', label: 'Gut', colorClass: 'text-green-500 bg-green-500/10' },
  5: { emoji: '🚀', label: 'Elite Recovery', colorClass: 'text-indigo-500 bg-indigo-500/10' },
};

// Helper: Get last 7 days as YYYY-MM-DD array
const getLast7Days = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

// Helper: Calculate sleep duration from times
const calculateDuration = (bedtime: string | null, wakeTime: string | null): string | null => {
  if (!bedtime || !wakeTime) return null;
  
  try {
    const bed = parse(bedtime, 'HH:mm:ss', new Date());
    let wake = parse(wakeTime, 'HH:mm:ss', new Date());
    
    // Handle overnight (bedtime > wakeTime)
    if (wake < bed) {
      wake = addDays(wake, 1);
    }
    
    const diffMinutes = differenceInMinutes(wake, bed);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  } catch {
    return null;
  }
};

// Helper: Format time for display
const formatTime = (time: string | null): string => {
  if (!time) return '--:--';
  try {
    const parsed = parse(time, 'HH:mm:ss', new Date());
    return format(parsed, 'HH:mm');
  } catch {
    return time.substring(0, 5);
  }
};

export const SleepDaySheet: React.FC<SleepDaySheetProps> = ({
  isOpen,
  onClose,
  onOpenLogger
}) => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch today's sleep data + weekly sparkline
  const { data: sleepData, isLoading } = useQuery({
    queryKey: ['sleep-day-sheet', todayStr],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Today's detailed entry
      const { data: today } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      // Weekly sparkline data
      const dates = getLast7Days();
      const { data: weekData } = await supabase
        .from('sleep_tracking')
        .select('date, sleep_hours')
        .eq('user_id', user.id)
        .in('date', dates);

      // Build sparkline map
      const weekMap = new Map<string, number>();
      weekData?.forEach(r => {
        weekMap.set(r.date, Number(r.sleep_hours) || 0);
      });

      const sparkline = dates.map(d => weekMap.get(d) || 0);
      const validHours = sparkline.filter(h => h > 0);
      const weeklyAvg = validHours.length > 0 
        ? validHours.reduce((a, b) => a + b, 0) / validHours.length 
        : 0;

      return { today, sparkline, weeklyAvg };
    },
    enabled: isOpen,
    staleTime: 30000
  });

  const todayEntry = sleepData?.today;
  const hasLoggedToday = !!todayEntry;
  const sleepHours = todayEntry?.sleep_hours ? Number(todayEntry.sleep_hours) : 0;
  const quality = todayEntry?.sleep_quality || 3;
  const qualityInfo = QUALITY_LABELS[quality] || QUALITY_LABELS[3];

  const sparkline = sleepData?.sparkline || [0, 0, 0, 0, 0, 0, 0];
  const weeklyAvg = sleepData?.weeklyAvg || 0;
  const maxSparkline = Math.max(...sparkline, 8);

  // Factors
  const interruptions = todayEntry?.sleep_interruptions || 0;
  const screenTime = todayEntry?.screen_time_evening || 0;
  const motivation = todayEntry?.motivation_level || 0;
  const libido = todayEntry?.morning_libido || 0;
  const deepSleepMinutes = todayEntry?.deep_sleep_minutes || 0;

  // Helper: Format deep sleep
  const formatDeepSleep = (minutes: number): string => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${minutes}min`;
  };

  const handleNavigateToSleep = () => {
    onClose();
    navigate('/sleep');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl p-0 flex flex-col bg-background border-t border-border/50"
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-border/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Schlaf-Analyse</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
          
          {/* Hero Score Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl p-6 text-center",
              hasLoggedToday ? qualityInfo.colorClass : "bg-muted/50"
            )}
          >
            {hasLoggedToday ? (
              <>
                <span className="text-5xl mb-2 block">{qualityInfo.emoji}</span>
                <p className="text-3xl font-bold text-foreground mb-1">
                  {sleepHours.toFixed(1)}h
                </p>
                <p className={cn("text-sm font-medium", qualityInfo.colorClass.split(' ')[0])}>
                  {qualityInfo.label}
                </p>
              </>
            ) : (
              <>
                <Moon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">
                  Noch nicht erfasst
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Erfasse deinen Schlaf für Insights
                </p>
              </>
            )}
          </motion.div>

          {/* Timing Grid */}
          {hasLoggedToday && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="bg-card rounded-xl p-4 text-center border border-border/30">
                <Moon className="w-5 h-5 mx-auto mb-2 text-indigo-400" />
                <p className="text-lg font-bold text-foreground">
                  {formatTime(todayEntry?.bedtime)}
                </p>
                <p className="text-xs text-muted-foreground">Bett</p>
              </div>
              <div className="bg-card rounded-xl p-4 text-center border border-border/30">
                <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold text-foreground">
                  {calculateDuration(todayEntry?.bedtime, todayEntry?.wake_time) || `${sleepHours.toFixed(1)}h`}
                </p>
                <p className="text-xs text-muted-foreground">Dauer</p>
              </div>
              <div className="bg-card rounded-xl p-4 text-center border border-border/30">
                <Sunrise className="w-5 h-5 mx-auto mb-2 text-orange-400" />
                <p className="text-lg font-bold text-foreground">
                  {formatTime(todayEntry?.wake_time)}
                </p>
                <p className="text-xs text-muted-foreground">Aufwachen</p>
              </div>
            </motion.div>
          )}

          {/* Context Factors */}
          {hasLoggedToday && (interruptions > 0 || screenTime > 0 || motivation > 0 || libido > 0 || deepSleepMinutes > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Einflussfaktoren
              </h3>
              <div className="flex flex-wrap gap-2">
                {deepSleepMinutes > 0 && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                    deepSleepMinutes >= 90 
                      ? "bg-indigo-500/10 text-indigo-500"
                      : "bg-orange-500/10 text-orange-500"
                  )}>
                    <Moon className="w-3.5 h-3.5" />
                    <span>💤 {formatDeepSleep(deepSleepMinutes)} Tiefschlaf</span>
                  </div>
                )}
                {interruptions > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full text-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{interruptions}x Aufgewacht</span>
                  </div>
                )}
                {screenTime > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-full text-sm">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{screenTime}min Screen</span>
                  </div>
                )}
                {motivation > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm">
                    <Battery className="w-3.5 h-3.5" />
                    <span>Motivation: {motivation}/5</span>
                  </div>
                )}
                {libido > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 text-pink-500 rounded-full text-sm">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Libido: {libido}/5</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Weekly Sparkline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Woche
              </h3>
              <span className="text-sm text-muted-foreground">
                Ø {weeklyAvg > 0 ? `${weeklyAvg.toFixed(1)}h` : '--'}
              </span>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/30">
              <div className="flex items-end justify-between gap-2 h-20">
                {sparkline.map((hours, i) => {
                  const height = hours > 0 ? (hours / maxSparkline) * 100 : 5;
                  const isToday = i === sparkline.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className={cn(
                          "w-full rounded-md min-h-[4px]",
                          isToday 
                            ? "bg-primary" 
                            : hours > 0 
                              ? "bg-indigo-500/40" 
                              : "bg-muted"
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][new Date(getLast7Days()[i]).getDay() === 0 ? 6 : new Date(getLast7Days()[i]).getDay() - 1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

        </div>

        {/* Footer Actions */}
        <div className="flex-none border-t border-border/30 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-3">
            <Button
              onClick={onOpenLogger}
              className="flex-1"
            >
              {hasLoggedToday ? 'Log bearbeiten' : 'Schlaf erfassen'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNavigateToSleep}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
