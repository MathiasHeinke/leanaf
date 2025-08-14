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
import { Droplets, Plus, X, Clock, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Edit, Trash2, Copy, Check, ChevronDown } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(hasFluidEntries);
  const [showFluids, setShowFluids] = useState(false);

  // Calculate progress toward daily water goal (2000ml)
  const waterGoal = 2000;
  const waterProgress = Math.min((totalWater / waterGoal) * 100, 100);

  // Smart chip actions
  const smartChips = [
    { label: "💧 250ml Wasser", action: () => { setSelectedFluid(''); setCustomName('Wasser'); setAmount('250'); setShowAddForm(true); } },
    { label: "💧 500ml Wasser", action: () => { setSelectedFluid(''); setCustomName('Wasser'); setAmount('500'); setShowAddForm(true); } },
    { label: "☕ Kaffee", action: () => { setSelectedFluid(''); setCustomName('Kaffee'); setAmount('200'); setShowAddForm(true); } },
    { label: "🍵 Tee", action: () => { setSelectedFluid(''); setCustomName('Tee'); setAmount('250'); setShowAddForm(true); } }
  ];

  // Fluid Pills Component
  const FluidPill: React.FC<{ label: string; value: string; color: string; progress?: number }> = ({ label, value, color, progress }) => (
    <div className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800 rounded-lg px-3 py-2`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold text-${color}-600 dark:text-${color}-400`}>{value}</div>
      {progress !== undefined && (
        <Progress value={progress} className={`h-1 mt-1 bg-${color}-100 dark:bg-${color}-800`} />
      )}
    </div>
  );

  // FluidRow Component
  const FluidRow: React.FC<{ 
    fluid: UserFluid; 
    onEdit: (fluid: UserFluid) => void; 
    onDelete: (id: string) => void; 
    onDuplicate: (fluid: UserFluid) => void; 
  }> = ({ fluid, onEdit, onDelete, onDuplicate }) => {
    const isEditing = editingFluidId === fluid.id;

    if (isEditing) {
      return (
        <Card className="p-3">
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
        </Card>
      );
    }

    return (
      <Card className="p-3">
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
                onClick={() => onEdit(fluid)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDuplicate(fluid)}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(fluid.id)}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Card className="glass-card shadow-lg border border-primary/20">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center gap-3 p-5">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-foreground">Flüssigkeiten</div>
            <div className="text-sm text-muted-foreground font-normal">Hydration heute</div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className={cn("h-4 w-4 transition-transform", !isCollapsed && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsed State - Fluid Pills */}
        {isCollapsed && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <FluidPill 
                label="Wasser" 
                value={`${totalWater}ml`} 
                color="blue" 
                progress={waterProgress}
              />
              <FluidPill 
                label="Kalorien" 
                value={`${Math.round(totalCalories)}`} 
                color="orange" 
              />
              <FluidPill 
                label={hasAlcoholToday ? "Alkohol" : "Status"} 
                value={hasAlcoholToday ? "getrunken" : "nüchtern"} 
                color={hasAlcoholToday ? "red" : "green"} 
              />
            </div>
            
            {/* Smart Chips - only show when no entries */}
            {!hasFluidEntries && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Häufig getrunken:</div>
                <div className="flex flex-wrap gap-1">
                  {smartChips.map((chip, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      size="sm" 
                      onClick={() => { chip.action(); setIsCollapsed(false); }}
                      className="text-xs h-6 px-2 hover:bg-primary/10 border-primary/20"
                    >
                      {chip.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Summary Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wasser heute</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(waterProgress)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalWater} ml
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

            {/* Daily Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Kalorien aus Getränken</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {Math.round(totalCalories)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className={`text-lg font-bold flex items-center gap-1 ${hasAlcoholToday ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {hasAlcoholToday ? 'Alkohol' : 'Nüchtern'}
                </div>
              </div>
            </div>

            {/* Alcohol Abstinence Status */}
            {alcoholAbstinence?.is_abstinent && (
              <div className="text-sm text-green-600 dark:text-green-400 font-medium border-t pt-4">
                ✅ Alkoholfrei seit {calculateAbstinenceDays()} Tagen
                {alcoholAbstinence.abstinence_reason && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {alcoholAbstinence.abstinence_reason}
                  </div>
                )}
              </div>
            )}

            {/* Warning if alcohol consumed today and abstinent */}
            {hasAlcoholToday && alcoholAbstinence?.is_abstinent && (
              <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium border-t pt-4">
                ⚠️ Alkohol wurde heute getrunken - Abstinenz unterbrochen
              </div>
            )}

            {/* Getränke anzeigen/ausblenden */}
            {todaysFluids.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowFluids(!showFluids)}
                  className="w-full justify-between p-0 h-auto font-normal"
                >
                  <span className="text-sm">Getränke {showFluids ? 'ausblenden' : 'anzeigen'}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showFluids && "rotate-180")} />
                </Button>

                <Collapsible open={showFluids} onOpenChange={setShowFluids}>
                  <CollapsibleContent>
                    <div className="space-y-2">
                      {todaysFluids.map((fluid) => (
                        <FluidRow key={fluid.id} fluid={fluid} onEdit={handleEditFluid} onDelete={handleDeleteFluid} onDuplicate={handleDuplicateFluid} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};