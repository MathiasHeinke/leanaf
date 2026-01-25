import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useProtocolStatus } from '@/hooks/useProtocolStatus';

interface ProtocolWidgetProps {
  size: WidgetSize;
}

export const ProtocolWidget: React.FC<ProtocolWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { status: protocolStatus, phase0Progress } = useProtocolStatus();

  const protocolPhase = protocolStatus?.current_phase || 0;
  const protocolPercent = ((phase0Progress || 0) / 9) * 100;

  const phaseNames: Record<number, string> = {
    0: 'Fundament',
    1: 'Rekomposition',
    2: 'Fine-tuning',
    3: 'Longevity'
  };

  // MEDIUM: Standard-Ansicht
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/protocol')}
      className={cn(
        "bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/10 transition-colors flex flex-col justify-between",
        size === 'small' ? "min-h-[100px]" : "min-h-[140px]"
      )}
    >
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
          ARES Protokoll
        </p>
        {size !== 'small' && (
          <span className="text-[10px] font-medium text-primary/80">
            {phase0Progress || 0}/9
          </span>
        )}
      </div>
      
      <div>
        <p className="text-lg font-bold text-foreground">Phase {protocolPhase}</p>
        {size !== 'small' && (
          <p className="text-xs text-muted-foreground">{phaseNames[protocolPhase]}</p>
        )}
      </div>
      
      {size !== 'small' && (
        <div className="mt-2">
          <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${protocolPercent}%` }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};
