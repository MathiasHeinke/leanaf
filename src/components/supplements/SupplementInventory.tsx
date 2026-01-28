import React, { useState, useMemo } from 'react';
import { Search, Building2, Target, FlaskConical, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SupplementToggleRow } from './SupplementToggleRow';
import { useSupplementLibrary, useUserStack } from '@/hooks/useSupplementLibrary';
import { useSupplementToggle } from '@/hooks/useSupplementLibrary';
import {
  NECESSITY_TIER_CONFIG,
  type NecessityTier,
  type SupplementLibraryItem,
  type UserStackItem,
} from '@/types/supplementLibrary';

interface SupplementInventoryProps {
  groupedByCategory: Record<string, UserStackItem[]>;
  onAdd?: () => void;
}

// Tier icons for navigation
const TIER_ICONS: Record<NecessityTier, React.ElementType> = {
  essential: Building2,
  optimizer: Target,
  specialist: FlaskConical,
};

/**
 * SupplementInventory - Blueprint Tab (Premium UX v2)
 * Shows the master supplement library grouped by tier with toggle activation
 */
export const SupplementInventory: React.FC<SupplementInventoryProps> = ({
  groupedByCategory,
  onAdd,
}) => {
  const [activeTier, setActiveTier] = useState<NecessityTier>('essential');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch master library and user stack
  const { data: library, isLoading: libraryLoading } = useSupplementLibrary();
  const { data: userStack } = useUserStack();
  const { toggleSupplement, isToggling } = useSupplementToggle();

  // Create a set of active supplement IDs for quick lookup
  const activeSupplementIds = useMemo(() => {
    return new Set(
      (userStack || [])
        .filter((s) => s.is_active && s.supplement_id)
        .map((s) => s.supplement_id)
    );
  }, [userStack]);

  // Group library by tier
  const groupedByTier = useMemo(() => {
    const groups: Record<NecessityTier, SupplementLibraryItem[]> = {
      essential: [],
      optimizer: [],
      specialist: [],
    };

    (library || []).forEach((item) => {
      const tier = item.necessity_tier || 'optimizer';
      groups[tier].push(item);
    });

    // Sort each tier by impact score (descending)
    Object.keys(groups).forEach((tier) => {
      groups[tier as NecessityTier].sort(
        (a, b) => (b.impact_score || 0) - (a.impact_score || 0)
      );
    });

    return groups;
  }, [library]);

  // Filter by search query
  const filteredSupplements = useMemo(() => {
    const tierItems = groupedByTier[activeTier] || [];
    if (!searchQuery.trim()) return tierItems;

    const query = searchQuery.toLowerCase();
    return tierItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }, [groupedByTier, activeTier, searchQuery]);

  // Count active items per tier
  const tierCounts = useMemo(() => {
    const counts: Record<NecessityTier, { total: number; active: number }> = {
      essential: { total: 0, active: 0 },
      optimizer: { total: 0, active: 0 },
      specialist: { total: 0, active: 0 },
    };

    Object.entries(groupedByTier).forEach(([tier, items]) => {
      counts[tier as NecessityTier].total = items.length;
      counts[tier as NecessityTier].active = items.filter((item) =>
        activeSupplementIds.has(item.id)
      ).length;
    });

    return counts;
  }, [groupedByTier, activeSupplementIds]);

  // Handle toggle
  const handleToggle = async (item: SupplementLibraryItem, activate: boolean) => {
    await toggleSupplement(item, activate);
  };

  const currentConfig = NECESSITY_TIER_CONFIG[activeTier];

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

      {/* Tier Pills (Horizontal Scrollable) */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-hide">
        {(Object.keys(NECESSITY_TIER_CONFIG) as NecessityTier[]).map((tier) => {
          const config = NECESSITY_TIER_CONFIG[tier];
          const Icon = TIER_ICONS[tier];
          const counts = tierCounts[tier];

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
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{config.shortLabel || config.label.split(' ')[0]}</span>
              <span className="text-xs opacity-70">
                {counts.active}/{counts.total}
              </span>
            </button>
          );
        })}
      </div>

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

      {/* Supplement List */}
      <div className="space-y-2">
        {libraryLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSupplements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchQuery
              ? `Keine Ergebnisse für "${searchQuery}"`
              : `Keine ${currentConfig.shortLabel || currentConfig.label} verfügbar`}
          </div>
        ) : (
          filteredSupplements.map((item) => (
            <SupplementToggleRow
              key={item.id}
              item={item}
              isActive={activeSupplementIds.has(item.id)}
              onToggle={(id, active) => handleToggle(item, active)}
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
    </div>
  );
};

export default SupplementInventory;
