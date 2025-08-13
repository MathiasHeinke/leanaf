import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { NumericInput } from './ui/numeric-input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Progress } from './ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Droplets, Plus, X, Clock, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Edit, Trash2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getCurrentDateString } from "@/utils/dateHelpers";
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { de } from 'date-fns/locale';

interface FluidOption {
  id: string;
  name: string;
  category: string;
  default_amount: number;
  calories_per_100ml: number;
  protein_per_100ml?: number;
  carbs_per_100ml?: number;
  fats_per_100ml?: number;
  has_caffeine: boolean;
  has_alcohol: boolean;
  alcohol_percentage: number;
  description: string;
  icon_name: string;
}

interface UserFluid {
  id: string;
  fluid_id: string | null;
  custom_name: string | null;
  amount_ml: number;
  consumed_at: string;
  notes: string | null;
  fluid_name?: string;
  fluid_category?: string;
  has_alcohol?: boolean;
  calories_per_100ml?: number;
  fluid_database?: {
    name: string;
    category: string;
    has_alcohol: boolean;
    calories_per_100ml: number;
    protein_per_100ml?: number;
    carbs_per_100ml?: number;
    fats_per_100ml?: number;
  };
}

interface AlcoholAbstinence {
  id: string;
  is_abstinent: boolean;
  abstinence_start_date: string | null;
  abstinence_reason: string | null;
  notes: string | null;
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
}

