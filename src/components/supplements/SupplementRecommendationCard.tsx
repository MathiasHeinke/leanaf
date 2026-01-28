import React from 'react';
import { Plus, Zap, FlaskConical, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SupplementLibraryItem, NecessityTier, EvidenceLevel } from '@/types/supplementLibrary';
import { EVIDENCE_LEVEL_CONFIG, TIMING_CONSTRAINT_ICONS, TIMING_CONSTRAINT_LABELS } from '@/types/supplementLibrary';
import { cn } from '@/lib/utils';

interface SupplementRecommendationCardProps {
  supplement: SupplementLibraryItem;
  onAdd: (supplement: SupplementLibraryItem) => void;
  isInStack?: boolean;
  variant?: 'essential' | 'optimizer' | 'specialist';
}

export const SupplementRecommendationCard: React.FC<SupplementRecommendationCardProps> = ({
  supplement,
  onAdd,
  isInStack = false,
  variant = 'optimizer',
}) => {
  const evidenceConfig = EVIDENCE_LEVEL_CONFIG[supplement.evidence_level as EvidenceLevel];
  const timingIcon = TIMING_CONSTRAINT_ICONS[supplement.timing_constraint] || '⏰';
  const timingLabel = TIMING_CONSTRAINT_LABELS[supplement.timing_constraint] || 'Flexibel';

  const isEssential = variant === 'essential';
  const isSpecialist = variant === 'specialist';

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isEssential && "border-primary/30 bg-primary/5",
        isSpecialist && "opacity-75 hover:opacity-100",
        isInStack && "border-green-500/30 bg-green-500/5"
      )}
    >
      <CardContent className={cn("p-4", isEssential && "p-5")}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            {/* Header with Impact Score */}
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                isEssential ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Zap className="h-3 w-3" />
                {supplement.impact_score.toFixed(1)}
              </div>
              
              {/* Evidence Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        evidenceConfig?.bgClass,
                        evidenceConfig?.textClass
                      )}
                    >
                      {evidenceConfig?.label || 'Moderat'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">{evidenceConfig?.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Name */}
            <h4 className={cn(
              "font-semibold text-foreground truncate",
              isEssential ? "text-base" : "text-sm"
            )}>
              {supplement.name}
            </h4>

            {/* Dosage & Timing */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{supplement.default_dosage} {supplement.default_unit}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {timingIcon} {timingLabel}
              </span>
            </div>

            {/* Brand Recommendation */}
            {supplement.brand_recommendation && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  {supplement.brand_recommendation}
                </Badge>
              </div>
            )}

            {/* Description (only for essentials) */}
            {isEssential && supplement.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                {supplement.description}
              </p>
            )}

            {/* Cost per day (if available) */}
            {supplement.cost_per_day_eur && (
              <div className="mt-2 text-xs text-muted-foreground">
                ~{supplement.cost_per_day_eur.toFixed(2)} €/Tag
              </div>
            )}
          </div>

          {/* Right: Add Button */}
          <div className="flex-shrink-0">
            {isInStack ? (
              <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">
                ✓ Im Stack
              </Badge>
            ) : (
              <Button
                size="sm"
                variant={isEssential ? "default" : "outline"}
                onClick={() => onAdd(supplement)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Compact version for lists
export const SupplementRecommendationRow: React.FC<SupplementRecommendationCardProps> = ({
  supplement,
  onAdd,
  isInStack = false,
}) => {
  const evidenceConfig = EVIDENCE_LEVEL_CONFIG[supplement.evidence_level as EvidenceLevel];

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Zap className="h-3 w-3" />
          {supplement.impact_score.toFixed(1)}
        </div>
        <div className="min-w-0">
          <span className="font-medium text-sm truncate">{supplement.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {supplement.default_dosage} {supplement.default_unit}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {supplement.brand_recommendation && (
          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
            {supplement.brand_recommendation}
          </Badge>
        )}
        {isInStack ? (
          <span className="text-xs text-green-600">✓</span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAdd(supplement)}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SupplementRecommendationCard;
