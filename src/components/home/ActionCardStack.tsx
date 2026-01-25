/**
 * ActionCardStack - Tinder-style swipeable card stack
 * Shows prioritized action cards with shimmer effect
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActionCards, ActionCard } from '@/hooks/useActionCards';

interface ActionCardStackProps {
  onTriggerChat: (context: string) => void;
}

export const ActionCardStack: React.FC<ActionCardStackProps> = ({ onTriggerChat }) => {
  const { cards: initialCards } = useActionCards();
  const [cards, setCards] = useState<ActionCard[]>(initialCards);
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('right');

  // Sync cards when hook data changes (only when initialCards reference changes)
  React.useEffect(() => {
    if (JSON.stringify(initialCards) !== JSON.stringify(cards)) {
      setCards(initialCards);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCards]);

  const handleDismiss = (direction: 'left' | 'right' = 'right') => {
    setExitDirection(direction);
    setCards((prev) => prev.slice(1));
  };

  const handleInteract = (card: ActionCard) => {
    // Prefer direct prompt with metrics, fallback to context key
    if (card.actionPrompt) {
      onTriggerChat(card.actionPrompt);
    } else if (card.actionContext) {
      onTriggerChat(card.actionContext);
    }
  };

  const handleDragEnd = (info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      handleDismiss(info.offset.x > 0 ? 'right' : 'left');
    }
  };

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
            const Icon = card.icon;
            
            // Stacking offsets - cards peek from bottom-left
            const yOffset = index * 8;
            const xOffset = index * -4;
            const scale = 1 - index * 0.04;
            const zIndex = 10 - index;
            
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
                exit={{ 
                  x: exitDirection === 'right' ? 300 : -300,
                  opacity: 0,
                  rotate: exitDirection === 'right' ? 15 : -15,
                  transition: { duration: 0.3 }
                }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => isTop && handleDragEnd(info)}
                onClick={() => isTop && handleInteract(card)}
                style={{ zIndex }}
                className={cn(
                  "absolute inset-x-0 top-0 h-44 rounded-3xl shadow-2xl overflow-hidden",
                  isTop ? "cursor-pointer touch-pan-x" : "pointer-events-none"
                )}
              >
                {/* Card Background */}
                <div className={cn("absolute inset-0 bg-gradient-to-br", card.gradient)} />
                
                {/* Noise Texture for Premium Look */}
                <div 
                  className="absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{ 
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
                  }}
                />

                {/* Shimmer Effect (Only Top Card) */}
                {isTop && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div 
                      className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                      style={{ transform: 'skewX(-12deg)' }}
                    />
                  </div>
                )}

                {/* Neon border for sleep card */}
                {card.type === 'sleep_fix' && (
                  <div className="absolute inset-0 rounded-3xl border border-indigo-500/40" />
                )}

                {/* Content */}
                <div className="relative h-full p-5 flex flex-col text-white">
                  {/* Top Row: Badge + Icon */}
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10">
                      {card.type === 'insight' ? 'ARES Insight' : 'Priority'}
                    </span>
                    
                    <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Bottom: Title + Subtitle */}
                  <div className="mt-auto">
                    <h2 className="text-xl font-bold leading-tight mb-1">
                      {card.title}
                    </h2>
                    <p className="text-white/80 text-sm font-medium line-clamp-2 pr-4">
                      {card.subtitle}
                    </p>
                  </div>

                  {/* "Tap to Open" Hint */}
                  {isTop && (
                    <motion.div 
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute bottom-5 right-5"
                    >
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </motion.div>
                  )}
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
