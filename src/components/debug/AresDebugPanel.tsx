import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Copy, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchTraceDetails } from '@/lib/orchestratorClient';

interface AresDebugPanelProps {
  traceId?: string;
  httpStatus?: number;
  serverBody?: string;
  error?: any;
  onClose?: () => void;
}

export function AresDebugPanel({ 
  traceId, 
  httpStatus, 
  serverBody, 
  error,
  onClose 
}: AresDebugPanelProps) {
  const [traceData, setTraceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopiert!');
  };

  const refreshTrace = async () => {
    if (!traceId) return;
    
    setLoading(true);
    try {
      const data = await fetchTraceDetails(traceId);
      setTraceData(data);
    } catch (err) {
      console.error('Failed to refresh trace:', err);
      toast.error('Trace konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (traceId && !traceData) {
      refreshTrace();
    }
  }, [traceId]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-background shadow-lg"
        >
          ARES Debug
          {httpStatus && (
            <Badge variant={httpStatus >= 400 ? "destructive" : "secondary"} className="ml-2">
              {httpStatus}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[600px] overflow-auto z-50 bg-background shadow-xl border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">ARES Debug Panel</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 text-xs">
        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            {httpStatus && (
              <Badge variant={httpStatus >= 400 ? "destructive" : "secondary"}>
                HTTP {httpStatus}
              </Badge>
            )}
          </div>
          
          {traceId && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Trace ID:</span>
              <code className="flex-1 p-1 bg-muted rounded text-xs">{traceId}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(traceId)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {traceData && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshTrace}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="outline">
                {traceData.status || 'unknown'}
              </Badge>
              {traceData.duration_ms && (
                <Badge variant="outline">
                  {traceData.duration_ms}ms
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Server Response */}
        {(serverBody || error) && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 font-medium">
              <ChevronDown className="h-3 w-3" />
              Server Response
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-2 bg-muted rounded">
                <pre className="text-xs whitespace-pre-wrap">
                  {serverBody || JSON.stringify(error, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(serverBody || JSON.stringify(error, null, 2))}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Trace Data Sections */}
        {traceData && (
          <>
            {traceData.persona && (
              <DebugSection 
                title="Persona" 
                data={traceData.persona}
                onCopy={() => copyToClipboard(JSON.stringify(traceData.persona, null, 2))}
              />
            )}
            
            {traceData.context && (
              <DebugSection 
                title="Context" 
                data={traceData.context}
                onCopy={() => copyToClipboard(JSON.stringify(traceData.context, null, 2))}
              />
            )}
            
            {traceData.rag_sources && (
              <DebugSection 
                title="RAG Sources" 
                data={traceData.rag_sources}
                onCopy={() => copyToClipboard(JSON.stringify(traceData.rag_sources, null, 2))}
              />
            )}
            
            {traceData.system_prompt && (
              <DebugSection 
                title="System Prompt" 
                data={traceData.system_prompt}
                isText
                onCopy={() => copyToClipboard(traceData.system_prompt)}
              />
            )}
            
            {traceData.llm_input && (
              <DebugSection 
                title="LLM Input" 
                data={traceData.llm_input}
                onCopy={() => copyToClipboard(JSON.stringify(traceData.llm_input, null, 2))}
              />
            )}
            
            {traceData.llm_output && (
              <DebugSection 
                title="LLM Output" 
                data={traceData.llm_output}
                isText
                onCopy={() => copyToClipboard(traceData.llm_output)}
              />
            )}
            
            {traceData.error && (
              <DebugSection 
                title="Error" 
                data={traceData.error}
                onCopy={() => copyToClipboard(JSON.stringify(traceData.error, null, 2))}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DebugSectionProps {
  title: string;
  data: any;
  isText?: boolean;
  onCopy?: () => void;
}

function DebugSection({ title, data, isText, onCopy }: DebugSectionProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 font-medium">
        <ChevronDown className="h-3 w-3" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-2 bg-muted rounded">
          <pre className="text-xs whitespace-pre-wrap max-h-32 overflow-auto">
            {isText ? data : JSON.stringify(data, null, 2)}
          </pre>
          {onCopy && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={onCopy}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}