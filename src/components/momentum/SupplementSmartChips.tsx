import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserSupplement {
  id: string;
  custom_name: string;
  dosage: string;
  timing: string[];
}

interface TodayIntake {
  user_supplement_id: string;
  timing: string;
  taken: boolean;
}

export const SupplementSmartChips: React.FC = () => {
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todayIntake, setTodayIntake] = useState<TodayIntake[]>([]);
  const [loading, setLoading] = useState(true);

  const getCurrentTimeSlot = (): 'morning' | 'noon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'noon';
    return 'evening';
  };

  const currentTimeSlot = getCurrentTimeSlot();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      // Load supplements for current time slot
      const { data: supplementsData } = await supabase
        .from('user_supplements')
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('is_active', true);

      // Load today's intake
      const today = new Date().toISOString().split('T')[0];
      const { data: intakeData } = await supabase
        .from('supplement_intake_log')
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('date', today);

      setSupplements(supplementsData || []);
      setTodayIntake(intakeData || []);
    } catch (error) {
      console.error('Error loading supplement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markTaken = async (supplementId: string) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Find existing intake record for this supplement and timing
      const existingIntake = todayIntake.find(i => 
        i.user_supplement_id === supplementId && 
        i.timing === currentTimeSlot
      );
      
      if (existingIntake) {
        // Update existing record
        const { error } = await supabase
          .from('supplement_intake_log')
          .update({ taken: true })
          .eq('user_supplement_id', supplementId)
          .eq('timing', currentTimeSlot)
          .eq('date', today)
          .eq('user_id', auth.user.id);

        if (error) throw error;

        // Update local state
        setTodayIntake(prev => prev.map(intake => 
          intake.user_supplement_id === supplementId && intake.timing === currentTimeSlot
            ? { ...intake, taken: true }
            : intake
        ));
      } else {
        // Create new record
        const newIntake = {
          user_id: auth.user.id,
          user_supplement_id: supplementId,
          date: today,
          timing: currentTimeSlot,
          taken: true
        };

        const { error } = await supabase
          .from('supplement_intake_log')
          .insert([newIntake]);

        if (error) throw error;

        // Update local state
        setTodayIntake(prev => [...prev, newIntake as TodayIntake]);
      }

      toast.success('Supplement als genommen markiert');
    } catch (error) {
      console.error('Error marking supplement as taken:', error);
      toast.error('Fehler beim Markieren des Supplements');
    }
  };

  const getSupplementsForCurrentTime = () => {
    return supplements.filter(supplement => 
      supplement.timing.includes(currentTimeSlot) &&
      !todayIntake.find(intake => 
        intake.user_supplement_id === supplement.id && 
        intake.timing === currentTimeSlot &&
        intake.taken
      )
    );
  };

  const currentSupplements = getSupplementsForCurrentTime();

  if (loading || currentSupplements.length === 0) {
    return null;
  }

  const getTimeLabel = () => {
    switch (currentTimeSlot) {
      case 'morning': return 'Morgens';
      case 'noon': return 'Mittags';
      case 'evening': return 'Abends';
    }
  };

  return (
    <div className="mb-4">
      <div className="text-sm text-muted-foreground mb-2">
        {getTimeLabel()} • Supplements:
      </div>
      <div className="flex flex-wrap gap-2">
        {currentSupplements.map((supplement) => (
          <Badge
            key={supplement.id}
            variant="secondary"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors pr-1"
            onClick={() => markTaken(supplement.id)}
          >
            <span className="mr-1">{supplement.custom_name}</span>
            <X className="w-3 h-3" />
          </Badge>
        ))}
      </div>
    </div>
  );
};