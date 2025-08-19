import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTraceDebug } from '@/hooks/useTraceDebug';
import { useState } from 'react';
import { Copy, RefreshCw, X } from 'lucide-react';

interface DebugTraceInspectorProps {
  traceId?: string;
  onClose?: () => void;
}

export function DebugTraceInspector({ traceId, onClose }: DebugTraceInspectorProps) {
  const { data: trace, loading } = useTraceDebug(traceId);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!traceId) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="shadow-lg"
        >
          Debug Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(720px,90vw)] max-h-[80vh] overflow-hidden">
      <Card className="shadow-2xl border">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">Trace Debug Panel</div>
              <div className="font-mono text-xs opacity-80">{traceId}</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(traceId)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
              >
                ─
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {loading && <div className="text-sm opacity-70">Lade Trace…</div>}

          {trace && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="text-xs opacity-70">
                Status: <span className="font-mono">{trace.status}</span> | 
                Created: <span className="font-mono">{new Date(trace.created_at).toLocaleTimeString()}</span>
              </div>

              {trace.persona && (
                <Section title="Persona">
                  <JsonView data={trace.persona} />
                </Section>
              )}

              {trace.context && (
                <Section title="User Context">
                  <JsonView data={trace.context} />
                </Section>
              )}

              {trace.rag_sources && (
                <Section title="RAG Sources">
                  <JsonView data={trace.rag_sources} />
                </Section>
              )}

              {trace.system_prompt && (
                <Section title="System Prompt (assembled)">
                  <CodeBlock text={trace.system_prompt} />
                </Section>
              )}

              {trace.llm_input && (
                <Section title="LLM Input">
                  <JsonView data={trace.llm_input} />
                </Section>
              )}

              {trace.llm_output && (
                <Section title="LLM Output">
                  <JsonView data={trace.llm_output} />
                </Section>
              )}

              {trace.error && (
                <Section title="Error Information">
                  <JsonView data={trace.error} />
                </Section>
              )}

              {trace.duration_ms && (
                <div className="text-xs opacity-70">
                  Duration: {trace.duration_ms}ms
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{title}</div>
      <div className="rounded-md border bg-muted/30 p-2">{children}</div>
    </div>
  );
}

function JsonView({ data }: { data: any }) {
  return (
    <div className="relative">
      <pre className="text-xs whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
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
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <div className="relative">
      <textarea
        readOnly
        className="w-full text-xs font-mono bg-transparent outline-none resize-y min-h-[120px] p-2"
        value={text}
      />
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1"
        onClick={() => navigator.clipboard.writeText(text || '')}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}