import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Phase0Checklist {
  toxin_free: { completed: boolean; confirmed_at: string | null };
  sleep_score: { completed: boolean; avg_hours: number | null; validated_at: string | null };
  bio_sanierung: { completed: boolean; confirmed_at: string | null };
  psycho_hygiene: { completed: boolean; confirmed_at: string | null };
  digital_hygiene: { completed: boolean; confirmed_at: string | null };
  protein_training: { completed: boolean; protein_avg: number | null; zone2_avg: number | null; validated_at: string | null };
  kfa_trend: { completed: boolean; current_kfa: number | null; trend: string | null; validated_at: string | null };
  bloodwork_baseline: { completed: boolean; markers_present: string[]; validated_at: string | null };
  tracking_measurement: { completed: boolean; confirmed_at: string | null };
}

export interface ProtocolStatus {
  id: string;
  user_id: string;
  current_phase: number;
  phase_started_at: string;
  protocol_mode: 'analog' | 'advanced';
  phase_0_checklist: Phase0Checklist;
  phase_0_completed_at: string | null;
  phase_1_started_at: string | null;
  phase_1_target_kfa: number;
  phase_2_started_at: string | null;
  phase_3_started_at: string | null;
  is_paused: boolean;
  paused_at: string | null;
  pause_reason: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CHECKLIST: Phase0Checklist = {
  toxin_free: { completed: false, confirmed_at: null },
  sleep_score: { completed: false, avg_hours: null, validated_at: null },
  bio_sanierung: { completed: false, confirmed_at: null },
  psycho_hygiene: { completed: false, confirmed_at: null },
  digital_hygiene: { completed: false, confirmed_at: null },
  protein_training: { completed: false, protein_avg: null, zone2_avg: null, validated_at: null },
  kfa_trend: { completed: false, current_kfa: null, trend: null, validated_at: null },
  bloodwork_baseline: { completed: false, markers_present: [], validated_at: null },
  tracking_measurement: { completed: false, confirmed_at: null }
};

export function useProtocolStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate progress
  const phase0Progress = status?.phase_0_checklist 
    ? Object.values(status.phase_0_checklist).filter(item => item.completed).length 
    : 0;
  
  // Need 8/9 items + bloodwork to unlock Phase 1
  const canUnlockPhase1 = phase0Progress >= 8 && status?.phase_0_checklist?.bloodwork_baseline?.completed;

