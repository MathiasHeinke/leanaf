/**
 * LiquidCarouselMenu - Virtual Physics Carousel
 * MotionValue-based infinite scroll with true Apple feel
 * Features: Momentum, friction, 1:1 trackpad mapping, spring snapping
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  motion, 
  AnimatePresence, 
  useMotionValue, 
  useTransform,
  useMotionValueEvent,
  animate,
  type MotionValue,
  type PanInfo 
} from 'framer-motion';
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

const springConfig = { type: "spring" as const, stiffness: 400, damping: 40 };

// ============= Physics Carousel Item =============

interface PhysicsItemProps {
  item: QuickActionItem;
  index: number;
  x: MotionValue<number>;
  totalItems: number;
  onTap: () => void;
  isCompleted: boolean;
  isActive: boolean;
}

const PhysicsCarouselItem: React.FC<PhysicsItemProps> = ({
  item, index, x, totalItems, onTap, isCompleted, isActive
}) => {
  const Icon = item.icon;
  
  // Calculate position relative to x motion value with infinite wrap
  const itemX = useTransform(x, (xVal) => {
    const totalWidth = totalItems * ITEM_TOTAL;
    const centerOffset = typeof window !== 'undefined' ? window.innerWidth / 2 - ITEM_WIDTH / 2 : 200;
    
    // Raw position based on index and scroll
    let pos = index * ITEM_TOTAL + xVal + centerOffset;
    
    // Modulo wrap for infinite scroll
    pos = ((pos % totalWidth) + totalWidth) % totalWidth;
    
    // Offset so items wrap around center
    if (pos > totalWidth / 2) {
      pos -= totalWidth;
    }
    
    return pos;
  });
  
  // Distance from center for scale/opacity effects
  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 - ITEM_WIDTH / 2 : 200;
  
  const distanceFromCenter = useTransform(itemX, (posX) => {
    return Math.abs(posX - centerX);
  });
  
  const scale = useTransform(distanceFromCenter, [0, 120], [1.15, 0.75]);
  const opacity = useTransform(distanceFromCenter, [0, 80, 200], [1, 0.5, 0.2]);
  
  return (
    <motion.button
      style={{ x: itemX, scale, opacity }}
      whileTap={{ scale: 1.05 }}
      onTap={onTap}
      className={cn(
        "absolute top-0 left-0 w-16 h-16 rounded-full",
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
  // MotionValue for continuous physics-based scrolling
  const x = useMotionValue(0);
  const wheelTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [currentActiveIndex, setCurrentActiveIndex] = useState(0);
  
  // Smart ordered items based on time of day
  const orderedItems = useMemo(() => getSmartOrderedItems(), []);
  const ITEMS_COUNT = orderedItems.length;
  
  // Smart Start: Find first uncompleted item index
  const getSmartStartIndex = useCallback((completed: Set<ActionId>): number => {
    const firstIncompleteIndex = orderedItems.findIndex(item => !completed.has(item.id));
    return firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
  }, [orderedItems]);
  
  // Track active index from x position
  const activeIndex = useTransform(x, (xVal) => {
    const index = Math.round(-xVal / ITEM_TOTAL);
    return ((index % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT;
  });
  
  // Update state when active index changes (for label)
  useMotionValueEvent(activeIndex, "change", (latest) => {
    setCurrentActiveIndex(latest);
  });
  
  // Get active item for label display
  const activeItem = useMemo(() => {
    return orderedItems[currentActiveIndex];
  }, [orderedItems, currentActiveIndex]);
  
  // Physics-based drag end with momentum + snapping
  const handleDragEnd = useCallback((
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentX = x.get();
    const velocity = info.velocity.x;
    
    // Predict where momentum would carry us
    const projectedX = currentX + velocity * 0.2;
    
    // Snap to nearest item
    const snapTarget = Math.round(projectedX / ITEM_TOTAL) * ITEM_TOTAL;
    
    // Animate with spring physics (the Apple feel!)
    animate(x, snapTarget, {
      type: "spring",
      stiffness: 400,
      damping: 40,
      velocity: velocity * 0.5 // Carry momentum into snap
    });
    
    // Haptic feedback on snap
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [x]);
  
  // Direct 1:1 trackpad/wheel mapping
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only capture horizontal scrolling (trackpad 2-finger swipe)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      
      // Direct 1:1 mapping - THIS is the Apple feel
      x.set(x.get() - e.deltaX);
      
      // Clear previous timeout
      if (wheelTimeout.current) {
        clearTimeout(wheelTimeout.current);
      }
      
      // Snap after 150ms of no wheel events
      wheelTimeout.current = setTimeout(() => {
        const snapTarget = Math.round(x.get() / ITEM_TOTAL) * ITEM_TOTAL;
        animate(x, snapTarget, springConfig);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }, 150);
    }
  }, [x]);
  
  // Handle item tap - navigate to item or trigger action
  const handleItemTap = useCallback((index: number) => {
    const targetX = -index * ITEM_TOTAL;
    const currentIndex = Math.round(-x.get() / ITEM_TOTAL);
    const normalizedCurrent = ((currentIndex % ITEMS_COUNT) + ITEMS_COUNT) % ITEMS_COUNT;
    
    // If already at this item, trigger action
    if (normalizedCurrent === index) {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      onAction(orderedItems[index].id);
      onClose();
    } else {
      // Scroll to the item
      animate(x, targetX, springConfig);
    }
  }, [x, ITEMS_COUNT, orderedItems, onAction, onClose]);
  
  // Smart Start: Reset to first uncompleted item when menu opens
  useEffect(() => {
    if (isOpen) {
      const startIndex = completedActions && completedActions.size > 0
        ? getSmartStartIndex(completedActions)
        : 0;
      
      // Set x so the start item is centered
      x.set(-startIndex * ITEM_TOTAL);
      setCurrentActiveIndex(startIndex);
    }
  }, [isOpen, completedActions, getSmartStartIndex, x]);
  
  // Cleanup wheel timeout on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeout.current) {
        clearTimeout(wheelTimeout.current);
      }
    };
  }, []);
  
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
            {/* Physics-based Carousel */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              onWheel={handleWheel}
              className="relative h-20 w-full touch-pan-y cursor-grab active:cursor-grabbing"
            >
              {orderedItems.map((item, index) => (
                <PhysicsCarouselItem
                  key={item.id}
                  item={item}
                  index={index}
                  x={x}
                  totalItems={ITEMS_COUNT}
                  onTap={() => handleItemTap(index)}
                  isCompleted={completedActions?.has(item.id) ?? false}
                  isActive={currentActiveIndex === index}
                />
              ))}
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
