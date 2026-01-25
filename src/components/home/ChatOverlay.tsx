/**
 * ChatOverlay - Slide-up chat sheet with context support
 * Opens ARES chat without page navigation
 * Supports initialContext for AI-triggered conversations
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { COACH_REGISTRY } from '@/lib/coachRegistry';
import AresChat from '@/components/ares/AresChat';
import { useAuth } from '@/hooks/useAuth';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string | null;
}

// Context prompts for AI - triggered by action cards
const CONTEXT_PROMPTS: Record<string, string> = {
  'analyze_recovery_pattern': 'Analysiere meine aktuellen Recovery-Daten und gib mir eine prägnante Handlungsempfehlung basierend auf meinen Schlaf-, Stress- und Trainingsdaten.',
  'sleep_optimization_advice': 'Mein Schlaf war schlecht. Gib mir konkrete, wissenschaftlich fundierte Tipps zur Schlafoptimierung basierend auf meinen Daten.',
  'start_evening_journal': 'Führe mich durch 3 kurze Reflexionsfragen für mein Abend-Journal. Halte es kurz und fokussiert.',
  'log_supplements': 'Erinnere mich an meine Supplement-Routine. Welche Supplements sollte ich basierend auf meinem Profil nehmen?',
  'complete_profile': 'Hilf mir, mein Profil zu vervollständigen. Welche wichtigen Daten fehlen mir noch für optimale Empfehlungen?',
  'hydration_reminder': 'Gib mir einen Motivationsschub zum Trinken. Erkläre kurz, warum Hydration für meine Ziele wichtig ist.'
};

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  isOpen, 
  onClose, 
  initialContext 
}) => {
  const { user } = useAuth();
  const aresCoach = COACH_REGISTRY.ares;

  // Stable close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key and browser back button
  useEffect(() => {
    if (!isOpen) return;

    // Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // Browser back button handler (pushes a state, then listens for popstate)
    window.history.pushState({ chatOverlay: true }, '');
    
    const handlePopState = (e: PopStateEvent) => {
      handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, handleClose]);

  if (!user) return null;

  // Get the initial message based on context
  const contextPrompt = initialContext ? CONTEXT_PROMPTS[initialContext] : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - z-50 to be above content but clickable */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet - z-[51] to be above backdrop */}
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: "5%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-0 z-[51] bg-background rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Drag Handle - clickable to close */}
            <div 
              className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-pointer z-10"
              onClick={handleClose}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-5 pt-12 pb-3 flex justify-between items-center border-b border-border/50 bg-background/95 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border/50">
                  <AvatarImage src={aresCoach.imageUrl} alt="ARES" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    <Zap className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base font-semibold text-foreground">ARES</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {initialContext ? 'Hat eine Erkenntnis...' : 'Dein Coach • Online'}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handleClose} 
                className="p-2 bg-secondary/80 hover:bg-secondary rounded-full transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <AresChat 
                userId={user.id}
                coachId="ares"
                className="h-full"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
