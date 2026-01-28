import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StackScoreCardProps {
  score: number;              // 0-100
  essentialsActive: number;
  essentialsTotal: number;
  className?: string;
}

/**
 * StackScoreCard - Gamification component showing stack quality as a donut chart
 * Displays the percentage of essential supplements activated
 */
export const StackScoreCard: React.FC<StackScoreCardProps> = ({
  score,
  essentialsActive,
  essentialsTotal,
  className,
}) => {
  // SVG Donut Chart calculations
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color based on score
  const scoreColor = score >= 80 
    ? 'text-green-500' 
    : score >= 50 
      ? 'text-amber-500' 
      : 'text-red-500';

  return (
    <Card className={cn("bg-card/50 snap-start min-w-[160px] shrink-0", className)}>
      <CardContent className="p-4 flex items-center gap-3">
        {/* Donut Chart */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn("transition-all duration-500", scoreColor)}
            />
          </svg>
          {/* Center percentage */}
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {score}%
          </span>
        </div>

        {/* Text content */}
        <div className="min-w-0">
          <p className="text-2xl font-bold">
            {essentialsActive}/{essentialsTotal}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Stack Score
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StackScoreCard;
