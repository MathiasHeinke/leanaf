
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
  variant = 'secondary'
}: PointsBadgeProps) => {
  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant={variant}
        className={`${animated ? 'animate-pulse' : ''}`}
      >
        {icon} +{points}P
      </Badge>
      {bonusPoints && bonusPoints > 0 && (
        <Badge 
          variant="outline"
          className={`text-yellow-600 border-yellow-300 bg-yellow-50 ${animated ? 'animate-bounce' : ''}`}
        >
          ⭐ +{bonusPoints}BP
        </Badge>
      )}
    </div>
  );
};
