/**
 * AresTopNav - Clean Top Navigation
 * Menu trigger (left), ARES avatar with glow (right)
 */

import React from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { COACH_REGISTRY } from '@/lib/coachRegistry';

interface AresTopNavProps {
  onOpenChat: () => void;
}

export const AresTopNav: React.FC<AresTopNavProps> = ({ onOpenChat }) => {
  const aresCoach = COACH_REGISTRY.ares;

  return (
    <div className="fixed top-[3px] left-0 right-0 z-40 pt-2 px-4 pb-2 bg-gradient-to-b from-background/95 via-background/80 to-transparent backdrop-blur-sm">
      <div className="flex justify-between items-center max-w-md mx-auto">
        
        {/* Left: Sidebar Trigger */}
        <SidebarTrigger className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors" />

        {/* Center: Empty for clean look */}
        <div className="flex-1" />

        {/* Right: ARES Avatar Trigger */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onOpenChat}
          className="relative p-0.5 rounded-full group"
        >
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary to-primary-glow rounded-full blur-sm opacity-40 group-hover:opacity-70 transition-opacity" />
          
          {/* Avatar Container */}
          <Avatar className="relative w-10 h-10 border-2 border-background shadow-lg">
            <AvatarImage src={aresCoach.imageUrl} alt="ARES" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              <Zap className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          {/* Online Indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-background rounded-full shadow-sm" />
        </motion.button>
      </div>
    </div>
  );
};
