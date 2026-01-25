import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Pill, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { usePlusData } from '@/hooks/usePlusData';

interface SupplementsWidgetProps {
  size: WidgetSize;
}

export const SupplementsWidget: React.FC<SupplementsWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { supplementsLoggedToday } = usePlusData();

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/supplements')}
      className={cn(
        "bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between",
        size === 'small' ? "min-h-[100px]" : "min-h-[140px]"
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn(
          "p-2 rounded-xl",
          supplementsLoggedToday 
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}>
          <Pill className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">Supplements</span>
      </div>

      <div className="flex items-center gap-2">
        {supplementsLoggedToday ? (
          <>
            <Check className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-foreground">Eingenommen</span>
          </>
        ) : (
          <>
            <X className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Offen</span>
          </>
        )}
      </div>
    </motion.div>
  );
};
