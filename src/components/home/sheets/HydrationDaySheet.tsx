/**
 * HydrationDaySheet - "Layer 2" of the Three-Layer-Design
 * Premium bottom sheet showing today's hydration timeline and quick-add buttons
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Droplets, GlassWater, Check, Pencil, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useTodaysFluids } from '@/hooks/useTodaysFluids';
import { useAresEvents } from '@/hooks/useAresEvents';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FluidGoalSlider } from '@/components/ui/fluid-goal-slider';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { toast } from 'sonner';

interface HydrationDaySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Import FluidModern type
import type { FluidModern } from '@/ares/adapters/fluids';

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

// Fluid Timeline Item
const FluidItem: React.FC<{
  fluid: FluidModern;
  index: number;
}> = ({ fluid, index }) => {
  const time = fluid.timestamp 
    ? format(new Date(fluid.timestamp), 'HH:mm')
    : '--:--';
  
  const isCoffee = fluid.fluid_type === 'coffee';
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0"
    >
      {/* Time */}
      <span className="text-xs text-muted-foreground font-mono w-12 flex-shrink-0">
        {time}
      </span>
      
      {/* Icon */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isCoffee 
          ? "bg-amber-100 dark:bg-amber-900/30"
          : "bg-cyan-100 dark:bg-cyan-900/30"
      )}>
        {isCoffee ? (
          <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">
          {isCoffee ? 'Kaffee' : 'Wasser'}
        </p>
      </div>
      
      {/* Amount */}
      <span className={cn(
        "text-sm font-semibold tabular-nums",
        isCoffee 
          ? "text-amber-600 dark:text-amber-400"
          : "text-cyan-600 dark:text-cyan-400"
      )}>
        {fluid.volume_ml} ml
      </span>
    </motion.div>
  );
};

// Quick Add Button with feedback animation
const QuickAddButton: React.FC<{
  amount: number;
  variant: 'outline' | 'solid' | 'coffee';
  type?: 'water' | 'coffee';
  onAdd: (amount: number) => Promise<boolean>;
}> = ({ amount, variant, type = 'water', onAdd }) => {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    const success = await onAdd(amount);
    
    if (success) {
      setIsSuccess(true);
      const emoji = type === 'coffee' ? '☕' : '💧';
      const label = type === 'coffee' ? 'Kaffee' : 'Wasser';
      toast.success(`+${amount}ml ${label} ${emoji}`, { duration: 1500 });
      setTimeout(() => setIsSuccess(false), 1500);
    }
    
    setIsLoading(false);
  };

  const isCoffee = variant === 'coffee';
  
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "flex-1 h-14 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2",
        variant === 'outline' && "border-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20",
        variant === 'solid' && "bg-gradient-to-r from-cyan-500 to-teal-400 text-white shadow-lg hover:shadow-xl",
        variant === 'coffee' && "border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
        isSuccess && variant === 'coffee' && "bg-emerald-500 border-emerald-500 text-white",
        isSuccess && variant !== 'coffee' && "bg-emerald-500 border-emerald-500"
      )}
    >
      {isSuccess ? (
        <>
          <Check className="w-5 h-5" />
          <span>Gespeichert</span>
        </>
      ) : (
        <>
          {isCoffee ? <Coffee className="w-5 h-5" /> : <GlassWater className="w-5 h-5" />}
          <span>{isCoffee ? 'Kaffee' : `+${amount}ml`}</span>
        </>
      )}
    </motion.button>
  );
};

