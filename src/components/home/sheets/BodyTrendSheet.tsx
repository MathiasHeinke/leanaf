/**
 * BodyTrendSheet - "Layer 2" of the Three-Layer-Design
 * Premium bottom sheet showing weight trends with 30-day chart
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Scale, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AreaChart, Area, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { QUERY_KEYS } from '@/constants/queryKeys';

interface BodyTrendSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickLog: () => void;
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

// Custom Tooltip for Chart
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{data.dateFormatted}</p>
      <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
        {data.weight.toFixed(1)} kg
      </p>
    </div>
  );
};

// Weight History Item
const WeightItem: React.FC<{
  entry: {
    id: string;
    weight: number;
    date: string;
  };
  onDelete: (id: string) => void;
  isDeleting: boolean;
}> = ({ entry, onDelete, isDeleting }) => {
  const formattedDate = format(new Date(entry.date), 'd. MMM', { locale: de });
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0"
    >
      {/* Date */}
      <span className="text-sm text-muted-foreground w-16 flex-shrink-0">
        {formattedDate}
      </span>
      
      {/* Weight */}
      <div className="flex-1">
        <span className="text-base font-semibold text-foreground tabular-nums">
          {entry.weight.toFixed(1)} kg
        </span>
      </div>
      
      {/* Delete */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onDelete(entry.id)}
        disabled={isDeleting}
        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 disabled:opacity-50"
        aria-label="Eintrag löschen"
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};

export const BodyTrendSheet: React.FC<BodyTrendSheetProps> = ({
  isOpen,
  onClose,
  onOpenQuickLog
}) => {
  const { data: metrics } = useDailyMetrics();
  const queryClient = useQueryClient();
  
  // Current weight from metrics
  const currentWeight = metrics?.weight?.latest || 0;
  
  // Fetch 30-day weight history
  const { data: weightHistory, isLoading } = useQuery({
    queryKey: ['weight-history-30d'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('weight_history')
        .select('id, weight, date')
        .eq('user_id', auth.user.id)
        .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
        .order('date', { ascending: true });
      
      if (error) {
        console.error('[BodyTrendSheet] Error fetching weight history:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: isOpen,
    staleTime: 60000, // 1 min
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      return entryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-history-30d'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHT_RECENT });
      toast.success('Eintrag gelöscht');
    },
    onError: () => {
      toast.error('Löschen fehlgeschlagen');
    }
  });
  
  // Calculate trend (last 7 days vs previous 7 days)
  const trend = React.useMemo(() => {
    if (!weightHistory || weightHistory.length < 2) return null;
    
    const sorted = [...weightHistory].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get entries from last 7 days and previous 7 days
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);
    
    const recentEntries = sorted.filter(e => new Date(e.date) >= sevenDaysAgo);
    const previousEntries = sorted.filter(e => {
      const date = new Date(e.date);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });
    
    if (recentEntries.length === 0 || previousEntries.length === 0) {
      // Compare just first and last entry
      if (sorted.length >= 2) {
        const diff = sorted[0].weight - sorted[sorted.length - 1].weight;
        return { value: diff, direction: diff > 0.3 ? 'up' : diff < -0.3 ? 'down' : 'stable' as const };
      }
      return null;
    }
    
    const recentAvg = recentEntries.reduce((sum, e) => sum + e.weight, 0) / recentEntries.length;
    const previousAvg = previousEntries.reduce((sum, e) => sum + e.weight, 0) / previousEntries.length;
    const diff = recentAvg - previousAvg;
    
    return {
      value: diff,
      direction: diff > 0.3 ? 'up' : diff < -0.3 ? 'down' : 'stable' as const
    };
  }, [weightHistory]);
  
  // Chart data
  const chartData = React.useMemo(() => {
    if (!weightHistory) return [];
    return weightHistory.map(entry => ({
      date: entry.date,
      dateFormatted: format(new Date(entry.date), 'd. MMM', { locale: de }),
      weight: entry.weight
    }));
  }, [weightHistory]);
  
  // Recent entries for the list (last 7)
  const recentEntries = React.useMemo(() => {
    if (!weightHistory) return [];
    return [...weightHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [weightHistory]);

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  // Trend icon and color
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'up' ? 'text-orange-500' : trend?.direction === 'down' ? 'text-emerald-500' : 'text-muted-foreground';

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
                  Gewicht & Trends
                </h2>
                <p className="text-sm text-muted-foreground">
                  Letzte 30 Tage
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
              {/* Hero Section - Current Weight */}
              <div className="text-center py-6 border-b border-border/30 mb-4">
                <div className="relative inline-block">
                  <span className="text-5xl font-bold tabular-nums text-foreground">
                    {currentWeight > 0 ? currentWeight.toFixed(1) : '--'}
                  </span>
                  <span className="text-lg text-muted-foreground ml-1">
                    kg
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Aktuelles Gewicht</p>
                
                {/* Trend Indicator */}
                {trend && (
                  <div className={cn("flex items-center justify-center gap-1.5 mt-3", trendColor)}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)} kg diese Woche
                    </span>
                  </div>
                )}
              </div>
              
              {/* Chart Section */}
              <div className="mt-4 mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Verlauf
                </h3>
                
                {isLoading ? (
                  <div className="h-[180px] flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : chartData.length < 2 ? (
                  <div className="h-[180px] flex items-center justify-center bg-muted/30 rounded-2xl">
                    <div className="text-center">
                      <Scale className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Mindestens 2 Einträge für Chart</p>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="h-[180px] bg-muted/20 rounded-2xl p-2"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="weight" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          fill="url(#weightGradient)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#8b5cf6' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>
              
              {/* History List */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Letzte Einträge
                </h3>
                
                {recentEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Scale className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">Noch keine Gewichtseinträge</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {recentEntries.map((entry) => (
                      <WeightItem 
                        key={entry.id} 
                        entry={entry} 
                        onDelete={deleteMutation.mutate}
                        isDeleting={deleteMutation.isPending}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/30">
              <Button
                onClick={onOpenQuickLog}
                className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600"
              >
                <Scale className="w-4 h-4 mr-2" />
                Gewicht eintragen
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
