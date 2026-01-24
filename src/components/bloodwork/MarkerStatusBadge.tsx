// Marker Status Badge Component
// Displays colored status badge for bloodwork markers

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MarkerStatus } from './types';
import { CheckCircle, AlertTriangle, XCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MarkerStatusBadgeProps {
  status: MarkerStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_CONFIG: Record<MarkerStatus, { 
  label: string; 
  className: string;
  icon: typeof CheckCircle;
}> = {
  optimal: {
    label: 'Optimal',
    className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: CheckCircle
  },
  normal: {
    label: 'Normal',
    className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: CheckCircle
  },
  borderline_low: {
    label: 'Grenzwertig niedrig',
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: ArrowDown
  },
  borderline_high: {
    label: 'Grenzwertig hoch',
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: ArrowUp
  },
  low: {
    label: 'Niedrig',
    className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
    icon: XCircle
  },
  high: {
    label: 'Hoch',
    className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
    icon: XCircle
  }
};

export function MarkerStatusBadge({ status, showIcon = true, size = 'sm', className }: MarkerStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium border',
        config.className,
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// Trend arrow component
interface TrendArrowProps {
  direction: 'improving' | 'stable' | 'declining';
  changePercent?: number;
  className?: string;
}

export function TrendArrow({ direction, changePercent, className }: TrendArrowProps) {
  const config = {
    improving: { 
      icon: ArrowUp, 
      className: 'text-emerald-500',
      label: 'Verbessert'
    },
    stable: { 
      icon: Minus, 
      className: 'text-muted-foreground',
      label: 'Stabil'
    },
    declining: { 
      icon: ArrowDown, 
      className: 'text-red-500',
      label: 'Verschlechtert'
    }
  };

  const { icon: Icon, className: colorClass, label } = config[direction];

  return (
    <div className={cn('flex items-center gap-1', colorClass, className)} title={label}>
      <Icon className="h-3 w-3" />
      {changePercent !== undefined && (
        <span className="text-xs">
          {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// Helper to get border class for cards
export function getStatusBorderClass(status: MarkerStatus): string {
  const borderClasses: Record<MarkerStatus, string> = {
    optimal: 'border-l-4 border-l-emerald-500',
    normal: 'border-l-4 border-l-blue-500',
    borderline_low: 'border-l-4 border-l-amber-500',
    borderline_high: 'border-l-4 border-l-amber-500',
    low: 'border-l-4 border-l-red-500',
    high: 'border-l-4 border-l-red-500'
  };
  return borderClasses[status];
}

// Status priority for sorting (higher = more urgent)
export function getStatusPriority(status: MarkerStatus): number {
  const priorities: Record<MarkerStatus, number> = {
    low: 5,
    high: 5,
    borderline_low: 3,
    borderline_high: 3,
    normal: 1,
    optimal: 0
  };
  return priorities[status];
}
