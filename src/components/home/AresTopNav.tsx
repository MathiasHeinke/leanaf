/**
 * AresTopNav - Clean Top Navigation
 * Menu trigger (left), right side empty for future elements
 */

import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const AresTopNav: React.FC = () => {
  return (
    <div className="fixed top-[3px] left-0 right-0 z-40 pt-2 px-4 pb-2 bg-gradient-to-b from-background/95 via-background/80 to-transparent backdrop-blur-sm">
      <div className="flex justify-between items-center max-w-md mx-auto">
        
        {/* Left: Sidebar Trigger */}
        <SidebarTrigger className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors" />

        {/* Center: Empty for clean look */}
        <div className="flex-1" />

        {/* Right: Placeholder - empty for future element */}
        <div className="w-10" />
      </div>
    </div>
  );
};
