import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useUserProfile } from '@/hooks/useUserProfile';

interface WeightWidgetProps {
  size: WidgetSize;
}

export const WeightWidget: React.FC<WeightWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { profileData } = useUserProfile();
  
  const currentWeight = profileData?.weight || 0;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/weight')}
      className={cn(
        "bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between",
        size === 'small' ? "min-h-[100px]" : "min-h-[140px]"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
          <Scale className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">Gewicht</span>
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
};
