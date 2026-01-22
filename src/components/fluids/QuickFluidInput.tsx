import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { NumericInput } from '../ui/numeric-input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Progress } from '../ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Droplets, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { SmartChip } from '../ui/smart-chip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { saveFluid, type FluidModern } from "@/ares/adapters/fluids";
import { useTodaysFluids } from '@/hooks/useTodaysFluids';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';

interface FluidOption {
  id: string;
  name: string;
  category: string;
  default_amount: number;
  calories_per_100ml: number;
  has_alcohol: boolean;
  description: string;
}

const categoryLabels = {
  water: 'Wasser',
  coffee: 'Kaffee', 
  tea: 'Tee',
  alcohol: 'Alkohol',
  soft_drinks: 'Softdrinks',
  juices: 'Säfte',
  dairy: 'Milchprodukte',
  other: 'Sonstiges'
};

interface QuickFluidInputProps {
  onFluidUpdate?: () => void;
  currentDate?: Date;
}

export const QuickFluidInput = ({ onFluidUpdate, currentDate }: QuickFluidInputProps = {}) => {
  const { user } = useAuth();
  const { data: todaysFluidData, loading: fluidsLoading } = useTodaysFluids();
  const [fluids, setFluids] = useState<FluidOption[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFluid, setSelectedFluid] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [amount, setAmount] = useState<string>('250');
  const [notes, setNotes] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    loadFluids();
  }, []);

  const loadFluids = async () => {
    const { data, error } = await supabase
      .from('fluid_database')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading fluids:', error);
      return;
    }

    setFluids(data || []);
  };

  const addFluidDirectly = async (fluidId: string | null, customFluidName: string | null, amountMl: number) => {
    if (!user) {
      toast.error('Benutzer nicht angemeldet');
      return;
    }

    try {
      // Use ARES adapter for consistent fluid saving
      const modernFluid: FluidModern = {
        volume_ml: amountMl,
        intake_date: new Date().toISOString(),
        fluid_type: fluidId ? fluids.find(f => f.id === fluidId)?.name || 'water' : customFluidName || 'water',
        has_alcohol: fluidId ? fluids.find(f => f.id === fluidId)?.has_alcohol || false : false,
        timestamp: new Date().toISOString()
      };

      await saveFluid(
        modernFluid, 
        user.id, 
        fluidId, 
        customFluidName, 
        `fluid_${Date.now()}`
      );

      const fluidName = fluidId 
        ? fluids.find(f => f.id === fluidId)?.name || 'Getränk'
        : customFluidName || 'Getränk';
      
      toast.success(`${amountMl}ml ${fluidName} hinzugefügt`);
      triggerDataRefresh(); // Notify all fluid-related components to refresh
      onFluidUpdate?.();
    } catch (error) {
      console.error('Error adding fluid directly:', error);
      toast.error('Fehler beim Hinzufügen des Getränks');
    }
  };

  const handleAddFluid = async () => {
    const amountValue = parseFloat(amount);
    if (!user || (!selectedFluid && !customName) || !amount || isNaN(amountValue)) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setLoading(true);

    try {
      // Use ARES adapter for consistent fluid saving
      const modernFluid: FluidModern = {
        volume_ml: amountValue,
        intake_date: new Date().toISOString(),
        fluid_type: selectedFluid ? fluids.find(f => f.id === selectedFluid)?.name || 'water' : customName || 'water',
        has_alcohol: selectedFluid ? fluids.find(f => f.id === selectedFluid)?.has_alcohol || false : false,
        timestamp: new Date().toISOString()
      };

      await saveFluid(
        modernFluid, 
        user.id, 
        selectedFluid || null, 
        selectedFluid ? null : customName, 
        `fluid_${Date.now()}`
      );

      toast.success('Getränk erfolgreich hinzugefügt');
      
      // Reset form
      setSelectedFluid('');
      setCustomName('');
      setAmount('250');
      setNotes('');
      setShowAddForm(false);
      
      triggerDataRefresh(); // Notify all fluid-related components to refresh
      onFluidUpdate?.();
    } catch (error) {
      console.error('Error adding fluid:', error);
      toast.error('Fehler beim Hinzufügen des Getränks');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from modern fluid data
  const totalVolume = todaysFluidData?.reduce((sum, fluid) => sum + fluid.volume_ml, 0) || 0;
  const waterGoal = 2500; // From ARES goals adapter
  const waterProgress = Math.min((totalVolume / waterGoal) * 100, 100);
  const hasAlcoholToday = todaysFluidData?.some(f => f.has_alcohol) || false;

  // Generate smart chips for quick adding
  const generateSmartChips = () => {
    const waterDrink = fluids.find(f => f.category === 'water');
    return [
      { label: "+ 250ml Wasser", action: () => addFluidDirectly(waterDrink?.id || null, 'Wasser', 250) },
      { label: "+ 500ml Wasser", action: () => addFluidDirectly(waterDrink?.id || null, 'Wasser', 500) },
      { label: "+ 200ml Kaffee", action: () => addFluidDirectly(null, 'Kaffee', 200) }
    ];
  };

  const smartChips = generateSmartChips();

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <Card className="p-4">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Flüssigkeiten</h2>
            </div>
            <button
              type="button"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              {!isCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </CollapsibleTrigger>

        {/* Collapsed summary */}
        {isCollapsed && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="font-medium">
                {Math.round(totalVolume)}ml / {waterGoal}ml
              </div>
              <Progress
                className="h-2 w-24 md:w-32"
                value={waterProgress}
                aria-label="Hydration progress"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hasAlcoholToday ? "destructive" : "secondary"}>
                {hasAlcoholToday ? 'Alkohol' : 'Alkoholfrei'}
              </Badge>
            </div>
            
            {/* Smart Chips - always show */}
            <div className="flex gap-1 overflow-x-auto">
              {smartChips.slice(0, 3).map((chip, index) => (
                <SmartChip
                  key={index}
                  variant="fluid"
                  size="sm"
                  onClick={() => { chip.action(); setIsCollapsed(false); }}
                >
                  {chip.label}
                </SmartChip>
              ))}
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="pt-4 space-y-4">
            {/* Smart Chips - expanded view */}
            <div className="flex gap-1 overflow-x-auto">
              {smartChips.map((chip, index) => (
                <SmartChip
                  key={index}
                  variant="fluid"
                  size="default"
                  onClick={chip.action}
                >
                  {chip.label}
                </SmartChip>
              ))}
            </div>

            {/* Progress display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Flüssigkeiten heute</span>
                <Badge variant="outline">
                  {Math.round(waterProgress)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-medium text-blue-600 dark:text-blue-400">
                  {Math.round(totalVolume)} ml
                </div>
                <div className="text-sm text-muted-foreground">
                  Ziel: {waterGoal} ml
                </div>
                <Progress 
                  value={waterProgress} 
                  className="h-3 bg-blue-100 dark:bg-blue-800/50"
                />
              </div>
            </div>

            {/* Add Fluid Button */}
            {!showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Getränk hinzufügen
              </Button>
            )}

            {/* Add Fluid Form */}
            {showAddForm && (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Getränk hinzufügen</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Fluid selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Getränk auswählen
                  </label>
                  <Select value={selectedFluid} onValueChange={setSelectedFluid}>
                    <SelectTrigger>
                      <SelectValue placeholder="Getränk wählen oder eigenes eingeben" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Object.entries(categoryLabels).map(([category, label]) => {
                        const categoryFluids = fluids.filter(f => f.category === category);
                        if (categoryFluids.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                              {label}
                            </div>
                            {categoryFluids.map(fluid => (
                              <SelectItem key={fluid.id} value={fluid.id}>
                                <div className="flex flex-col">
                                  <span>{fluid.name}</span>
                                  <div className="text-xs text-muted-foreground">
                                    {fluid.default_amount}ml • {fluid.calories_per_100ml > 0 ? `${fluid.calories_per_100ml} kcal/100ml` : 'kalorienfrei'}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom name if no fluid selected */}
                {!selectedFluid && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Eigenes Getränk
                    </label>
                    <Input
                      placeholder="z.B. Hausgemachter Eistee"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Menge (ml)
                  </label>
                  <NumericInput
                    placeholder="250"
                    value={amount}
                    onChange={setAmount}
                    allowDecimals={false}
                    min={1}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Notizen (optional)
                  </label>
                  <Input
                    placeholder="z.B. mit Eis, warm, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleAddFluid}
                  disabled={loading || (!selectedFluid && !customName) || !amount || isNaN(parseFloat(amount))}
                  className="w-full"
                  size="sm"
                >
                  {loading ? 'Wird hinzugefügt...' : 'Getränk hinzufügen'}
                </Button>
              </Card>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};