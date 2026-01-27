/**
 * MetricWidgetGrid - Customizable Widget Dashboard
 * iOS Home Screen-like grid with personalized widgets
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import { WidgetEditorSheet } from './WidgetEditorSheet';
import { WidgetSize } from '@/types/widgets';

interface MetricWidgetGridProps {
  onOpenNutritionSheet?: () => void;
  onOpenHydrationSheet?: () => void;
  onOpenBodySheet?: () => void;
  onOpenPeptidesSheet?: () => void;
  onOpenTrainingSheet?: () => void;
  onOpenSupplementsSheet?: () => void;
}

export const MetricWidgetGrid: React.FC<MetricWidgetGridProps> = ({ 
  onOpenNutritionSheet,
  onOpenHydrationSheet,
  onOpenBodySheet,
  onOpenPeptidesSheet,
  onOpenTrainingSheet,
  onOpenSupplementsSheet
}) => {
  const { enabledWidgets, isLoading } = useWidgetConfig();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const getGridClass = (size: WidgetSize): string => {
    switch (size) {
      case 'small':
        return 'col-span-1 min-h-[100px]';
      case 'medium':
        return 'col-span-1 min-h-[140px]';
      case 'large':
        return 'col-span-2 min-h-[180px]';
      case 'wide':
        return 'col-span-2 min-h-[100px]';
      case 'flat':
        return 'col-span-2 min-h-[60px]';
      default:
        return 'col-span-1 min-h-[140px]';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="bg-card/50 rounded-2xl min-h-[140px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {enabledWidgets.map((widget, index) => (
            <motion.div
              key={`${widget.type}-${widget.size}-${widget.enabled}`}
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ 
                delay: index * 0.05,
                layout: { duration: 0.3 }
              }}
              className={cn(getGridClass(widget.size))}
            >
              <WidgetRenderer 
                config={widget} 
                onOpenNutritionSheet={onOpenNutritionSheet}
                onOpenHydrationSheet={onOpenHydrationSheet}
                onOpenBodySheet={onOpenBodySheet}
                onOpenPeptidesSheet={onOpenPeptidesSheet}
                onOpenTrainingSheet={onOpenTrainingSheet}
                onOpenSupplementsSheet={onOpenSupplementsSheet}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* "+" Button to open Widget Editor */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: enabledWidgets.length * 0.05 + 0.1 }}
          onClick={() => setIsEditorOpen(true)}
          className={cn(
            "col-span-2 h-16 rounded-3xl border-2 border-dashed",
            "border-muted-foreground/20 hover:border-primary/50",
            "flex items-center justify-center gap-2",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-primary/5 transition-all duration-200"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Widgets anpassen</span>
        </motion.button>
      </div>

      <WidgetEditorSheet 
        open={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
      />
    </>
  );
};
