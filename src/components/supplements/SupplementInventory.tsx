import React, { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SupplementGroupRow } from './SupplementGroupRow';
import { SupplementDetailSheet } from './SupplementDetailSheet';
import { MissingBloodworkBanner } from './MissingBloodworkBanner';
import { useUserStack, useSupplementToggle } from '@/hooks/useSupplementLibrary';
import { 
  useDynamicallySortedSupplements, 
  type ScoredSupplementItem,
  type BaseNameGroup 
} from '@/hooks/useDynamicallySortedSupplements';
import { useUserRelevanceContext } from '@/hooks/useUserRelevanceContext';
import { META_CATEGORIES, type MetaCategoryKey } from '@/lib/categoryMapping';
import { DYNAMIC_TIER_CONFIG } from '@/lib/calculateRelevanceScore';
import type { DynamicTier } from '@/types/relevanceMatrix';
import type { SupplementLibraryItem, UserStackItem } from '@/types/supplementLibrary';

interface SupplementInventoryProps {
  groupedByCategory: Record<string, UserStackItem[]>;
  onAdd?: () => void;
}

// Icons for dynamic tiers
const TIER_ICONS: Record<DynamicTier, string> = {
  essential: '🚨',
  optimizer: '🎯',
  niche: '💭',
};

/**
 * SupplementInventory - Blueprint Tab (Premium UX v3)
 * Shows supplements grouped by CALCULATED DYNAMIC TIER based on user context
 */
