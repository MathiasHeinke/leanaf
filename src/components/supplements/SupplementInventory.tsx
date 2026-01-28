import React from 'react';
import { Package, Pause, Play, Edit2, AlertTriangle, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  SCHEDULE_TYPE_LABELS,
  TIMING_CONSTRAINT_ICONS,
  type UserStackItem,
  type ScheduleType,
} from '@/types/supplementLibrary';

interface SupplementInventoryProps {
  groupedByCategory: Record<string, UserStackItem[]>;
  onToggleActive?: (supplement: UserStackItem, isActive: boolean) => void;
  onEdit?: (supplement: UserStackItem) => void;
  onAdd?: () => void;
}

// Category display order and icons
const CATEGORY_CONFIG: Record<string, { order: number; icon: string; label: string }> = {
  'Vitamine': { order: 1, icon: '💊', label: 'Vitamine' },
  'Mineralstoffe': { order: 2, icon: '🔋', label: 'Mineralstoffe' },
  'Aminosäuren': { order: 3, icon: '💪', label: 'Aminosäuren' },
  'Fettsäuren': { order: 4, icon: '🐟', label: 'Fettsäuren' },
  'Adaptogene': { order: 5, icon: '🌿', label: 'Adaptogene' },
  'Nootropics': { order: 6, icon: '🧠', label: 'Nootropics' },
  'Performance': { order: 7, icon: '⚡', label: 'Performance' },
  'Longevity': { order: 8, icon: '🧬', label: 'Longevity' },
  'Schlaf': { order: 9, icon: '🌙', label: 'Schlaf' },
  'Sonstige': { order: 99, icon: '📦', label: 'Sonstige' },
};

const getCategoryConfig = (category: string) => {
  return CATEGORY_CONFIG[category] || { order: 50, icon: '📦', label: category };
};

// Single inventory item
const InventoryItem: React.FC<{
  supplement: UserStackItem;
  onToggle?: (isActive: boolean) => void;
  onEdit?: () => void;
}> = ({ supplement, onToggle, onEdit }) => {
  const constraint = supplement.supplement?.timing_constraint || 'any';
  const constraintIcon = TIMING_CONSTRAINT_ICONS[constraint];
  const isLowStock = supplement.stock_count !== null && supplement.stock_count <= 7;

  return (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-lg",
      "bg-card/50 border border-border/30",
      "hover:border-border/60 transition-colors",
      !supplement.is_active && "opacity-50"
    )}>
      {/* Active toggle */}
      <Switch
        checked={supplement.is_active}
        onCheckedChange={onToggle}
        className="flex-none"
      />

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
        </div>
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

export const SupplementInventory: React.FC<SupplementInventoryProps> = ({
  groupedByCategory,
  onToggleActive,
  onEdit,
  onAdd,
}) => {
  // Sort categories by order
  const sortedCategories = Object.entries(groupedByCategory)
    .sort(([a], [b]) => {
      const configA = getCategoryConfig(a);
      const configB = getCategoryConfig(b);
      return configA.order - configB.order;
    });

  const totalCount = Object.values(groupedByCategory).reduce(
    (sum, items) => sum + items.length, 0
  );

  const activeCount = Object.values(groupedByCategory).reduce(
    (sum, items) => sum + items.filter(i => i.is_active).length, 0
  );

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
    <div className="space-y-6">
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

      {/* Categories */}
      {sortedCategories.map(([category, supplements]) => {
        const config = getCategoryConfig(category);
        const activeInCategory = supplements.filter(s => s.is_active).length;

        return (
          <div key={category}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-base">{config.icon}</span>
              <span className="text-sm font-medium">{config.label}</span>
              <Badge variant="secondary" className="text-xs">
                {activeInCategory}/{supplements.length}
              </Badge>
            </div>

            {/* Items */}
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
          </div>
        );
      })}
    </div>
  );
};
