/**
 * ActionCardStack - Smart swipeable card stack with frictionless logging
 * Swipe right = complete, Swipe left = dismiss, Quick actions for instant logging
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActionCards, ActionCard, QuickAction } from '@/hooks/useActionCards';
import { useDismissedCards } from '@/hooks/useDismissedCards';
import { useQuickLogging } from '@/hooks/useQuickLogging';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { SmartFocusCard, SmartTask } from './SmartFocusCard';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ActionCardStackProps {
  onTriggerChat: (context: string) => void;
}

export const ActionCardStack: React.FC<ActionCardStackProps> = ({ onTriggerChat }) => {
  const { cards: initialCards } = useActionCards();
  const { dismissCard, isCardDismissed } = useDismissedCards();
  const { logWater, logSupplementsTaken } = useQuickLogging();
  
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);

  // Filter out dismissed cards and sync with hook data
  useEffect(() => {
    const filteredCards = initialCards.filter(card => !isCardDismissed(card.id));
    
    // Only update if cards actually changed
    const currentIds = cards.map(c => c.id).join(',');
    const newIds = filteredCards.map(c => c.id).join(',');
    
    if (currentIds !== newIds) {
      setCards(filteredCards);
    }
  }, [initialCards, isCardDismissed, cards]);

  // Show confetti when all cards are completed
  useEffect(() => {
    if (cards.length === 0 && initialCards.length > 0 && !hasShownConfetti) {
      setHasShownConfetti(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#059669']
      });
    }
  }, [cards.length, initialCards.length, hasShownConfetti]);

  // Handle card completion with logging
  const handleCardComplete = useCallback(async (card: ActionCard, action?: string) => {
    let success = true;
    
    // Execute the appropriate logging action
    switch (card.type) {
      case 'hydration':
        if (action === '250ml_water') {
          success = await logWater(250, 'water');
          if (success) toast.success('+250ml Wasser', { description: `+${card.xp} XP` });
        } else if (action === '500ml_water') {
          success = await logWater(500, 'water');
          if (success) toast.success('+500ml Wasser', { description: `+${card.xp} XP` });
        } else if (action === 'coffee') {
          success = await logWater(150, 'coffee');
          if (success) toast.success('+Kaffee', { description: `+${card.xp} XP` });
        } else {
          // Default swipe complete = 250ml
          success = await logWater(250, 'water');
          if (success) toast.success('+250ml Wasser', { description: `+${card.xp} XP` });
        }
        break;
        
      case 'supplement':
        if (action === 'snooze') {
          dismissCard(card.id, true);
          toast.info('Supplements auf später verschoben');
          return;
        }
        // Timing-specific supplement logging
        if (['morning', 'noon', 'evening', 'pre_workout', 'post_workout'].includes(action || '')) {
          success = await logSupplementsTaken(action as 'morning' | 'noon' | 'evening' | 'pre_workout' | 'post_workout');
          if (success) {
            const timingLabels: Record<string, string> = {
              morning: 'Morgens',
              noon: 'Mittags',
              evening: 'Abends',
              pre_workout: 'Pre-Workout',
              post_workout: 'Post-Workout'
            };
            toast.success(`${timingLabels[action!]} Supplements ✓`, { description: `+${card.xp} XP` });
          }
        }
        break;
        
      case 'insight':
        // Open chat with dynamic prompt
        if (card.actionPrompt) {
          onTriggerChat(card.actionPrompt);
        }
        return; // Don't remove the card
        
      case 'sleep_fix':
      case 'journal':
      case 'profile':
        // These open other flows, trigger chat or navigation
        if (card.actionContext) {
          onTriggerChat(card.actionContext);
        }
        return; // Don't remove the card
        
      default:
        toast.success('Erledigt!', { description: `+${card.xp} XP` });
    }
    
    if (success) {
      // Remove card from stack
      setCards(prev => prev.filter(c => c.id !== card.id));
      
      // Award XP via custom event
      window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
        detail: { amount: card.xp, reason: card.title }
      }));
    }
  }, [logWater, logSupplementsTaken, dismissCard, onTriggerChat]);

  // Handle card dismissal (snooze)
  const handleCardDismiss = useCallback((card: ActionCard) => {
    dismissCard(card.id, true); // Snooze for 2 hours
    setCards(prev => prev.filter(c => c.id !== card.id));
    toast.info(`"${card.title}" ausgeblendet`, { description: 'Erscheint in 2h wieder' });
  }, [dismissCard]);

  // Convert ActionCard to SmartTask for the component
  const toSmartTask = (card: ActionCard): SmartTask => ({
    id: card.id,
    type: card.type as SmartTask['type'],
    title: card.title,
    subtitle: card.subtitle,
    xp: card.xp,
    gradient: card.gradient,
    icon: card.icon,
    actionPrompt: card.actionPrompt,
    canSwipeComplete: card.canSwipeComplete,
    quickActions: card.quickActions
  });

  // Empty state with success message
  if (cards.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-44 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center"
      >
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm font-medium">Alles erledigt. Stay strong.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Stack Container */}
      <div className="relative h-44">
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            // Only show top 3 cards in DOM
            if (index > 2) return null;
            
            const isTop = index === 0;
            
            // Stacking offsets - cards peek from bottom-left
            const yOffset = index * 8;
            const xOffset = index * -4;
            const scale = 1 - index * 0.04;
            const zIndex = 10 - index;
            
            if (isTop) {
              // Top card uses SmartFocusCard with full interactivity
              return (
                <motion.div
                  key={card.id}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ 
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    x: 0,
                  }}
                  exit={{ 
                    x: 300,
                    opacity: 0,
                    rotate: 15,
                    transition: { duration: 0.3 }
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  style={{ zIndex }}
                  className="absolute inset-x-0 top-0"
                >
                  <SmartFocusCard
                    task={toSmartTask(card)}
                    onComplete={(action) => handleCardComplete(card, action)}
                    onDismiss={() => handleCardDismiss(card)}
                    onOpenChat={onTriggerChat}
                  />
                </motion.div>
              );
            }
            
            // Background cards (non-interactive preview)
            return (
              <motion.div
                key={card.id}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ 
                  scale,
                  opacity: 1 - index * 0.15,
                  y: yOffset,
                  x: xOffset,
                  rotate: index * -1,
                }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                style={{ zIndex }}
                className="absolute inset-x-0 top-0 h-44 rounded-3xl shadow-xl overflow-hidden pointer-events-none"
              >
                {/* Card Background */}
                <div className={cn("absolute inset-0 bg-gradient-to-br", card.gradient)} />
                
                {/* Noise Texture */}
                <div 
                  className="absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{ 
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
                  }}
                />

                {/* Content Preview */}
                <div className="relative h-full p-5 flex flex-col text-white">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10">
                      {card.type === 'insight' ? 'ARES Insight' : 'Priority'}
                    </span>
                    
                    <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="mt-auto">
                    <h2 className="text-xl font-bold leading-tight mb-1">
                      {card.title}
                    </h2>
                    <p className="text-white/80 text-sm font-medium line-clamp-2 pr-4">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Hint under stack */}
      <div className="mt-3 flex justify-center">
        <span className="text-xs text-muted-foreground font-medium">
          {cards.length} Pending Actions
        </span>
      </div>
    </div>
  );
};