export const HydrationDaySheet: React.FC<HydrationDaySheetProps> = ({
  isOpen,
  onClose
}) => {
  const { data: metrics } = useDailyMetrics();
  const { data: fluids, loading: isLoading } = useTodaysFluids();
  const { logWater, logCoffee } = useAresEvents();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Edit goal state
  const [isEditingGoal, setIsEditingGoal] = React.useState(false);
  const [editGoalValue, setEditGoalValue] = React.useState(2500);
  const [isSavingGoal, setIsSavingGoal] = React.useState(false);
  
  // Hydration data from central cache
  const current = metrics?.water?.current || 0;
  const target = metrics?.water?.target || 2500;
  const percent = Math.min((current / target) * 100, 100);
  const remaining = Math.max(0, target - current);
  
  // Convert to liters for display
  const currentL = (current / 1000).toFixed(1);
  const targetL = (target / 1000).toFixed(1);
  const remainingL = (remaining / 1000).toFixed(1);

  // Sync edit value with target when popover opens
  React.useEffect(() => {
    if (isEditingGoal) {
      setEditGoalValue(target);
    }
  }, [isEditingGoal, target]);

  const handleSaveGoal = async () => {
    if (!user) return;
    
    setIsSavingGoal(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      
      const { error } = await supabase
        .from('daily_goals')
        .upsert({
          user_id: user.id,
          goal_date: today,
          fluid_goal_ml: editGoalValue,
        }, {
          onConflict: 'user_id,goal_date'
        });
      
      if (error) throw error;
      
      // Invalidate cache to refresh metrics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
      
      toast.success(`Wasserziel auf ${(editGoalValue / 1000).toFixed(1)}L gesetzt 💧`);
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Error saving fluid goal:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  // Sort fluids by timestamp (most recent first)
  const sortedFluids = React.useMemo(() => {
    if (!fluids) return [];
    return [...fluids].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [fluids]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[71] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Wasserhaushalt
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'd. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* Hero Section - Progress */}
              <div className="text-center py-6 border-b border-border/30 mb-4">
                <div className="relative inline-flex items-center justify-center gap-2">
                  <span className="text-5xl font-bold tabular-nums text-foreground">
                    {currentL}
                  </span>
                  <Popover open={isEditingGoal} onOpenChange={setIsEditingGoal}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 group cursor-pointer hover:opacity-80 transition-opacity">
                        <span className="text-lg text-muted-foreground">
                          / {targetL}L
                        </span>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4" align="center">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Wasserziel anpassen</h4>
                        <FluidGoalSlider
                          value={editGoalValue}
                          onChange={setEditGoalValue}
                          showIcon={false}
                        />
                        <Button 
                          onClick={handleSaveGoal} 
                          disabled={isSavingGoal}
                          className="w-full"
                          size="sm"
                        >
                          {isSavingGoal ? 'Speichern...' : 'Speichern'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Liter getrunken</p>
                
                {/* Progress Bar */}
                <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden mx-auto max-w-xs relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
                  />
                </div>
                
                <p className={cn(
                  "text-sm font-medium mt-3",
                  remaining > 0 ? "text-cyan-600 dark:text-cyan-400" : "text-emerald-500"
                )}>
                  {remaining > 0 
                    ? `Noch ${remainingL}L bis zum Ziel` 
                    : "🎉 Tagesziel erreicht!"
                  }
                </p>
              </div>
              
              {/* Timeline Section */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Heute getrunken
                </h3>
                
                {isLoading ? (
                  <div className="py-8 text-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : sortedFluids.length === 0 ? (
                  <div className="text-center py-12">
                    <Droplets className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Noch kein Wasser getrackt heute</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Tippe auf +250ml oder +500ml um zu starten
                    </p>
                  </div>
                ) : (
                  <div>
                    {sortedFluids.map((fluid, index) => (
                      <FluidItem key={`${fluid.intake_date}-${fluid.timestamp}-${index}`} fluid={fluid} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/30">
              <div className="flex gap-3">
                <QuickAddButton 
                  amount={250} 
                  variant="outline" 
                  onAdd={logWater}
                />
                <QuickAddButton 
                  amount={500} 
                  variant="solid" 
                  onAdd={logWater}
                />
                <QuickAddButton 
                  amount={150} 
                  variant="coffee"
                  type="coffee"
                  onAdd={logCoffee}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
