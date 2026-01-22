import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pingAuth } from "@/utils/authDiagnostics";

type GateState = {
  ready: boolean;        // volle Freigabe
  degraded: boolean;     // Dashboard rendern, auch wenn nicht alles fertig ist
  reason?: string;       // warum degraded
  uid?: string | null;
};

export function useBootGate(_timeoutMs = 2000): GateState {
  const [state, setState] = useState<GateState>({ ready: false, degraded: false, uid: null });

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
          // Kein harter Block: erlauben degraded Mode mit Grund
          if (!cancelled) setState({ ready: true, degraded: true, reason: "diag-auth-failed", uid: null });
          return;
        }

        // 3) Auth ok → sofort ready setzen (kein Warten mehr)
        if (!cancelled) {
          setState({ ready: true, degraded: false, reason: "auth-ok", uid: data.uid });
        }

      } catch (e: any) {
        if (!cancelled) setState({ ready: false, degraded: true, reason: e?.message ?? "boot-ex", uid: null });
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return useMemo(() => state, [state]);
}