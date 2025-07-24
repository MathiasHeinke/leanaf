import React, { useState } from 'react';
import { Crown, Star, Trophy, Award } from 'lucide-react';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { LevelOverlay } from './LevelOverlay';

export const LevelBadge = () => {
  const { userPoints, loading, getLevelColor } = usePointsSystem();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  if (loading || !userPoints) {
    return (
      <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
    );
  }

  const getLevelIcon = (levelName: string) => {
    switch (levelName) {
      case 'Rookie': return <Star className="w-3 h-3" />;
      case 'Bronze': return <Award className="w-3 h-3" />;
      case 'Silver': return <Trophy className="w-3 h-3" />;
      case 'Gold': return <Crown className="w-3 h-3" />;
      case 'Platinum': return <Crown className="w-3 h-3" />;
      case 'Diamond': return <Crown className="w-3 h-3" />;
      case 'Master': return <Crown className="w-3 h-3" />;
      case 'Grandmaster': return <Crown className="w-3 h-3" />;
      default: return <Star className="w-3 h-3" />;
    }
  };

  const displayLevelColor = getLevelColor(userPoints.level_name);

  // Calculate progress for the ring - same logic as LevelOverlay
  const getMaxPointsForLevel = (level: number): number => {
    if (level === 1) return 100;
    if (level === 2) return 200;
    if (level === 3) return 350;
    if (level === 4) return 550;
    if (level === 5) return 800;
    if (level === 6) return 1100;
    if (level === 7) return 1500;
    if (level >= 8) return 2000 + ((level - 8) * 500);
    return 100;
  };

  const maxPointsForCurrentLevel = getMaxPointsForLevel(userPoints.current_level);
  
  let minPointsForCurrentLevel = 0;
  if (userPoints.current_level === 1) {
    minPointsForCurrentLevel = 0;
  } else if (userPoints.current_level === 2) {
    minPointsForCurrentLevel = 100;
  } else if (userPoints.current_level === 3) {
    minPointsForCurrentLevel = 300;
  } else if (userPoints.current_level === 4) {
    minPointsForCurrentLevel = 650;
  } else if (userPoints.current_level === 5) {
    minPointsForCurrentLevel = 1200;
  } else if (userPoints.current_level === 6) {
    minPointsForCurrentLevel = 2000;
  } else if (userPoints.current_level === 7) {
    minPointsForCurrentLevel = 3100;
  } else if (userPoints.current_level >= 8) {
    minPointsForCurrentLevel = 4600 + ((userPoints.current_level - 8) * 500);
  }
  
  const pointsEarnedInCurrentLevel = userPoints.total_points - minPointsForCurrentLevel;
  const currentLevelProgress = Math.max(0, Math.min(pointsEarnedInCurrentLevel, maxPointsForCurrentLevel));
  const levelProgress = (currentLevelProgress / maxPointsForCurrentLevel) * 100;

  return (
    <>
      <button
        onClick={() => setIsOverlayOpen(true)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 hover:scale-110"
        title={`Level ${userPoints.current_level} - ${userPoints.level_name} (${Math.round(levelProgress)}%)`}
      >
        {/* Base Circle - consistent with level badge styling */}
        <div 
          className="absolute inset-0 w-8 h-8 rounded-full border-2 transition-all duration-500"
          style={{ 
            borderColor: displayLevelColor,
            backgroundColor: displayLevelColor
          }}
        />
        
        {/* Progress Segment - yellow/gold fill from top */}
        <div 
          className="absolute inset-0 w-8 h-8 rounded-full overflow-hidden transition-all duration-500"
          style={{
            background: `conic-gradient(from -90deg, #FFD700 ${levelProgress * 3.6}deg, transparent ${levelProgress * 3.6}deg)`,
            opacity: levelProgress > 0 ? 0.6 : 0
          }}
        />

        {/* Level Icon */}
        <div 
          className="relative z-10 font-bold transition-all duration-300"
          style={{ 
            color: '#FFD700',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
          }}
        >
          {getLevelIcon(userPoints.level_name)}
        </div>
      </button>

      <LevelOverlay 
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        userPoints={userPoints}
        getLevelColor={getLevelColor}
      />
    </>
  );
};