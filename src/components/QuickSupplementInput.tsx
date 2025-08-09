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
import { Pill, Plus, Check, X, Clock, Edit, Trash2, Save, Sun, Utensils, Dumbbell, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { getCurrentDateString } from "@/utils/dateHelpers";
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';

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
  is_active?: boolean;
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
  { value: 'before_bed', label: 'Vor dem Schlafengehen' },
  { value: 'with_meals', label: 'Zu den Mahlzeiten' }
];

// Helper function to get German label for timing value
const getTimingLabel = (timing: string): string => {
  const option = timingOptions.find(opt => opt.value === timing);
  return option ? option.label : timing;
};

// Time group definitions
const timeGroups = [
  {
    id: 'morning',
    title: '🌅 Morgens/Nüchtern',
    timings: ['morning'],
    icon: Sun,
    description: 'Auf nüchternen Magen'
  },
  {
    id: 'meals',
    title: '🍽️ Zu den Mahlzeiten',
    timings: ['with_meals', 'noon'],
    icon: Utensils,
    description: 'Mit oder nach dem Essen'
  },
  {
    id: 'training',
    title: '🏋️ Training',
    timings: ['pre_workout', 'post_workout'],
    icon: Dumbbell,
    description: 'Rund ums Training'
  },
  {
    id: 'evening',
    title: '🌙 Abends/Vor dem Schlafen',
    timings: ['evening', 'before_bed'],
    icon: Moon,
    description: 'Abends oder vor dem Schlafen'
  }
];

// Helper function to group supplements by time
const groupSupplementsByTime = (supplements: UserSupplement[]) => {
  const groups: { [key: string]: UserSupplement[] } = {};
  
  timeGroups.forEach(group => {
    groups[group.id] = [];
  });
  
  supplements.forEach(supplement => {
    const addedToGroups = new Set<string>();
    
    supplement.timing.forEach(timing => {
      timeGroups.forEach(group => {
        if (group.timings.includes(timing) && !addedToGroups.has(group.id)) {
          groups[group.id].push(supplement);
          addedToGroups.add(group.id);
        }
      });
    });
  });
  
  // Sort supplements within each group alphabetically
  Object.keys(groups).forEach(groupId => {
    groups[groupId].sort((a, b) => 
      (a.supplement_name || '').localeCompare(b.supplement_name || '')
    );
  });
  
  return groups;
};

