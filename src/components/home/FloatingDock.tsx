/**
 * FloatingDock - Dynamic Island style action dock
 * Two clear, labeled action buttons for quick access
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Camera, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingDockProps {
  onChatOpen: () => void;
  onMealInput?: () => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ 
  onChatOpen,
  onMealInput 
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        className={cn(
          "flex items-center gap-2 p-2",
          "bg-card/95 dark:bg-card/90 backdrop-blur-xl",
          "border border-border/50 dark:border-border/30",
          "rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/40"
        )}
      >
        {/* Meal-Tracking Button */}
        <motion.button 
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.02 }}
          onClick={onMealInput}
          className={cn(
            "flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl",
            "bg-secondary/60 dark:bg-secondary/40",
            "text-foreground",
            "hover:bg-secondary/80 transition-colors"
          )}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mahlzeit</span>
        </motion.button>

        {/* ARES Chat Button (Prominent) */}
        <motion.button 
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={onChatOpen}
          className={cn(
            "flex flex-col items-center gap-1 px-6 py-2.5 rounded-xl",
            "bg-gradient-to-tr from-primary to-primary-glow",
            "text-primary-foreground",
            "shadow-lg shadow-primary/30",
            "hover:shadow-xl hover:shadow-primary/40 transition-all"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-semibold">ARES</span>
        </motion.button>
      </motion.div>
    </div>
  );
};
