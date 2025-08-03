import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RagEvent } from '@/types/coach-dashboard';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Database, FileText, TrendingUp } from 'lucide-react';

interface RagTabProps {
  ragEvents: RagEvent[];
}

export const RagTab: React.FC<RagTabProps> = ({ ragEvents }) => {
  if (ragEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine RAG-Treffer gefunden</p>
          <p className="text-sm">In diesem Gespräch wurde kein RAG-Kontext verwendet</p>
        </div>
      </div>
    );
  }

  // Sort by score descending
  const sortedEvents = [...ragEvents].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Calculate statistics
  const avgScore = ragEvents.reduce((sum, event) => sum + (event.score || 0), 0) / ragEvents.length;
  const maxScore = Math.max(...ragEvents.map(event => event.score || 0));
  const uniqueSources = new Set(ragEvents.map(event => event.source_doc).filter(Boolean)).size;

  const getScoreColor = (score: number | null): string => {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!score) return 'outline';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Statistics Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{ragEvents.length}</div>
            <div className="text-xs text-muted-foreground">RAG-Treffer</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(avgScore * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg. Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{uniqueSources}</div>
            <div className="text-xs text-muted-foreground">Quellen</div>
          </div>
        </div>
      </div>

      {/* RAG Events List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {sortedEvents.map((event, index) => (
            <Card key={event.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    RAG-Treffer #{index + 1}
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getScoreBadgeVariant(event.score)}
                      className="text-xs"
                    >
                      <TrendingUp className="h-2 w-2 mr-1" />
                      {event.score ? (event.score * 100).toFixed(1) + '%' : 'N/A'}
                    </Badge>
                    
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'HH:mm:ss', { locale: de })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                {/* Source Document */}
                {event.source_doc && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Quelle</div>
                      <div className="text-sm">{event.source_doc}</div>
                    </div>
                  </div>
                )}

                {/* Content Snippet */}
                {event.content_snippet && (
                  <div className="bg-muted/50 rounded-md p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Kontext</div>
                    <div className="text-sm leading-relaxed">
                      {event.content_snippet}
                    </div>
                  </div>
                )}

                {/* Chunk ID (for debugging) */}
                {event.chunk_id && (
                  <div className="text-xs text-muted-foreground">
                    Chunk ID: <code className="bg-muted px-1 rounded">{event.chunk_id}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};