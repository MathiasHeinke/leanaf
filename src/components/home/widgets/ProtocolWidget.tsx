import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, ChevronRight } from 'lucide-react';
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
  const progress = phase0Progress || 0;
  const protocolPercent = (progress / 9) * 100;

  const phaseNames: Record<number, string> = {
    0: 'Fundament',
    1: 'Rekomposition',
    2: 'Fine-tuning',
    3: 'Longevity'
  };

  // LARGE / WIDE: Full-width with step indicators
  if (size === 'large' || size === 'wide') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/protocol')}
        className="h-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-all"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">ARES Protokoll</p>
              <p className="text-xs text-muted-foreground">Phase {protocolPhase}: {phaseNames[protocolPhase]}</p>
            </div>
          </div>
          <span className="text-lg font-bold text-primary">{progress}/9</span>
        </div>
        
        {/* Progress Steps Visualization */}
        <div className="flex gap-1.5 mt-4">
          {[...Array(9)].map((_, i) => (
            <motion.div 
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn(
                "flex-1 h-2.5 rounded-full transition-colors",
                i < progress 
                  ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
                  : "bg-primary/20"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>{Math.round(protocolPercent)}% abgeschlossen</span>
          <div className="flex items-center gap-1">
            <span>Details</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    );
  }

  // SMALL: Compact
  if (size === 'small') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/protocol')}
        className="h-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/10 transition-colors flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            <Brain className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-primary">{progress}/9</span>
        </div>
        
        <div>
          <p className="text-lg font-bold text-foreground">Phase {protocolPhase}</p>
          <p className="text-[10px] text-muted-foreground truncate">{phaseNames[protocolPhase]}</p>
        </div>
      </motion.div>
    );
  }

  // MEDIUM: Standard view
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/protocol')}
      className="h-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/10 transition-colors flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
          ARES Protokoll
        </p>
        <span className="text-[10px] font-medium text-primary/80">
          {progress}/9
        </span>
      </div>
      
      <div>
        <p className="text-lg font-bold text-foreground">Phase {protocolPhase}</p>
        <p className="text-xs text-muted-foreground">{phaseNames[protocolPhase]}</p>
      </div>
      
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
    </motion.div>
  );
};
