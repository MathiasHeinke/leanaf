/**
 * LiquidCarouselMenu - Premium "Glass & Glow" Carousel
 * Transform-based infinite scroll with no visible jumps
 * Smart Start: Opens at first uncompleted action of the day
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Moon, Scale, Pill, Dumbbell, Droplet, Utensils, BookOpen, Check,
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionId } from '@/hooks/useTodayCompletedActions';

// ============= Types =============

interface QuickActionItem {
  id: ActionId;
  icon: LucideIcon;
  label: string;
  color: string;
  glowColor: string;
}

interface VisibleItem extends QuickActionItem {
  offset: number;
  uniqueKey: string;
}

interface LiquidCarouselMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
  completedActions?: Set<ActionId>;
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

// ============= Constants =============

const ITEM_WIDTH = 64; // w-16
const GAP = 16; // gap-4
const ITEM_TOTAL = ITEM_WIDTH + GAP; // 80px per item

// ============= Spring Config =============

const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };

// ============= Carousel Item Component =============

interface CarouselItemProps {
  item: VisibleItem;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

const CarouselItem: React.FC<CarouselItemProps> = ({ item, isActive, isCompleted, onClick }) => {
  const Icon = item.icon;
  
  return (
    <motion.button
      whileTap={{ scale: isActive ? 1.05 : 0.7 }}
      onClick={onClick}
      className={cn(
        "relative w-16 h-16 rounded-full",
        "flex items-center justify-center",
        "transition-shadow duration-300",
        isActive 
          ? `${item.color} shadow-lg ${item.glowColor} border border-white/20`
          : "bg-muted/40 dark:bg-white/10 border border-border/20"
      )}
      aria-label={item.label}
    >
      <Icon className={cn(
        "transition-colors",
        isActive ? "w-7 h-7 text-white" : "w-5 h-5 text-muted-foreground"
      )} />
      
      {/* Completion Badge */}
      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </motion.button>
  );
};

// ============= Main Component =============

export const LiquidCarouselMenu: React.FC<LiquidCarouselMenuProps> = ({
  isOpen,
  onClose,
  onAction,
  completedActions,
}) => {
  const [virtualIndex, setVirtualIndex] = useState(0);
  const wheelAccumulator = useRef(0);
  
  // Smart ordered items based on time of day
  const orderedItems = useMemo(() => getSmartOrderedItems(), []);
  const ITEMS_COUNT = orderedItems.length;
  
  // Smart Start: Find first uncompleted item index
  const getSmartStartIndex = useCallback((completed: Set<ActionId>): number => {
    const firstIncompleteIndex = orderedItems.findIndex(item => !completed.has(item.id));
    // If all completed, start at 0
    return firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
  }, [orderedItems]);
  
  // Calculate visible items (7 items: -3 to +3 from center)
  const visibleItems = useMemo((): VisibleItem[] => {
    const items: VisibleItem[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      const actualIndex = ((virtualIndex + offset) % ITEMS_COUNT + ITEMS_COUNT) % ITEMS_COUNT;
      items.push({
        ...orderedItems[actualIndex],
        offset,
        uniqueKey: `${orderedItems[actualIndex].id}-${offset}`,
      });
    }
    return items;
  }, [virtualIndex, orderedItems, ITEMS_COUNT]);
  
  // Get active item (center item)
  const activeItem = useMemo(() => {
    const normalizedIndex = ((virtualIndex % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT;
    return orderedItems[normalizedIndex];
  }, [virtualIndex, orderedItems, ITEMS_COUNT]);
  
  // Check if active item is completed
  const isActiveCompleted = useMemo(() => {
    return completedActions?.has(activeItem?.id) ?? false;
  }, [completedActions, activeItem]);
  
  // Handle drag end - determine direction and update index
  const handleDragEnd = useCallback((
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Threshold: At least half item width or high velocity
    const threshold = ITEM_TOTAL / 2;
    
    let change = 0;
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      // Determine direction (drag right = previous item, drag left = next item)
      change = offset > 0 ? -1 : 1;
      
      // For high velocity: skip multiple items
      if (Math.abs(velocity) > 1000) {
        change *= 2;
      }
    }
    
    if (change !== 0) {
      setVirtualIndex(prev => prev + change);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  }, []);
  
  // Handle trackpad/mouse wheel scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only capture horizontal scrolling (trackpad 2-finger swipe)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      
      // Accumulate deltaX for smooth scrolling
      wheelAccumulator.current += e.deltaX;
      
      // Threshold: when accumulated enough, change index
      const threshold = ITEM_TOTAL / 2;
      
      if (Math.abs(wheelAccumulator.current) >= threshold) {
        const change = wheelAccumulator.current > 0 ? 1 : -1;
        setVirtualIndex(prev => prev + change);
        wheelAccumulator.current = 0; // Reset accumulator
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    }
  }, []);
  
  // Handle item click
  const handleItemClick = useCallback((item: VisibleItem) => {
    // If not center item, scroll to it first
    if (item.offset !== 0) {
      setVirtualIndex(prev => prev + item.offset);
      return;
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    onAction(item.id);
    onClose();
  }, [onAction, onClose]);
  
  // Smart Start: Reset to first uncompleted item when menu opens
  useEffect(() => {
    if (isOpen) {
      const startIndex = completedActions && completedActions.size > 0
        ? getSmartStartIndex(completedActions)
        : 0;
      setVirtualIndex(startIndex);
    }
  }, [isOpen, completedActions, getSmartStartIndex]);
  
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
            {/* Transform-based Carousel */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              onWheel={handleWheel}
              className="relative h-20 w-full touch-pan-y cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence mode="sync">
                {visibleItems.map((item) => (
                  <motion.div
                    key={item.uniqueKey}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      x: `calc(50vw - 32px + ${item.offset * ITEM_TOTAL}px)`,
                      scale: item.offset === 0 ? 1.15 : 0.75,
                      opacity: Math.abs(item.offset) <= 2 ? (item.offset === 0 ? 1 : 0.5) : 0.2,
                    }}
                    exit={{ opacity: 0 }}
                    transition={springConfig}
                    className="absolute top-0 left-0"
                  >
                    <CarouselItem
                      item={item}
                      isActive={item.offset === 0}
                      isCompleted={completedActions?.has(item.id) ?? false}
                      onClick={() => handleItemClick(item)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            
            {/* Active Label - Animated */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeItem?.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="text-center text-sm font-medium text-foreground mt-1"
              >
                {activeItem?.label}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LiquidCarouselMenu;
