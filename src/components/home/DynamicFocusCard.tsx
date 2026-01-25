/**
 * DynamicFocusCard - The Hero Card
 * Shows the most important action based on context
 * Changes dynamically based on missing data/goals
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Moon, Dumbbell, Scale, MessageSquare, Zap, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FocusTask {
  type: 'food' | 'weight' | 'sleep' | 'training' | 'protein' | 'checkin';
  title: string;
  subtitle: string;
  xp: number;
  progress?: number; // 0-100
}

interface DynamicFocusCardProps {
  task: FocusTask | null;
  onInteract: () => void;
}

const taskConfig: Record<FocusTask['type'], { 
  icon: LucideIcon; 
  gradient: string;
  shadowColor: string;
}> = {
  food: { 
    icon: Utensils, 
    gradient: 'from-orange-500 to-red-500',
    shadowColor: 'shadow-orange-500/20'
  },
  weight: { 
    icon: Scale, 
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/20'
  },
  sleep: { 
    icon: Moon, 
    gradient: 'from-indigo-500 to-blue-600',
    shadowColor: 'shadow-indigo-500/20'
  },
  training: { 
    icon: Dumbbell, 
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/20'
  },
  protein: { 
    icon: Zap, 
    gradient: 'from-cyan-500 to-blue-500',
    shadowColor: 'shadow-cyan-500/20'
  },
  checkin: { 
    icon: MessageSquare, 
    gradient: 'from-primary to-primary-glow',
    shadowColor: 'shadow-primary/20'
  }
};

export const DynamicFocusCard: React.FC<DynamicFocusCardProps> = ({ 
  task, 
  onInteract 
}) => {
  if (!task) {
    // Default fallback
    task = {
      type: 'checkin',
      title: 'Check-in mit ARES',
      subtitle: 'Erzähle mir, wie es dir geht und was du heute vorhast.',
      xp: 20
    };
  }

  const config = taskConfig[task.type];
  const Icon = config.icon;

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      onClick={onInteract}
      className={cn(
        "relative w-full rounded-3xl overflow-hidden cursor-pointer",
        "shadow-xl",
        config.shadowColor,
        "active:scale-[0.98] transition-transform duration-200"
      )}
    >
      {/* Gradient Background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", config.gradient)} />
      
      {/* Noise Texture for Premium Look */}
      <div 
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      />
      
      {/* Content */}
      <div className="relative p-6 flex flex-col gap-4 text-white min-h-[160px]">
        {/* Top Row: Badge + Icon */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10">
              Priority
            </span>
            <span className="text-xs font-medium text-white/80">
              +{task.xp} XP
            </span>
          </div>
          
          <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Bottom: Title + Subtitle */}
        <div className="mt-auto">
          <h2 className="text-xl font-bold leading-tight mb-1">
            {task.title}
          </h2>
          <p className="text-white/80 text-sm font-medium line-clamp-2 pr-4">
            {task.subtitle}
          </p>
        </div>

        {/* Optional Progress Bar */}
        {task.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <motion.div 
              className="h-full bg-white/90"
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{ boxShadow: '0 0 8px rgba(255,255,255,0.5)' }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
