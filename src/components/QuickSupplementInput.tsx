import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Progress } from './ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Pill, Plus, Check, X, Clock, Edit, Trash2, Save, Sun, Utensils, Dumbbell, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { getCurrentDateString } from "@/utils/dateHelpers";
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { cn } from '@/lib/utils';

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

export const QuickSupplementInput = ({ onProgressUpdate }: { onProgressUpdate?: (taken: number, required: number) => void }) => {
  const { user } = useAuth();
  const [userSupplements, setUserSupplements] = useState<UserSupplement[]>([]);
  const [todayIntake, setTodayIntake] = useState<TodayIntake>({});
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadSupplements = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_supplements')
        .select(`
          id,
          custom_name,
          timing,
          dosage,
          unit,
          supplement_id,
          supplement_database!left(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(5);

      if (error) throw error;

      const supplementsWithNames = (data || []).map((s: any) => ({
        ...s,
        supplement_name: s.supplement_database?.name || s.custom_name || 'Supplement'
      }));
      setUserSupplements(supplementsWithNames);
    } catch (e) {
      console.error('Error loading supplements', e);
    }
  };

  const loadTodayIntake = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, timing, taken')
        .eq('user_id', user.id)
        .eq('date', getCurrentDateString());
      if (error) throw error;

      const intakeMap: TodayIntake = {};
      (data || []).forEach((r: any) => {
        if (!intakeMap[r.user_supplement_id]) intakeMap[r.user_supplement_id] = {};
        intakeMap[r.user_supplement_id][r.timing] = r.taken === true;
      });
      setTodayIntake(intakeMap);
    } catch (e) {
      console.error('Error loading intake', e);
    }
  };

  useEffect(() => {
    loadSupplements();
    loadTodayIntake();
  }, [user]);

  useEffect(() => {
    const required = userSupplements.reduce((sum, s) => sum + (s.timing?.length || 0), 0);
    const taken = Object.values(todayIntake).reduce((sum, timings) => sum + Object.values(timings || {}).filter(Boolean).length, 0);
    onProgressUpdate?.(taken, required);
  }, [userSupplements, todayIntake, onProgressUpdate]);

  const toggleIntake = async (supplementId: string, timing: string, taken: boolean) => {
    if (!user) return;
    setLoading(true);
    setTodayIntake(prev => ({
      ...prev,
      [supplementId]: { ...(prev[supplementId] || {}), [timing]: taken }
    }));
    try {
      const today = getCurrentDateString();
      if (taken) {
        const { error } = await supabase
          .from('supplement_intake_log')
          .upsert({ user_id: user.id, user_supplement_id: supplementId, date: today, timing, taken: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplement_intake_log')
          .update({ taken: false })
          .eq('user_id', user.id)
          .eq('user_supplement_id', supplementId)
          .eq('date', today)
          .eq('timing', timing);
        if (error) throw error;
      }
      toast.success(taken ? 'Einnahme markiert' : 'Einnahme entfernt');
    } catch (e) {
      console.error('Error updating intake', e);
      toast.error('Fehler beim Aktualisieren');
      setTodayIntake(prev => ({
        ...prev,
        [supplementId]: { ...(prev[supplementId] || {}), [timing]: !taken }
      }));
    } finally {
      setLoading(false);
    }
  };

  const countTakenToday = () => {
    return Object.values(todayIntake).reduce((sum, timings) => sum + Object.values(timings || {}).filter(Boolean).length, 0);
  };
  const totalTodayIntakes = countTakenToday();
  const totalScheduledIntakes = userSupplements.reduce((sum, s) => sum + (s.timing?.length || 0), 0);
  const completionPercent = totalScheduledIntakes > 0 ? (totalTodayIntakes / totalScheduledIntakes) * 100 : 0;

  const getCurrentSlot = (): string => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 15) return 'noon';
    if (h >= 17 && h < 21) return 'evening';
    if (h >= 21 || h < 5) return 'before_bed';
    return 'with_meals';
  };
  const getSlotLabel = (v: string) => timingOptions.find(t => t.value === v)?.label || v;

  const currentSlot = getCurrentSlot();
  const slotSupps = userSupplements.filter(s => (s.timing || []).includes(currentSlot));
  const takenInSlot = slotSupps.filter(s => todayIntake[s.id]?.[currentSlot]).length;

  const markAllForCurrentSlot = async () => {
    if (!user || slotSupps.length === 0) return;
    try {
      setLoading(true);
      const today = getCurrentDateString();
      const rows = slotSupps
        .filter(s => !todayIntake[s.id]?.[currentSlot])
        .map(s => ({ user_id: user.id, user_supplement_id: s.id, date: today, timing: currentSlot, taken: true }));
      if (rows.length > 0) {
        const { error } = await supabase.from('supplement_intake_log').upsert(rows);
        if (error) throw error;
      }
      setTodayIntake(prev => {
        const updated = { ...prev };
        slotSupps.forEach(s => {
          updated[s.id] = { ...(updated[s.id] || {}), [currentSlot]: true };
        });
        return updated;
      });
      toast.success(`${getSlotLabel(currentSlot)} erledigt`);
    } catch (e) {
      console.error('Error markAllForCurrentSlot', e);
      toast.error('Fehler beim Markieren');
    } finally {
      setLoading(false);
    }
  };

  const smartChips = slotSupps.length > 0 ? [{
    label: `${getSlotLabel(currentSlot)} ${takenInSlot}/${slotSupps.length}`,
    action: () => markAllForCurrentSlot()
  }] : [];


  return (
    <Card className="relative">
      <span className="pointer-events-none absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-destructive/30 animate-[pulse_3s_ease-in-out_infinite]" aria-hidden />
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center gap-3 p-5" onClick={() => isCollapsed && setIsCollapsed(false)}>
          <Pill className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h3 className="text-base font-semibold">
              Supplemente{totalTodayIntakes > 0 ? ` (${totalTodayIntakes} genommen)` : ''}
            </h3>
            {isCollapsed && userSupplements.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {totalTodayIntakes}/{totalScheduledIntakes} genommen
                </span>
                <Progress value={completionPercent} className="h-1 w-16" />
              </div>
            )}
            {isCollapsed && smartChips.length > 0 && (
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
            <div className="space-y-3">
              {timingOptions.map(({ value, label }) => {
                const groupSupps = userSupplements.filter(s => (s.timing || []).includes(value));
                if (groupSupps.length === 0) return null;
                const takenInGroup = groupSupps.filter(s => todayIntake[s.id]?.[value]).length;
                const [open, setOpen] = [value === currentSlot, undefined] as unknown as [boolean, any];
                // Simple default-open current slot without separate state per group to keep minimal
                return (
                  <div key={value} className="rounded-lg border">
                    <div className="flex items-center justify-between p-3 bg-muted/40">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{label}</span>
                        <Badge variant={takenInGroup === groupSupps.length ? 'default' : 'secondary'} className="text-xs">
                          {takenInGroup}/{groupSupps.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {groupSupps.map(s => {
                        const checked = !!todayIntake[s.id]?.[value];
                        return (
                          <div key={`${s.id}-${value}`} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{s.supplement_name}</div>
                              <div className="text-xs text-muted-foreground">{s.dosage} {s.unit}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => toggleIntake(s.id, value, !!c)}
                                disabled={loading}
                                className="h-4 w-4"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-blue-600"
                                onClick={async () => {
                                  const newName = prompt('Name', s.custom_name || s.supplement_name || '');
                                  const newDosage = prompt('Dosierung', s.dosage || '');
                                  const newUnit = prompt('Einheit', s.unit || '');
                                  if (newName !== null || newDosage !== null || newUnit !== null) {
                                    try {
                                      const { error } = await supabase
                                        .from('user_supplements')
                                        .update({
                                          custom_name: newName ?? s.custom_name,
                                          dosage: newDosage ?? s.dosage,
                                          unit: newUnit ?? s.unit
                                        })
                                        .eq('id', s.id);
                                      if (error) throw error;
                                      toast.success('Supplement aktualisiert');
                                      loadSupplements();
                                    } catch (e) {
                                      console.error('Update supplement failed', e);
                                      toast.error('Aktualisierung fehlgeschlagen');
                                    }
                                  }
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600"
                                onClick={async () => {
                                  if (!confirm('Supplement löschen?')) return;
                                  try {
                                    const { error } = await supabase
                                      .from('user_supplements')
                                      .delete()
                                      .eq('id', s.id);
                                    if (error) throw error;
                                    toast.success('Gelöscht');
                                    loadSupplements();
                                    loadTodayIntake();
                                  } catch (e) {
                                    console.error('Delete supplement failed', e);
                                    toast.error('Löschen fehlgeschlagen');
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
