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

  return (
    <>
      <button
        onClick={() => setIsOverlayOpen(true)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 hover:scale-110"
        style={{ 
          borderColor: displayLevelColor,
          backgroundColor: `${displayLevelColor}15`
        }}
        title={`Level ${userPoints.current_level} - ${userPoints.level_name}`}
      >
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