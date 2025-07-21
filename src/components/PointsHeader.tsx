
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Trophy, Award } from 'lucide-react';
import { usePointsSystem } from '@/hooks/usePointsSystem';

export const PointsHeader = () => {
  const { userPoints, loading, getLevelColor } = usePointsSystem();

  if (loading || !userPoints) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const progressPercentage = ((userPoints.total_points % 100) / 100) * 100;
  const nextLevelPoints = userPoints.points_to_next_level;
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

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm border-b border-border/50 px-4 py-2">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center space-x-3">
          <div 
            className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${isLevelUp ? 'animate-bounce' : ''}`}
            style={{ 
              borderColor: getLevelColor(userPoints.level_name),
              backgroundColor: `${getLevelColor(userPoints.level_name)}20`
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
            
            {/* Icon with enhanced visibility */}
            <div 
              className={`relative z-10 font-bold transition-all duration-300 ${isLevelUp ? 'animate-pulse text-yellow-300' : ''}`}
              style={{ 
                color: userPoints.level_name === 'Rookie' ? '#FFD700' : getLevelColor(userPoints.level_name),
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
              }}
            >
              {getLevelIcon(userPoints.level_name)}
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className="text-xs font-semibold px-2 py-0"
                style={{ 
                  backgroundColor: `${getLevelColor(userPoints.level_name)}20`,
                  color: getLevelColor(userPoints.level_name),
                  border: `1px solid ${getLevelColor(userPoints.level_name)}40`
                }}
              >
                {userPoints.level_name}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                Lvl {userPoints.current_level}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {userPoints.total_points} Punkte
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-[160px] ml-2">
          <div className="flex-1 space-y-0.5">
            <Progress 
              value={(currentLevelProgress / userPoints.points_to_next_level) * 100} 
              className="h-2"
              style={{
                background: `${getLevelColor(userPoints.level_name)}20`
              }}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate text-[10px]">Nächstes Level</span>
              <span className="font-medium text-[10px]">
                {currentLevelProgress}/{userPoints.points_to_next_level}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