// Helper function to get current time-based default open groups
const getDefaultOpenGroups = () => {
  const currentHour = new Date().getHours();
  const openGroups: string[] = [];
  
  if (currentHour >= 6 && currentHour < 12) {
    openGroups.push('morning');
  } else if (currentHour >= 12 && currentHour < 18) {
    openGroups.push('meals');
  } else if (currentHour >= 18 || currentHour < 6) {
    openGroups.push('evening');
  }
  
  return openGroups;
};

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
  const [openGroups, setOpenGroups] = useState<string[]>(getDefaultOpenGroups());

  const { awardPoints, getPointsForActivity, updateStreak } = usePointsSystem();

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
    try {
      const { data, error } = await supabase
        .from('supplement_database')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading supplements:', error);
        toast.error('Fehler beim Laden der Supplement-Datenbank');
        return;
      }

      setSupplements(data || []);
    } catch (error) {
      console.error('Critical error loading supplements:', error);
      toast.error('Kritischer Fehler beim Laden der Supplemente');
    }
  };

  const loadUserSupplements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_supplements')
        .select(`
          *,
          supplement_database!left (
            name,
            category
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading user supplements:', error);
        toast.error('Fehler beim Laden deiner Supplemente');
        return;
      }

      const supplementsWithNames = data?.map(supplement => ({
        ...supplement,
        supplement_name: supplement.supplement_database?.name || supplement.custom_name,
        supplement_category: supplement.supplement_database?.category
      })) || [];

      setUserSupplements(supplementsWithNames);
    } catch (error) {
      console.error('Critical error loading user supplements:', error);
      toast.error('Kritischer Fehler beim Laden deiner Supplemente');
    }
  };

  const loadTodayIntake = async () => {
    if (!user) return;

    const today = getCurrentDateString();
    
    try {
      const { data, error } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, timing, taken')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) {
        console.error('Error loading today intake:', error);
        toast.error('Fehler beim Laden der heutigen Einnahmen');
        return;
      }

      const intakeMap: TodayIntake = {};
      data?.forEach(record => {
        if (!intakeMap[record.user_supplement_id]) {
          intakeMap[record.user_supplement_id] = {};
        }
        // Only set to true if actually taken, otherwise leave undefined/false
        intakeMap[record.user_supplement_id][record.timing] = record.taken === true;
      });

      console.log('Today intake loaded:', intakeMap);
      setTodayIntake(intakeMap);
    } catch (error) {
      console.error('Critical error loading today intake:', error);
      toast.error('Kritischer Fehler beim Laden der heutigen Einnahmen');
    }
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

  const countTakenToday = () => {
    return Object.values(todayIntake).reduce((sum, timings) => {
      return sum + Object.values(timings || {}).filter(Boolean).length;
    }, 0);
  };

  const handleIntakeChange = async (supplementId: string, timing: string, taken: boolean) => {
    console.log('handleIntakeChange called:', { supplementId, timing, taken });
    
    if (!user || !supplementId) {
      console.error('Missing user or supplementId:', { user: !!user, supplementId });
      return;
    }

    const today = getCurrentDateString();

    // Determine if this is the first intake today BEFORE optimistic update
    const wasFirstIntake = taken && countTakenToday() === 0;

    // Optimistic update
    setTodayIntake(prev => ({
      ...prev,
      [supplementId]: {
        ...prev[supplementId],
        [timing]: taken
      }
    }));

    try {
      if (taken) {
        // For marking as taken, use upsert
        const { error } = await supabase
          .from('supplement_intake_log')
          .upsert({
            user_id: user.id,
            user_supplement_id: supplementId,
            date: today,
            timing,
            taken: true
          });

        if (error) throw error;
      } else {
        // For unmarking (taken = false), first check if entry exists and update it
        const { data: existingEntry, error: selectError } = await supabase
          .from('supplement_intake_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('user_supplement_id', supplementId)
          .eq('date', today)
          .eq('timing', timing)
          .maybeSingle();

        if (selectError) throw selectError;

        if (existingEntry) {
          // Update existing entry to mark as not taken
          const { error: updateError } = await supabase
            .from('supplement_intake_log')
            .update({ taken: false })
            .eq('id', existingEntry.id);

          if (updateError) throw updateError;
        }
      }

      console.log('Database update successful for:', { supplementId, timing, taken });

      if (wasFirstIntake) {
        try {
          await awardPoints('supplement_taken', getPointsForActivity('supplement_taken'), 'Supplemente: erste Einnahme heute');
          await updateStreak('supplement_tracking');
        } catch (e) {
          console.error('Error awarding points for supplements', e);
        }
        triggerDataRefresh();
      }

      if (taken) {
        toast.success('Einnahme markiert');
      } else {
        toast.success('Einnahme rückgängig gemacht');
      }

    } catch (error) {
      console.error('Error updating intake:', error);
      
      // Rollback optimistic update
      setTodayIntake(prev => ({
        ...prev,
        [supplementId]: {
          ...prev[supplementId],
          [timing]: !taken
        }
      }));
      
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
  const todaySupplements = userSupplements;

  // Calculate completion status
  const totalToday = todaySupplements.reduce((sum, supplement) => sum + supplement.timing.length, 0);
  const takenToday = todaySupplements.reduce((sum, supplement) => {
    const taken = Object.values(todayIntake[supplement.id] || {}).filter(Boolean).length;
    return sum + taken;
  }, 0);
  const isCompleted = hasSupplements && totalToday > 0 && takenToday > 0;

  // Group supplements by time
  const groupedSupplements = groupSupplementsByTime(userSupplements);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Handle "check all" for a group
  const handleCheckAllGroup = async (groupId: string) => {
    const group = timeGroups.find(g => g.id === groupId);
    const groupSupplements = groupedSupplements[groupId];
    
    if (!group || !groupSupplements || groupSupplements.length === 0) return;

    const allTimingsInGroup: Array<{supplementId: string, timing: string}> = [];
    
    groupSupplements.forEach(supplement => {
      supplement.timing
        .filter(timing => group.timings.includes(timing))
        .forEach(timing => {
          allTimingsInGroup.push({ supplementId: supplement.id, timing });
        });
    });

    if (allTimingsInGroup.length === 0) return;

    // Check if all are already taken
    const allTaken = allTimingsInGroup.every(item => 
      todayIntake[item.supplementId]?.[item.timing] === true
    );

    const newValue = !allTaken; // If all taken, uncheck all. Otherwise, check all.
    
    // Batch update all timings
    const promises = allTimingsInGroup.map(item => 
      handleIntakeChange(item.supplementId, item.timing, newValue)
    );

    try {
      await Promise.all(promises);
      if (newValue) {
        toast.success(`Alle ${group.title} Supplemente markiert!`);
      } else {
        toast.success(`Alle ${group.title} Supplemente abgehakt!`);
      }
    } catch (error) {
      console.error('Error in batch update:', error);
      toast.error('Fehler beim Batch-Update');
    }
  };

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
        {/* Time-Grouped Supplements List */}
        {userSupplements.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Meine Supplemente</h4>
            
            {timeGroups.map(group => {
              const groupSupplements = groupedSupplements[group.id];
              if (groupSupplements.length === 0) return null;
              
              const isOpen = openGroups.includes(group.id);
              const IconComponent = group.icon;
              
              // Calculate group progress
              const groupTotal = groupSupplements.reduce((sum, supplement) => {
                return sum + supplement.timing.filter(timing => group.timings.includes(timing)).length;
              }, 0);
              
              const groupTaken = groupSupplements.reduce((sum, supplement) => {
                return sum + supplement.timing.filter(timing => {
                  return group.timings.includes(timing) && todayIntake[supplement.id]?.[timing];
                }).length;
              }, 0);
              
              return (
                <div key={group.id} className="space-y-2">
                  <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-4 w-4" />
                          <div className="text-left">
                            <div className="font-medium text-sm">{group.title}</div>
                            <div className="text-xs text-muted-foreground">{group.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckAllGroup(group.id);
                            }}
                            className="h-8 w-8 p-0 rounded-full bg-primary/10 hover:bg-primary/20"
                            title={groupTaken === groupTotal ? "Alle abhaken" : "Alle markieren"}
                          >
                            {groupTaken === groupTotal ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Badge variant="secondary" className="text-xs">
                            {groupTaken}/{groupTotal}
                          </Badge>
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-2">
                      {groupSupplements.map(supplement => {
                        const isEditing = editingSupplementId === supplement.id;
                        
                        if (isEditing) {
                          return (
                            <Card key={supplement.id} className="p-4 space-y-4 ml-4">
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

                              <div className="space-y-2">
                                <Input
                                  placeholder="Name"
                                  value={editForm.customName}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, customName: e.target.value }))}
                                />
                              </div>

                              <div className="flex space-x-2">
                                <Input
                                  placeholder="Dosierung"
                                  value={editForm.dosage}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, dosage: e.target.value }))}
                                  className="flex-1"
                                />
                                <Select 
                                  value={editForm.unit} 
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, unit: value }))}
                                >
                                  <SelectTrigger className="w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mg">mg</SelectItem>
                                    <SelectItem value="g">g</SelectItem>
                                    <SelectItem value="mcg">mcg</SelectItem>
                                    <SelectItem value="ml">ml</SelectItem>
                                    <SelectItem value="Stück">Stück</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Einnahmezeiten</label>
                                <div className="flex flex-wrap gap-2">
                                  {timingOptions.map(timing => (
                                    <Button
                                      key={timing.value}
                                      variant={editForm.timing.includes(timing.value) ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleEditTiming(timing.value)}
                                    >
                                      {timing.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <Input
                                placeholder="Ziel (optional)"
                                value={editForm.goal}
                                onChange={(e) => setEditForm(prev => ({ ...prev, goal: e.target.value }))}
                              />

                              <Textarea
                                placeholder="Notizen (optional)"
                                value={editForm.notes}
                                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={handleCancelEdit}>
                                  Abbrechen
                                </Button>
                                <Button onClick={handleSaveEdit} disabled={editLoading}>
                                  {editLoading ? 'Speichern...' : 'Speichern'}
                                </Button>
                              </div>
                            </Card>
                          );
                        }

                        return (
                          <Card key={supplement.id} className="p-3 ml-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-3">
                                {/* Supplement Info */}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{supplement.supplement_name}</p>
                                    {supplement.supplement_category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {supplement.supplement_category}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {supplement.dosage} {supplement.unit}
                                  </p>
                                  {supplement.goal && (
                                    <p className="text-xs text-muted-foreground">Ziel: {supplement.goal}</p>
                                  )}
                                </div>
                                
                                {/* Daily Intake Checkboxes - Only show relevant timings for this group */}
                                <div className="flex flex-wrap gap-2">
                                  {supplement.timing
                                    .filter(timing => group.timings.includes(timing))
                                    .map(timing => {
                                      const timingLabel = getTimingLabel(timing);
                                      const isTaken = todayIntake[supplement.id]?.[timing] || false;
                                      
                                      return (
                                        <div key={timing} className="flex items-center space-x-2">
                                           <Checkbox
                                             id={`${supplement.id}-${timing}`}
                                             checked={isTaken}
                                             onCheckedChange={(checked) => {
                                               console.log('Checkbox changed:', { supplementId: supplement.id, timing, checked });
                                               const isChecked = checked === true || checked === 'indeterminate';
                                               handleIntakeChange(supplement.id, timing, isChecked);
                                             }}
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
                              
                              {/* Management Buttons */}
                              <div className="flex space-x-1 ml-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSupplement(supplement)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      disabled={deleteLoading === supplement.id}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supplement entfernen?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Möchtest du "{supplement.supplement_name}" wirklich aus deiner Liste entfernen?
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
                          </Card>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
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

      </div>
    </CollapsibleQuickInput>
  );
};