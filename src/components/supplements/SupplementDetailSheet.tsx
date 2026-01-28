import React from 'react';
import { X, Clock, Beaker, AlertTriangle, Check, RefreshCw, Sparkles, Shield } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getMetaCategory, META_CATEGORIES } from '@/lib/categoryMapping';
import {
  EVIDENCE_LEVEL_CONFIG,
  NECESSITY_TIER_CONFIG,
  TIMING_CONSTRAINT_LABELS,
  TIMING_CONSTRAINT_ICONS,
  type SupplementLibraryItem,
  type EvidenceLevel,
} from '@/types/supplementLibrary';

interface SupplementDetailSheetProps {
  item: SupplementLibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SupplementDetailSheet: React.FC<SupplementDetailSheetProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  if (!item) return null;

  const metaCategoryKey = getMetaCategory(item.category);
  const metaCategory = META_CATEGORIES[metaCategoryKey];
  const tierConfig = NECESSITY_TIER_CONFIG[item.necessity_tier || 'optimizer'];
  const evidenceConfig = item.evidence_level 
    ? EVIDENCE_LEVEL_CONFIG[item.evidence_level as EvidenceLevel] 
    : null;

  // Get timing label
  const getTimingLabel = () => {
    if (item.timing_constraint && item.timing_constraint !== 'any') {
      return TIMING_CONSTRAINT_LABELS[item.timing_constraint];
    }
    const timing = item.common_timing?.[0]?.toLowerCase() || '';
    if (timing.includes('morgen') || timing.includes('nüchtern')) return 'Morgens';
    if (timing.includes('mittag')) return 'Mittags';
    if (timing.includes('abend')) return 'Abends';
    if (timing.includes('schlaf')) return 'Vor dem Schlaf';
    return 'Flexibel';
  };

  const timingIcon = item.timing_constraint 
    ? TIMING_CONSTRAINT_ICONS[item.timing_constraint] 
    : '⏰';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold">{item.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", metaCategory.bgClass, metaCategory.textClass)}
                >
                  {metaCategory.emoji} {item.category || metaCategory.shortLabel}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {tierConfig.icon} {tierConfig.shortLabel}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto pb-8">
          {/* Beschreibung */}
          {item.description && (
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Empfohlene Einnahme - 3er Grid */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              Empfohlene Einnahme
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Dosierung */}
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-bold">
                  {item.default_dosage || '–'}
                  {item.default_unit && (
                    <span className="text-sm font-normal ml-0.5">{item.default_unit}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Dosis</p>
              </div>

              {/* Timing */}
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-bold">{timingIcon}</p>
                <p className="text-xs text-muted-foreground">{getTimingLabel()}</p>
              </div>

              {/* Evidenz */}
              <div className={cn(
                "p-3 rounded-lg text-center",
                evidenceConfig?.bgClass || 'bg-muted/50'
              )}>
                <p className={cn("text-lg font-bold", evidenceConfig?.textClass)}>
                  {item.evidence_level === 'stark' ? '🔬' : item.evidence_level === 'moderat' ? '📊' : '💡'}
                </p>
                <p className={cn("text-xs", evidenceConfig?.textClass || 'text-muted-foreground')}>
                  {evidenceConfig?.label.split(' ')[0] || 'Evidenz'}
                </p>
              </div>
            </div>
          </div>

          {/* Zyklus */}
          {item.cycling_protocol && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  Zyklus-Protokoll
                </h4>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {item.cycling_protocol}
                  </p>
                  {item.cycling_required && (
                    <p className="text-xs text-amber-600/80 mt-1">
                      Zykluseinhaltung empfohlen für optimale Wirkung
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Synergien */}
          {item.synergies && item.synergies.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  Synergien
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.synergies.map((synergy, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {synergy}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Blocker */}
          {item.blockers && item.blockers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  Zu beachten
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.blockers.map((blocker, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                    >
                      {blocker}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Warnung */}
          {item.warnung && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Warnung
                </h4>
                <p className="text-sm text-destructive/90">
                  {item.warnung}
                </p>
              </div>
            </>
          )}

          {/* Hallmarks */}
          {item.hallmarks_addressed && item.hallmarks_addressed.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Beeinflusste Hallmarks
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {item.hallmarks_addressed.map((hallmark, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {hallmark}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Impact Score & Cost */}
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Impact Score</p>
              <p className="text-lg font-bold">{item.impact_score?.toFixed(1) || '–'}</p>
            </div>
            {item.cost_per_day_eur && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Kosten/Tag</p>
                <p className="text-lg font-bold">€{item.cost_per_day_eur.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SupplementDetailSheet;
