/**
 * RelevanceScorePopover - Shows detailed breakdown of personalized score
 * Displays base score, modifiers, and explanations
 */

import React from 'react';
import { Info, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles } from 'lucide-react';
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

export const RelevanceScorePopover: React.FC<RelevanceScorePopoverProps> = ({
  scoreResult,
  supplementName,
  className,
  children,
}) => {
  const tierConfig = getScoreTierConfig(scoreResult.score);
  const scoreDelta = scoreResult.score - scoreResult.baseScore;
  
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
          
          {/* Modifiers */}
          {scoreResult.reasons.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Modifikatoren
                </p>
                {scoreResult.reasons.map((reason, idx) => {
                  // Parse the modifier value from the reason string
                  const isPositive = reason.includes('+');
                  const isNegative = reason.includes('-') && !reason.includes('+');
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-sm"
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
                Personalisiert basierend auf deinem Profil, Blutwerten und aktiven Protokollen.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RelevanceScorePopover;
