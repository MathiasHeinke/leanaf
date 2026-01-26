/**
 * LiquidCarouselMenu - Premium "Glass & Glow" Carousel
 * iOS Cover Flow inspired with smart time-based ordering
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Scale, Pill, Dumbbell, Droplet, Utensils, BookOpen,
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= Types =============

interface QuickActionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
  glowColor: string;
}

interface LiquidCarouselMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

// ============= Action Items Definition =============

const ALL_ACTIONS: QuickActionItem[] = [
  { id: 'sleep', icon: Moon, label: 'Schlaf', color: 'bg-indigo-500', glowColor: 'shadow-indigo-500/40' },
  { id: 'weight', icon: Scale, label: 'Gewicht', color: 'bg-teal-500', glowColor: 'shadow-teal-500/40' },
  { id: 'supplements', icon: Pill, label: 'Supps', color: 'bg-purple-500', glowColor: 'shadow-purple-500/40' },
  { id: 'workout', icon: Dumbbell, label: 'Training', color: 'bg-orange-500', glowColor: 'shadow-orange-500/40' },
  { id: 'hydration', icon: Droplet, label: 'Wasser', color: 'bg-blue-500', glowColor: 'shadow-blue-500/40' },
  { id: 'nutrition', icon: Utensils, label: 'Essen', color: 'bg-emerald-500', glowColor: 'shadow-emerald-500/40' },
  { id: 'journal', icon: BookOpen, label: 'Journal', color: 'bg-amber-500', glowColor: 'shadow-amber-500/40' },
];

// ============= Smart Ordering Logic =============

const getSmartOrderedItems = (): QuickActionItem[] => {
  const hour = new Date().getHours();
  
  // Morning routine (before 10:00)
  const morningOrder = ['sleep', 'weight', 'supplements', 'workout', 'hydration', 'nutrition', 'journal'];
  
  // Day/Evening routine (10:00+)
  const dayOrder = ['nutrition', 'hydration', 'workout', 'supplements', 'journal', 'weight', 'sleep'];
  
  const orderIds = hour < 10 ? morningOrder : dayOrder;
  
  return orderIds
    .map(id => ALL_ACTIONS.find(a => a.id === id))
    .filter((item): item is QuickActionItem => item !== undefined);
};

// ============= Spring Config =============

const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };

// ============= Carousel Item Component =============

interface CarouselItemProps {
  item: QuickActionItem;
  isActive: boolean;
  onClick: () => void;
}

const CarouselItem: React.FC<CarouselItemProps> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  
  return (
    <motion.button
      animate={{
        scale: isActive ? 1.15 : 0.75,
        opacity: isActive ? 1 : 0.5,
      }}
      whileTap={{ scale: isActive ? 1.05 : 0.7 }}
      transition={springConfig}
      onClick={onClick}
      className={cn(
        "snap-center shrink-0 w-16 h-16 rounded-full",
        "flex items-center justify-center",
        "transition-shadow duration-300",
        isActive 
          ? `${item.color} shadow-lg ${item.glowColor} border border-white/20`
          : "bg-slate-200/40 dark:bg-white/10 border border-white/5"
      )}
      aria-label={item.label}
    >
      <Icon className={cn(
        "transition-colors",
        isActive ? "w-7 h-7 text-white" : "w-5 h-5 text-slate-500 dark:text-white/60"
      )} />
    </motion.button>
  );
};

// ============= Main Component =============

export const LiquidCarouselMenu: React.FC<LiquidCarouselMenuProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Smart ordered items based on time of day
  const orderedItems = useMemo(() => getSmartOrderedItems(), []);
  
  // Calculate item width + gap for scroll position tracking
  const ITEM_WIDTH = 64; // w-16
  const GAP = 16; // gap-4
  const ITEM_TOTAL = ITEM_WIDTH + GAP;
  
  // Handle scroll to track active item
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    // Center offset - items are padded with px-[40%] so center is at 40% from left
    const centerPoint = scrollPosition + (containerWidth / 2);
    
    // Find which item is closest to center
    const activeIdx = Math.round(centerPoint / ITEM_TOTAL);
    const clampedIdx = Math.max(0, Math.min(activeIdx, orderedItems.length - 1));
    
    if (clampedIdx !== activeIndex) {
      setActiveIndex(clampedIdx);
    }
  }, [activeIndex, orderedItems.length, ITEM_TOTAL]);
  
  // Reset scroll position when opening
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      setActiveIndex(0);
      scrollRef.current.scrollTo({ left: 0, behavior: 'instant' });
    }
  }, [isOpen]);
  
  // Handle item click
  const handleItemClick = useCallback((item: QuickActionItem) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    onAction(item.id);
    onClose();
  }, [onAction, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Click to close (lowest layer) */}
          <motion.div 
            className="fixed inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          
          {/* Gradient Mask - Visual layer only */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={springConfig}
            className="fixed bottom-0 left-0 right-0 h-[45vh] z-30 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 40%, transparent 100%)'
            }}
          />
          
          {/* Carousel Container - Below dock buttons */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={springConfig}
            className="fixed bottom-28 left-0 right-0 z-40"
          >
            {/* Scrollable Carousel */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar py-4"
              style={{ 
                paddingLeft: 'calc(50vw - 32px)', 
                paddingRight: 'calc(50vw - 32px)' 
              }}
            >
              {orderedItems.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  item={item}
                  isActive={index === activeIndex}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
            
            {/* Active Label - Animated */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={orderedItems[activeIndex]?.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="text-center text-sm font-medium text-foreground mt-1"
              >
                {orderedItems[activeIndex]?.label}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LiquidCarouselMenu;
