
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PointsBadgeProps {
  points: number;
  bonusPoints?: number;
  icon: string;
  animated?: boolean;
  variant?: 'default' | 'secondary' | 'outline';
}

export const PointsBadge = ({ 
  points, 
  bonusPoints, 
  icon, 
  animated = false,
  variant = 'outline'
}: PointsBadgeProps) => {
  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant="outline"
        className={`bg-background/90 border-2 border-primary/50 text-foreground font-semibold backdrop-blur-sm ${animated ? 'animate-pulse' : ''}`}
      >
        {icon} +{points}P
      </Badge>
      {bonusPoints && bonusPoints > 0 && (
        <Badge 
          variant="outline"
          className={`bg-yellow-50/90 dark:bg-yellow-950/90 border-2 border-yellow-500/60 text-yellow-700 dark:text-yellow-300 font-semibold backdrop-blur-sm ${animated ? 'animate-bounce' : ''}`}
        >
          ⭐ +{bonusPoints}BP
        </Badge>
      )}
    </div>
  );
};
