import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/constants/queryKeys';

interface WeightWidgetProps {
  size: WidgetSize;
}

export const WeightWidget: React.FC<WeightWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  
  // Fetch recent weight entries from weight_history
  const { data: weightData } = useQuery({
    queryKey: QUERY_KEYS.WEIGHT_RECENT,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('weight_history')
        .select('weight, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);
      
      if (!data || data.length === 0) return null;
      
      return {
        current: data[0].weight,
        previous: data.length > 1 ? data[1].weight : null,
        history: data.map(d => d.weight).reverse()
      };
    },
    staleTime: 10000
  });
  
  const currentWeight = weightData?.current || 0;
  const previousWeight = weightData?.previous;
  const history = weightData?.history || [];
  
  const trend = previousWeight && currentWeight 
    ? currentWeight - previousWeight 
    : null;
  
  const TrendIcon = trend === null 
    ? Minus 
    : trend > 0 
      ? TrendingUp 
      : trend < 0 
        ? TrendingDown 
        : Minus;
  
  const trendColor = trend === null 
    ? 'text-muted-foreground' 
    : trend > 0 
      ? 'text-orange-500' 
      : trend < 0 
        ? 'text-emerald-500' 
        : 'text-muted-foreground';

  // LARGE: With mini sparkline
  if (size === 'large' || size === 'wide') {
    const maxWeight = Math.max(...history, currentWeight || 80);
    const minWeight = Math.min(...history, currentWeight || 70);
    const range = maxWeight - minWeight || 1;
    
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/weight')}
        className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Gewicht</p>
              <p className="text-xs text-muted-foreground">Letzte 7 Einträge</p>
            </div>
          </div>
          {trend !== null && (
            <div className={cn("flex items-center gap-1", trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg
              </span>
            </div>
          )}
        </div>
        
        {/* Mini Sparkline */}
        {history.length > 1 && (
          <div className="flex items-end justify-between gap-1 h-12 mt-2 mb-3">
            {history.map((w, i) => {
              const height = ((w - minWeight) / range) * 100;
              return (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 10)}%` }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex-1 rounded-sm bg-violet-500/40"
                />
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : '-- kg'}
            </p>
            <p className="text-xs text-muted-foreground">Aktuell</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // MEDIUM: With trend arrow
  if (size === 'medium') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/weight')}
        className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
            <Scale className="w-5 h-5" />
          </div>
          {trend !== null && (
            <div className={cn("flex items-center gap-0.5", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-[10px] font-medium">
                {Math.abs(trend).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xl font-bold text-foreground">
            {currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : '-- kg'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {currentWeight > 0 ? 'Aktuell' : 'Nicht erfasst'}
          </p>
        </div>
      </motion.div>
    );
  }

  // SMALL: Compact
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/weight')}
      className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
          <Scale className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">kg</span>
      </div>

      <div>
        <p className="text-xl font-bold text-foreground">
          {currentWeight > 0 ? currentWeight.toFixed(0) : '--'}
        </p>
        <p className="text-[10px] text-muted-foreground">Gewicht</p>
      </div>
    </motion.div>
  );
};
