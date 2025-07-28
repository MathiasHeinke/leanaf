import React, { useState, useEffect } from 'react';
import { CollapsibleQuickInput } from './CollapsibleQuickInput';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Droplets, Plus, X, Clock, Calendar as CalendarIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface FluidOption {
  id: string;
  name: string;
  category: string;
  default_amount: number;
  calories_per_100ml: number;
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

export const QuickFluidInput = () => {
  const { user } = useAuth();
  const [fluids, setFluids] = useState<FluidOption[]>([]);
  const [todaysFluids, setTodaysFluids] = useState<UserFluid[]>([]);
  const [alcoholAbstinence, setAlcoholAbstinence] = useState<AlcoholAbstinence | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAbstinenceForm, setShowAbstinenceForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFluid, setSelectedFluid] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [amount, setAmount] = useState<number>(250);
  const [notes, setNotes] = useState('');
  const [abstinenceStartDate, setAbstinenceStartDate] = useState<Date | undefined>(undefined);
  const [abstinenceReason, setAbstinenceReason] = useState('');
  const [abstinenceNotes, setAbstinenceNotes] = useState('');

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

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('user_fluids')
      .select(`
        *,
        fluid_database (
          name,
          category,
          has_alcohol,
          calories_per_100ml
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
    if (!user || (!selectedFluid && !customName) || !amount) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setLoading(true);

    try {
      const fluidData = {
        user_id: user.id,
        fluid_id: selectedFluid || null,
        custom_name: selectedFluid ? null : customName,
        amount_ml: amount,
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
      setAmount(250);
      setNotes('');
      setShowAddForm(false);
      
      // Reload data
      loadTodaysFluids();
      
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
      setAmount(fluid.default_amount);
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
      
    } catch (error) {
      console.error('Error setting abstinence:', error);
      toast.error('Fehler beim Eintragen der Abstinenz');
    } finally {
      setLoading(false);
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

  const hasAlcoholToday = todaysFluids.some(f => f.has_alcohol);
  const totalWater = getTotalWaterIntake();
  const totalCalories = getTotalCaloriesFromDrinks();

  return (
    <CollapsibleQuickInput
      title="Flüssigkeiten"
      icon={<Droplets className="h-4 w-4" />}
      theme="cyan"
      isCompleted={false}
      defaultOpen={false}
    >
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2">
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
              {todaysFluids.map(fluid => (
                <Card key={fluid.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{fluid.fluid_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fluid.amount_ml}ml • {format(new Date(fluid.consumed_at), 'HH:mm', { locale: de })}
                      </p>
                      {fluid.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{fluid.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
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
                    </div>
                  </div>
                </Card>
              ))}
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
                              <span className="text-xs text-muted-foreground">
                                {fluid.default_amount}ml • {fluid.calories_per_100ml > 0 ? `${fluid.calories_per_100ml} kcal/100ml` : 'kalorienfrei'}
                              </span>
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
              <Input
                type="number"
                placeholder="250"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
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
              disabled={loading || (!selectedFluid && !customName) || !amount}
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
    </CollapsibleQuickInput>
  );
};