import React, { useMemo } from 'react';
import { Clock, Beaker, AlertTriangle, Check, RefreshCw, Sparkles, Shield, Zap, FlaskConical, Target, Droplets, BookOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getMetaCategory, META_CATEGORIES } from '@/lib/categoryMapping';
import { useUserRelevanceContext } from '@/hooks/useUserRelevanceContext';
import { calculateRelevanceScore, getScoreTierConfig } from '@/lib/calculateRelevanceScore';
import { RelevanceScorePopover } from './RelevanceScorePopover';
import {
  EVIDENCE_LEVEL_CONFIG,
  NECESSITY_TIER_CONFIG,
  TIMING_CONSTRAINT_LABELS,
  TIMING_CONSTRAINT_ICONS,
  type SupplementLibraryItem,
  type EvidenceLevel,
} from '@/types/supplementLibrary';
import type { RelevanceMatrix } from '@/types/relevanceMatrix';

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
  // Get user relevance context for personalized scoring - MUST be before early return
  const { context: userContext } = useUserRelevanceContext();
  
  // Calculate personalized relevance score
  const scoreResult = useMemo(() => {
    if (!item) return null;
    return calculateRelevanceScore(
      item.impact_score ?? 5.0,
      item.relevance_matrix,
      userContext
    );
  }, [item?.impact_score, item?.relevance_matrix, userContext]);
  
  const personalizedTierConfig = useMemo(() => {
    if (!scoreResult) return null;
    return getScoreTierConfig(scoreResult.score);
  }, [scoreResult]);
  
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

          {/* Wissenschaftliche Evidenz - Extended Section */}
          {evidenceConfig && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Wissenschaftliche Evidenz
                </h4>
                <div className={cn(
                  "p-3 rounded-lg border",
                  evidenceConfig.bgClass,
                  "border-opacity-30"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", evidenceConfig.textClass)}
                    >
                      {item.evidence_level === 'stark' ? '🔬' : item.evidence_level === 'moderat' ? '📊' : '💡'} {evidenceConfig.label}
                    </Badge>
                  </div>
                  <p className={cn("text-xs leading-relaxed", evidenceConfig.textClass)}>
                    {evidenceConfig.longDescription}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Scientific Sources & Critical Insights */}
          <ScientificSourcesSection matrix={item.relevance_matrix} />

          {/* Kontext-Relevanz Section */}
          <ContextRelevanceSection matrix={item.relevance_matrix} />

          {/* Blutwert-Trigger Section */}
          <BloodworkTriggersSection matrix={item.relevance_matrix} />

          {/* Personalized ARES Score & Cost */}
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            {/* Personalized Score */}
            {scoreResult && personalizedTierConfig && (
              <RelevanceScorePopover
                scoreResult={scoreResult}
                supplementName={item.name}
              >
                <div className={cn(
                  'p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity',
                  personalizedTierConfig.bgClass,
                  'border',
                  personalizedTierConfig.borderClass
                )}>
                  <div className="flex items-center gap-1.5">
                    <Zap className={cn('h-3.5 w-3.5', personalizedTierConfig.textClass)} />
                    <p className="text-xs text-muted-foreground">Dein Score</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={cn('text-lg font-bold', personalizedTierConfig.textClass)}>
                      {scoreResult.score.toFixed(1)}
                    </p>
                    {scoreResult.isPersonalized && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <p className={cn('text-[10px] mt-0.5', personalizedTierConfig.textClass)}>
                    {personalizedTierConfig.labelShort}
                  </p>
                </div>
              </RelevanceScorePopover>
            )}
            
            {/* Static Impact Score fallback */}
            {!scoreResult && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Impact Score</p>
                <p className="text-lg font-bold">{item.impact_score?.toFixed(1) || '–'}</p>
              </div>
            )}
            
            {/* Cost per day */}
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

// =====================================================
// Sub-Components for Matrix Info Display
// =====================================================

const CONTEXT_LABELS: Record<string, string> = {
  true_natural: 'True Natural',
  enhanced_no_trt: 'Enhanced ohne TRT',
  on_trt: 'Bei TRT/HRT',
  on_glp1: 'Bei GLP-1 (Reta/Tirze/Sema)',
};

const BLOODWORK_LABELS: Record<string, string> = {
  cortisol_high: 'Cortisol erhöht',
  testosterone_low: 'Testosteron niedrig',
  vitamin_d_low: 'Vitamin D niedrig',
  magnesium_low: 'Magnesium niedrig',
  triglycerides_high: 'Triglyceride erhöht',
  inflammation_high: 'Entzündungswerte erhöht',
  glucose_high: 'Blutzucker erhöht',
  insulin_resistant: 'Insulinresistenz',
  hdl_low: 'HDL niedrig',
  ldl_high: 'LDL erhöht',
  apob_high: 'ApoB erhöht',
  ferritin_high: 'Ferritin erhöht',
  homocysteine_high: 'Homocystein erhöht',
  nad_low: 'NAD+ niedrig',
  b12_low: 'B12 niedrig',
  iron_low: 'Eisen niedrig',
  thyroid_slow: 'Schilddrüse verlangsamt',
};

interface ContextRelevanceSectionProps {
  matrix?: RelevanceMatrix | null;
}

const ContextRelevanceSection: React.FC<ContextRelevanceSectionProps> = ({ matrix }) => {
  const ctxModifiers = matrix?.context_modifiers;
  
  const relevantContexts = useMemo(() => {
    if (!ctxModifiers) return [];
    
    return Object.entries(CONTEXT_LABELS)
      .filter(([key]) => {
        const value = ctxModifiers[key as keyof typeof ctxModifiers];
        return value !== undefined && value !== 0;
      })
      .map(([key, label]) => ({
        key,
        label,
        value: ctxModifiers[key as keyof typeof ctxModifiers] as number,
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [ctxModifiers]);
  
  if (relevantContexts.length === 0) return null;
  
  return (
    <>
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          Wann besonders relevant
        </h4>
        <div className="space-y-1.5">
          {relevantContexts.map(({ key, label, value }) => (
            <div 
              key={key}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg text-xs",
                value > 0 
                  ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              )}
            >
              <span>{label}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-mono",
                  value > 0 
                    ? "border-green-500/30 text-green-600" 
                    : "border-red-500/30 text-red-600"
                )}
              >
                {value > 0 ? '+' : ''}{value.toFixed(1)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

interface BloodworkTriggersSectionProps {
  matrix?: RelevanceMatrix | null;
}

const BloodworkTriggersSection: React.FC<BloodworkTriggersSectionProps> = ({ matrix }) => {
  const bwTriggers = matrix?.bloodwork_triggers;
  
  const relevantTriggers = useMemo(() => {
    if (!bwTriggers) return [];
    
    return Object.entries(bwTriggers)
      .filter(([, value]) => value !== undefined && value !== 0)
      .map(([key, value]) => ({
        key,
        label: BLOODWORK_LABELS[key] || key.replace(/_/g, ' '),
        value: value as number,
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 6); // Show top 6
  }, [bwTriggers]);
  
  if (relevantTriggers.length === 0) return null;
  
  return (
    <>
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Droplets className="h-4 w-4 text-purple-500" />
          Blutwert-basierte Empfehlung
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {relevantTriggers.map(({ key, label, value }) => (
            <div 
              key={key}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg text-xs",
                value > 0 
                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-400" 
                  : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
              )}
            >
              <span className="truncate mr-1">{label}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-mono shrink-0",
                  value > 0 
                    ? "border-purple-500/30 text-purple-600" 
                    : "border-orange-500/30 text-orange-600"
                )}
              >
                {value > 0 ? '+' : ''}{value.toFixed(1)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// =====================================================
// Scientific Sources Section (for v2.1 evidence_notes)
// =====================================================

interface ScientificSourcesSectionProps {
  matrix?: RelevanceMatrix | null;
}

const VALIDATION_STATUS_CONFIG = {
  validated: {
    label: 'Validiert',
    className: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
    icon: '✓',
  },
  pending: {
    label: 'Ausstehend',
    className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    icon: '⏳',
  },
  disputed: {
    label: 'Umstritten',
    className: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
    icon: '⚠',
  },
};

const ScientificSourcesSection: React.FC<ScientificSourcesSectionProps> = ({ matrix }) => {
  const notes = matrix?.evidence_notes;
  
  // Don't render if no evidence notes exist
  if (!notes?.critical_insight && !notes?.sources?.length && !notes?.validation_status) {
    return null;
  }
  
  const statusConfig = notes?.validation_status 
    ? VALIDATION_STATUS_CONFIG[notes.validation_status] 
    : null;
  
  return (
    <>
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          Wissenschaftliche Einordnung
        </h4>
        
        <div className="space-y-2">
          {/* Validation Status Badge */}
          {statusConfig && (
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          )}
          
          {/* Critical Insight */}
          {notes?.critical_insight && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed italic">
                💡 {notes.critical_insight}
              </p>
            </div>
          )}
          
          {/* Sources */}
          {notes?.sources && notes.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {notes.sources.map((source, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[10px] bg-muted/50 font-mono"
                >
                  📚 {source}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SupplementDetailSheet;