  const loadStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('user_protocol_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Parse checklist from JSON
        const checklist = typeof data.phase_0_checklist === 'string' 
          ? JSON.parse(data.phase_0_checklist) 
          : data.phase_0_checklist || DEFAULT_CHECKLIST;
        
        setStatus({
          ...data,
          phase_0_checklist: checklist,
          protocol_mode: data.protocol_mode as 'analog' | 'advanced'
        });
      } else {
        // Create initial status
        const { data: newStatus, error: insertError } = await (supabase as any)
          .from('user_protocol_status')
          .insert([{
            user_id: user.id,
            phase_0_checklist: DEFAULT_CHECKLIST
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        
        if (newStatus) {
          setStatus({
            ...newStatus,
            phase_0_checklist: DEFAULT_CHECKLIST,
            protocol_mode: 'advanced' as const
          });
        }
      }
    } catch (err) {
      console.error('Error loading protocol status:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const updatePhase0Check = useCallback(async (
    checkKey: keyof Phase0Checklist, 
    updates: Partial<Phase0Checklist[keyof Phase0Checklist]>
  ) => {
    if (!status || !user?.id) return false;

    try {
      const newChecklist = {
        ...status.phase_0_checklist,
        [checkKey]: {
          ...status.phase_0_checklist[checkKey],
          ...updates,
          completed: updates.completed ?? status.phase_0_checklist[checkKey].completed
        }
      };

      const { error: updateError } = await supabase
        .from('user_protocol_status')
        .update({ 
          phase_0_checklist: newChecklist,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStatus(prev => prev ? { ...prev, phase_0_checklist: newChecklist } : null);
      return true;
    } catch (err) {
      console.error('Error updating phase 0 check:', err);
      toast.error('Fehler beim Speichern');
      return false;
    }
  }, [status, user?.id]);

  const unlockPhase1 = useCallback(async () => {
    if (!status || !user?.id || !canUnlockPhase1) {
      toast.error('Noch nicht alle Voraussetzungen erfüllt');
      return false;
    }

    try {
      const now = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('user_protocol_status')
        .update({
          current_phase: 1,
          phase_0_completed_at: now,
          phase_1_started_at: now,
          phase_started_at: now,
          updated_at: now
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStatus(prev => prev ? {
        ...prev,
        current_phase: 1,
        phase_0_completed_at: now,
        phase_1_started_at: now,
        phase_started_at: now
      } : null);

      toast.success('Phase 1 freigeschaltet! 💪');
      return true;
    } catch (err) {
      console.error('Error unlocking phase 1:', err);
      toast.error('Fehler beim Freischalten');
      return false;
    }
  }, [status, user?.id, canUnlockPhase1]);

  const advancePhase = useCallback(async (targetPhase: 2 | 3) => {
    if (!status || !user?.id) return false;
    if (status.current_phase !== targetPhase - 1) {
      toast.error('Phasen müssen der Reihe nach freigeschaltet werden');
      return false;
    }

    try {
      const now = new Date().toISOString();
      const phaseField = targetPhase === 2 ? 'phase_2_started_at' : 'phase_3_started_at';
      
      const { error: updateError } = await supabase
        .from('user_protocol_status')
        .update({
          current_phase: targetPhase,
          [phaseField]: now,
          phase_started_at: now,
          updated_at: now
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStatus(prev => prev ? {
        ...prev,
        current_phase: targetPhase,
        [phaseField]: now,
        phase_started_at: now
      } : null);

      toast.success(`Phase ${targetPhase} gestartet!`);
      return true;
    } catch (err) {
      console.error('Error advancing phase:', err);
      toast.error('Fehler beim Phasenwechsel');
      return false;
    }
  }, [status, user?.id]);

  const pauseProtocol = useCallback(async (reason: 'health' | 'travel' | 'financial' | 'other') => {
    if (!status || !user?.id) return false;

    try {
      const now = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('user_protocol_status')
        .update({
          is_paused: true,
          paused_at: now,
          pause_reason: reason,
          updated_at: now
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStatus(prev => prev ? {
        ...prev,
        is_paused: true,
        paused_at: now,
        pause_reason: reason
      } : null);

      toast.info('Protokoll pausiert');
      return true;
    } catch (err) {
      console.error('Error pausing protocol:', err);
      toast.error('Fehler beim Pausieren');
      return false;
    }
  }, [status, user?.id]);

  const resumeProtocol = useCallback(async () => {
    if (!status || !user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_protocol_status')
        .update({
          is_paused: false,
          paused_at: null,
          pause_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStatus(prev => prev ? {
        ...prev,
        is_paused: false,
        paused_at: null,
        pause_reason: null
      } : null);

      toast.success('Protokoll fortgesetzt');
      return true;
    } catch (err) {
      console.error('Error resuming protocol:', err);
      toast.error('Fehler beim Fortsetzen');
      return false;
    }
  }, [status, user?.id]);

  const setProtocolMode = useCallback(async (mode: 'analog' | 'advanced') => {
    if (!status || !user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_protocol_status')
        .update({
          protocol_mode: mode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStatus(prev => prev ? { ...prev, protocol_mode: mode } : null);
      toast.success(mode === 'analog' ? 'Analog-Modus aktiviert' : 'Advanced-Modus aktiviert');
      return true;
    } catch (err) {
      console.error('Error setting protocol mode:', err);
      toast.error('Fehler beim Moduswechsel');
      return false;
    }
  }, [status, user?.id]);

  return {
    status,
    loading,
    error,
    phase0Progress,
    canUnlockPhase1,
    updatePhase0Check,
    unlockPhase1,
    advancePhase,
    pauseProtocol,
    resumeProtocol,
    setProtocolMode,
    refresh: loadStatus
  };
}
