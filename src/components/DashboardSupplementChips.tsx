import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface UserSupplement {
  id: string;
  name: string;
  dosage?: string;
  unit?: string;
  timing: ('morning' | 'noon' | 'evening')[];
}

interface TodayIntake {
  supplement_id: string;
  taken_morning: boolean;
  taken_noon: boolean;
  taken_evening: boolean;
}

export const DashboardSupplementChips: React.FC = () => {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todayIntake, setTodayIntake] = useState<TodayIntake[]>([]);
  const [loading, setLoading] = useState(true);

  const getCurrentTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'noon';
    return 'evening';
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Load user supplements
      const { data: supplementsData, error: supplementsError } = await supabase
        .from('user_supplements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (supplementsError) throw supplementsError;

      // Load today's intake
      const { data: intakeData, error: intakeError } = await supabase
        .from('supplement_intake_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (intakeError) throw intakeError;

      setSupplements((supplementsData || []).map(s => ({
        ...s,
        timing: (s.timing || []) as ('morning' | 'noon' | 'evening')[]
      })));
      setTodayIntake((intakeData || []).map(i => ({
        supplement_id: i.user_supplement_id,
        taken_morning: i.timing === 'morning' && i.taken,
        taken_noon: i.timing === 'noon' && i.taken,
        taken_evening: i.timing === 'evening' && i.taken
      })));
    } catch (error) {
      console.error('Error loading supplement data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markTaken = async (supplementId: string, timing: string) => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const column = `taken_${timing}`;

      const { error } = await supabase
        .from('supplement_intake_log')
        .upsert({
          user_id: user.id,
          user_supplement_id: supplementId,
          date: today,
          timing: timing,
          taken: true
        }, {
          onConflict: 'user_id,user_supplement_id,date,timing'
        });

      if (error) throw error;

      setTodayIntake(prev => {
        const existing = prev.find(item => item.supplement_id === supplementId);
        if (existing) {
          return prev.map(item => 
            item.supplement_id === supplementId 
              ? { ...item, [column]: true }
              : item
          );
        } else {
          return [...prev, {
            supplement_id: supplementId,
            taken_morning: timing === 'morning',
            taken_noon: timing === 'noon',
            taken_evening: timing === 'evening'
          }];
        }
      });

      toast.success('Supplement eingenommen markiert');
    } catch (error) {
      console.error('Error marking supplement taken:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const getSupplementsForCurrentTime = () => {
    const currentTime = getCurrentTimeSlot();
    return supplements.filter(supplement => {
      if (!supplement.timing.includes(currentTime as any)) return false;
      
      const intake = todayIntake.find(item => item.supplement_id === supplement.id);
      if (!intake) return true;
      
      const takenKey = `taken_${currentTime}` as keyof TodayIntake;
      return !intake[takenKey];
    });
  };

  if (loading) return null;

  const currentSupplements = getSupplementsForCurrentTime();
  if (currentSupplements.length === 0) return null;

  const getTimeLabel = () => {
    const currentTime = getCurrentTimeSlot();
    switch (currentTime) {
      case 'morning': return 'Morgens';
      case 'noon': return 'Mittags';
      case 'evening': return 'Abends';
      default: return '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        {getTimeLabel()} einzunehmen:
      </div>
      <div className="flex flex-wrap gap-2">
        {currentSupplements.map(supplement => (
          <Badge
            key={supplement.id}
            variant="outline"
            className="cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => markTaken(supplement.id, getCurrentTimeSlot())}
          >
            {supplement.name}
            {supplement.dosage && ` ${supplement.dosage}${supplement.unit || ''}`}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        ))}
      </div>
    </div>
  );
};