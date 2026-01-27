/**
 * RecipePopover - Premium popover showing recipe details
 * Displays ingredients, steps, effort, and cost
 */

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, ChefHat, Clock, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/hooks/useMealAdvisor';

interface RecipePopoverProps {
  recipe: Recipe;
  title: string;
}

const effortLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Einfach', color: 'text-emerald-400' },
  medium: { label: 'Mittel', color: 'text-amber-400' },
  high: { label: 'Aufwändig', color: 'text-orange-400' },
};

const costLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Günstig', color: 'text-emerald-400' },
  medium: { label: 'Mittel', color: 'text-amber-400' },
  high: { label: 'Teurer', color: 'text-orange-400' },
};

export const RecipePopover: React.FC<RecipePopoverProps> = ({ recipe, title }) => {
  const effort = effortLabels[recipe.effort] || effortLabels.medium;
  const cost = costLabels[recipe.cost] || costLabels.medium;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
            "transition-colors duration-200"
          )}
          aria-label="Rezept anzeigen"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3 border-b border-border/50">
          <h4 className="font-semibold text-sm text-foreground truncate">{title}</h4>
        </div>

        <div className="p-4 space-y-4">
          {/* Ingredients */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              📋 Zutaten
            </h5>
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ChefHat className="w-3 h-3" />
              Zubereitung
            </h5>
            <ol className="space-y-1.5">
              {recipe.steps.map((step, idx) => (
                <li key={idx} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-muted-foreground font-medium min-w-[16px]">{idx + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Effort & Cost */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className={effort.color}>{effort.label}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Euro className="w-3 h-3 text-muted-foreground" />
              <span className={cost.color}>{cost.label}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
