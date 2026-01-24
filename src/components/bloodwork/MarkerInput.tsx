// Marker Input Component
// Reusable input for individual bloodwork markers with live status feedback

import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkerStatusBadge } from './MarkerStatusBadge';
import { ReferenceRange, MarkerEvaluation, MARKER_DISPLAY_NAMES } from './types';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkerInputProps {
  markerKey: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  referenceRange?: ReferenceRange;
  evaluation?: MarkerEvaluation | null;
  gender?: 'male' | 'female';
  disabled?: boolean;
  className?: string;
}

export function MarkerInput({
  markerKey,
  value,
  onChange,
  referenceRange,
  evaluation,
  gender = 'male',
  disabled = false,
  className
}: MarkerInputProps) {
  const displayName = MARKER_DISPLAY_NAMES[markerKey] || markerKey;
  const unit = referenceRange?.unit || '';

  // Get gender-specific or default ranges for display
  const normalMin = (gender === 'male' ? referenceRange?.male_normal_min : referenceRange?.female_normal_min) 
    ?? referenceRange?.normal_min;
  const normalMax = (gender === 'male' ? referenceRange?.male_normal_max : referenceRange?.female_normal_max) 
    ?? referenceRange?.normal_max;
  const optimalMin = (gender === 'male' ? referenceRange?.male_optimal_min : referenceRange?.female_optimal_min) 
    ?? referenceRange?.optimal_min;
  const optimalMax = (gender === 'male' ? referenceRange?.male_optimal_max : referenceRange?.female_optimal_max) 
    ?? referenceRange?.optimal_max;

  const hasValue = value !== null && value !== undefined && value !== '';
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Label with tooltip */}
      <div className="flex items-center gap-1.5">
        <Label htmlFor={markerKey} className="text-sm font-medium">
          {displayName}
        </Label>
        {referenceRange?.description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{referenceRange.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Input with unit */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <NumericInput
            id={markerKey}
            value={value ?? ''}
            onChange={onChange}
            placeholder="—"
            disabled={disabled}
            className={cn(
              'pr-16',
              evaluation && hasValue && {
                'border-emerald-500 focus:ring-emerald-500': evaluation.status === 'optimal',
                'border-blue-500 focus:ring-blue-500': evaluation.status === 'normal',
                'border-amber-500 focus:ring-amber-500': evaluation.status === 'borderline_low' || evaluation.status === 'borderline_high',
                'border-red-500 focus:ring-red-500': evaluation.status === 'low' || evaluation.status === 'high'
              }
            )}
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit}
            </span>
          )}
        </div>

        {/* Live status badge */}
        {evaluation && hasValue && numericValue !== null && !isNaN(numericValue) && (
          <MarkerStatusBadge status={evaluation.status} size="sm" />
        )}
      </div>

      {/* Reference range hint */}
      {(normalMin !== null || optimalMin !== null) && (
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {normalMin !== null && normalMax !== null && (
            <span>Referenz: {normalMin}–{normalMax} {unit}</span>
          )}
          {optimalMin !== null && optimalMax !== null && (
            <span className="text-emerald-600 dark:text-emerald-400">
              Optimal: {optimalMin}–{optimalMax} {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
