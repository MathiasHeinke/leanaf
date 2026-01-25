import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { usePlusData } from '@/hooks/usePlusData';

interface SleepWidgetProps {
  size: WidgetSize;
}

export const SleepWidget: React.FC<SleepWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { sleepDurationToday } = usePlusData();
  
  const sleepHours = sleepDurationToday || 0;
  const sleepStatus = sleepHours >= 7 ? 'good' : sleepHours >= 5 ? 'ok' : 'low';
  
  // Fake sparkline data for sleep chart (would come from last 7 days)
  const sleepSparkline = [40, 60, 30, 80, 50, 70, 90];

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
    }
  };

  const colors = statusColors[sleepStatus];

  // LARGE: Volle Breite mit mehr Infos
  if (size === 'large') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/sleep')}
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
            <p className="text-sm font-medium text-muted-foreground">Ø 7,2h</p>
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
        onClick={() => navigate('/sleep')}
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
      onClick={() => navigate('/sleep')}
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
