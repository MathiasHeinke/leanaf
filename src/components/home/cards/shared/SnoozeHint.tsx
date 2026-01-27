/**
 * SnoozeHint - 2h Snooze button with clock icon
 * Shared across all ActionCard types
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight } from 'lucide-react';

interface SnoozeHintProps {
  onSnooze: () => void;
}

export const SnoozeHint: React.FC<SnoozeHintProps> = ({ onSnooze }) => (
  <motion.button
    onClick={(e) => { 
      e.stopPropagation(); 
      onSnooze(); 
    }}
    whileTap={{ scale: 0.9 }}
    className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-1 
               rounded-full bg-white/10 backdrop-blur-sm border border-white/10
               text-white/40 text-[10px] font-medium hover:bg-white/20 hover:text-white/60 
               transition-all"
  >
    <Clock size={10} />
    <span>2h</span>
    <ChevronRight size={10} className="opacity-60" />
  </motion.button>
);
