/**
 * ChatOverlay - Slide-up chat sheet
 * Opens ARES chat without page navigation
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { COACH_REGISTRY } from '@/lib/coachRegistry';
import AresChat from '@/components/ares/AresChat';
import { useAuth } from '@/hooks/useAuth';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string | null;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  isOpen, 
  onClose, 
  initialContext 
}) => {
  const { user } = useAuth();
  const aresCoach = COACH_REGISTRY.ares;

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

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Sheet */}
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: "5%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-0 z-50 bg-background rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Drag Handle */}
            <div 
              className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-pointer z-10"
              onClick={onClose}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-5 pt-12 pb-3 flex justify-between items-center border-b border-border/50 bg-background/95 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border/50">
                  <AvatarImage src={aresCoach.imageUrl} alt="ARES" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">A</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base font-semibold text-foreground">ARES</h2>
                  <p className="text-[11px] text-muted-foreground">Dein Coach • Online</p>
                </div>
              </div>
              
              <button 
                onClick={onClose} 
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
