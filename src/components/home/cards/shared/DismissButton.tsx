/**
 * DismissButton - Morphing Icon to X dismiss button
 * Shared across all ActionCard types
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';

interface DismissButtonProps {
  icon: LucideIcon;
  onDismiss: () => void;
}

export const DismissButton: React.FC<DismissButtonProps> = ({ icon: Icon, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 300)}
      whileTap={{ scale: 0.9 }}
      className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 
                 flex items-center justify-center transition-colors hover:bg-white/30 flex-shrink-0"
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          <motion.div
            key="close"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            <X size={22} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Icon size={22} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