export const SupplementInventory: React.FC<SupplementInventoryProps> = ({
  groupedByCategory,
  onAdd,
}) => {
  const [activeTier, setActiveTier] = useState<DynamicTier>('essential');
  const [activeMetaCategory, setActiveMetaCategory] = useState<MetaCategoryKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState<ScoredSupplementItem | null>(null);

  // Use dynamic scoring hook - now with grouped output
  const { 
    essentialGroups, 
    optimizerGroups, 
    nicheGroups,
    tierCounts, 
    isLoading: libraryLoading 
  } = useDynamicallySortedSupplements();
  const { data: userStack } = useUserStack();
  const { toggleSupplement, isToggling } = useSupplementToggle();
  const { context } = useUserRelevanceContext();

  // Create a set of active supplement IDs for quick lookup
  const activeSupplementIds = useMemo(() => {
    return new Set(
      (userStack || [])
        .filter((s) => s.is_active && s.supplement_id)
        .map((s) => s.supplement_id)
    );
  }, [userStack]);

  // Get groups for active tier
  const tierGroups = useMemo((): BaseNameGroup[] => {
    switch (activeTier) {
      case 'essential':
        return essentialGroups;
      case 'optimizer':
        return optimizerGroups;
      case 'niche':
        return nicheGroups;
      default:
        return [];
    }
  }, [activeTier, essentialGroups, optimizerGroups, nicheGroups]);

  // Filter groups by meta category and search query
  const filteredGroups = useMemo(() => {
    let groups = tierGroups;
    
    // Meta-Kategorie-Filter: Keep groups that have at least one variant matching
    if (activeMetaCategory !== 'all') {
      const allowedCategories = META_CATEGORIES[activeMetaCategory].categories;
      groups = groups
        .map(group => ({
          ...group,
          variants: group.variants.filter(item =>
            allowedCategories.some(cat =>
              cat.toLowerCase() === (item.category || '').toLowerCase()
            )
          ),
        }))
        .filter(group => group.variants.length > 0);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups
        .map(group => ({
          ...group,
          variants: group.variants.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              group.baseName.toLowerCase().includes(query) ||
              item.category?.toLowerCase().includes(query) ||
              item.description?.toLowerCase().includes(query)
          ),
        }))
        .filter(group => group.variants.length > 0);
    }

    return groups;
  }, [tierGroups, activeMetaCategory, searchQuery]);

  // Count active groups per dynamic tier
  const dynamicTierCounts = useMemo(() => {
    const countActiveInGroups = (groups: BaseNameGroup[]): number => {
      return groups.filter(g => 
        g.variants.some(v => activeSupplementIds.has(v.id))
      ).length;
    };

    return {
      essential: { total: essentialGroups.length, active: countActiveInGroups(essentialGroups) },
      optimizer: { total: optimizerGroups.length, active: countActiveInGroups(optimizerGroups) },
      niche: { total: nicheGroups.length, active: countActiveInGroups(nicheGroups) },
    };
  }, [essentialGroups, optimizerGroups, nicheGroups, activeSupplementIds]);

  // Handle toggle
  const handleToggle = async (item: ScoredSupplementItem, activate: boolean) => {
    await toggleSupplement(item, activate);
  };

  const currentConfig = DYNAMIC_TIER_CONFIG[activeTier];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Supplement suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card/50"
        />
      </div>

      {/* Dynamic Tier Pills (Horizontal Scrollable) */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-hide">
        {(Object.keys(DYNAMIC_TIER_CONFIG) as DynamicTier[]).map((tier) => {
          const config = DYNAMIC_TIER_CONFIG[tier];
          const counts = dynamicTierCounts[tier];

          return (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all border snap-start shrink-0",
                activeTier === tier
                  ? "bg-foreground text-background border-foreground shadow-md"
                  : "bg-card text-muted-foreground border-border hover:bg-card/80"
              )}
            >
              <span className="text-base">{config.icon}</span>
              <span className="hidden sm:inline">{config.shortLabel}</span>
              <span className="text-xs opacity-70">
                {counts.active}/{counts.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Meta Category Pills (Wirkebenen) */}
      <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-hide">
        {/* "Alle" pill */}
        <button
          onClick={() => setActiveMetaCategory('all')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all border snap-start shrink-0",
            activeMetaCategory === 'all'
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
          )}
        >
          Alle
        </button>

        {/* Meta category pills */}
        {(Object.keys(META_CATEGORIES) as MetaCategoryKey[]).map((key) => {
          const meta = META_CATEGORIES[key];
          return (
            <button
              key={key}
              onClick={() => setActiveMetaCategory(key)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all border snap-start shrink-0",
                activeMetaCategory === key
                  ? cn("border-current", meta.bgClass, meta.textClass)
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              <span>{meta.emoji}</span>
              <span className="hidden sm:inline">{meta.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Missing Data Banner */}
      {context && context.profileCompleteness !== 'full' && 
       (activeTier === 'essential' || activeTier === 'optimizer') && (
        <MissingBloodworkBanner 
          profileCompleteness={context.profileCompleteness}
          activeTier={activeTier}
          missingProfileFields={context.missingProfileFields}
        />
      )}

      {/* Tier Description */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg text-sm border",
          currentConfig.bgClass,
          currentConfig.borderClass
        )}
      >
        <span className="text-lg">{currentConfig.icon}</span>
        <span className="text-muted-foreground">{currentConfig.description}</span>
      </div>

      {/* Supplement Groups List */}
      <div className="space-y-2">
        {libraryLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchQuery
              ? `Keine Ergebnisse für "${searchQuery}"`
              : activeMetaCategory !== 'all'
              ? `Keine ${META_CATEGORIES[activeMetaCategory].shortLabel} in ${currentConfig.shortLabel}`
              : `Keine ${currentConfig.shortLabel} verfügbar`}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <SupplementGroupRow
              key={group.baseName}
              group={group}
              activeVariantIds={activeSupplementIds}
              onToggle={handleToggle}
              onInfoClick={setDetailItem}
              isLoading={isToggling}
            />
          ))
        )}
      </div>

      {/* Add Custom Button */}
      {onAdd && (
        <div className="pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={onAdd}
            className="w-full text-muted-foreground"
          >
            + Custom Supplement hinzufügen
          </Button>
        </div>
      )}

      {/* Detail Sheet */}
      <SupplementDetailSheet
        item={detailItem}
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
};

export default SupplementInventory;
