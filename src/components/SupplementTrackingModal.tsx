import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbSeparator,
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import { Pill, Plus, Clock, CheckCircle, ChevronRight, ArrowLeft, Star, Sparkles, FlaskConical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useSupplementLibrary, useSupplementProducts } from '@/hooks/useSupplementLibrary';
import type { SupplementLibraryItem, NecessityTier, SupplementProduct } from '@/types/supplementLibrary';
import { NECESSITY_TIER_CONFIG } from '@/types/supplementLibrary';
import { 
  groupByTier, 
  getUniqueBaseNames, 
  getVariantsForBase, 
  getVariantName,
  hasMultipleVariants,
  type BaseNameGroup 
} from '@/lib/supplementDeduplication';

interface SupplementTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    profileData?: any;
    currentSupplements?: any[];
    recommendations?: string[];
    compliance?: number;
  };
}

const timingOptions = [
  { value: 'morning', label: 'Morgens' },
  { value: 'noon', label: 'Mittags' },
  { value: 'evening', label: 'Abends' },
  { value: 'pre_workout', label: 'Vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training' }
];

type SelectionStep = 'tier' | 'base' | 'variant' | 'product' | 'form';

const TIER_ICONS: Record<NecessityTier, React.ReactNode> = {
  essential: <Star className="h-4 w-4" />,
  optimizer: <Sparkles className="h-4 w-4" />,
  specialist: <FlaskConical className="h-4 w-4" />,
};

