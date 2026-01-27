import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface IntakeLogEntry {
  id: string;
  protocol_id: string | null;
  peptide_name: string;
  dose_mcg: number | null;
  dose_unit: string | null;
  timing: string | null;
  injection_site: string | null;
  taken_at: string | null;
  skipped: boolean | null;
  skip_reason: string | null;
  notes: string | null;
}

// Site rotation order for smart suggestions
const SITE_ROTATION = [
  'abdomen_left',
  'abdomen_right',
  'thigh_left',
  'thigh_right',
  'deltoid_left',
  'deltoid_right',
] as const;

export type InjectionSite = typeof SITE_ROTATION[number];

export interface SiteRotationSuggestion {
  suggested: InjectionSite;
  lastUsed: InjectionSite | null;
}

export function useIntakeLog(date: Date = new Date()) {
  const [logs, setLogs] = useState<IntakeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Format date to YYYY-MM-DD for comparison
  const dateStr = format(date, 'yyyy-MM-dd');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfDay = `${dateStr}T00:00:00.000Z`;
      const endOfDay = `${dateStr}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('peptide_intake_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', startOfDay)
        .lte('taken_at', endOfDay)
        .order('taken_at', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching intake logs:', err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  // Get smart site rotation suggestion based on last used site
  const getNextSuggestedSite = useCallback(async (protocolId: string): Promise<SiteRotationSuggestion> => {
    try {
      const { data } = await supabase
        .from('peptide_intake_log')
        .select('injection_site')
        .eq('protocol_id', protocolId)
        .not('injection_site', 'is', null)
        .order('taken_at', { ascending: false })
        .limit(1);

      const lastSite = data?.[0]?.injection_site as InjectionSite | null;
      
      if (!lastSite) {
        return { suggested: 'abdomen_left', lastUsed: null };
      }

      const lastIndex = SITE_ROTATION.indexOf(lastSite);
      const nextSite = SITE_ROTATION[(lastIndex + 1) % SITE_ROTATION.length];
      
      return { suggested: nextSite, lastUsed: lastSite };
    } catch (err) {
      console.error('Error getting site suggestion:', err);
      return { suggested: 'abdomen_left', lastUsed: null };
    }
  }, []);

  // Decrement vial using RPC function
  const decrementVial = useCallback(async (protocolId: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase.rpc('decrement_vial', { 
        p_protocol_id: protocolId 
      });
      
      if (error) {
        console.error('Error decrementing vial:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Error decrementing vial:', err);
      return null;
    }
  }, []);

  const logIntake = async (
    protocolId: string,
    peptideName: string,
    doseMcg: number,
    doseUnit: string,
    timing: string,
    injectionSite?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('peptide_intake_log')
        .insert({
          user_id: user.id,
          protocol_id: protocolId,
          peptide_name: peptideName,
          dose_mcg: doseMcg,
          dose_unit: doseUnit,
          timing: timing,
          injection_site: injectionSite || null,
          taken_at: new Date().toISOString(),
          skipped: false,
        });

      if (error) throw error;
      
      // Decrement vial inventory after successful log
      await decrementVial(protocolId);
      
      await fetchLogs();
      return true;
    } catch (err) {
      console.error('Error logging intake:', err);
      return false;
    }
  };

  const skipIntake = async (
    protocolId: string,
    peptideName: string,
    timing: string,
    skipReason: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('peptide_intake_log')
        .insert({
          user_id: user.id,
          protocol_id: protocolId,
          peptide_name: peptideName,
          timing: timing,
          taken_at: new Date().toISOString(),
          skipped: true,
          skip_reason: skipReason,
        });

      if (error) throw error;
      await fetchLogs();
      return true;
    } catch (err) {
      console.error('Error skipping intake:', err);
      return false;
    }
  };

  const isProtocolTakenToday = (protocolId: string): boolean => {
    return logs.some(log => log.protocol_id === protocolId && !log.skipped);
  };

  const isPeptideTakenToday = (protocolId: string, peptideName: string): boolean => {
    return logs.some(
      log => log.protocol_id === protocolId && 
             log.peptide_name === peptideName && 
             !log.skipped
    );
  };

  const isPeptideSkippedToday = (protocolId: string, peptideName: string): boolean => {
    return logs.some(
      log => log.protocol_id === protocolId && 
             log.peptide_name === peptideName && 
             log.skipped
    );
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    logIntake,
    skipIntake,
    isProtocolTakenToday,
    isPeptideTakenToday,
    isPeptideSkippedToday,
    getNextSuggestedSite,
    decrementVial,
    refetch: fetchLogs,
  };
}
