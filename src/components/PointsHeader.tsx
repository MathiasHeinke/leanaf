
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Trophy, Award } from 'lucide-react';
import { usePointsSystem } from '@/hooks/usePointsSystem';

export const PointsHeader = () => {
  const { userPoints, loading, getLevelColor } = usePointsSystem();

  if (loading || !userPoints) {
    return (
      <div className="bg-card/30 border-b border-border/30 py-1">
        <div className="container mx-auto px-3 max-w-sm flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-9 h-9 sm:w-8 sm:h-8 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Calculate level progression based on actual level requirements
  const getMaxPointsForLevel = (level: number): number => {
    // The points required for each level, based on the database logic
    switch (level) {
      case 1: return 100;  // Rookie: 0-99 points (100 to reach level 2)
      case 2: return 200;  // Bronze: 100-299 points (200 to reach level 3)
      case 3: return 350;  // Silver: 300-649 points (350 to reach level 4)
      case 4: return 550;  // Gold: 650-1199 points (550 to reach level 5)
      case 5: return 800;  // Platinum: 1200-1999 points (800 to reach level 6)
      case 6: return 1100; // Diamond: 2000-3099 points (1100 to reach level 7)
      case 7: return 1500; // Master: 3100-4599 points (1500 to reach level 8)
      default: return 500; // Grandmaster: Level 8+ requires 500 points per level
    }
  };
  
  // Get the maximum points needed for the current level
  const maxPointsForCurrentLevel = getMaxPointsForLevel(userPoints.current_level);
  
  // Calculate progress in the current level based on points_to_next_level
  const currentLevelProgress = maxPointsForCurrentLevel - userPoints.points_to_next_level;
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

  const levelProgress = (currentLevelProgress / maxPointsForCurrentLevel) * 100;
  const isLevelUp = levelProgress >= 100;

  const displayLevelColor = getLevelColor(userPoints.level_name);

  return (
    <div className="border-b border-border/30 py-1">
        <div className="container mx-auto px-3 max-w-sm flex items-center justify-between">
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
              <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-primary to-primary-glow opacity-75" />
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
          
          {/* Level Badge with improved readability */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Badge 
                variant="outline"
                className="text-xs font-semibold px-2 py-0.5 sm:py-0 bg-background/90 backdrop-blur-sm border-2"
                style={{ 
                  color: displayLevelColor,
                  borderColor: displayLevelColor,
                  backgroundColor: 'hsl(var(--background) / 0.9)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {userPoints.level_name}
              </Badge>
              <span className="text-xs font-medium text-foreground/80 bg-background/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                Lvl {userPoints.current_level}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Progress Bar + Points in same line */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Progress 
            value={levelProgress} 
            className="h-2.5 sm:h-2 w-16 sm:w-20"
            style={{
              background: `${displayLevelColor}20`
            }}
          />
          <span className="font-medium text-xs sm:text-xs text-foreground whitespace-nowrap bg-background/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {Math.max(0, currentLevelProgress)}/{maxPointsForCurrentLevel}
          </span>
        </div>
      </div>
    </div>
  );
};
