/**
 * PeptideFocusCard - Peptide injection tracking with visual circles
 * Shows active peptide protocols as interactive circles
 * Taken: white checkmark, Pending: syringe icon
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Syringe, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProtocols, Protocol } from '@/hooks/useProtocols';
import { useIntakeLog } from '@/hooks/useIntakeLog';
import { toast } from 'sonner';

interface PeptideCircleProps {
  protocol: Protocol;
  isTaken: boolean;
  onInject: () => void;
  disabled?: boolean;
}

const PeptideCircle: React.FC<PeptideCircleProps> = ({
  protocol,
  isTaken,
  onInject,
  disabled,
}) => {
  const [isLogging, setIsLogging] = useState(false);
  const peptide = protocol.peptides[0];
  const displayName = peptide?.name?.substring(0, 3)?.toUpperCase() || 'PEP';

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTaken || disabled || isLogging) return;
    
    setIsLogging(true);
    await onInject();
    setIsLogging(false);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isTaken || disabled || isLogging}
      whileTap={{ scale: isTaken ? 1 : 0.9 }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[56px]",
        isTaken && "cursor-default",
        !isTaken && !disabled && "cursor-pointer hover:bg-white/10",
      )}
    >
      {/* Circle */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
          isTaken && "bg-white border-white",
          !isTaken && "border-white bg-transparent animate-pulse"
        )}
      >
        <AnimatePresence mode="wait">
          {isTaken ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check size={20} className="text-purple-600" strokeWidth={3} />
            </motion.div>
          ) : isLogging ? (
            <motion.div
              key="loading"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <motion.div key="icon">
              <Syringe size={18} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Label - short peptide name */}
      <span className={cn(
        "text-[10px] font-medium whitespace-nowrap",
        isTaken ? "text-white" : "text-white/80"
      )}>
        {displayName}
      </span>

      {/* Dose badge */}
      {peptide?.dose && (
        <span className={cn(
          "absolute -top-1 -right-1 text-[8px] font-bold rounded-full px-1.5 py-0.5",
          isTaken ? "bg-emerald-500 text-white" : "bg-white/20 text-white/80"
        )}>
          {peptide.dose}{peptide.unit === 'mg' ? 'mg' : 'mcg'}
        </span>
      )}
    </motion.button>
  );
};

interface PeptideTimingCirclesProps {
  onComplete?: () => void;
}

export const PeptideTimingCircles: React.FC<PeptideTimingCirclesProps> = ({ onComplete }) => {
  const { protocols, loading: protocolsLoading } = useProtocols();
  const { logs, logIntake, isPeptideTakenToday, loading: logsLoading } = useIntakeLog();
  
  // Only active protocols
  const activeProtocols = protocols.filter(p => p.is_active);
  
  // Check if all peptides are taken
  const allTaken = activeProtocols.every(protocol => {
    const peptide = protocol.peptides[0];
    return peptide && isPeptideTakenToday(protocol.id, peptide.name);
  });

  const handleInject = async (protocol: Protocol) => {
    const peptide = protocol.peptides[0];
    if (!peptide) return;
    
    try {
      const success = await logIntake(
        protocol.id,
        peptide.name,
        peptide.dose,
        peptide.unit,
        protocol.timing || 'evening_fasted'
      );
      
      if (success) {
        toast.success(`${peptide.name} injiziert ✓`, {
          description: `${peptide.dose}${peptide.unit}`
        });
        
        // Award XP
        window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
          detail: { amount: 25, reason: `${peptide.name} Injektion` }
        }));
        
        // Check if all peptides are now done
        const remainingIncomplete = activeProtocols.filter(p => {
          if (p.id === protocol.id) return false;
          const pep = p.peptides[0];
          return pep && !isPeptideTakenToday(p.id, pep.name);
        });
        
        if (remainingIncomplete.length === 0 && onComplete) {
          onComplete();
        }
      }
    } catch (err) {
      console.error('Failed to log peptide injection:', err);
      toast.error('Konnte Injektion nicht speichern');
    }
  };

  const loading = protocolsLoading || logsLoading;

  if (loading) {
    return (
      <div className="flex gap-2 animate-pulse">
        {[1].map(i => (
          <div key={i} className="w-10 h-10 rounded-full bg-white/20" />
        ))}
      </div>
    );
  }

  if (activeProtocols.length === 0) {
    return (
      <div className="text-white/60 text-sm flex items-center gap-2">
        <AlertCircle size={14} />
        <span>Keine aktiven Protokolle</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {activeProtocols.map(protocol => {
        const peptide = protocol.peptides[0];
        if (!peptide) return null;
        
        const isTaken = isPeptideTakenToday(protocol.id, peptide.name);
        
        return (
          <PeptideCircle
            key={protocol.id}
            protocol={protocol}
            isTaken={isTaken}
            onInject={() => handleInject(protocol)}
          />
        );
      })}
    </div>
  );
};
