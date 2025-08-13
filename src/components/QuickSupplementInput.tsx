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
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

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
        .order('created_at', { ascending: true });

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

  const markAllForSlot = async (slot: string) => {
    if (!user) return;
    const group = userSupplements.filter((s) => (s.timing || []).includes(slot));
    if (group.length === 0) return;
    try {
      setLoading(true);
      const today = getCurrentDateString();
      const rows = group
        .filter((s) => !todayIntake[s.id]?.[slot])
        .map((s) => ({ user_id: user.id, user_supplement_id: s.id, date: today, timing: slot, taken: true }));
      if (rows.length > 0) {
        const { error } = await supabase.from("supplement_intake_log").upsert(rows);
        if (error) throw error;
      }
      setTodayIntake((prev) => {
        const updated = { ...prev };
        group.forEach((s) => {
          updated[s.id] = { ...(updated[s.id] || {}), [slot]: true };
        });
        return updated;
      });
      toast.success('Alle Supplemente markiert');
    } catch (e) {
      console.error("Error markAllForSlot", e);
      toast.error("Fehler beim Markieren");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card className="p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold">
                Supplemente{totalTodayIntakes > 0 ? ` (${totalTodayIntakes} genommen)` : ''}
              </h3>
              {!isOpen && userSupplements.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {totalTodayIntakes}/{totalScheduledIntakes} genommen
                  </span>
                  <Progress value={completionPercent} className="h-2 w-16" />
                </div>
              )}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <button type="button" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              {isOpen ? (
                <>Einklappen <ChevronUp className="ml-1 h-4 w-4" /></>
              ) : (
                <>Ausklappen <ChevronDown className="ml-1 h-4 w-4" /></>
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {timingOptions.map(({ value, label }) => {
                const groupSupps = userSupplements.filter(s => (s.timing || []).includes(value));
                if (groupSupps.length === 0) return null;
                const takenInGroup = groupSupps.filter(s => todayIntake[s.id]?.[value]).length;
                return (
                  <div key={value} className="rounded-lg border">
                    <div
                      className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer"
                      onClick={() =>
                        setGroupOpen((prev: Record<string, boolean>) => ({
                          ...prev,
                          [value]: !prev?.[value],
                        }))
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{label}</span>
                        <Badge
                          variant={
                            takenInGroup === groupSupps.length ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {takenInGroup}/{groupSupps.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={takenInGroup === groupSupps.length || loading}
                          className="h-6 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); markAllForSlot(value); }}
                        >
                          Alle erledigen
                        </Button>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            groupOpen?.[value] && "rotate-180"
                          )}
                        />
                      </div>
                    </div>

                    {groupOpen?.[value] && (
                      <div className="p-3 space-y-2">
                        {groupSupps.map((s) => {
                          const checked = !!todayIntake[s.id]?.[value];
                          return (
                            <div
                              key={`${s.id}-${value}`}
                              className="flex items-center justify-between p-2 bg-muted/20 rounded"
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium">{s.supplement_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {s.dosage} {s.unit}
                                </div>
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
                                    const newName = prompt(
                                      "Name",
                                      s.custom_name || s.supplement_name || ""
                                    );
                                    const newDosage = prompt("Dosierung", s.dosage || "");
                                    const newUnit = prompt("Einheit", s.unit || "");
                                    if (
                                      newName !== null ||
                                      newDosage !== null ||
                                      newUnit !== null
                                    ) {
                                      try {
                                        const { error } = await supabase
                                          .from("user_supplements")
                                          .update({
                                            custom_name: newName ?? s.custom_name,
                                            dosage: newDosage ?? s.dosage,
                                            unit: newUnit ?? s.unit,
                                          })
                                          .eq("id", s.id);
                                        if (error) throw error;
                                        toast.success("Supplement aktualisiert");
                                        loadSupplements();
                                      } catch (e) {
                                        console.error("Update supplement failed", e);
                                        toast.error("Aktualisierung fehlgeschlagen");
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
                                    if (!confirm("Supplement löschen?")) return;
                                    try {
                                      const { error } = await supabase
                                        .from("user_supplements")
                                        .delete()
                                        .eq("id", s.id);
                                      if (error) throw error;
                                      toast.success("Gelöscht");
                                      loadSupplements();
                                      loadTodayIntake();
                                    } catch (e) {
                                      console.error("Delete supplement failed", e);
                                      toast.error("Löschen fehlgeschlagen");
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
                    )}
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
