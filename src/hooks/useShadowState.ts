import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from '@/integrations/supabase/client';

export interface ShadowMeta {
  domain_probs?: Record<string, number>;
  action_probs?: Record<string, number>;
  entities?: Record<string, string[]>;
  suggestions?: string[];
  soft_signal?: ("maybe_log_meal"|"maybe_add_supplement"|"maybe_analyze_stack")[];
}

export function useShadowState() {
  const [shadowTraceId, setShadowTraceId] = useState<string|null>(null);
  const [pendingChips, setPendingChips] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const typingRef = useRef(false);

  // expose to parent to set typing state
  const setUserTyping = useCallback((typing: boolean) => { typingRef.current = typing; }, []);

  const saveShadowTraceId = useCallback((traceId: string) => {
    setShadowTraceId(traceId);
  }, []);

  const clearShadowTraceId = useCallback(() => {
    setShadowTraceId(null);
    setPendingChips([]);
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const scheduleChips = useCallback(async (traceId: string, delay = 6500) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      if (typingRef.current) return; // don't show chips while typing
      try {
        const { data, error } = await supabase
          .from("shadow_state")
          .select("meta")
          .eq("trace_id", traceId)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!error && data?.meta) {
          const meta = data.meta as ShadowMeta;
          if (meta.suggestions?.length) {
            setPendingChips(meta.suggestions.slice(0, 3));
          }
        }
      } catch {}
    }, delay);
  }, []);

  const clearChips = useCallback(() => {
    setPendingChips([]);
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  useEffect(() => () => { // unmount
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return {
    shadowTraceId,
    pendingChips,
    saveShadowTraceId,
    clearShadowTraceId,
    scheduleChips,
    clearChips,
    setUserTyping,
  };
}