import { useTrace } from '@/hooks/useTrace';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw } from 'lucide-react';

interface TraceInspectorProps {
  traceId?: string;
}

export default function TraceInspector({ traceId }: TraceInspectorProps) {
  const { trace, loading, error, refetch } = useTrace(traceId);

  if (!traceId) {
    return <p className="text-sm opacity-60">No trace selected.</p>;
  }

  if (loading) {
    return <p className="animate-pulse text-sm">Loading trace data…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-red-500 text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (!trace) {
    return <p className="opacity-60 text-sm">No context data available for this trace</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-70">
          Trace: {trace.id} · Status: {trace.status}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(trace.id)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      <Section title="Persona" data={trace.persona ?? {}} />
      <Section title="RAG Sources" data={trace.rag_chunks ?? []} />
      <Section title="User Context" data={trace.user_context ?? {}} />

      <div>
        <h3 className="font-medium mb-1">Complete Prompt Sent to LLM</h3>
        <div className="relative">
          <textarea 
            readOnly 
            className="w-full min-h-[160px] bg-muted/30 p-2 rounded text-xs font-mono resize-y"
            value={trace.system_prompt ?? ''} 
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1"
            onClick={() => navigator.clipboard.writeText(trace.system_prompt || '')}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Section title="LLM Input" data={trace.llm_input ?? {}} />
      <Section title="LLM Output" data={trace.llm_output ?? {}} />
      <Section title="Meta" data={trace.meta ?? {}} />
    </div>
  );
}

function Section({ title, data }: { title: string; data: any }) {
  return (
    <div>
      <h3 className="font-medium mb-1">{title}</h3>
      <div className="relative">
        <pre className="bg-muted/30 p-2 rounded text-xs overflow-auto max-h-32 font-mono">
{JSON.stringify(data, null, 2)}
        </pre>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1"
          onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}