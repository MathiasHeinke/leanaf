
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Trophy, Award } from 'lucide-react';
import { usePointsSystem } from '@/hooks/usePointsSystem';

export const PointsHeader = () => {
  const { userPoints, loading, getLevelColor } = usePointsSystem();

  if (loading || !userPoints) {
    return (
      <div className="bg-card/30 border-b border-border/30 px-3 py-3 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-9 h-9 sm:w-8 sm:h-8 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const currentLevelProgress = userPoints.total_points - (userPoints.points_to_next_level - 100);
  
  const getLevelIcon = (levelName: string) => {
    switch (levelName) {
      case 'Rookie': return <Star className="w-4 h-4" />;
      case 'Bronze': return <Award className="w-4 h-4" />;
      case 'Silver': return <Trophy className="w-4 h-4" />;
      case 'Gold': return <Crown className="w-4 h-4" />;
      case 'Platinum': return <Crown className="w-4 h-4" />;
      case 'Diamond': return <Crown className="w-4 h-4" />;
      case 'Master': return <Crown className="w-4 h-4" />;
      case 'Grandmaster': return <Crown className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const levelProgress = (currentLevelProgress / userPoints.points_to_next_level) * 100;
  const isLevelUp = levelProgress >= 100;

  // Improved color for Rookie level with better contrast
  const getRookieLevelColor = () => {
    return 'hsl(220, 15%, 45%)'; // Better contrast for light mode
  };

  const displayLevelColor = userPoints.level_name === 'Rookie' ? getRookieLevelColor() : getLevelColor(userPoints.level_name);

  return (
    <div className="border-b border-border/30 px-3 py-3 sm:px-4 sm:py-2">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* Left Side - Level Icon + Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div 
            className={`relative flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-300 ${isLevelUp ? 'animate-bounce' : ''}`}
            style={{ 
              borderColor: displayLevelColor,
              backgroundColor: `${displayLevelColor}15`
            }}
          >
            {/* Gold fill background based on progress */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-500 ease-out"
              style={{
                background: `conic-gradient(from 0deg, #FFD700 ${levelProgress * 3.6}deg, transparent ${levelProgress * 3.6}deg)`,
                opacity: levelProgress > 0 ? 0.6 : 0
              }}
            />
            
            {/* Level up celebration effect */}
            {isLevelUp && (
              <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-yellow-400 to-orange-400 opacity-75" />
            )}
            
            {/* Gold Star Icon */}
            <div 
              className={`relative z-10 font-bold transition-all duration-300 ${isLevelUp ? 'animate-pulse' : ''}`}
              style={{ 
                color: '#FFD700',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
              }}
            >
              {getLevelIcon(userPoints.level_name)}
            </div>
          </div>
          
          {/* Restored previous Badge design with better visibility for Rookie */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Badge 
                variant="secondary" 
                className="text-xs font-semibold px-2 py-0.5 sm:py-0"
                style={{ 
                  backgroundColor: userPoints.level_name === 'Rookie' ? 'hsl(220, 15%, 92%)' : `${displayLevelColor}20`,
                  color: displayLevelColor,
                  border: `1px solid ${displayLevelColor}40`
                }}
              >
                {userPoints.level_name}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                Lvl {userPoints.current_level}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Progress Bar + Points in same line */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Progress 
            value={(currentLevelProgress / userPoints.points_to_next_level) * 100} 
            className="h-2.5 sm:h-2 w-16 sm:w-20"
            style={{
              background: `${displayLevelColor}20`
            }}
          />
          <span className="font-medium text-xs sm:text-xs text-foreground whitespace-nowrap">
            {currentLevelProgress}/{userPoints.points_to_next_level}
          </span>
        </div>
      </div>
    </div>
  );
};
