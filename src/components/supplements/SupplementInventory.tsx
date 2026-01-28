import React, { useState, useMemo } from 'react';
import { Package, Edit2, AlertTriangle, Building2, Target, FlaskConical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EvidenceRing } from './EvidenceRing';
import { FormQualityBadge } from './FormQualityBadge';
import { InteractionBadges } from './InteractionWarnings';
import { haptics } from '@/lib/haptics';
import { 
  SCHEDULE_TYPE_LABELS,
  TIMING_CONSTRAINT_ICONS,
  NECESSITY_TIER_CONFIG,
  type UserStackItem,
  type ScheduleType,
  type NecessityTier,
} from '@/types/supplementLibrary';

interface SupplementInventoryProps {
  groupedByCategory: Record<string, UserStackItem[]>;
  onToggleActive?: (supplement: UserStackItem, isActive: boolean) => void;
  onEdit?: (supplement: UserStackItem) => void;
  onAdd?: () => void;
}

// Tier icons for pyramid navigation
const TIER_ICONS: Record<NecessityTier, React.ElementType> = {
  essential: Building2,
  optimizer: Target,
  specialist: FlaskConical,
};

// Single inventory item with premium features
const InventoryItem: React.FC<{
  supplement: UserStackItem;
  onToggle?: (isActive: boolean) => void;
  onEdit?: () => void;
}> = ({ supplement, onToggle, onEdit }) => {
  const constraint = supplement.supplement?.timing_constraint || 'any';
  const constraintIcon = TIMING_CONSTRAINT_ICONS[constraint];
  const isLowStock = supplement.stock_count !== null && supplement.stock_count <= 7;
  const impactScore = supplement.supplement?.impact_score || 5;

  const handleToggle = (checked: boolean) => {
    haptics.light();
    onToggle?.(checked);
  };

  return (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-xl",
      "bg-card/50 border border-border/30",
      "hover:border-border/60 transition-all duration-200",
      !supplement.is_active && "opacity-50"
    )}>
      {/* Active toggle */}
      <Switch
        checked={supplement.is_active}
        onCheckedChange={handleToggle}
        className="flex-none"
      />

      {/* Evidence Ring */}
      <EvidenceRing score={impactScore} size="sm" className="flex-none" />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {supplement.name}
          </span>
          {constraintIcon && (
            <span className="text-xs">{constraintIcon}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {supplement.dosage} {supplement.unit}
          </span>
          {supplement.schedule_type !== 'daily' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {SCHEDULE_TYPE_LABELS[supplement.schedule_type as ScheduleType]}
            </Badge>
          )}
          {supplement.supplement?.form_quality && (
            <FormQualityBadge 
              quality={supplement.supplement.form_quality} 
              className="text-[10px]"
            />
          )}
        </div>
        {/* Interaction badges */}
        {supplement.supplement && (
          <InteractionBadges 
            supplement={supplement.supplement} 
            className="mt-1"
          />
        )}
      </div>

      {/* Stock indicator */}
      {supplement.stock_count !== null && (
        <div className={cn(
          "flex-none text-xs",
          isLowStock ? "text-amber-500" : "text-muted-foreground"
        )}>
          {isLowStock && <AlertTriangle className="h-3 w-3 inline mr-1" />}
          {supplement.stock_count}
        </div>
      )}

      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className="flex-none h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onEdit}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

/**
 * SupplementInventory - Premium UX v2 with Pyramid Navigation
 * Groups supplements by necessity tier (Essential, Optimizer, Specialist)
 * with animated tabs and progress indicators
 */
export const SupplementInventory: React.FC<SupplementInventoryProps> = ({
  groupedByCategory,
  onToggleActive,
  onEdit,
  onAdd,
}) => {
  const [activeTab, setActiveTab] = useState<NecessityTier>('essential');

  // Group supplements by necessity tier
  const { groupedByTier, tierCounts, totalCount, activeCount } = useMemo(() => {
    const allSupplements = Object.values(groupedByCategory).flat();
    
    const grouped: Record<NecessityTier, UserStackItem[]> = {
      essential: [],
      optimizer: [],
      specialist: [],
    };

    allSupplements.forEach(supplement => {
      const tier = supplement.supplement?.necessity_tier || 'optimizer';
      grouped[tier].push(supplement);
    });

    // Sort each tier by impact score (descending)
    Object.keys(grouped).forEach(tier => {
      grouped[tier as NecessityTier].sort((a, b) => 
        (b.supplement?.impact_score || 0) - (a.supplement?.impact_score || 0)
      );
    });

    return {
      groupedByTier: grouped,
      tierCounts: {
        essential: grouped.essential.length,
        optimizer: grouped.optimizer.length,
        specialist: grouped.specialist.length,
      },
      totalCount: allSupplements.length,
      activeCount: allSupplements.filter(s => s.is_active).length,
    };
  }, [groupedByCategory]);

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">
          Dein Stack ist leer
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
          Füge Supplements aus der ARES Library hinzu
        </p>
        {onAdd && (
          <Button onClick={onAdd} size="sm">
            Supplement hinzufügen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{activeCount}</span>
          {' '}von{' '}
          <span>{totalCount}</span>
          {' '}aktiv
        </div>
        {onAdd && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            + Hinzufügen
          </Button>
        )}
      </div>

      {/* Pyramid Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NecessityTier)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
          {(['essential', 'optimizer', 'specialist'] as NecessityTier[]).map((tier) => {
            const config = NECESSITY_TIER_CONFIG[tier];
            const Icon = TIER_ICONS[tier];
            const count = tierCounts[tier];
            const activeInTier = groupedByTier[tier].filter(s => s.is_active).length;

            return (
              <TabsTrigger
                key={tier}
                value={tier}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-background",
                  "transition-all duration-200"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium truncate">{config.label.split(' ')[0]}</span>
                </div>
                <Badge 
                  variant={activeTab === tier ? "default" : "secondary"}
                  className="text-[10px] px-1.5"
                >
                  {activeInTier}/{count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        {(['essential', 'optimizer', 'specialist'] as NecessityTier[]).map((tier) => {
          const supplements = groupedByTier[tier];
          const config = NECESSITY_TIER_CONFIG[tier];

          return (
            <TabsContent key={tier} value={tier} className="mt-4 space-y-4">
              {/* Tier description */}
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg text-sm",
                config.bgClass,
                "border",
                config.borderClass
              )}>
                <span>{config.icon}</span>
                <span className="text-muted-foreground">{config.description}</span>
              </div>

              {/* Supplements list */}
              {supplements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Keine {config.label} in deinem Stack
                </div>
              ) : (
                <div className="space-y-2">
                  {supplements.map((supplement) => (
                    <InventoryItem
                      key={supplement.id}
                      supplement={supplement}
                      onToggle={(isActive) => onToggleActive?.(supplement, isActive)}
                      onEdit={() => onEdit?.(supplement)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default SupplementInventory;
