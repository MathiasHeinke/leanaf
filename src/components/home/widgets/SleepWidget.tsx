import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SleepWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;
}

export const SleepWidget: React.FC<SleepWidgetProps> = ({ size, onOpenSheet }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onOpenSheet) {
      onOpenSheet();
    } else {
      navigate('/sleep');
    }
  };

  // Fetch sleep data for last 7 days
  const { data: sleepData } = useQuery({
    queryKey: ['sleep-weekly'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { todayHours: 0, weeklyAvg: 0, sparkline: [] as number[] };
      
      const dates: string[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      
      const { data: sleepRecords } = await supabase
        .from('sleep_tracking')
        .select('date, sleep_hours')
        .eq('user_id', user.id)
        .in('date', dates);
      
      // Create a map of date -> hours
      const sleepMap = new Map<string, number>();
      sleepRecords?.forEach(r => {
        sleepMap.set(r.date, Number(r.sleep_hours) || 0);
      });
      
      // Build sparkline (percentage of 8h target)
      const sparkline = dates.map(d => {
        const hours = sleepMap.get(d) || 0;
        return Math.min((hours / 8) * 100, 100);
      });
      
      const todayStr = today.toISOString().slice(0, 10);
      const todayHours = sleepMap.get(todayStr) || 0;
      
      // Calculate weekly average
      const totalHours = Array.from(sleepMap.values()).reduce((a, b) => a + b, 0);
      const daysWithData = sleepMap.size;
      const weeklyAvg = daysWithData > 0 ? totalHours / daysWithData : 0;
      
      return { todayHours, weeklyAvg, sparkline };
    },
    staleTime: 60000
  });
  
  const sleepHours = sleepData?.todayHours || 0;
  const weeklyAvg = sleepData?.weeklyAvg || 0;
  const sleepSparkline = sleepData?.sparkline?.length ? sleepData.sparkline : [0, 0, 0, 0, 0, 0, 0];
  const sleepStatus = sleepHours >= 7 ? 'good' : sleepHours >= 5 ? 'ok' : sleepHours > 0 ? 'low' : 'none';

  const statusColors = {
    good: {
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      text: "text-indigo-600 dark:text-indigo-400",
      bar: "bg-indigo-500/40 dark:bg-indigo-400/40"
    },
    ok: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
      bar: "bg-orange-500/40"
    },
    low: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      bar: "bg-destructive/40"
    },
    none: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      bar: "bg-muted-foreground/20"
    }
  };

  const colors = statusColors[sleepStatus];
  const sleepPercent = Math.min((sleepHours / 8) * 100, 100);

  // FLAT: Horizontal compact strip with sparkline
  if (size === 'flat') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
      >
        {/* Background Fill */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${sleepPercent}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-indigo-400/10"
        />
        
        {/* Icon */}
        <div className={cn("relative z-10 p-2 rounded-xl", colors.bg, colors.text)}>
          <Moon className="w-5 h-5" />
        </div>
        
        {/* Label */}
        <span className="relative z-10 text-sm font-medium text-foreground shrink-0">Schlaf</span>
        
        {/* Mini Sparkline */}
        <div className="relative z-10 flex-1 flex items-end justify-center gap-0.5 h-4">
          {sleepSparkline.map((h, i) => (
            <motion.div 
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(h, 10)}%` }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn("w-2 rounded-sm", colors.bar)}
            />
          ))}
        </div>
        
        {/* Value */}
        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-foreground">
            {sleepHours > 0 ? `${sleepHours.toFixed(1)}h` : '--'}
          </span>
          <span className="text-xs text-muted-foreground">
            {weeklyAvg > 0 ? `Ø ${weeklyAvg.toFixed(1)}h` : ''}
          </span>
        </div>
      </motion.div>
    );
  }

  // LARGE: Volle Breite mit mehr Infos
  if (size === 'large') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="col-span-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[180px]"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", colors.bg, colors.text)}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Schlaf</p>
              <p className="text-xs text-muted-foreground">Letzte 7 Tage</p>
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            colors.bg, colors.text
          )}>
            {sleepStatus === 'good' ? 'Gut' : sleepStatus === 'ok' ? 'OK' : 'Wenig'}
          </span>
        </div>
        
        {/* Big Sparkline Chart */}
        <div className="flex items-end justify-between gap-2 h-16 mb-4">
          {sleepSparkline.map((h, i) => (
            <motion.div 
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn("flex-1 rounded-md", colors.bar)}
            />
          ))}
        </div>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-3xl font-bold text-foreground">
              {sleepHours > 0 ? `${sleepHours.toFixed(1)}h` : '--'}
            </p>
            <p className="text-xs text-muted-foreground">Heute</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">
              {weeklyAvg > 0 ? `Ø ${weeklyAvg.toFixed(1)}h` : '--'}
            </p>
            <p className="text-xs text-muted-foreground">Wochenschnitt</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // MEDIUM: Standard mit Mini-Chart
  if (size === 'medium') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[140px] flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className={cn("p-2 rounded-xl", colors.bg, colors.text)}>
            <Moon className="w-5 h-5" />
          </div>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            colors.bg, colors.text
          )}>
            {sleepStatus === 'good' ? 'Gut' : sleepStatus === 'ok' ? 'OK' : 'Wenig'}
          </span>
        </div>
        
        {/* Mini Sparkline */}
        <div className="flex items-end justify-between gap-1 h-6 my-2">
          {sleepSparkline.map((h, i) => (
            <motion.div 
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn("flex-1 rounded-sm", colors.bar)}
            />
          ))}
        </div>

        <div>
          <p className="text-2xl font-bold text-foreground">
            {sleepHours > 0 ? `${sleepHours.toFixed(0)}h` : '--'}
          </p>
          <p className="text-xs text-muted-foreground">Ø Letzte 7 Tage</p>
        </div>
      </motion.div>
    );
  }

  // SMALL: Kompakt
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[100px] flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-2 rounded-xl", colors.bg, colors.text)}>
          <Moon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">Schlaf</span>
      </div>

      <div>
        <p className="text-xl font-bold text-foreground">
          {sleepHours > 0 ? `${sleepHours.toFixed(0)}h` : '--'}
        </p>
        <p className="text-[10px] text-muted-foreground">Heute</p>
      </div>
    </motion.div>
  );
};
