import React from 'react';
import { cn } from '@/lib/utils';

interface EvidenceRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * EvidenceRing - Visual indicator for impact/evidence score
 * Green (8-10): Strong evidence
 * Yellow (5-7.9): Moderate evidence
 * Gray (<5): Experimental
 */
export const EvidenceRing: React.FC<EvidenceRingProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const normalizedScore = Math.min(10, Math.max(0, score));
  const percentage = (normalizedScore / 10) * 100;
  
  // Determine color based on score
  const getColor = () => {
    if (normalizedScore >= 8) return { stroke: 'stroke-green-500', text: 'text-green-500', bg: 'bg-green-500/10' };
    if (normalizedScore >= 5) return { stroke: 'stroke-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { stroke: 'stroke-muted-foreground/50', text: 'text-muted-foreground', bg: 'bg-muted/50' };
  };
  
  const colors = getColor();
  
  // Size configurations
  const sizeConfig = {
    sm: { container: 'w-8 h-8', strokeWidth: 3, fontSize: 'text-[10px]', radius: 12 },
    md: { container: 'w-12 h-12', strokeWidth: 3, fontSize: 'text-xs', radius: 18 },
    lg: { container: 'w-16 h-16', strokeWidth: 4, fontSize: 'text-sm', radius: 24 },
  };
  
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={cn('relative inline-flex items-center justify-center', config.container, className)}>
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={config.radius}
          fill="none"
          strokeWidth={config.strokeWidth}
          className="stroke-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="24"
          cy="24"
          r={config.radius}
          fill="none"
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(colors.stroke, 'transition-all duration-500')}
        />
      </svg>
      
      {/* Score label */}
      {showLabel && (
        <span className={cn('font-bold', config.fontSize, colors.text)}>
          {normalizedScore.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default EvidenceRing;
