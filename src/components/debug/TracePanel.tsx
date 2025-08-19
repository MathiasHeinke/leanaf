import { useTraceDebug } from '@/hooks/useTraceDebug';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw } from 'lucide-react';

interface TracePanelProps {
  traceId?: string | null;
}

export function TracePanel({ traceId }: TracePanelProps) {
  const { data, loading } = useTraceDebug(traceId);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!traceId) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Trace wird erzeugt…
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="animate-pulse text-sm p-4">
        Lade Trace {traceId}…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm p-4">
        Keine Debug-Daten für Trace <code className="bg-muted px-1 rounded">{traceId}</code>.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Trace ID: <code className="bg-muted px-1 rounded">{traceId}</code> • Status: <span className="font-medium">{data.status}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(traceId)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {/* Persona */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Persona</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(JSON.stringify(data.persona, null, 2))}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <pre className="rounded bg-muted p-3 overflow-x-auto text-xs max-h-40 overflow-y-auto">
          {JSON.stringify(data.persona, null, 2)}
        </pre>
      </section>

      {/* User Context */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">User Context</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(JSON.stringify(data.context, null, 2))}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <pre className="rounded bg-muted p-3 overflow-x-auto text-xs max-h-40 overflow-y-auto">
          {JSON.stringify(data.context, null, 2)}
        </pre>
      </section>

      {/* RAG Sources */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">RAG Sources</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(JSON.stringify(data.rag_sources, null, 2))}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <pre className="rounded bg-muted p-3 overflow-x-auto text-xs max-h-40 overflow-y-auto">
          {JSON.stringify(data.rag_sources, null, 2)}
        </pre>
      </section>

      {/* System Prompt */}
      {data.system_prompt && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">System Prompt</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data.system_prompt || '')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <textarea
            readOnly
            className="w-full text-xs rounded bg-muted p-3 min-h-[200px] resize-y"
            value={data.system_prompt || ''}
          />
        </section>
      )}

      {/* Complete Prompt Sent to LLM */}
      {data.complete_prompt && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Complete Prompt Sent to LLM</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data.complete_prompt || '')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <textarea
            readOnly
            className="w-full text-xs rounded bg-muted p-3 min-h-[250px] resize-y"
            value={data.complete_prompt || ''}
          />
        </section>
      )}

      {/* LLM Input */}
      {data.llm_input && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">LLM Input</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(data.llm_input, null, 2))}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="rounded bg-muted p-3 overflow-x-auto text-xs max-h-60 overflow-y-auto">
            {JSON.stringify(data.llm_input, null, 2)}
          </pre>
        </section>
      )}

      {/* LLM Output */}
      {data.llm_output && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">LLM Output</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(data.llm_output, null, 2))}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="rounded bg-muted p-3 overflow-x-auto text-xs max-h-60 overflow-y-auto">
            {JSON.stringify(data.llm_output, null, 2)}
          </pre>
        </section>
      )}

      {/* Error */}
      {data.error && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-destructive">Error</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(data.error, null, 2))}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="rounded bg-destructive/10 p-3 overflow-x-auto text-xs max-h-40 overflow-y-auto text-destructive">
            {JSON.stringify(data.error, null, 2)}
          </pre>
        </section>
      )}

      {/* Performance */}
      {data.duration_ms && (
        <div className="text-xs text-muted-foreground">
          Duration: {data.duration_ms}ms
        </div>
      )}
    </div>
  );
}