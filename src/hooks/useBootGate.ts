import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pingAuth } from "@/utils/authDiagnostics";

type GateState = {
  ready: boolean;        // volle Freigabe
  degraded: boolean;     // Dashboard rendern, auch wenn nicht alles fertig ist
  reason?: string;       // warum degraded
  uid?: string | null;
};

export function useBootGate(timeoutMs = 4000): GateState {
  const [state, setState] = useState<GateState>({ ready: false, degraded: false, uid: null });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // 1) Hat der Client ein Token?
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          if (!cancelled) setState({ ready: false, degraded: false, reason: "no-token", uid: null });
          return;
        }

        // 2) Diag-Auth (bypasst RLS, prüft Profil-Zeile)
        const { data, error } = await pingAuth();
        if (error || !data?.ok) {
          // Kein harter Block: wir erlauben degraded Mode mit Grund
          if (!cancelled) setState({ ready: false, degraded: true, reason: "diag-auth-failed", uid: null });
          return;
        }

        // 3) Wenn diag-auth ok ist, schalten wir min. degraded frei
        if (!cancelled) {
          setState({ ready: false, degraded: true, reason: "waiting-bootstrap", uid: data.uid });
        }

        // 4) Kleiner Wartezyklus: wenn Profil+Bootstrap innerhalb Timeout fertig werden → ready
        const t = window.setTimeout(() => {
          if (!cancelled) {
            // nach timeout bleiben wir degraded, nicht blockieren
            setState(prev => ({ ...prev, ready: false, degraded: true, reason: prev.reason ?? "boot-timeout" }));
          }
        }, timeoutMs);
        timerRef.current = t as unknown as number;

      } catch (e: any) {
        if (!cancelled) setState({ ready: false, degraded: true, reason: e?.message ?? "boot-ex", uid: null });
      }
    };

    run();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [timeoutMs]);

  return useMemo(() => state, [state]);
}