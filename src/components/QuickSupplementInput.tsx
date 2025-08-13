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

export const QuickSupplementInput = () => {
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

  const smartChips = userSupplements.slice(0, 3).map((s) => ({
    label: s.supplement_name || 'Supplement',
    action: () => {
      const firstTiming = s.timing?.[0];
      if (!firstTiming) return;
      const already = !!(todayIntake[s.id]?.[firstTiming]);
      toggleIntake(s.id, firstTiming, !already);
      setIsCollapsed(false);
    }
  }));

  return (
    <Card className="relative">
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
            {isCollapsed && userSupplements.length === 0 && (
              <div className="flex gap-1 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsCollapsed(false)}
                  className="text-xs h-6 px-2"
                >
                  Supplement hinzufügen
                </Button>
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
              {userSupplements.slice(0, 5).map((s) => {
                const intake = todayIntake[s.id] || {};
                const takenTimings = Object.values(intake).filter(Boolean).length;
                const totalTimings = s.timing?.length || 0;
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{s.supplement_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.dosage} {s.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={takenTimings === totalTimings ? 'default' : 'secondary'} className="text-xs">
                        {takenTimings}/{totalTimings}
                      </Badge>
                      {(s.timing || []).slice(0, 2).map((timing) => (
                        <Checkbox
                          key={timing}
                          checked={!!intake[timing]}
                          onCheckedChange={(checked) => toggleIntake(s.id, timing, checked as boolean)}
                          disabled={loading}
                          className="h-4 w-4"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {userSupplements.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Keine Supplemente konfiguriert
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
