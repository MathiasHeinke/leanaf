/**
 * FloatingDock - Dynamic Island style action dock
 * Floating pill with quick actions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Camera, MessageSquare, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingDockProps {
  onChatOpen: () => void;
  onCameraOpen?: () => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ 
  onChatOpen,
  onCameraOpen 
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        className={cn(
          "flex items-center gap-2 p-1.5 pl-5 pr-1.5",
          "bg-card/90 dark:bg-card/80 backdrop-blur-xl",
          "border border-border/50 dark:border-border/30",
          "rounded-full shadow-2xl shadow-black/10 dark:shadow-black/30"
        )}
      >
        <span className="text-xs font-medium text-muted-foreground mr-2">
          Ask ARES
        </span>

        {/* Camera/Scan Button */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onCameraOpen}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-secondary/80 dark:bg-secondary/50",
            "text-foreground",
            "hover:bg-secondary transition-colors"
          )}
        >
          <ScanLine className="w-4 h-4" />
        </motion.button>

        {/* Main Chat Button */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onChatOpen}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            "bg-gradient-to-tr from-primary to-primary-glow",
            "text-primary-foreground",
            "shadow-lg shadow-primary/30",
            "hover:shadow-xl hover:shadow-primary/40 transition-shadow"
          )}
        >
          <MessageSquare className="w-5 h-5 fill-current/20" />
        </motion.button>
      </motion.div>
    </div>
  );
};
