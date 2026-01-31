import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, Trash2, X, Check, Droplets, Utensils, Moon, Sun, 
  Dumbbell, Clock, AlertCircle, RotateCcw, Sparkles, Pill, Disc,
  Zap, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { haptics } from '@/lib/haptics';
import { useSupplementProducts } from '@/hooks/useSupplementLibrary';
import { useUserRelevanceContext } from '@/hooks/useUserRelevanceContext';
import { calculateRelevanceScore, getScoreTierConfig } from '@/lib/calculateRelevanceScore';
import type { UserStackItem, PreferredTiming, TimingConstraint, SupplementBrand, SupplementProduct } from '@/types/supplementLibrary';
import { PREFERRED_TIMING_LABELS, NECESSITY_TIER_CONFIG } from '@/types/supplementLibrary';
import { TimingCircleSelector } from './TimingCircleSelector';
import { BrandSelector } from './BrandSelector';
import { SelectedProductCard } from './SelectedProductCard';
import { SupplementDetailSheet } from './SupplementDetailSheet';
import { RelevanceScorePopover } from './RelevanceScorePopover';
import { AresInstantCheckDrawer } from './AresInstantCheckDrawer';

// QualityStars moved to BrandSelector component

// Form-specific icon based on unit
const getFormIcon = (unit: string): React.ReactNode => {
  const u = unit?.toLowerCase() || '';
  if (u.includes('tropfen') || u === 'ml' || u === 'hub') {
    return <Droplets className="h-4 w-4 text-blue-500" />;
  }
  if (u === 'g' || u.includes('löffel') || u.includes('scoop') || u.includes('pulver')) {
    return <span className="text-sm">🥄</span>;
  }
  if (u.includes('kapsel')) {
    return <Pill className="h-4 w-4 text-amber-500" />;
  }
  if (u.includes('tabl')) {
    return <Disc className="h-4 w-4 text-slate-500" />;
  }
  // IU, mg, mcg => default pill
  return <Pill className="h-4 w-4 text-muted-foreground" />;
};

// Spring animation config
const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// Timing constraint badge config
const CONSTRAINT_BADGE_CONFIG: Record<TimingConstraint, { 
  icon: React.ReactNode; 
  label: string; 
  className: string;
}> = {
  fasted: { 
    icon: <Droplets className="h-3 w-3" />, 
    label: 'Nüchtern', 
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
  },
  with_food: { 
    icon: <Utensils className="h-3 w-3" />, 
    label: 'Zum Essen', 
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
  },
  with_fats: { 
    icon: <span className="text-xs">🥑</span>, 
    label: 'Mit Fett', 
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' 
  },
  pre_workout: { 
    icon: <Dumbbell className="h-3 w-3" />, 
    label: 'Vor Training', 
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
  },
  post_workout: { 
    icon: <Sparkles className="h-3 w-3" />, 
    label: 'Nach Training', 
    className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' 
  },
  any: { 
    icon: <Clock className="h-3 w-3" />, 
    label: 'Flexibel', 
    className: 'bg-muted text-muted-foreground' 
  },
};

// Unit options
const UNIT_OPTIONS = ['mg', 'g', 'µg', 'mcg', 'IU', 'ml', 'Kapseln', 'Tropfen'];

