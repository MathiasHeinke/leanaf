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
  const { awardPoints, getPointsForActivity, updateStreak } = usePointsSystem();

  // Get completion status for today
  const countTakenToday = () => {
    return Object.values(todayIntake).reduce((sum, timings) => {
      return sum + Object.values(timings || {}).filter(Boolean).length;
    }, 0);
  };

  const totalTodayIntakes = countTakenToday();
  const totalScheduledIntakes = userSupplements.reduce((sum, supplement) => sum + supplement.timing.length, 0);
  const isCompleted = totalTodayIntakes > 0;
  const completionPercent = totalScheduledIntakes > 0 ? (totalTodayIntakes / totalScheduledIntakes) * 100 : 0;

  // Smart chip actions - get user's 3 most common supplements
  const smartChips = userSupplements.slice(0, 3).map(supplement => ({
    label: supplement.supplement_name || 'Supplement',
    action: () => {
      // Mark first timing as taken for this supplement
      const firstTiming = supplement.timing[0];
      if (firstTiming) {
        // handleIntakeChange(supplement.id, firstTiming, true);
      }
    }
  }));

  return (
    <Card className="relative">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center gap-3 p-5">
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
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Supplemente-Tracking verfügbar. Erweiterte Funktionen werden bald hinzugefügt.
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
