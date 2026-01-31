/**
 * CycleDetailSheet - Layer 2 Bottom Sheet for Cycle Management
 * Displays cycle status, progress, compliance, and manual controls
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Pause, RotateCcw, Calendar, Target, TrendingUp, Info } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useCyclingStatus } from '@/hooks/useCyclingStatus';
import { CyclingStatusBadge } from './CyclingStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CycleScheduleExtended } from '@/lib/schedule-utils';

interface CycleDetailSheetProps {
  userSupplementId: string | undefined;
  supplementName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const CycleDetailSheet: React.FC<CycleDetailSheetProps> = ({
  userSupplementId,
  supplementName,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { status, isLoading, cyclingReason } = useCyclingStatus(userSupplementId);

  const handlePauseCycle = async () => {
    if (!userSupplementId || !status) return;
    
    setIsUpdating(true);
    try {
      // Fetch current schedule
      const { data: current, error: fetchError } = await supabase
        .from('user_supplements')
        .select('schedule')
        .eq('id', userSupplementId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const schedule = current.schedule as unknown as CycleScheduleExtended;
      
      // Update to pause (set is_on_cycle = false)
      const updatedSchedule = {
        ...schedule,
        is_on_cycle: false,
        current_cycle_start: new Date().toISOString().split('T')[0],
      };
      
      const { error: updateError } = await supabase
        .from('user_supplements')
        .update({ schedule: updatedSchedule })
        .eq('id', userSupplementId);
      
      if (updateError) throw updateError;
      
      toast.success('Cycle pausiert', {
        description: 'Off-Cycle Phase wurde gestartet',
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error pausing cycle:', error);
      toast.error('Fehler beim Pausieren');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetCycle = async () => {
    if (!userSupplementId || !status) return;
    
    setIsUpdating(true);
    try {
      // Fetch current schedule
      const { data: current, error: fetchError } = await supabase
        .from('user_supplements')
        .select('schedule')
        .eq('id', userSupplementId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const schedule = current.schedule as unknown as CycleScheduleExtended;
      
      // Reset cycle: set is_on_cycle = true, reset start date
      const updatedSchedule = {
        ...schedule,
        is_on_cycle: true,
        current_cycle_start: new Date().toISOString().split('T')[0],
        start_date: new Date().toISOString().split('T')[0],
      };
      
      const { error: updateError } = await supabase
        .from('user_supplements')
        .update({ schedule: updatedSchedule })
        .eq('id', userSupplementId);
      
      if (updateError) throw updateError;
      
      toast.success('Cycle zurückgesetzt', {
        description: 'Neuer On-Cycle gestartet ab heute',
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error resetting cycle:', error);
      toast.error('Fehler beim Zurücksetzen');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResumeCycle = async () => {
    if (!userSupplementId || !status) return;
    
    setIsUpdating(true);
    try {
      // Fetch current schedule
      const { data: current, error: fetchError } = await supabase
        .from('user_supplements')
        .select('schedule')
        .eq('id', userSupplementId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const schedule = current.schedule as unknown as CycleScheduleExtended;
      
      // Resume: set is_on_cycle = true
      const updatedSchedule = {
        ...schedule,
        is_on_cycle: true,
        current_cycle_start: new Date().toISOString().split('T')[0],
        total_cycles_completed: (schedule.total_cycles_completed || 0) + 1,
      };
      
      const { error: updateError } = await supabase
        .from('user_supplements')
        .update({ schedule: updatedSchedule })
        .eq('id', userSupplementId);
      
      if (updateError) throw updateError;
      
      toast.success('Cycle fortgesetzt', {
        description: 'On-Cycle Phase wurde gestartet',
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error resuming cycle:', error);
      toast.error('Fehler beim Fortsetzen');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">
              {supplementName}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 py-6 space-y-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : status ? (
            <>
              {/* Current Cycle Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Aktueller Cycle
                </h3>
                
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <CyclingStatusBadge status={status} size="md" />
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fortschritt</span>
                    <span className="font-medium">
                      Tag {status.currentDay} von {status.totalDays}
                    </span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Progress 
                      value={status.progressPercent} 
                      className="h-3"
                    />
                  </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Verbleibend</span>
                    </div>
                    <p className="font-semibold">
                      {status.daysRemaining} {status.daysRemaining === 1 ? 'Tag' : 'Tage'}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Compliance</span>
                    </div>
                    <p className="font-semibold">
                      {status.compliancePercent}%
                    </p>
                  </div>
                </div>

                {/* Transition Day Warning */}
                {status.isTransitionDay && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                  >
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      ⚡ Letzter Tag dieser Phase - morgen wechselt der Status!
                    </p>
                  </motion.div>
                )}
              </section>

              <Separator />

              {/* Protocol Section */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Protokoll
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle-Typ</span>
                    <span className="font-medium">
                      {status.totalDays} Tage {status.isOnCycle ? 'On' : 'Off'} / {status.isOnCycle ? '?' : status.totalDays} Off
                    </span>
                  </div>
                  
                  {cyclingReason && (
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-muted-foreground shrink-0">Grund</span>
                      <span className="font-medium text-right">{cyclingReason}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nächster Wechsel</span>
                    <span className="font-medium">
                      {format(status.nextPhaseDate, 'dd. MMM yyyy', { locale: de })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle #</span>
                    <Badge variant="outline" className="text-xs">
                      {status.cycleNumber}
                    </Badge>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Action Buttons */}
              <section className="space-y-3">
                <div className="flex gap-3">
                  {status.isOnCycle ? (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handlePauseCycle}
                      disabled={isUpdating}
                    >
                      <Pause className="h-4 w-4" />
                      Cycle pausieren
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="flex-1 gap-2"
                      onClick={handleResumeCycle}
                      disabled={isUpdating}
                    >
                      <Target className="h-4 w-4" />
                      Cycle fortsetzen
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="flex-1 gap-2"
                    onClick={handleResetCycle}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Zurücksetzen
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Info className="h-3 w-3" />
                  Cycle-Wechsel erfolgt automatisch um Mitternacht
                </p>
              </section>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine Cycle-Daten verfügbar</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CycleDetailSheet;
