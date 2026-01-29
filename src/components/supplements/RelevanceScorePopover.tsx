/**
 * RelevanceScorePopover - Shows detailed breakdown of personalized score
 * Displays base score, modifiers, and explanations (Extended v2)
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Activity, Users, Dumbbell, Beaker, Heart } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { RelevanceScoreResult } from '@/types/relevanceMatrix';
import { getScoreTierConfig } from '@/lib/calculateRelevanceScore';

interface RelevanceScorePopoverProps {
  scoreResult: RelevanceScoreResult;
  supplementName: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Categorize reasons into groups for better display
 */
function categorizeReasons(reasons: string[]): {
  context: string[];
  goals: string[];
  demographics: string[];
  bloodwork: string[];
  peptides: string[];
  other: string[];
} {
  const categories = {
    context: [] as string[],
    goals: [] as string[],
    demographics: [] as string[],
    bloodwork: [] as string[],
    peptides: [] as string[],
    other: [] as string[],
  };

  for (const reason of reasons) {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('trt') || lowerReason.includes('natural') || lowerReason.includes('peptide ohne') || lowerReason.includes('glp-1') || lowerReason.includes('phase')) {
      categories.context.push(reason);
    } else if (lowerReason.includes('ziel') || lowerReason.includes('defizit') || lowerReason.includes('aufbau')) {
      categories.goals.push(reason);
    } else if (lowerReason.includes('alter') || lowerReason.includes('weiblich') || lowerReason.includes('männlich')) {
      categories.demographics.push(reason);
    } else if (lowerReason.includes('blutwert')) {
      categories.bloodwork.push(reason);
    } else if (lowerReason.includes('protokoll') || lowerReason.includes('synergie')) {
      categories.peptides.push(reason);
    } else {
      categories.other.push(reason);
    }
  }

  return categories;
}

/**
 * Get icon for category
 */
function getCategoryIcon(category: string) {
  switch (category) {
    case 'context':
      return <Activity className="h-3 w-3" />;
    case 'goals':
      return <Dumbbell className="h-3 w-3" />;
    case 'demographics':
      return <Users className="h-3 w-3" />;
    case 'bloodwork':
      return <Heart className="h-3 w-3" />;
    case 'peptides':
      return <Beaker className="h-3 w-3" />;
    default:
      return null;
  }
}

/**
 * Get label for category
 */
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'context':
      return 'Protokoll-Modus';
    case 'goals':
      return 'Ziele & Status';
    case 'demographics':
      return 'Demografie';
    case 'bloodwork':
      return 'Blutwerte';
    case 'peptides':
      return 'Peptide & Synergien';
    default:
      return 'Sonstige';
  }
}

export const RelevanceScorePopover: React.FC<RelevanceScorePopoverProps> = ({
  scoreResult,
  supplementName,
  className,
  children,
}) => {
  const tierConfig = getScoreTierConfig(scoreResult.score);
  const scoreDelta = scoreResult.score - scoreResult.baseScore;
  const categorizedReasons = categorizeReasons(scoreResult.reasons);
  
  // Get non-empty categories
  const activeCategories = Object.entries(categorizedReasons)
    .filter(([_, reasons]) => reasons.length > 0);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-auto p-1 gap-1', className)}
          >
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              tierConfig.bgClass,
              tierConfig.textClass
            )}>
              <span>{tierConfig.icon}</span>
              <span>{scoreResult.score.toFixed(1)}</span>
            </div>
          </Button>
        )}
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="bottom"
      >
        {/* Header */}
        <div className={cn('p-3 rounded-t-lg', tierConfig.bgClass)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Dein ARES Score</p>
              <p className={cn('text-2xl font-bold', tierConfig.textClass)}>
                {scoreResult.score.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground">/10</span>
              </p>
            </div>
            <div className="text-right">
              <Badge className={cn('text-xs', tierConfig.bgClass, tierConfig.textClass)}>
                {tierConfig.labelShort}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {/* Base Score */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Basis-Score ({supplementName})</span>
            <span className="font-medium">{scoreResult.baseScore.toFixed(1)}</span>
          </div>
          
          {/* Categorized Modifiers */}
          {activeCategories.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                {activeCategories.map(([category, reasons]) => (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {getCategoryIcon(category)}
                      <span>{getCategoryLabel(category)}</span>
                    </div>
                    {reasons.map((reason, idx) => {
                      const isPositive = reason.includes('+');
                      const isNegative = reason.includes('-') && !reason.includes('+');
                      
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between text-sm pl-4"
                        >
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            {isPositive ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : isNegative ? (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            ) : (
                              <Minus className="h-3 w-3 text-muted-foreground" />
                            )}
                            {reason.split(':')[0]}
                          </span>
                          <span className={cn(
                            'font-medium',
                            isPositive && 'text-green-600',
                            isNegative && 'text-red-600'
                          )}>
                            {reason.split(':')[1]?.trim() || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Warnings */}
          {scoreResult.warnings.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                {scoreResult.warnings.map((warning, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20"
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      {warning}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Summary */}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Gesamt</span>
            <div className="flex items-center gap-2">
              {scoreDelta !== 0 && (
                <span className={cn(
                  'text-xs',
                  scoreDelta > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  ({scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)})
                </span>
              )}
              <span className={cn('font-bold', tierConfig.textClass)}>
                {scoreResult.score.toFixed(1)}
              </span>
            </div>
          </div>
          
          {/* Personalization indicator */}
          {scoreResult.isPersonalized && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Personalisiert basierend auf deinem Profil, Blutwerten, Peptiden und Zielen.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RelevanceScorePopover;
