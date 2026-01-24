import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { differenceInWeeks } from "date-fns";

export interface NootropicStack {
  id: string;
  user_id: string;
  substance_name: string;
  dose_mcg: number;
  administration_route: string;
  timing: string;
  cycle_weeks_on: number;
  cycle_weeks_off: number;
  current_cycle_week: number;
  is_on_cycle: boolean;
  cycle_started_at: string | null;
  is_active: boolean;
  protocol_phase: number;
  baseline_focus_score: number | null;
  current_focus_score: number | null;
  created_at: string;
  updated_at: string;
}

export function useNootropicStacks() {
  const [stacks, setStacks] = useState<NootropicStack[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('nootropic_stacks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize nullable fields with defaults
      const normalizedStacks: NootropicStack[] = (data || []).map((stack: any) => ({
        ...stack,
        cycle_weeks_on: stack.cycle_weeks_on ?? 4,
        cycle_weeks_off: stack.cycle_weeks_off ?? 2,
        current_cycle_week: stack.current_cycle_week ?? 1,
        is_on_cycle: stack.is_on_cycle ?? true,
        is_active: stack.is_active ?? true,
        protocol_phase: stack.protocol_phase ?? 2,
        administration_route: stack.administration_route ?? 'nasal',
      }));

      setStacks(normalizedStacks);
    } catch (err) {
      console.error('Error fetching nootropic stacks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStack = async (input: {
    substance_name: string;
    dose_mcg: number;
    timing: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      const { data, error } = await (supabase as any)
        .from('nootropic_stacks')
        .insert({
          user_id: user.id,
          ...input,
          administration_route: 'nasal',
          cycle_weeks_on: 4,
          cycle_weeks_off: 2,
          current_cycle_week: 1,
          is_on_cycle: true,
          cycle_started_at: new Date().toISOString(),
          protocol_phase: 2,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Nootropic-Stack erstellt",
        description: `${input.substance_name} hinzugefügt`,
      });

      await fetchStacks();
      return data;
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCycleStatus = async (stackId: string) => {
    try {
      const stack = stacks.find(s => s.id === stackId);
      if (!stack || !stack.cycle_started_at) return;

      const weeksSinceStart = differenceInWeeks(new Date(), new Date(stack.cycle_started_at));
      const totalCycleWeeks = stack.cycle_weeks_on + stack.cycle_weeks_off;
      const currentWeekInCycle = (weeksSinceStart % totalCycleWeeks) + 1;
      const isOnCycle = currentWeekInCycle <= stack.cycle_weeks_on;

      const { error } = await (supabase as any)
        .from('nootropic_stacks')
        .update({
          current_cycle_week: currentWeekInCycle,
          is_on_cycle: isOnCycle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stackId);

      if (error) throw error;
      await fetchStacks();
    } catch (err) {
      console.error('Error updating cycle status:', err);
    }
  };

  const updateFocusScore = async (stackId: string, score: number) => {
    try {
      const stack = stacks.find(s => s.id === stackId);
      if (!stack) return;

      const updateData: Record<string, any> = {
        current_focus_score: score,
        updated_at: new Date().toISOString(),
      };

      // Set baseline if not set
      if (stack.baseline_focus_score === null) {
        updateData.baseline_focus_score = score;
      }

      const { error } = await (supabase as any)
        .from('nootropic_stacks')
        .update(updateData)
        .eq('id', stackId);

      if (error) throw error;
      await fetchStacks();
    } catch (err) {
      console.error('Error updating focus score:', err);
    }
  };

  const getCycleStatusText = (stack: NootropicStack): string => {
    if (stack.is_on_cycle) {
      return `Woche ${stack.current_cycle_week}/${stack.cycle_weeks_on} aktiv`;
    } else {
      const pauseWeek = stack.current_cycle_week - stack.cycle_weeks_on;
      return `Pause Woche ${pauseWeek}/${stack.cycle_weeks_off}`;
    }
  };

  const deleteStack = async (stackId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('nootropic_stacks')
        .delete()
        .eq('id', stackId);

      if (error) throw error;

      toast({
        title: "Stack gelöscht",
        description: "Nootropic-Stack wurde entfernt",
      });

      await fetchStacks();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Löschen fehlgeschlagen",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStacks();
  }, [fetchStacks]);

  return {
    stacks,
    loading,
    createStack,
    updateCycleStatus,
    updateFocusScore,
    getCycleStatusText,
    deleteStack,
    refetch: fetchStacks,
  };
}
