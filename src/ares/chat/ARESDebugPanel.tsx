import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function ARESDebugPanel({ lastTraceId }: { lastTraceId: string | null }) {
  const [row, setRow] = useState<any | null>(null);

  useEffect(() => {
    if (!lastTraceId) { setRow(null); return; }
    sb.from('ares_traces').select('*').eq('trace_id', lastTraceId).single().then(({ data }) => setRow(data || null));
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