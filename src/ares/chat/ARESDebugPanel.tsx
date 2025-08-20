
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useComponentTrace } from '../trace/withTrace';

export default function ARESDebugPanel({ lastTraceId }: { lastTraceId: string | null }) {
  const [row, setRow] = useState<any | null>(null);
  
  // Component tracing
  useComponentTrace('ARES:DebugPanel', lastTraceId);

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`[ARES-Debug] Copied ${label} to clipboard`);
    });
  };

  if (!lastTraceId) return null;

  return (
    <div className="border-t bg-muted/30 p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Trace: {lastTraceId}</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(lastTraceId, 'Trace ID')}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://supabase.com/dashboard/project/gzczjscctgyxjyodhnhk/sql/new`, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {!row && <div className="text-muted-foreground">No context data available for this trace</div>}
      {row && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Persona</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(row.persona, null, 2), 'Persona')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64 text-xs">
              {JSON.stringify(row.persona, null, 2)}
            </pre>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Context</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(row.context, null, 2), 'Context')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64 text-xs">
              {JSON.stringify(row.context, null, 2)}
            </pre>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">System Prompt</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(row.system_prompt || '', 'System Prompt')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64 text-xs">
              {row.system_prompt}
            </pre>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">RAG Sources</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(row.rag_sources, null, 2), 'RAG Sources')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="p-2 bg-background rounded-lg overflow-auto max-h-64 text-xs">
              {JSON.stringify(row.rag_sources, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
