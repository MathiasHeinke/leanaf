import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToolEvent } from '@/types/coach-dashboard';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Wrench, Zap, Hand, CheckCircle, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolsTabProps {
  toolEvents: ToolEvent[];
}

export const ToolsTab: React.FC<ToolsTabProps> = ({ toolEvents }) => {
  if (toolEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine Tool-Nutzung gefunden</p>
          <p className="text-sm">In diesem Gespräch wurden keine Tools verwendet</p>
        </div>
      </div>
    );
  }

  // Sort by created_at descending
  const sortedEvents = [...toolEvents].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Calculate statistics
  const autoTools = toolEvents.filter(event => event.source === 'auto').length;
  const manualTools = toolEvents.filter(event => event.source === 'manual').length;
  const appliedTools = toolEvents.filter(event => event.is_applied).length;
  const avgConfidence = toolEvents.reduce((sum, event) => sum + event.confidence, 0) / toolEvents.length;

  const getSourceIcon = (source: string) => {
    return source === 'auto' ? (
      <Zap className="h-3 w-3 text-yellow-600" />
    ) : (
      <Hand className="h-3 w-3 text-blue-600" />
    );
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeVariant = (confidence: number): "default" | "secondary" | "destructive" | "outline" => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Statistics Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{toolEvents.length}</div>
            <div className="text-xs text-muted-foreground">Tools gesamt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{autoTools}</div>
            <div className="text-xs text-muted-foreground">Auto-Detect</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{manualTools}</div>
            <div className="text-xs text-muted-foreground">Manuell</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{appliedTools}</div>
            <div className="text-xs text-muted-foreground">Angewendet</div>
          </div>
        </div>
        
        <div className="mt-3 text-center">
          <div className="text-sm text-muted-foreground">
            Durchschnittliche Konfidenz: <span className="font-medium">{(avgConfidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Tool Events Timeline */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {/* Timeline visualization */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border"></div>
            
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="relative flex gap-4 pb-4">
                {/* Timeline dot */}
                <div className={cn(
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2",
                  event.is_applied 
                    ? "bg-green-100 border-green-300" 
                    : "bg-gray-100 border-gray-300"
                )}>
                  {getSourceIcon(event.source)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-primary" />
                          {event.tool}
                        </CardTitle>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.source === 'auto' ? 'Auto' : 'Manuell'}
                          </Badge>
                          
                          <Badge 
                            variant={getConfidenceBadgeVariant(event.confidence)}
                            className="text-xs"
                          >
                            <Activity className="h-2 w-2 mr-1" />
                            {(event.confidence * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'HH:mm:ss', { locale: de })}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {event.is_applied ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Angewendet</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-500">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">Nicht angewendet</span>
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        {Object.keys(event.metadata).length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {Object.keys(event.metadata).length} Metadaten
                          </Badge>
                        )}
                      </div>

                      {/* Show metadata if available */}
                      {Object.keys(event.metadata).length > 0 && (
                        <div className="mt-3 bg-muted/50 rounded-md p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Metadaten</div>
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};