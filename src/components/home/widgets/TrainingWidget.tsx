import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { getLast7Days } from '@/utils/dateHelpers';

interface TrainingWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;
}

export const TrainingWidget: React.FC<TrainingWidgetProps> = ({ size, onOpenSheet }) => {
  const navigate = useNavigate();

  // Fetch training sessions for last 7 days (FIXED: uses training_sessions table)
  const { data: weeklyData } = useQuery({
    queryKey: QUERY_KEYS.TRAINING_WEEKLY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { count: 0, days: [] as boolean[] };
      
      // Use timezone-aware date helper
      const dates = getLast7Days();
      
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('session_date')
        .eq('user_id', user.id)
        .in('session_date', dates);
      
      const sessionDates = new Set(
        sessions?.map(s => s.session_date) || []
      );
      
      return {
        count: sessionDates.size,
        days: dates.map(d => sessionDates.has(d))
      };
    },
    staleTime: 10000
  });

  const weeklyWorkouts = weeklyData?.count || 0;
  const weekDays = weeklyData?.days || [false, false, false, false, false, false, false];
  const workoutTarget = 4;
  const workoutStatus = weeklyWorkouts < 2 ? 'low' : 
                        weeklyWorkouts >= workoutTarget ? 'good' : 'ok';

  const statusColors = {
    good: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
    },
    ok: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
      dot: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
    },
    low: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      dot: "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.6)]"
    }
  };

  const colors = statusColors[workoutStatus];
  const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const progressPercent = Math.min((weeklyWorkouts / workoutTarget) * 100, 100);

  // FLAT: Horizontal compact strip with week dots
  if (size === 'flat') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => onOpenSheet?.()}
        className={cn(
          "col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden",
          workoutStatus === 'low' ? "border-destructive/30" : "border-border/50"
        )}
      >
        {/* Background Fill */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={cn(
            "absolute inset-0",
            workoutStatus === 'good' 
              ? "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10"
              : workoutStatus === 'ok'
                ? "bg-gradient-to-r from-orange-500/20 to-orange-400/10"
                : "bg-gradient-to-r from-destructive/20 to-destructive/10"
          )}
        />
        
        {/* Icon */}
        <div className={cn("relative z-10 p-2 rounded-xl", colors.bg, colors.text)}>
          <Dumbbell className="w-5 h-5" />
        </div>
        
        {/* Label */}
        <span className="relative z-10 text-sm font-medium text-foreground shrink-0">Training</span>
        
        {/* Week Days Dots */}
        <div className="relative z-10 flex-1 flex items-center justify-center gap-1.5">
          {weekDays.map((done, i) => (
            <motion.div 
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[8px]",
                done 
                  ? "bg-emerald-500 text-white" 
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              {done && <Check className="w-2.5 h-2.5" />}
            </motion.div>
          ))}
        </div>
        
        {/* Value */}
        <span className={cn("relative z-10 text-sm font-bold shrink-0", colors.text)}>
          {weeklyWorkouts}/{workoutTarget} Woche
        </span>
      </motion.div>
    );
  }

  // LARGE / WIDE: With week view
  if (size === 'large' || size === 'wide') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => onOpenSheet?.()}
        className={cn(
          "h-full bg-card/80 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors",
          workoutStatus === 'low' ? "border-destructive/30" : "border-border/50"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", colors.bg, colors.text)}>
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Training</p>
              <p className="text-xs text-muted-foreground">Diese Woche</p>
            </div>
          </div>
          <span className={cn("text-lg font-bold", colors.text)}>
            {weeklyWorkouts}/{workoutTarget}
          </span>
        </div>
        
        {/* Week Days Visualization */}
        <div className="flex gap-2 mt-4">
          {weekDays.map((done, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  done 
                    ? "bg-emerald-500 text-white" 
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                {done ? <Check className="w-4 h-4" /> : null}
              </motion.div>
              <span className="text-[10px] text-muted-foreground">{dayLabels[i]}</span>
            </div>
          ))}
        </div>

        {workoutStatus === 'low' && (
          <div className="flex items-center gap-1 mt-3">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-destructive font-medium">
              Mindestens 3x pro Woche empfohlen
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  // SMALL: Compact
  if (size === 'small') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => onOpenSheet?.()}
        className={cn(
          "h-full bg-card/80 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between",
          workoutStatus === 'low' ? "border-destructive/30" : "border-border/50"
        )}
      >
        <div className="flex justify-between items-start">
          <div className={cn("p-2 rounded-xl", colors.bg, colors.text)}>
            <Dumbbell className="w-4 h-4" />
          </div>
          <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
        </div>
        
        <div>
          <p className="text-xl font-bold text-foreground">
            {weeklyWorkouts}/{workoutTarget}
          </p>
          <p className="text-[10px] text-muted-foreground">Workouts</p>
        </div>
      </motion.div>
    );
  }

  // MEDIUM: Standard
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => onOpenSheet?.()}
      className={cn(
        "h-full bg-card/80 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between",
        workoutStatus === 'low' ? "border-destructive/30" : "border-border/50"
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-2 rounded-xl", colors.bg, colors.text)}>
          <Dumbbell className="w-5 h-5" />
        </div>
        <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
      </div>
      
      <div>
        <p className="text-2xl font-bold text-foreground">
          {weeklyWorkouts}/{workoutTarget}
        </p>
        <p className="text-xs text-muted-foreground">Workouts / Woche</p>
        
        {workoutStatus === 'low' && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-destructive font-medium">Zu wenig</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
