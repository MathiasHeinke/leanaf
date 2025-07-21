
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Trophy, Award } from 'lucide-react';
import { usePointsSystem } from '@/hooks/usePointsSystem';

export const PointsHeader = () => {
  const { userPoints, loading, getLevelColor } = usePointsSystem();

  if (loading || !userPoints) {
    return (
      <div className="bg-card/30 border-b border-border/30 py-3">
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

  // Theme-aware color for Rookie level
  const getRookieLevelColor = () => {
    return 'hsl(var(--muted-foreground))'; // Use theme-aware muted foreground
  };

  const displayLevelColor = userPoints.level_name === 'Rookie' ? getRookieLevelColor() : getLevelColor(userPoints.level_name);

  return (
    <div className="border-b border-border/30 py-3 sm:py-2">
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
            {/* Progress fill background based on progress */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-500 ease-out"
              style={{
                background: `conic-gradient(from 0deg, hsl(var(--primary)) ${levelProgress * 3.6}deg, transparent ${levelProgress * 3.6}deg)`,
                opacity: levelProgress > 0 ? 0.6 : 0
              }}
            />
            
            {/* Level up celebration effect */}
            {isLevelUp && (
              <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-primary to-primary-glow opacity-75" />
            )}
            
            {/* Level Icon with theme-aware styling */}
            <div 
              className={`relative z-10 font-bold transition-all duration-300 text-primary drop-shadow-sm ${isLevelUp ? 'animate-pulse' : ''}`}
            >
              {getLevelIcon(userPoints.level_name)}
            </div>
          </div>
          
          {/* Level Badge with theme-aware styling */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Badge 
                variant="secondary" 
                className="text-xs font-semibold px-2 py-0.5 sm:py-0"
                style={{ 
                  backgroundColor: userPoints.level_name === 'Rookie' ? 'hsl(var(--muted))' : `${displayLevelColor}20`,
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
