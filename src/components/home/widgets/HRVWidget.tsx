import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';

interface HRVWidgetProps {
  size: WidgetSize;
}

export const HRVWidget: React.FC<HRVWidgetProps> = ({ size }) => {
  // HRV data would come from Health Connect / Apple Health integration
  // For now, show a beautiful placeholder
  
  // FLAT: Horizontal compact placeholder strip
  if (size === 'flat') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 flex items-center gap-3"
      >
        {/* Icon */}
        <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
          <Activity className="w-5 h-5" />
        </div>
        
        {/* Label */}
        <span className="text-sm font-medium text-foreground shrink-0">HRV</span>
        
        {/* Coming Soon Badge */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Bald verfügbar
          </span>
        </div>
        
        {/* Value Placeholder */}
        <span className="text-sm font-bold text-muted-foreground/50 shrink-0">-- ms</span>
      </motion.div>
    );
  }

  // LARGE: More info placeholder
  if (size === 'large' || size === 'wide') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">HRV</p>
              <p className="text-xs text-muted-foreground">Herzratenvariabilität</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Bald
          </span>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 rounded-full bg-purple-100/50 dark:bg-purple-900/20 flex items-center justify-center mb-2">
            <Clock className="w-8 h-8 text-purple-400/50" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Health Connect Integration<br/>coming soon
          </p>
        </div>
      </motion.div>
    );
  }

  // MEDIUM: Standard placeholder
  if (size === 'medium') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Bald
          </span>
        </div>

        <div>
          <p className="text-xl font-bold text-muted-foreground/50">-- ms</p>
          <p className="text-[10px] text-muted-foreground">HRV Daten benötigt</p>
        </div>
      </motion.div>
    );
  }

  // SMALL: Compact placeholder
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          <Activity className="w-4 h-4" />
        </div>
        <span className="text-[10px] text-muted-foreground">HRV</span>
      </div>

      <div>
        <p className="text-xl font-bold text-muted-foreground/50">--</p>
        <p className="text-[10px] text-muted-foreground">ms</p>
      </div>
    </motion.div>
  );
};
