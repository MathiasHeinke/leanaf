import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { usePlusData } from '@/hooks/usePlusData';

interface TrainingWidgetProps {
  size: WidgetSize;
}

export const TrainingWidget: React.FC<TrainingWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { workoutLoggedToday } = usePlusData();

  const weeklyWorkouts = workoutLoggedToday ? 1 : 0;
  const workoutTarget = 4;
  const workoutStatus = weeklyWorkouts < workoutTarget * 0.5 ? 'low' : 
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

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/training')}
      className={cn(
        "bg-card/80 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between",
        workoutStatus === 'low' ? "border-destructive/30" : "border-border/50",
        size === 'small' ? "min-h-[100px]" : "min-h-[140px]"
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
        
        {workoutStatus === 'low' && size !== 'small' && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-destructive font-medium">Zu wenig</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