interface ExpandableSupplementChipProps {
  item: UserStackItem;
  brands?: SupplementBrand[];
  onSave: (id: string, updates: Partial<UserStackItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

export const ExpandableSupplementChip: React.FC<ExpandableSupplementChipProps> = ({
  item,
  brands = [],
  onSave,
  onDelete,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInstantCheck, setShowInstantCheck] = useState(false);
  
  // Fetch products for this supplement (only when expanded for performance)
  const { data: products = [], isLoading: productsLoading } = useSupplementProducts(
    isExpanded ? item.supplement_id || undefined : undefined
  );
  
  // Get user relevance context for personalized scoring
  const { context: userContext } = useUserRelevanceContext();
  
  // Calculate personalized relevance score
  const scoreResult = useMemo(() => {
    return calculateRelevanceScore(
      item.supplement?.impact_score ?? 5.0,
      item.supplement?.relevance_matrix,
      userContext
    );
  }, [item.supplement?.impact_score, item.supplement?.relevance_matrix, userContext]);
  
  const tierConfig = useMemo(() => getScoreTierConfig(scoreResult.score), [scoreResult.score]);
  
  // Form state
  const [dosage, setDosage] = useState(item.dosage || '');
  const [unit, setUnit] = useState(item.unit || 'mg');
  const [preferredTiming, setPreferredTiming] = useState<PreferredTiming>(item.preferred_timing || 'morning');
  const [notes, setNotes] = useState(item.notes || '');
  const [isCyclic, setIsCyclic] = useState(item.schedule?.type === 'cycle' || item.schedule?.type === 'cyclic');
  const [cycleOnDays, setCycleOnDays] = useState<number>(
    (item.schedule as any)?.cycle_on_days || 5
  );
  const [cycleOffDays, setCycleOffDays] = useState<number>(
    (item.schedule as any)?.cycle_off_days || 2
  );
  
  // Selected product state - initialize from persisted data
  const [selectedProduct, setSelectedProduct] = useState<SupplementProduct | null>(
    item.selected_product || null
  );
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  // Handle ARES Instant Check - Opens inline overlay (no redirect)
  const handleAskAres = useCallback(() => {
    haptics.light();
    setShowInstantCheck(true);
  }, []);

  // Get constraint badge info
  const constraint = item.supplement?.timing_constraint || 'any';
  const constraintBadge = CONSTRAINT_BADGE_CONFIG[constraint];
  
  // Check if user has customized the supplement
  const isCustomized = 
    dosage !== (item.supplement?.default_dosage || '') ||
    notes !== '' ||
    isCyclic;

  // Reset form when item changes
  useEffect(() => {
    setDosage(item.dosage || '');
    setUnit(item.unit || 'mg');
    setPreferredTiming(item.preferred_timing || 'morning');
    setNotes(item.notes || '');
    setIsCyclic(item.schedule?.type === 'cycle' || item.schedule?.type === 'cyclic');
    setCycleOnDays((item.schedule as any)?.cycle_on_days || 5);
    setCycleOffDays((item.schedule as any)?.cycle_off_days || 2);
    // Reset selected product from persisted data
    setSelectedProduct(item.selected_product || null);
  }, [item]);

  // Handle expand
  const handleExpand = useCallback(() => {
    haptics.light();
    setIsExpanded(true);
  }, []);

  // Handle collapse
  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const schedule = isCyclic 
        ? { type: 'cycle' as const, cycle_on_days: cycleOnDays, cycle_off_days: cycleOffDays, start_date: new Date().toISOString() }
        : { type: 'daily' as const };

      await onSave(item.id, {
        dosage,
        unit,
        preferred_timing: preferredTiming,
        notes: notes || null,
        schedule,
        // Persist selected product ID for brand display
        selected_product_id: selectedProduct?.id || null,
      });
      
      haptics.success();
      setIsExpanded(false);
    } catch (error) {
      haptics.error();
      console.error('Failed to save supplement:', error);
    } finally {
      setIsSaving(false);
    }
  }, [item.id, dosage, unit, preferredTiming, notes, isCyclic, cycleOnDays, cycleOffDays, selectedProduct, onSave]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    haptics.error();
    await onDelete(item.id);
  }, [item.id, onDelete]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        handleCollapse();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, handleCollapse]);

  return (
    <motion.div
      layout
      initial={false}
      transition={SPRING_CONFIG}
      className={cn('w-full', className)}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // ==================== COLLAPSED STATE ====================
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'group relative flex items-start gap-2 px-3 py-2 rounded-xl',
              'bg-background/80 border border-border/50',
              'hover:border-primary/30',
              'transition-colors duration-200 cursor-pointer',
              'min-h-[44px]' // Touch-friendly
            )}
            onClick={handleExpand}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleExpand()}
          >
            {/* Delete X - top right inside (visible on hover) */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="absolute top-1.5 right-1.5 z-20 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Entfernen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            
            {/* Hover Overlay - grayed out with centered edit icon */}
            <div className="absolute inset-0 flex items-center justify-center bg-muted/60 backdrop-blur-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="p-2 rounded-full bg-background shadow-sm border border-border">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {/* Form Icon */}
            <div className="shrink-0 mt-0.5">
              {getFormIcon(unit)}
            </div>
            
            {/* Content with flex-wrap for two-line support */}
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* Name */}
              <span className="text-sm font-medium">
                {item.name}
              </span>
              
              {/* Dosage */}
              <span className="text-xs text-muted-foreground">
                {dosage}{unit}
              </span>
              
              {/* Brand Name (from persisted selected_product) */}
              {item.selected_product?.brand?.name && (
                <span className="text-xs text-primary font-medium">
                  · {item.selected_product.brand.name}
                </span>
              )}
              
              {/* Timing Constraint Badge */}
              {constraint !== 'any' && constraintBadge && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 gap-1',
                    constraintBadge.className
                  )}
                >
                  {constraintBadge.icon}
                  <span className="hidden sm:inline">{constraintBadge.label}</span>
                </Badge>
              )}
            </div>
          </motion.div>
        ) : (
          // ==================== EXPANDED STATE ====================
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'rounded-xl border border-border bg-card shadow-lg',
              'overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">💊</span>
                <h3 className="font-semibold text-sm">{item.name} bearbeiten</h3>
              </div>
              <button
                onClick={handleCollapse}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Form Content */}
            <div className="p-4 space-y-4">
              {/* Dosierung */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Menge</Label>
                  <Input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="z.B. 5000"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Einheit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Timing Selection - Circle Design (Layer 0 consistency) */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Einnahmezeitpunkt</Label>
                <TimingCircleSelector
                  value={preferredTiming}
                  onChange={setPreferredTiming}
                  size="md"
                />
              </div>
              
              {/* Timing Constraint Info (readonly) */}
              {constraint !== 'any' && constraintBadge && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{constraintBadge.label}:</span>{' '}
                    {constraint === 'fasted' && 'Am besten auf nüchternen Magen einnehmen (30 Min vor dem Essen).'}
                    {constraint === 'with_food' && 'Zusammen mit einer Mahlzeit einnehmen.'}
                    {constraint === 'with_fats' && 'Mit fetthaltiger Nahrung für bessere Absorption.'}
                    {constraint === 'pre_workout' && '30-60 Minuten vor dem Training einnehmen.'}
                    {constraint === 'post_workout' && 'Direkt nach dem Training einnehmen.'}
                  </div>
                </div>
              )}
              
              {/* Cycle Toggle */}
              {item.supplement?.cycling_required && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                          Zyklische Einnahme empfohlen
                        </p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          {item.supplement.cycling_protocol || 'Z.B. 5 Tage an, 2 Tage Pause'}
                        </p>
                      </div>
                      <Switch
                        checked={isCyclic}
                        onCheckedChange={setIsCyclic}
                      />
                    </div>
                    
                    {isCyclic && (
                      <div className="flex items-center gap-2 mt-3">
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={cycleOnDays}
                          onChange={(e) => setCycleOnDays(parseInt(e.target.value) || 5)}
                          className="h-8 w-16 text-center"
                        />
                        <span className="text-xs text-muted-foreground">Tage an,</span>
                        <Input
                          type="number"
                          min={1}
                          max={14}
                          value={cycleOffDays}
                          onChange={(e) => setCycleOffDays(parseInt(e.target.value) || 2)}
                          className="h-8 w-16 text-center"
                        />
                        <span className="text-xs text-muted-foreground">Tage Pause</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notizen (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eigene Anmerkungen..."
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
              
              {/* =============== ARES Personalized Score =============== */}
              {item.supplement && (
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  tierConfig.bgClass,
                  tierConfig.borderClass
                )}>
                  <div className={cn('p-2 rounded-full', tierConfig.bgClass)}>
                    <Zap className={cn('h-4 w-4', tierConfig.textClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-lg font-bold', tierConfig.textClass)}>
                        {scoreResult.score.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Dein Score {scoreResult.isPersonalized && '✨'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div 
                        className={cn('h-full rounded-full transition-all duration-300', tierConfig.textClass.replace('text-', 'bg-'))}
                        style={{ width: `${Math.min(scoreResult.score * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                  <RelevanceScorePopover
                    scoreResult={scoreResult}
                    supplementName={item.name}
                  >
                    <button
                      type="button"
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px] shrink-0 cursor-pointer hover:opacity-80',
                          tierConfig.borderClass,
                          tierConfig.textClass
                        )}
                      >
                        {tierConfig.labelShort}
                      </Badge>
                    </button>
                  </RelevanceScorePopover>
                </div>
              )}
              
              {/* =============== Brand Selector + Product Card =============== */}
              {(products.length > 0 || productsLoading) && (
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Hersteller wählen</Label>
                  <BrandSelector
                    products={products}
                    selectedBrandId={selectedProduct?.brand_id || null}
                    onSelect={(brandId, product) => setSelectedProduct(product)}
                    loading={productsLoading}
                  />
                  
                  {/* Selected Product Card */}
                  {selectedProduct && (
                    <SelectedProductCard
                      product={selectedProduct}
                      supplementItem={item.supplement || null}
                      onInfoClick={() => setShowDetailSheet(true)}
                    />
                  )}
                </div>
              )}
              
              {/* Supplement Detail Sheet */}
              {item.supplement && (
                <SupplementDetailSheet
                  item={item.supplement}
                  isOpen={showDetailSheet}
                  onClose={() => setShowDetailSheet(false)}
                />
              )}
            </div>
            
            {/* Footer Actions - Updated with ARES Button */}
            <div className="flex items-center justify-between gap-2 p-4 pt-2 border-t border-border/50 bg-muted/30">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="gap-1.5"
              >
                <Check className="h-4 w-4" />
                {isSaving ? 'Speichert...' : 'Speichern'}
              </Button>
              
              <div className="flex items-center gap-2">
                {/* ARES Button */}
                <Button
                  onClick={handleAskAres}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Frag ARES</span>
                </Button>
                
                <Button
                  onClick={handleDelete}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ARES Instant Check Drawer - Inline Analysis Overlay */}
      <AresInstantCheckDrawer
        isOpen={showInstantCheck}
        onClose={() => setShowInstantCheck(false)}
        supplement={{
          name: item.name,
          dosage,
          unit,
          timing: preferredTiming,
          brandName: selectedProduct?.brand?.name,
          constraint: item.supplement?.timing_constraint,
        }}
      />
    </motion.div>
  );
};

export default ExpandableSupplementChip;
