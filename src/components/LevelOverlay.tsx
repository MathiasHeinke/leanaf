import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Trophy, Award } from 'lucide-react';

interface UserPoints {
  total_points: number;
  current_level: number;
  level_name: string;
  points_to_next_level: number;
}

interface LevelOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: UserPoints;
  getLevelColor: (levelName: string) => string;
}

export const LevelOverlay = ({ isOpen, onClose, userPoints, getLevelColor }: LevelOverlayProps) => {
  // Calculate level progression based on actual level requirements
  const getMaxPointsForLevel = (level: number): number => {
    switch (level) {
      case 1: return 100;
      case 2: return 200;
      case 3: return 350;
      case 4: return 550;
      case 5: return 800;
      case 6: return 1100;
      case 7: return 1500;
      default: return 500;
    }
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

  const getLevelIcon = (levelName: string) => {
    switch (levelName) {
      case 'Rookie': return <Star className="w-6 h-6" />;
      case 'Bronze': return <Award className="w-6 h-6" />;
      case 'Silver': return <Trophy className="w-6 h-6" />;
      case 'Gold': return <Crown className="w-6 h-6" />;
      case 'Platinum': return <Crown className="w-6 h-6" />;
      case 'Diamond': return <Crown className="w-6 h-6" />;
      case 'Master': return <Crown className="w-6 h-6" />;
      case 'Grandmaster': return <Crown className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  const getNextLevelName = (currentLevel: number): string => {
    const levelNames = ['', 'Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
    if (currentLevel < levelNames.length - 1) {
      return levelNames[currentLevel + 1];
    }
    return 'Grandmaster';
  };

  const displayLevelColor = getLevelColor(userPoints.level_name);
  const nextLevelName = getNextLevelName(userPoints.current_level);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Level Progress</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Level Display */}
          <div className="flex flex-col items-center space-y-3">
            <div 
              className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all duration-300"
              style={{ 
                borderColor: displayLevelColor,
                backgroundColor: `${displayLevelColor}15`
              }}
            >
              {/* Progress ring */}
              <div 
                className="absolute inset-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  background: `conic-gradient(from -90deg, #FFD700 ${levelProgress * 3.6}deg, transparent ${levelProgress * 3.6}deg)`,
                  opacity: levelProgress > 0 ? 0.6 : 0
                }}
              />
              
              {/* Level Icon */}
              <div 
                className="relative z-10 font-bold"
                style={{ 
                  color: '#FFD700',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                }}
              >
                {getLevelIcon(userPoints.level_name)}
              </div>
            </div>
            
            <div className="text-center">
              <Badge 
                variant="outline"
                className="text-sm font-semibold px-3 py-1 bg-background/90 backdrop-blur-sm border-2"
                style={{ 
                  color: displayLevelColor,
                  borderColor: displayLevelColor,
                }}
              >
                {userPoints.level_name}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Level {userPoints.current_level}
              </p>
            </div>
          </div>

          {/* Points Display */}
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-foreground">
              {userPoints.total_points.toLocaleString()} 
              <span className="text-sm text-muted-foreground ml-1">Punkte</span>
            </div>
          </div>

          {/* Progress to Next Level */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Fortschritt zu Level {userPoints.current_level + 1}</span>
              <span className="text-sm text-muted-foreground">
                {currentLevelProgress}/{maxPointsForCurrentLevel}
              </span>
            </div>
            
            <Progress 
              value={levelProgress} 
              className="h-3"
              style={{
                background: `${displayLevelColor}20`
              }}
            />
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {userPoints.points_to_next_level} Punkte bis zu <span className="font-medium">{nextLevelName}</span>
              </p>
            </div>
          </div>

          {/* Achievement Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-center">Deine Erfolge</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg">{userPoints.current_level}</div>
                <div className="text-muted-foreground">Erreichte Level</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{userPoints.total_points}</div>
                <div className="text-muted-foreground">Gesammelte Punkte</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};