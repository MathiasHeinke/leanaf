
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ARESDebugPanel({ lastTraceId }: { lastTraceId: string | null }) {
  const [row, setRow] = useState<any | null>(null);

  useEffect(() => {
    if (!lastTraceId) { setRow(null); return; }
    // Secure debug read via edge function (respects RLS)
    supabase.functions.invoke('ares-get-trace', { body: { traceId: lastTraceId } })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[ARES-Debug] trace fetch error:', error);
          setRow(null);
          return;
        }
        setRow((data as any)?.data || null);
      });
  }, [lastTraceId]);

  if (!import.meta.env.VITE_ARES_DEBUG || !lastTraceId) return null;

  return (
    <div className="border-t bg-muted/30 p-3 text-xs">
      <div className="font-medium">Trace: {lastTraceId}</div>
      {!row && <div className="text-muted-foreground">No context data available for this trace</div>}
      {row && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64">Persona: {JSON.stringify(row.persona, null, 2)}</pre>
          <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64">Context: {JSON.stringify(row.context, null, 2)}</pre>
          <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64">System Prompt: {row.system_prompt}</pre>
          <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64">RAG: {JSON.stringify(row.rag_sources, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
