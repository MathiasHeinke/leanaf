import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronRight, Info, Sparkles, Lock, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetaCategory, META_CATEGORIES } from '@/lib/categoryMapping';
import { DYNAMIC_TIER_CONFIG } from '@/lib/calculateRelevanceScore';
import type { BaseNameGroup, ScoredSupplementItem } from '@/hooks/useDynamicallySortedSupplements';
import type { SupplementLibraryItem } from '@/types/supplementLibrary';

interface SupplementGroupRowProps {
  group: BaseNameGroup;
  activeVariantIds: Set<string>;
  onToggle: (item: ScoredSupplementItem, active: boolean) => void;
  onInfoClick?: (item: SupplementLibraryItem) => void;
  isLoading?: boolean;
}

/**
 * SupplementGroupRow - Expandable group showing base substance with variants
 * Groups like "Magnesium" expand to show Glycinat, Citrat, etc.
 */
export const SupplementGroupRow: React.FC<SupplementGroupRowProps> = ({
  group,
  activeVariantIds,
  onToggle,
  onInfoClick,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { baseName, variants, topScore, topVariant, dynamicTier } = group;

  // Check if any variant is active
  const activeVariants = variants.filter(v => activeVariantIds.has(v.id));
  const hasActiveVariant = activeVariants.length > 0;
  const hasMultipleVariants = variants.length > 1;

  // Use meta category from top variant
  const metaCategoryKey = getMetaCategory(topVariant.category);
  const metaCategory = META_CATEGORIES[metaCategoryKey];
  const tierConfig = DYNAMIC_TIER_CONFIG[dynamicTier];

  // Get score badge for a variant
  const getScoreBadge = (item: ScoredSupplementItem, compact = false) => {
    const { score, isPersonalized, isLimitedByMissingData } = item.scoreResult;
    
    return (
      <span 
        className={cn(
          "font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5",
          compact ? "text-[9px]" : "text-[10px]",
          tierConfig.bgClass,
          tierConfig.textClass,
          isLimitedByMissingData && "border border-dashed border-current/50 opacity-80"
        )}
      >
        {isPersonalized && !isLimitedByMissingData && <Sparkles className="h-2.5 w-2.5" />}
        {isLimitedByMissingData && <Lock className="h-2.5 w-2.5" />}
        {score.toFixed(1)}
      </span>
    );
  };

  // Handle toggle for single-variant groups
  const handleMainToggle = (checked: boolean) => {
    if (hasMultipleVariants) {
      // Expand to show variants on first interaction
      if (!isExpanded) {
        setIsExpanded(true);
        return;
      }
    }
    // Single variant - toggle it directly
    onToggle(topVariant, checked);
  };

  // Get variant name (the part after base name)
  const getVariantLabel = (item: ScoredSupplementItem): string => {
    const name = item.name;
    // Remove base name to get variant portion
    const basePattern = new RegExp(`^${baseName}\\s*[-–]?\\s*`, 'i');
    const variant = name.replace(basePattern, '').trim();
    return variant || name;
  };

  return (
    <div className="rounded-xl border overflow-hidden transition-all bg-card/50 border-border/30">
      {/* Main Row (Base Name) */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 transition-all cursor-pointer",
          hasActiveVariant && "bg-primary/5",
          hasMultipleVariants && "hover:bg-muted/50"
        )}
        onClick={() => hasMultipleVariants && setIsExpanded(!isExpanded)}
      >
        {/* Expand Icon (only if multiple variants) */}
        {hasMultipleVariants ? (
          <button
            className="w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon with meta category color */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
            hasActiveVariant ? "bg-primary/10" : metaCategory.bgClass
          )}
        >
          {metaCategory.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm">{baseName}</span>
            {getScoreBadge(topVariant)}
            {onInfoClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInfoClick(topVariant);
                }}
                className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                aria-label="Mehr Informationen"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            {hasMultipleVariants ? (
              <>
                <Package className="h-3 w-3 shrink-0" />
                <span>{variants.length} Varianten</span>
                {hasActiveVariant && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-primary">{activeVariants.length} aktiv</span>
                  </>
                )}
              </>
            ) : (
              <span className="truncate">
                {topVariant.default_dosage}{topVariant.default_unit}
              </span>
            )}
          </div>
        </div>

        {/* Toggle (only for single variants) */}
        {!hasMultipleVariants && (
          <div className="flex items-center shrink-0">
            <Switch
              checked={hasActiveVariant}
              onCheckedChange={handleMainToggle}
              disabled={isLoading}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Expand indicator for multi-variant groups */}
        {hasMultipleVariants && (
          <div className="text-xs text-muted-foreground shrink-0">
            {isExpanded ? 'Schließen' : 'Auswählen'}
          </div>
        )}
      </div>

      {/* Expanded Variants */}
      {isExpanded && hasMultipleVariants && (
        <div className="border-t border-border/30 bg-muted/20">
          {variants.map((variant) => {
            const isActive = activeVariantIds.has(variant.id);
            const variantLabel = getVariantLabel(variant);
            
            return (
              <div
                key={variant.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 ml-8 border-b last:border-b-0 border-border/20",
                  isActive && "bg-primary/5"
                )}
              >
                {/* Variant Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{variantLabel}</span>
                    {getScoreBadge(variant, true)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {variant.default_dosage}{variant.default_unit}
                  </div>
                </div>

                {/* Info Button */}
                {onInfoClick && (
                  <button
                    onClick={() => onInfoClick(variant)}
                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                    aria-label="Mehr Informationen"
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </button>
                )}

                {/* Toggle */}
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => onToggle(variant, checked)}
                  disabled={isLoading}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupplementGroupRow;
