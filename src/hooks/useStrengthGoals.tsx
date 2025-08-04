import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StrengthGoal {
  id: string;
  exercise_name: string;
  current_1rm_kg: number | null;
  target_1rm_kg: number;
  estimated_weeks: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useStrengthGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<StrengthGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStrengthGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('strength_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading strength goals:', error);
      toast.error('Fehler beim Laden der Kraftziele');
    } finally {
      setLoading(false);
    }
  };

  const addStrengthGoal = async (goalData: {
    exercise_name: string;
    current_1rm_kg?: number;
    target_1rm_kg: number;
    notes?: string;
  }) => {
    if (!user) return;

    try {
      // Simple estimation: 2-4kg per month for beginners, 1-2kg for intermediate
      const estimated_weeks = goalData.current_1rm_kg 
        ? Math.ceil((goalData.target_1rm_kg - goalData.current_1rm_kg) / 0.5) * 4 // 0.5kg per week
        : 12; // Default 12 weeks if no current weight

      const { data, error } = await supabase
        .from('strength_goals')
        .insert([{
          user_id: user.id,
          exercise_name: goalData.exercise_name,
          current_1rm_kg: goalData.current_1rm_kg,
          target_1rm_kg: goalData.target_1rm_kg,
          estimated_weeks,
          notes: goalData.notes
        }])
        .select()
        .single();

      if (error) throw error;
      
      setGoals(prev => [data, ...prev]);
      toast.success('Kraftziel hinzugefügt');
      return data;
    } catch (error) {
      console.error('Error adding strength goal:', error);
      toast.error('Fehler beim Hinzufügen des Kraftziels');
    }
  };

  const updateStrengthGoal = async (id: string, updates: Partial<StrengthGoal>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('strength_goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setGoals(prev => prev.map(goal => goal.id === id ? data : goal));
      toast.success('Kraftziel aktualisiert');
    } catch (error) {
      console.error('Error updating strength goal:', error);
      toast.error('Fehler beim Aktualisieren des Kraftziels');
    }
  };

  const deleteStrengthGoal = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('strength_goals')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setGoals(prev => prev.filter(goal => goal.id !== id));
      toast.success('Kraftziel entfernt');
    } catch (error) {
      console.error('Error deleting strength goal:', error);
      toast.error('Fehler beim Entfernen des Kraftziels');
    }
  };

  useEffect(() => {
    loadStrengthGoals();
  }, [user]);

  return {
    goals,
    loading,
    addStrengthGoal,
    updateStrengthGoal,
    deleteStrengthGoal,
    refreshGoals: loadStrengthGoals
  };
};