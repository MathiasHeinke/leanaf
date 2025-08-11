import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShadowMeta {
  domain_probs?: Record<string, number>;
  action_probs?: Record<string, number>;
  entities?: Record<string, string[]>;
  suggestions?: string[];
  soft_signal?: ("maybe_log_meal"|"maybe_add_supplement"|"maybe_analyze_stack")[];
}

export function useShadowState() {
  const [shadowTraceId, setShadowTraceId] = useState<string | null>(null);
  const [pendingChips, setPendingChips] = useState<string[]>([]);
  const [chipTimeout, setChipTimeout] = useState<NodeJS.Timeout | null>(null);

  const saveShadowTraceId = useCallback((traceId: string) => {
    setShadowTraceId(traceId);
  }, []);

  const clearShadowTraceId = useCallback(() => {
    setShadowTraceId(null);
    setPendingChips([]);
    if (chipTimeout) {
      clearTimeout(chipTimeout);
      setChipTimeout(null);
    }
  }, [chipTimeout]);

  const scheduleChips = useCallback(async (traceId: string, delay = 6500) => {
    // Clear any existing timeout
    if (chipTimeout) {
      clearTimeout(chipTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('shadow_state')
          .select('meta')
          .eq('trace_id', traceId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!error && data?.meta) {
          const meta = data.meta as ShadowMeta;
          if (meta.suggestions?.length) {
            const suggestions = meta.suggestions.slice(0, 3);
            setPendingChips(suggestions);
          }
        }
      } catch (error) {
        console.debug('Failed to load shadow chips:', error);
      }
    }, delay);

    setChipTimeout(timeout);
  }, [chipTimeout]);

  const clearChips = useCallback(() => {
    setPendingChips([]);
    if (chipTimeout) {
      clearTimeout(chipTimeout);
      setChipTimeout(null);
    }
  }, [chipTimeout]);

  return {
    shadowTraceId,
    pendingChips,
    saveShadowTraceId,
    clearShadowTraceId,
    scheduleChips,
    clearChips
  };
}