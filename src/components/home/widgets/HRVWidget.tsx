import React from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';

interface HRVWidgetProps {
  size: WidgetSize;
}

export const HRVWidget: React.FC<HRVWidgetProps> = ({ size }) => {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 flex flex-col justify-between",
        size === 'small' ? "min-h-[100px]" : "min-h-[140px]"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          <Activity className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">HRV</span>
      </div>

      <div>
        <p className="text-xl font-bold text-foreground">-- ms</p>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Coming soon</span>
        </div>
      </div>
    </motion.div>
  );
};
