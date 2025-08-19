import React from 'react';
import { JsonPanel } from '@/components/gehirn/JsonPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export function RequestInspector({ 
  request, 
  response, 
  onInspectPrompt 
}: { 
  request: any | null; 
  response: any | null;
  onInspectPrompt?: () => void;
}) {
  return (
    <section className="rounded-2xl border bg-muted/30 p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Request Inspector</h2>
          <p className="text-sm text-muted-foreground">Zeigt den letzten Payload und die Roh-Antwort der Funktion.</p>
        </div>
        {onInspectPrompt && (response?.traceId || response?.meta?.debug) && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {response?.meta?.debug?.model || response.model || 'GPT-4'}
            </Badge>
            {(response?.meta?.debug?.tokensUsed || response.tokensUsed) && (
              <Badge variant="secondary" className="text-xs">
                {response?.meta?.debug?.tokensUsed || response.tokensUsed} tokens
              </Badge>
            )}
            {response?.meta?.debug && (
              <Badge variant="outline" className="text-xs bg-green-50">
                Deep Debug
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onInspectPrompt}
            >
              <FileText className="h-4 w-4 mr-1" />
              Inspect Prompt
            </Button>
          </div>
        )}
      </header>

      <div>
        <h3 className="mb-2 text-sm font-medium">Letzter Request</h3>
        {request ? (
          <JsonPanel data={request} maxHeight={180} />
        ) : (
          <p className="text-sm text-muted-foreground">Noch kein Request ausgeführt.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Letzte Response</h3>
        {response ? (
          <JsonPanel data={response} maxHeight={240} />
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Response verfügbar.</p>
        )}
      </div>
    </section>
  );
}
