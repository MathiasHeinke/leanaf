import React, { useState, useEffect } from 'react';
import { CollapsibleQuickInput } from './CollapsibleQuickInput';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Pill, Plus, Check, X, Clock, Edit, Trash2, Save } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface SupplementOption {
  id: string;
  name: string;
  category: string;
  default_dosage: string;
  default_unit: string;
  common_timing: string[];
  description: string;
}

interface UserSupplement {
  id: string;
  supplement_id: string | null;
  custom_name: string | null;
  dosage: string;
  unit: string;
  timing: string[];
  goal: string | null;
  rating: number | null;
  notes: string | null;
  frequency_days: number | null;
  supplement_name?: string;
  supplement_category?: string;
}

interface TodayIntake {
  [key: string]: {
    [timing: string]: boolean;
  };
}

const timingOptions = [
  { value: 'morning', label: 'Morgens' },
  { value: 'noon', label: 'Mittags' },
  { value: 'evening', label: 'Abends' },
  { value: 'pre_workout', label: 'Vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training' },
  { value: 'before_bed', label: 'Vor dem Schlafengehen' }
];

export const QuickSupplementInput = () => {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<SupplementOption[]>([]);
  const [userSupplements, setUserSupplements] = useState<UserSupplement[]>([]);
  const [todayIntake, setTodayIntake] = useState<TodayIntake>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [editingSupplementId, setEditingSupplementId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    customName: '',
    dosage: '',
    unit: 'mg',
    timing: [] as string[],
    goal: '',
    notes: ''
  });
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Load supplements and user supplements
  useEffect(() => {
    if (user) {
      loadSupplements();
      loadUserSupplements();
      loadTodayIntake();
    }
  }, [user]);

  // Listen for supplement recommendations from coach
  useEffect(() => {
    const handleSupplementRecommendations = () => {
      if (user) {
        loadUserSupplements();
        loadTodayIntake();
        toast.success('Neue Supplement-Empfehlungen vom Coach hinzugefügt!');
      }
    };

    window.addEventListener('supplement-recommendations-saved', handleSupplementRecommendations);

    return () => {
      window.removeEventListener('supplement-recommendations-saved', handleSupplementRecommendations);
    };
  }, [user]);

  const loadSupplements = async () => {
    const { data, error } = await supabase
      .from('supplement_database')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading supplements:', error);
      return;
    }

    setSupplements(data || []);
  };

  const loadUserSupplements = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_supplements')
      .select(`
        *,
        supplement_database (
          name,
          category
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading user supplements:', error);
      return;
    }

    const supplementsWithNames = data?.map(supplement => ({
      ...supplement,
      supplement_name: supplement.supplement_database?.name || supplement.custom_name,
      supplement_category: supplement.supplement_database?.category
    })) || [];

    setUserSupplements(supplementsWithNames);
  };

  const loadTodayIntake = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('supplement_intake_log')
      .select('user_supplement_id, timing, taken')
      .eq('user_id', user.id)
      .eq('date', today);

    if (error) {
      console.error('Error loading today intake:', error);
      return;
    }

    const intakeMap: TodayIntake = {};
    data?.forEach(record => {
      if (!intakeMap[record.user_supplement_id]) {
        intakeMap[record.user_supplement_id] = {};
      }
      intakeMap[record.user_supplement_id][record.timing] = record.taken;
    });

    setTodayIntake(intakeMap);
  };

  const handleAddSupplement = async () => {
    if (!user || (!selectedSupplement && !customName) || !dosage || selectedTimings.length === 0) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setLoading(true);

    try {
      const supplementData = {
        user_id: user.id,
        supplement_id: selectedSupplement || null,
        custom_name: selectedSupplement ? null : customName,
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
      
      // Reset form
      setSelectedSupplement('');
      setCustomName('');
      setDosage('');
      setUnit('mg');
      setSelectedTimings([]);
      setGoal('');
      setNotes('');
      setShowAddForm(false);
      
      // Reload data
      loadUserSupplements();
      
    } catch (error) {
      console.error('Error adding supplement:', error);
      toast.error('Fehler beim Hinzufügen des Supplements');
    } finally {
      setLoading(false);
    }
  };

  const handleIntakeChange = async (supplementId: string, timing: string, taken: boolean) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('supplement_intake_log')
        .upsert({
          user_id: user.id,
          user_supplement_id: supplementId,
          date: today,
          timing,
          taken
        });

      if (error) throw error;

      setTodayIntake(prev => ({
        ...prev,
        [supplementId]: {
          ...prev[supplementId],
          [timing]: taken
        }
      }));

      if (taken) {
        toast.success('Einnahme markiert');
      }

    } catch (error) {
      console.error('Error updating intake:', error);
      toast.error('Fehler beim Aktualisieren der Einnahme');
    }
  };

  const handleSupplementSelect = (value: string) => {
    setSelectedSupplement(value);
    const supplement = supplements.find(s => s.id === value);
    if (supplement) {
      setDosage(supplement.default_dosage);
      setUnit(supplement.default_unit);
      setSelectedTimings(supplement.common_timing);
    }
  };

  const toggleTiming = (timing: string) => {
    setSelectedTimings(prev => 
      prev.includes(timing) 
        ? prev.filter(t => t !== timing)
        : [...prev, timing]
    );
  };

  const toggleEditTiming = (timing: string) => {
    setEditForm(prev => ({
      ...prev,
      timing: prev.timing.includes(timing) 
        ? prev.timing.filter(t => t !== timing)
        : [...prev.timing, timing]
    }));
  };

  const handleEditSupplement = (supplement: UserSupplement) => {
    setEditingSupplementId(supplement.id);
    setEditForm({
      customName: supplement.custom_name || supplement.supplement_name || '',
      dosage: supplement.dosage,
      unit: supplement.unit,
      timing: supplement.timing,
      goal: supplement.goal || '',
      notes: supplement.notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingSupplementId(null);
    setEditForm({
      customName: '',
      dosage: '',
      unit: 'mg',
      timing: [],
      goal: '',
      notes: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!user || !editingSupplementId || !editForm.dosage || editForm.timing.length === 0) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setEditLoading(true);

    try {
      const { error } = await supabase
        .from('user_supplements')
        .update({
          custom_name: editForm.customName || null,
          dosage: editForm.dosage,
          unit: editForm.unit,
          timing: editForm.timing,
          goal: editForm.goal || null,
          notes: editForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSupplementId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Supplement erfolgreich aktualisiert');
      setEditingSupplementId(null);
      loadUserSupplements();
      
    } catch (error) {
      console.error('Error updating supplement:', error);
      toast.error('Fehler beim Aktualisieren des Supplements');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSupplement = async (supplementId: string) => {
    if (!user) return;

    setDeleteLoading(supplementId);

    try {
      // Soft delete: set is_active to false
      const { error } = await supabase
        .from('user_supplements')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplementId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Supplement erfolgreich entfernt');
      loadUserSupplements();
      loadTodayIntake(); // Refresh today's intake
      
    } catch (error) {
      console.error('Error deleting supplement:', error);
      toast.error('Fehler beim Entfernen des Supplements');
    } finally {
      setDeleteLoading(null);
    }
  };

  const hasSupplements = userSupplements.length > 0;
  const todaySupplements = userSupplements.filter(supplement => 
    supplement.frequency_days === 1 || supplement.frequency_days === null
  );

  // Calculate completion status
  const totalToday = todaySupplements.reduce((sum, supplement) => sum + supplement.timing.length, 0);
  const takenToday = todaySupplements.reduce((sum, supplement) => {
    const taken = Object.values(todayIntake[supplement.id] || {}).filter(Boolean).length;
    return sum + taken;
  }, 0);
  const isCompleted = hasSupplements && totalToday > 0 && takenToday > 0;

  return (
    <CollapsibleQuickInput
      title="Supplemente"
      icon={<Pill className="h-4 w-4" />}
      theme="teal"
      isCompleted={isCompleted}
      defaultOpen={false}
      completedText={hasSupplements ? `${takenToday}/${totalToday} eingenommen` : undefined}
    >
      <div className="space-y-4">
        {/* Today's Supplements Check-off */}
        {todaySupplements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Heutige Einnahme</h4>
            {todaySupplements.map(supplement => (
              <Card key={supplement.id} className="p-3">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{supplement.supplement_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {supplement.dosage} {supplement.unit}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {supplement.timing.map(timing => {
                      const timingLabel = timingOptions.find(t => t.value === timing)?.label || timing;
                      const isTaken = todayIntake[supplement.id]?.[timing] || false;
                      
                      return (
                        <div key={timing} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${supplement.id}-${timing}`}
                            checked={isTaken}
                            onCheckedChange={(checked) => 
                              handleIntakeChange(supplement.id, timing, checked as boolean)
                            }
                          />
                          <label 
                            htmlFor={`${supplement.id}-${timing}`}
                            className={`text-xs cursor-pointer ${isTaken ? 'text-green-600' : 'text-muted-foreground'}`}
                          >
                            {timingLabel}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add new supplement */}
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Supplement hinzufügen
          </Button>
        ) : (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Neues Supplement</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Supplement selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Supplement auswählen
              </label>
              <Select value={selectedSupplement} onValueChange={handleSupplementSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Supplement wählen oder eigenes eingeben" />
                </SelectTrigger>
                <SelectContent>
                  {supplements.map(supplement => (
                    <SelectItem key={supplement.id} value={supplement.id}>
                      <div className="flex flex-col">
                        <span>{supplement.name}</span>
                        <span className="text-xs text-muted-foreground">{supplement.category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom name if no supplement selected */}
            {!selectedSupplement && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Eigener Name
                </label>
                <Input
                  placeholder="z.B. Mein Vitamin Mix"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
            )}

            {/* Dosage */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Dosierung
                </label>
                <Input
                  placeholder="z.B. 500"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Einheit
                </label>
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
                    <SelectItem value="Tablette">Tablette</SelectItem>
                    <SelectItem value="Kapsel">Kapsel</SelectItem>
                    <SelectItem value="Messlöffel">Messlöffel</SelectItem>
                    <SelectItem value="Tropfen">Tropfen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Einnahmezeitpunkt
              </label>
              <div className="flex flex-wrap gap-2">
                {timingOptions.map(timing => (
                  <Badge
                    key={timing.value}
                    variant={selectedTimings.includes(timing.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTiming(timing.value)}
                  >
                    {timing.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Goal (optional) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Ziel (optional)
              </label>
              <Input
                placeholder="z.B. Besserer Schlaf, Muskelaufbau"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            {/* Notes (optional) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Notizen (optional)
              </label>
              <Textarea
                placeholder="Zusätzliche Informationen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            <Button
              onClick={handleAddSupplement}
              disabled={loading || (!selectedSupplement && !customName) || !dosage || selectedTimings.length === 0}
              className="w-full"
              size="sm"
            >
              {loading ? 'Wird hinzugefügt...' : 'Supplement hinzufügen'}
            </Button>
          </Card>
        )}

        {/* List of current supplements */}
        {hasSupplements && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Meine Supplemente</h4>
            <div className="space-y-2">
              {userSupplements.map(supplement => (
                <Card key={supplement.id} className="p-3">
                  {editingSupplementId === supplement.id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium">Supplement bearbeiten</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Name */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Name
                        </label>
                        <Input
                          value={editForm.customName}
                          onChange={(e) => setEditForm(prev => ({ ...prev, customName: e.target.value }))}
                          placeholder="Supplement Name"
                        />
                      </div>

                      {/* Dosage */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Dosierung
                          </label>
                          <Input
                            value={editForm.dosage}
                            onChange={(e) => setEditForm(prev => ({ ...prev, dosage: e.target.value }))}
                            placeholder="z.B. 500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Einheit
                          </label>
                          <Select 
                            value={editForm.unit} 
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mg">mg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="mcg">mcg</SelectItem>
                              <SelectItem value="IU">IU</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="Tablette">Tablette</SelectItem>
                              <SelectItem value="Kapsel">Kapsel</SelectItem>
                              <SelectItem value="Messlöffel">Messlöffel</SelectItem>
                              <SelectItem value="Tropfen">Tropfen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Timing */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Einnahmezeitpunkt
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {timingOptions.map(timing => (
                            <Badge
                              key={timing.value}
                              variant={editForm.timing.includes(timing.value) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => toggleEditTiming(timing.value)}
                            >
                              {timing.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Goal */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Ziel (optional)
                        </label>
                        <Input
                          value={editForm.goal}
                          onChange={(e) => setEditForm(prev => ({ ...prev, goal: e.target.value }))}
                          placeholder="z.B. Besserer Schlaf, Muskelaufbau"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Notizen (optional)
                        </label>
                        <Textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Zusätzliche Informationen..."
                          className="min-h-[60px]"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveEdit}
                          disabled={editLoading || !editForm.dosage || editForm.timing.length === 0}
                          size="sm"
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editLoading ? 'Speichern...' : 'Speichern'}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{supplement.supplement_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplement.dosage} {supplement.unit} • {supplement.timing.map(t => 
                            timingOptions.find(opt => opt.value === t)?.label || t
                          ).join(', ')}
                        </p>
                        {supplement.goal && (
                          <p className="text-xs text-muted-foreground">Ziel: {supplement.goal}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {supplement.supplement_category && (
                          <Badge variant="outline" className="text-xs">
                            {supplement.supplement_category}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSupplement(supplement)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deleteLoading === supplement.id}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supplement entfernen</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Möchten Sie "{supplement.supplement_name}" wirklich aus Ihrer Supplement-Liste entfernen? 
                                  Diese Aktion kann nicht rückgängig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSupplement(supplement.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Entfernen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleQuickInput>
  );
};