export const QuickFluidInput = ({ onFluidUpdate }: QuickFluidInputProps = {}) => {
  const { user } = useAuth();
  const [fluids, setFluids] = useState<FluidOption[]>([]);
  const [todaysFluids, setTodaysFluids] = useState<UserFluid[]>([]);
  const [alcoholAbstinence, setAlcoholAbstinence] = useState<AlcoholAbstinence | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAbstinenceForm, setShowAbstinenceForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFluid, setSelectedFluid] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [amount, setAmount] = useState<string>('250');
  const [notes, setNotes] = useState('');
  const [abstinenceStartDate, setAbstinenceStartDate] = useState<Date | undefined>(undefined);
  const [abstinenceReason, setAbstinenceReason] = useState('');
  const [abstinenceNotes, setAbstinenceNotes] = useState('');
  
  // Editing state
  const [editingFluidId, setEditingFluidId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadFluids();
      loadTodaysFluids();
      loadAlcoholAbstinence();
    }
  }, [user]);

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

  const loadTodaysFluids = async () => {
    if (!user) return;

    const today = getCurrentDateString();
    
    const { data, error } = await supabase
      .from('user_fluids')
      .select(`
        *,
        fluid_database (
          name,
          category,
          has_alcohol,
          calories_per_100ml,
          protein_per_100ml,
          carbs_per_100ml,
          fats_per_100ml
        )
      `)
      .eq('user_id', user.id)
      .eq('date', today)
      .order('consumed_at', { ascending: false });

    if (error) {
      console.error('Error loading today\'s fluids:', error);
      return;
    }

    const fluidsWithNames = data?.map(fluid => ({
      ...fluid,
      fluid_name: fluid.fluid_database?.name || fluid.custom_name,
      fluid_category: fluid.fluid_database?.category,
      has_alcohol: fluid.fluid_database?.has_alcohol || false,
      calories_per_100ml: fluid.fluid_database?.calories_per_100ml || 0
    })) || [];

    setTodaysFluids(fluidsWithNames);
  };

  const loadAlcoholAbstinence = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_alcohol_abstinence')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading alcohol abstinence:', error);
      return;
    }

    setAlcoholAbstinence(data);
  };

  const addQuickFluid = async (amountMl: number, name: string) => {
    if (!user) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_fluids')
        .insert([{ user_id: user.id, fluid_id: null, custom_name: name, amount_ml: amountMl, notes: null }]);
      if (error) throw error;
      toast.success(`${amountMl}ml ${name} hinzugefügt`);
      await loadTodaysFluids();
      onFluidUpdate?.();
      triggerDataRefresh();
    } catch (e) {
      console.error('Error quick-adding fluid:', e);
      toast.error('Fehler beim schnellen Hinzufügen');
    } finally {
      setLoading(false);
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
      const fluidData = {
        user_id: user.id,
        fluid_id: selectedFluid || null,
        custom_name: selectedFluid ? null : customName,
        amount_ml: amountValue,
        notes: notes || null
      };

      const { error } = await supabase
        .from('user_fluids')
        .insert([fluidData]);

      if (error) throw error;

      toast.success('Getränk erfolgreich hinzugefügt');
      
      // Reset form
      setSelectedFluid('');
      setCustomName('');
      setAmount('250');
      setNotes('');
      setShowAddForm(false);
      
      // Reload data
      loadTodaysFluids();
      
      // Trigger parent update to refresh main page
      onFluidUpdate?.();
      
      // Global refresh for header/mission
      triggerDataRefresh();
    } catch (error) {
      console.error('Error adding fluid:', error);
      toast.error('Fehler beim Hinzufügen des Getränks');
    } finally {
      setLoading(false);
    }
  };

  const handleFluidSelect = (value: string) => {
    setSelectedFluid(value);
    const fluid = fluids.find(f => f.id === value);
    if (fluid) {
      setAmount(String(fluid.default_amount));
    }
  };

  const handleSetAbstinence = async () => {
    if (!user || !abstinenceStartDate) {
      toast.error('Bitte ein Startdatum für die Abstinenz auswählen');
      return;
    }

    setLoading(true);

    try {
      const abstinenceData = {
        user_id: user.id,
        is_abstinent: true,
        abstinence_start_date: abstinenceStartDate.toISOString().split('T')[0],
        abstinence_reason: abstinenceReason || null,
        notes: abstinenceNotes || null
      };

      const { error } = await supabase
        .from('user_alcohol_abstinence')
        .upsert([abstinenceData]);

      if (error) throw error;

      toast.success('Alkohol-Abstinenz erfolgreich eingetragen');
      
      // Reset form
      setAbstinenceStartDate(undefined);
      setAbstinenceReason('');
      setAbstinenceNotes('');
      setShowAbstinenceForm(false);
      
      // Reload data
      loadAlcoholAbstinence();
      
      // Trigger parent update to refresh main page
      onFluidUpdate?.();
      
    } catch (error) {
      console.error('Error setting abstinence:', error);
      toast.error('Fehler beim Eintragen der Abstinenz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFluid = async (fluidId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_fluids')
        .delete()
        .eq('id', fluidId);

      if (error) throw error;

      toast.success('Getränk gelöscht');
      loadTodaysFluids();
      onFluidUpdate?.();
      triggerDataRefresh();
    } catch (error) {
      console.error('Error deleting fluid:', error);
      toast.error('Fehler beim Löschen des Getränks');
    }
  };

  const handleEditFluid = (fluid: UserFluid) => {
    setEditingFluidId(fluid.id);
    setEditAmount(fluid.amount_ml.toString());
    setEditNotes(fluid.notes || '');
  };

  const handleSaveEdit = async (fluidId: string) => {
    if (!user || !editAmount) return;

    const amountValue = parseFloat(editAmount);
    if (isNaN(amountValue)) {
      toast.error('Ungültiger Mengenwert');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_fluids')
        .update({
          amount_ml: amountValue,
          notes: editNotes || null
        })
        .eq('id', fluidId);

      if (error) throw error;

      toast.success('Getränk aktualisiert');
      setEditingFluidId(null);
      setEditAmount('');
      setEditNotes('');
      loadTodaysFluids();
      onFluidUpdate?.();
      triggerDataRefresh();
    } catch (error) {
      console.error('Error updating fluid:', error);
      toast.error('Fehler beim Aktualisieren des Getränks');
    }
  };

  const handleCancelEdit = () => {
    setEditingFluidId(null);
    setEditAmount('');
    setEditNotes('');
  };

  const handleDuplicateFluid = async (fluid: UserFluid) => {
    if (!user) return;

    try {
      const duplicateData = {
        user_id: user.id,
        fluid_id: fluid.fluid_id,
        custom_name: fluid.custom_name,
        amount_ml: fluid.amount_ml,
        notes: fluid.notes ? `${fluid.notes} (Kopie)` : 'Kopie'
      };

      const { error } = await supabase
        .from('user_fluids')
        .insert([duplicateData]);

      if (error) throw error;

      toast.success('Getränk dupliziert');
      loadTodaysFluids();
      onFluidUpdate?.();
    } catch (error) {
      console.error('Error duplicating fluid:', error);
      toast.error('Fehler beim Duplizieren des Getränks');
    }
  };

  const calculateAbstinenceDays = () => {
    if (!alcoholAbstinence?.abstinence_start_date) return 0;
    
    const startDate = new Date(alcoholAbstinence.abstinence_start_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTotalWaterIntake = () => {
    return todaysFluids
      .filter(f => f.fluid_category === 'water')
      .reduce((sum, f) => sum + f.amount_ml, 0);
  };

  const getTotalCaloriesFromDrinks = () => {
    return todaysFluids.reduce((sum, f) => {
      const calories = (f.calories_per_100ml || 0) * (f.amount_ml / 100);
      return sum + calories;
    }, 0);
  };

  const getTotalMacrosFromDrinks = () => {
    return todaysFluids.reduce((totals, f) => {
      const factor = f.amount_ml / 100;
      return {
        protein: totals.protein + ((f.fluid_database?.protein_per_100ml || 0) * factor),
        carbs: totals.carbs + ((f.fluid_database?.carbs_per_100ml || 0) * factor),
        fats: totals.fats + ((f.fluid_database?.fats_per_100ml || 0) * factor)
      };
    }, { protein: 0, carbs: 0, fats: 0 });
  };

  const hasAlcoholToday = todaysFluids.some(f => f.has_alcohol);
  const totalWater = getTotalWaterIntake();
  const totalCalories = getTotalCaloriesFromDrinks();
  const totalMacros = getTotalMacrosFromDrinks();
  
  // Calculate completion status
  const hasFluidEntries = todaysFluids.length > 0;
  const totalFluidAmount = todaysFluids.reduce((sum, f) => sum + f.amount_ml, 0);
  const isCompleted = hasFluidEntries;
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Calculate progress toward daily water goal (2000ml)
  const waterGoal = 2000;
  const waterProgress = Math.min((totalWater / waterGoal) * 100, 100);

  // Smart chip actions
  const smartChips = [
    { label: "+250ml Wasser", action: () => addQuickFluid(250, 'Wasser') },
    { label: "+500ml Wasser", action: () => addQuickFluid(500, 'Wasser') },
    { label: "+200ml Kaffee", action: () => addQuickFluid(200, 'Kaffee') }
  ];

  return (
    <Card className="relative">
      <span className="pointer-events-none absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-destructive/30 animate-[pulse_3s_ease-in-out_infinite]" aria-hidden />
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center gap-3 p-5" onClick={() => isCollapsed && setIsCollapsed(false)}>
          <Droplets className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-base font-semibold">Flüssigkeiten</h3>
            {isCollapsed && hasFluidEntries && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {totalWater}ml • {Math.round(waterProgress)}% Ziel
                </span>
                <Progress value={waterProgress} className="h-1 w-16" />
              </div>
            )}
            {isCollapsed && (
              <div className="flex gap-1 mt-2">
                {smartChips.map((chip, index) => (
                  <Button 
                    key={index}
                    variant="outline" 
                    size="sm" 
                    onClick={chip.action}
                    className="text-xs h-6 px-2"
                  >
                    {chip.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className={cn("h-4 w-4 transition-transform", !isCollapsed && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Card className="p-2">
            <div className="text-center">
              <p className="text-lg font-bold text-cyan-600">{totalWater}ml</p>
              <p className="text-xs text-muted-foreground">Wasser heute</p>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">{Math.round(totalCalories)}</p>
              <p className="text-xs text-muted-foreground">Kalorien aus Getränken</p>
            </div>
          </Card>
        </div>

        {/* Macros from Drinks */}
        {(totalMacros.protein > 0 || totalMacros.carbs > 0 || totalMacros.fats > 0) && (
          <Card className="p-3 mb-2">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Makronährstoffe aus Getränken</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-semibold text-blue-600">{Math.round(totalMacros.protein * 10) / 10}g</p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-600">{Math.round(totalMacros.carbs * 10) / 10}g</p>
                <p className="text-xs text-muted-foreground">Kohlenhydrate</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-600">{Math.round(totalMacros.fats * 10) / 10}g</p>
                <p className="text-xs text-muted-foreground">Fette</p>
              </div>
            </div>
          </Card>
        )}

        {/* Alcohol Abstinence Status */}
        {alcoholAbstinence?.is_abstinent && (
          <Card className="p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Alkoholfrei seit {calculateAbstinenceDays()} Tagen
                </p>
                {alcoholAbstinence.abstinence_reason && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {alcoholAbstinence.abstinence_reason}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Warning if alcohol consumed today and abstinent */}
        {hasAlcoholToday && alcoholAbstinence?.is_abstinent && (
          <Card className="p-3 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Alkohol wurde heute getrunken - Abstinenz unterbrochen
              </p>
            </div>
          </Card>
        )}

        {/* Today's Fluids List */}
        {todaysFluids.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Heute getrunken</h4>
            <div className="space-y-2">
              {todaysFluids.map(fluid => {
                const isEditing = editingFluidId === fluid.id;
                
                return (
                  <Card key={fluid.id} className="p-3">
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{fluid.fluid_name}</p>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEdit(fluid.id)}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Menge (ml)</label>
                            <NumericInput
                              value={editAmount}
                              onChange={setEditAmount}
                              className="h-8 text-sm"
                              allowDecimals={false}
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Zeit</label>
                            <p className="text-xs pt-2 text-muted-foreground">
                              {format(new Date(fluid.consumed_at), 'HH:mm', { locale: de })}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-muted-foreground">Notizen</label>
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="h-16 text-sm resize-none"
                            placeholder="Notizen..."
                          />
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{fluid.fluid_name}</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>{fluid.amount_ml}ml • {format(new Date(fluid.consumed_at), 'HH:mm', { locale: de })}</p>
                            {(fluid.fluid_database?.calories_per_100ml || 0) > 0 && (
                              <p className="text-orange-600">
                                {Math.round((fluid.fluid_database?.calories_per_100ml || 0) * (fluid.amount_ml / 100))} kcal
                              </p>
                            )}
                            {/* Show macros if available */}
                            {((fluid.fluid_database?.protein_per_100ml || 0) > 0 || 
                              (fluid.fluid_database?.carbs_per_100ml || 0) > 0 || 
                              (fluid.fluid_database?.fats_per_100ml || 0) > 0) && (
                              <div className="flex gap-2 text-xs">
                                {(fluid.fluid_database?.protein_per_100ml || 0) > 0 && (
                                  <span className="text-blue-600">
                                    P: {Math.round((fluid.fluid_database?.protein_per_100ml || 0) * (fluid.amount_ml / 100) * 10) / 10}g
                                  </span>
                                )}
                                {(fluid.fluid_database?.carbs_per_100ml || 0) > 0 && (
                                  <span className="text-green-600">
                                    C: {Math.round((fluid.fluid_database?.carbs_per_100ml || 0) * (fluid.amount_ml / 100) * 10) / 10}g
                                  </span>
                                )}
                                {(fluid.fluid_database?.fats_per_100ml || 0) > 0 && (
                                  <span className="text-yellow-600">
                                    F: {Math.round((fluid.fluid_database?.fats_per_100ml || 0) * (fluid.amount_ml / 100) * 10) / 10}g
                                  </span>
                                )}
                              </div>
                            )}
                            {fluid.notes && (
                              <p className="text-muted-foreground">{fluid.notes}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {fluid.fluid_category && (
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[fluid.fluid_category as keyof typeof categoryLabels] || fluid.fluid_category}
                            </Badge>
                          )}
                          {fluid.has_alcohol && (
                            <Badge variant="destructive" className="text-xs">
                              Alkohol
                            </Badge>
                          )}
                          
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditFluid(fluid)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicateFluid(fluid)}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteFluid(fluid.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Fluid Button */}
        {!showAddForm && !showAbstinenceForm ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Getränk hinzufügen
            </Button>
            {!alcoholAbstinence?.is_abstinent && (
              <Button
                onClick={() => setShowAbstinenceForm(true)}
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                Alkoholfrei
              </Button>
            )}
          </div>
        ) : null}

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
              <Select value={selectedFluid} onValueChange={handleFluidSelect}>
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
                                <div>{fluid.default_amount}ml • {fluid.calories_per_100ml > 0 ? `${fluid.calories_per_100ml} kcal/100ml` : 'kalorienfrei'}</div>
                                {/* Show macros in selection if available */}
                                {((fluid.protein_per_100ml || 0) > 0 || (fluid.carbs_per_100ml || 0) > 0 || (fluid.fats_per_100ml || 0) > 0) && (
                                  <div className="flex gap-1 mt-1">
                                    {(fluid.protein_per_100ml || 0) > 0 && <span className="text-blue-600">P:{fluid.protein_per_100ml}g</span>}
                                    {(fluid.carbs_per_100ml || 0) > 0 && <span className="text-green-600">C:{fluid.carbs_per_100ml}g</span>}
                                    {(fluid.fats_per_100ml || 0) > 0 && <span className="text-yellow-600">F:{fluid.fats_per_100ml}g</span>}
                                  </div>
                                )}
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

        {/* Abstinence Form */}
        {showAbstinenceForm && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Alkohol-Abstinenz eintragen</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAbstinenceForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Abstinenz-Startdatum *
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !abstinenceStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {abstinenceStartDate ? format(abstinenceStartDate, "dd.MM.yyyy", { locale: de }) : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={abstinenceStartDate}
                    onSelect={setAbstinenceStartDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Grund (optional)
              </label>
              <Input
                placeholder="z.B. Gesundheit, Sport, persönliche Gründe"
                value={abstinenceReason}
                onChange={(e) => setAbstinenceReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Notizen (optional)
              </label>
              <Input
                placeholder="Zusätzliche Informationen..."
                value={abstinenceNotes}
                onChange={(e) => setAbstinenceNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSetAbstinence}
              disabled={loading || !abstinenceStartDate}
              className="w-full"
              size="sm"
            >
              {loading ? 'Wird gespeichert...' : 'Abstinenz eintragen'}
            </Button>
          </Card>
        )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};