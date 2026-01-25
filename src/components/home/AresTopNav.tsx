/**
 * AresTopNav - Clean Top Navigation with Stats Popover
 * Menu trigger (left), ARES avatar with stats overlay (right)
 */

import React, { useState } from 'react';
import { Zap, Crown, Trophy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { COACH_REGISTRY } from '@/lib/coachRegistry';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { cn } from '@/lib/utils';

interface AresTopNavProps {
  onOpenChat: () => void;
}

// Get min points for a level (same logic as sidebar)
const getMinPointsForLevel = (level: number): number => {
  const thresholds = [0, 100, 300, 600, 1100, 1800, 3100, 4600];
  if (level <= 7) return thresholds[level - 1] || 0;
  return 4600 + ((level - 8) * 500);
};

// Get max points for a level
const getMaxPointsForLevel = (level: number): number => {
  const thresholds = [100, 300, 600, 1100, 1800, 3100, 4600];
  if (level < 7) return thresholds[level] || 100;
  if (level === 7) return 4600;
  return 4600 + ((level - 7) * 500);
};

export const AresTopNav: React.FC<AresTopNavProps> = ({ onOpenChat }) => {
  const aresCoach = COACH_REGISTRY.ares;
  const { userPoints } = usePointsSystem();
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(false);

  // Calculate progress percentage
  const minPoints = getMinPointsForLevel(userPoints?.current_level || 1);
  const maxPoints = getMaxPointsForLevel(userPoints?.current_level || 1);
  const totalRange = maxPoints - minPoints;
  const currentProgress = (userPoints?.total_points || 0) - minPoints;
  const progressPercent = totalRange > 0 ? Math.min((currentProgress / totalRange) * 100, 100) : 0;

  // Check if high-level user (show crown)
  const isHighLevel = ['Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'].includes(userPoints?.level_name || '');

  const handleAvatarClick = () => {
    setShowStats(prev => !prev);
  };

  const handleGoToAchievements = () => {
    setShowStats(false);
    navigate('/achievements');
  };

  // Close popover when clicking outside
  const handleBackdropClick = () => {
    setShowStats(false);
  };

  return (
    <>
      <div className="fixed top-[3px] left-0 right-0 z-40 pt-2 px-4 pb-2 bg-gradient-to-b from-background/95 via-background/80 to-transparent backdrop-blur-sm">
        <div className="flex justify-between items-center max-w-md mx-auto">
          
          {/* Left: Sidebar Trigger */}
          <SidebarTrigger className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors" />

          {/* Center: Empty for clean look */}
          <div className="flex-1" />

          {/* Right: ARES Avatar Trigger */}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleAvatarClick}
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

      {/* Stats Popover Overlay */}
      <AnimatePresence>
        {showStats && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
            />
            
            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed top-16 right-4 z-50 w-72 p-4 bg-card border border-border rounded-2xl shadow-2xl"
            >
              {/* Header with Level */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20"
                )}>
                  {isHighLevel ? (
                    <Crown className="w-6 h-6 text-primary" />
                  ) : (
                    <Zap className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">
                    Level {userPoints?.current_level || 1} {userPoints?.level_name || 'Rookie'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {(userPoints?.total_points || 0).toLocaleString('de-DE')} Punkte
                  </p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Fortschritt</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Noch {(userPoints?.points_to_next_level || 0).toLocaleString('de-DE')} Punkte bis Level {(userPoints?.current_level || 1) + 1}
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-border mb-3" />

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Achievements Link */}
                <button
                  onClick={handleGoToAchievements}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">
                    Erfolge & Abzeichen
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                {/* Chat with ARES */}
                <button
                  onClick={() => {
                    setShowStats(false);
                    onOpenChat();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">
                    Mit ARES chatten
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
