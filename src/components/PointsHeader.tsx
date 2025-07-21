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
      case 'Rookie': return <Star className="w-5 h-5" />;
      case 'Bronze': return <Award className="w-5 h-5" />;
      case 'Silver': return <Trophy className="w-5 h-5" />;
      case 'Gold': return <Crown className="w-5 h-5" />;
      case 'Platinum': return <Crown className="w-5 h-5" />;
      case 'Diamond': return <Crown className="w-5 h-5" />;
      case 'Master': return <Crown className="w-5 h-5" />;
      case 'Grandmaster': return <Crown className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm border-b border-border/50 px-4 py-3 mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center space-x-4">
          <div 
            className="flex items-center justify-center w-10 h-10 rounded-full border-2"
            style={{ 
              borderColor: getLevelColor(userPoints.level_name),
              backgroundColor: `${getLevelColor(userPoints.level_name)}15`
            }}
          >
            <div style={{ color: getLevelColor(userPoints.level_name) }}>
              {getLevelIcon(userPoints.level_name)}
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className="text-xs font-semibold"
                style={{ 
                  backgroundColor: `${getLevelColor(userPoints.level_name)}20`,
                  color: getLevelColor(userPoints.level_name),
                  border: `1px solid ${getLevelColor(userPoints.level_name)}40`
                }}
              >
                {userPoints.level_name}
              </Badge>
              <span className="text-sm font-medium text-muted-foreground">
                Level {userPoints.current_level}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {userPoints.total_points} Punkte insgesamt
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 min-w-0 flex-1 max-w-xs ml-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bis zum nächsten Level</span>
              <span className="font-medium">
                {currentLevelProgress}/{userPoints.points_to_next_level}
              </span>
            </div>
            <Progress 
              value={(currentLevelProgress / userPoints.points_to_next_level) * 100} 
              className="h-2"
              style={{
                background: `${getLevelColor(userPoints.level_name)}20`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};