export const SupplementTrackingModal = ({ isOpen, onClose, contextData }: SupplementTrackingModalProps) => {
  // Selection state for 4-step flow
  const [selectedTier, setSelectedTier] = useState<NecessityTier>('essential');
  const [selectedBase, setSelectedBase] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SupplementLibraryItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<SelectionStep>('tier');
  
  // Form state
  const [customName, setCustomName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { user } = useAuth();
  const { data: libraryItems = [], isLoading: libraryLoading } = useSupplementLibrary();
  const { data: products = [], isLoading: productsLoading } = useSupplementProducts(selectedVariant?.id);

  // Group library by tier
  const tierGroups = useMemo(() => groupByTier(libraryItems), [libraryItems]);
  
  // Get unique base names for current tier
  const baseNameGroups = useMemo(() => {
    const tierItems = tierGroups[selectedTier] || [];
    return getUniqueBaseNames(tierItems);
  }, [tierGroups, selectedTier]);
  
  // Get variants for selected base
  const variants = useMemo(() => {
    if (!selectedBase) return [];
    const tierItems = tierGroups[selectedTier] || [];
    return getVariantsForBase(tierItems, selectedBase);
  }, [tierGroups, selectedTier, selectedBase]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetSelection();
    }
  }, [isOpen]);

  // Auto-advance if only one variant
  useEffect(() => {
    if (selectedBase && variants.length === 1 && currentStep === 'base') {
      setSelectedVariant(variants[0]);
      setCurrentStep('product');
      applySupplementDefaults(variants[0]);
    }
  }, [selectedBase, variants, currentStep]);

  // Pre-fill with context recommendations
  useEffect(() => {
    if (contextData?.recommendations && contextData.recommendations.length > 0) {
      const firstRecommendation = contextData.recommendations[0];
      setCustomName(firstRecommendation);
      setShowCustomForm(true);
      setCurrentStep('form');
    }
  }, [contextData]);

  const resetSelection = () => {
    setSelectedTier('essential');
    setSelectedBase(null);
    setSelectedVariant(null);
    setSelectedProductId(null);
    setCurrentStep('tier');
    setCustomName('');
    setDosage('');
    setUnit('mg');
    setSelectedTimings([]);
    setGoal('');
    setNotes('');
    setShowCustomForm(false);
  };

  const applySupplementDefaults = (supplement: SupplementLibraryItem) => {
    setDosage(supplement.default_dosage || '');
    setUnit(supplement.default_unit || 'mg');
    setSelectedTimings(supplement.common_timing || []);
  };

  const handleTierChange = (tier: NecessityTier) => {
    setSelectedTier(tier);
    setSelectedBase(null);
    setSelectedVariant(null);
    setSelectedProductId(null);
    setCurrentStep('tier');
  };

  const handleBaseSelect = (baseName: string) => {
    setSelectedBase(baseName);
    setSelectedVariant(null);
    setSelectedProductId(null);
    
    // Check if this base has multiple variants
    const tierItems = tierGroups[selectedTier] || [];
    if (hasMultipleVariants(tierItems, baseName)) {
      setCurrentStep('variant');
    } else {
      // Skip variant step, auto-select the only variant
      const singleVariant = getVariantsForBase(tierItems, baseName)[0];
      if (singleVariant) {
        setSelectedVariant(singleVariant);
        applySupplementDefaults(singleVariant);
        setCurrentStep('product');
      }
    }
  };

  const handleVariantSelect = (variant: SupplementLibraryItem) => {
    setSelectedVariant(variant);
    setSelectedProductId(null);
    applySupplementDefaults(variant);
    setCurrentStep('product');
  };

  const handleProductSelect = (productId: string) => {
    if (productId === 'custom') {
      setSelectedProductId(null);
      setCurrentStep('form');
      return;
    }
    
    setSelectedProductId(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setDosage(product.dose_per_serving.toString());
      setUnit(product.dose_unit);
    }
    setCurrentStep('form');
  };

  const handleBack = () => {
    if (currentStep === 'form') {
      setCurrentStep(products.length > 0 ? 'product' : (variants.length > 1 ? 'variant' : 'tier'));
    } else if (currentStep === 'product') {
      setCurrentStep(variants.length > 1 ? 'variant' : 'tier');
      setSelectedVariant(null);
    } else if (currentStep === 'variant') {
      setCurrentStep('tier');
      setSelectedBase(null);
    }
  };

  const handleCustomEntry = () => {
    setShowCustomForm(true);
    setSelectedBase(null);
    setSelectedVariant(null);
    setSelectedProductId(null);
    setCurrentStep('form');
  };

  const toggleTiming = (timing: string) => {
    setSelectedTimings(prev => 
      prev.includes(timing) 
        ? prev.filter(t => t !== timing)
        : [...prev, timing]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supplementName = selectedVariant?.name || customName;
    
    if (!user || !supplementName || !dosage || selectedTimings.length === 0) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setIsSubmitting(true);

    try {
      const supplementData = {
        user_id: user.id,
        supplement_id: selectedVariant?.id || null,
        custom_name: selectedVariant ? null : customName,
        dosage,
        unit,
        timing: selectedTimings,
        goal: goal || null,
        notes: notes || null
      };

      const { error } = await supabase
        .from('user_supplements')
        .insert([supplementData]);

      if (error) throw error;

      toast.success('Supplement erfolgreich hinzugefügt');
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
      
      onClose();
      
    } catch (error) {
      console.error('Error adding supplement:', error);
      toast.error('Fehler beim Hinzufügen des Supplements');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimingLabel = (timing: string): string => {
    const option = timingOptions.find(opt => opt.value === timing);
    return option ? option.label : timing;
  };

  const renderBreadcrumb = () => {
    if (showCustomForm && !selectedVariant) return null;
    if (currentStep === 'tier' && !selectedBase) return null;
    
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              onClick={() => handleTierChange(selectedTier)}
              className="cursor-pointer text-xs"
            >
              {NECESSITY_TIER_CONFIG[selectedTier].label}
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {selectedBase && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {selectedVariant ? (
                  <BreadcrumbLink 
                    onClick={() => {
                      setSelectedVariant(null);
                      setCurrentStep(variants.length > 1 ? 'variant' : 'tier');
                    }}
                    className="cursor-pointer text-xs"
                  >
                    {selectedBase}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-xs">{selectedBase}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}
          
          {selectedVariant && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs">
                  {getVariantName(selectedVariant.name, selectedBase || '')}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  const renderTierTabs = () => (
    <Tabs value={selectedTier} onValueChange={(v) => handleTierChange(v as NecessityTier)} className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        {(['essential', 'optimizer', 'specialist'] as NecessityTier[]).map(tier => (
          <TabsTrigger 
            key={tier} 
            value={tier}
            className="flex items-center gap-1.5 text-xs px-2"
          >
            {TIER_ICONS[tier]}
            <span className="hidden sm:inline">{tier === 'essential' ? 'Essential' : tier === 'optimizer' ? 'Optimizer' : 'Specialist'}</span>
            <span className="sm:hidden">{tier === 'essential' ? 'Ess.' : tier === 'optimizer' ? 'Opt.' : 'Spec.'}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const renderBaseSelection = () => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      <Label className="text-sm text-muted-foreground">
        {NECESSITY_TIER_CONFIG[selectedTier].description}
      </Label>
      
      {baseNameGroups.map((group) => (
        <button
          key={group.baseName}
          onClick={() => handleBaseSelect(group.baseName)}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium">{group.baseName}</span>
              {group.variantCount > 1 && (
                <span className="text-xs text-muted-foreground">
                  {group.variantCount} Varianten
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {group.topImpactScore.toFixed(1)}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      ))}
      
      <button
        onClick={handleCustomEntry}
        className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border hover:bg-muted/50 transition-colors text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
        <span>Eigenes Supplement hinzufügen</span>
      </button>
    </div>
  );

  const renderVariantSelection = () => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      <Label className="text-sm text-muted-foreground">
        Wähle die Form von {selectedBase}
      </Label>
      
      {variants.map((variant) => (
        <button
          key={variant.id}
          onClick={() => handleVariantSelect(variant)}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex flex-col">
            <span className="font-medium">
              {getVariantName(variant.name, selectedBase || '')}
            </span>
            {variant.form_quality && (
              <span className={`text-xs ${
                variant.form_quality === 'optimal' ? 'text-emerald-600 dark:text-emerald-400' :
                variant.form_quality === 'gut' ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
              }`}>
                {variant.form_quality === 'optimal' ? 'Beste Bioverfügbarkeit' :
                 variant.form_quality === 'gut' ? 'Gute Absorption' : 'Geringe Absorption'}
              </span>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            Impact: {variant.impact_score?.toFixed(1) || 'N/A'}
          </Badge>
        </button>
      ))}
    </div>
  );

  const renderProductSelection = () => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      <Label className="text-sm text-muted-foreground">
        Wähle einen Hersteller für {selectedVariant?.name}
      </Label>
      
      {productsLoading ? (
        <div className="text-center py-4 text-muted-foreground">Lade Produkte...</div>
      ) : (
        <>
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductSelect(product.id)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {product.brand?.name || 'Unbekannt'} - {product.product_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {product.dose_per_serving} {product.dose_unit} pro Portion
                  {product.price_per_serving && ` • €${product.price_per_serving.toFixed(2)}/Tag`}
                </span>
              </div>
              {product.is_recommended && (
                <Badge variant="default" className="text-xs">
                  Empfohlen
                </Badge>
              )}
            </button>
          ))}
          
          <button
            onClick={() => handleProductSelect('custom')}
            className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Eigenes Produkt / Manuell eingeben</span>
          </button>
        </>
      )}
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showCustomForm && !selectedVariant && (
        <div className="space-y-2">
          <Label htmlFor="customName">Supplement Name *</Label>
          <Input
            id="customName"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="z.B. Vitamin D3, Omega-3, etc."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dosage">Dosierung *</Label>
          <Input
            id="dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="z.B. 1000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Einheit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mg">mg</SelectItem>
              <SelectItem value="g">g</SelectItem>
              <SelectItem value="mcg">mcg</SelectItem>
              <SelectItem value="IU">IU</SelectItem>
              <SelectItem value="ml">ml</SelectItem>
              <SelectItem value="Stück">Stück</SelectItem>
              <SelectItem value="Tabletten">Tabletten</SelectItem>
              <SelectItem value="Kapseln">Kapseln</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Einnahmezeiten * (mindestens eine auswählen)</Label>
        <div className="grid grid-cols-2 gap-2">
          {timingOptions.map((timing) => (
            <div key={timing.value} className="flex items-center space-x-2">
              <Checkbox
                id={timing.value}
                checked={selectedTimings.includes(timing.value)}
                onCheckedChange={() => toggleTiming(timing.value)}
              />
              <Label htmlFor={timing.value} className="text-sm">
                {timing.label}
              </Label>
            </div>
          ))}
        </div>
        {selectedTimings.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedTimings.map((timing) => (
              <Badge key={timing} variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getTimingLabel(timing)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal">Ziel (optional)</Label>
        <Input
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="z.B. Immunsystem stärken, Muskelaufbau..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Besonderheiten, Nebenwirkungen, etc."
          className="min-h-[60px] resize-none"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || (!selectedVariant && !customName) || !dosage || selectedTimings.length === 0}
          className="flex-1"
        >
          {isSubmitting ? 'Hinzufügen...' : 'Supplement hinzufügen'}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Supplement hinzufügen
          </DialogTitle>
        </DialogHeader>

        {/* Back Button */}
        {(currentStep !== 'tier' || selectedBase) && !showCustomForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="w-fit -mt-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
        )}

        {/* Breadcrumb Navigation */}
        {renderBreadcrumb()}

        {/* Context Summary */}
        {contextData && currentStep === 'tier' && !selectedBase && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="text-sm space-y-2">
              {contextData.compliance !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Aktuelle Compliance: <span className="font-semibold">{contextData.compliance}%</span></span>
                </div>
              )}
              {contextData.currentSupplements && contextData.currentSupplements.length > 0 && (
                <p>Aktuelle Supplements: <span className="font-semibold">{contextData.currentSupplements.length}</span></p>
              )}
              {contextData.recommendations && contextData.recommendations.length > 0 && (
                <div>
                  <p className="font-semibold text-primary">Coach-Empfehlungen:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contextData.recommendations.map((rec, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {rec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content based on step */}
        <div className="space-y-4">
          {/* Tier Tabs - Always visible except in form */}
          {currentStep !== 'form' && !showCustomForm && renderTierTabs()}
          
          {/* Step Content */}
          {libraryLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Lade Supplement-Datenbank...
            </div>
          ) : showCustomForm ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomName('');
                  setCurrentStep('tier');
                }}
                className="text-sm -mt-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Zurück zur Datenbank
              </Button>
              {renderForm()}
            </>
          ) : currentStep === 'tier' || (currentStep === 'base' && !selectedBase) ? (
            renderBaseSelection()
          ) : currentStep === 'variant' ? (
            renderVariantSelection()
          ) : currentStep === 'product' ? (
            renderProductSelection()
          ) : currentStep === 'form' ? (
            renderForm()
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
