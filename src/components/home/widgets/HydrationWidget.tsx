import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { usePlusData } from '@/hooks/usePlusData';

interface HydrationWidgetProps {
  size: WidgetSize;
}

export const HydrationWidget: React.FC<HydrationWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { hydrationMlToday } = usePlusData();
  
  const target = 3000;
  const percent = Math.min((hydrationMlToday / target) * 100, 100);
  const liters = (hydrationMlToday / 1000).toFixed(1);
  const targetLiters = (target / 1000).toFixed(1);

  // FLAT: Horizontaler Progress-Balken (volle Breite)
  if (size === 'flat') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/hydration')}
        className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
      >
        {/* Background Fill Effect */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/10"
        />
        
        <div className="relative z-10 p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
          <Droplets className="w-5 h-5" />
        </div>
        
        <span className="relative z-10 flex-1 text-sm font-medium text-foreground">Wasser</span>
        
        <span className="relative z-10 text-sm font-bold text-cyan-600 dark:text-cyan-400">
          {liters}L / {targetLiters}L
        </span>
      </motion.div>
    );
  }

  // SMALL/MEDIUM: Klassische Card mit Liquid-Fill
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/hydration')}
      className={cn(
        "relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden flex flex-col justify-between",
        size === 'small' ? "min-h-[100px]" : "min-h-[140px]"
      )}
    >
      {/* Liquid Fill Animation */}
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: `${percent}%` }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500/30 to-cyan-400/10"
      />
      
      <div className="relative z-10 flex justify-between items-start">
        <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
          <Droplets className="w-5 h-5" />
        </div>
        {size !== 'small' && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {Math.round(percent)}%
          </span>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-2xl font-bold text-foreground">{liters}L</p>
        <p className="text-xs text-muted-foreground">Ziel: {targetLiters}L</p>
      </div>
    </motion.div>
  );
};
