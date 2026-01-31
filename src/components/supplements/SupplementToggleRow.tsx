import React from 'react';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Check, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScheduleLabel } from '@/lib/schedule-utils';
import { getMetaCategory, META_CATEGORIES } from '@/lib/categoryMapping';
import { DYNAMIC_TIER_CONFIG } from '@/lib/calculateRelevanceScore';
import {
  EVIDENCE_LEVEL_CONFIG,
  TIMING_CONSTRAINT_LABELS,
  type SupplementLibraryItem,
  type EvidenceLevel,
} from '@/types/supplementLibrary';
import type { RelevanceScoreResult } from '@/types/relevanceMatrix';

interface SupplementToggleRowProps {
  item: SupplementLibraryItem & { scoreResult?: RelevanceScoreResult };
  isActive: boolean;
  onToggle: (id: string, active: boolean) => void;
  onInfoClick?: (item: SupplementLibraryItem) => void;
  isLoading?: boolean;
}

/**
 * SupplementToggleRow - Toggle-based supplement activation
 * Shows supplement info with schedule badge and activation switch
 */
export const SupplementToggleRow: React.FC<SupplementToggleRowProps> = ({
  item,
  isActive,
  onToggle,
  onInfoClick,
  isLoading,
}) => {
  const scheduleLabel = getScheduleLabel(item.cycling_protocol);
  const metaCategoryKey = getMetaCategory(item.category);
  const metaCategory = META_CATEGORIES[metaCategoryKey];

  // Get timing label from constraint or common_timing
  const getTimingLabel = () => {
    if (item.timing_constraint && item.timing_constraint !== 'any') {
      return TIMING_CONSTRAINT_LABELS[item.timing_constraint];
    }
    const timing = item.common_timing?.[0]?.toLowerCase() || '';
    if (timing.includes('morgen') || timing.includes('nüchtern')) return 'Morgens';
    if (timing.includes('mittag')) return 'Mittags';
    if (timing.includes('abend') || timing.includes('nacht') || timing.includes('schlaf')) return 'Abends';
    if (timing.includes('vor training')) return 'Vor Training';
    if (timing.includes('nach training')) return 'Nach Training';
    return 'Flexibel';
  };

  // Get evidence badge
  const getEvidenceBadge = () => {
    if (!item.evidence_level) return null;
    const config = EVIDENCE_LEVEL_CONFIG[item.evidence_level as EvidenceLevel];
    if (!config) return null;
    return (
      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", config.bgClass, config.textClass)}>
        {item.evidence_level === 'stark' ? '🔬' : item.evidence_level === 'moderat' ? '📊' : '💡'}
      </span>
    );
  };

  // Format dosage with unit
  const formatDosage = () => {
    if (!item.default_dosage) return 'Nach Bedarf';
    return `${item.default_dosage}${item.default_unit || ''}`;
  };

  // Get dynamic score badge (if scoreResult available)
  const getScoreBadge = () => {
    if (!item.scoreResult) return null;
    const { score, dynamicTier, isPersonalized } = item.scoreResult;
    const tierConfig = DYNAMIC_TIER_CONFIG[dynamicTier];
    
    return (
      <span 
        className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5",
          tierConfig.bgClass,
          tierConfig.textClass
        )}
        title={isPersonalized ? 'Personalisierter Score' : 'Basis-Score'}
      >
        {isPersonalized && <Sparkles className="h-2.5 w-2.5" />}
        {score.toFixed(1)}
      </span>
    );
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        isActive
          ? "bg-primary/5 border-primary/20"
          : "bg-card/50 border-border/30 hover:bg-card"
      )}
    >
      {/* Icon with meta category color */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
          isActive ? "bg-primary/10" : metaCategory.bgClass
        )}
      >
        {metaCategory.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.name}</span>
          {/* Dynamic Score Badge */}
          {getScoreBadge()}
          {/* Info Icon - Clickable */}
          {onInfoClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick(item);
              }}
              className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
              aria-label="Mehr Informationen"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {isActive ? (
            <>
              <Check className="h-3 w-3 text-green-500 shrink-0" />
              <span className="truncate">{getTimingLabel()}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{formatDosage()}</span>
            </>
          ) : (
            <>
              <span className="truncate">{formatDosage()}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{getTimingLabel()}</span>
              {getEvidenceBadge()}
            </>
          )}
        </div>

        {/* Schedule Badge (Cycling) */}
        {scheduleLabel && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded w-fit">
            <RefreshCw className="h-3 w-3 shrink-0" />
            <span className="truncate">{scheduleLabel}</span>
          </div>
        )}
      </div>

      {/* Status + Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {isActive && (
          <span className="hidden sm:inline text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded whitespace-nowrap">
            Im Stack
          </span>
        )}
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => onToggle(item.id, checked)}
          disabled={isLoading}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
};

export default SupplementToggleRow;
