import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRAGMetrics } from "@/hooks/useRAGMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  Database, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Activity,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PerformanceMetrics {
  totalQueries: number;
  avgResponseTime: number;
  cacheHitRate: number;
  embeddingCoverage: number;
  topSearchTerms: Array<{ term: string; count: number }>;
  coachUsage: Array<{ coach_id: string; queries: number; avgRelevance: number }>;
  knowledgeGaps: Array<{ area: string; missingQueries: number }>;
}

interface EmbeddingHealth {
  totalEmbeddings: number;
  totalKnowledge: number;
  coveragePercentage: number;
  missingEmbeddings: Array<{ title: string; coach_id: string; id: string }>;
  avgChunkSize: number;
  qualityScore: number;
}

const RAGPerformanceMonitor = () => {
  const { toast } = useToast();
  const { metrics: ragMetrics, loading: ragLoading, refetch: refetchRAG } = useRAGMetrics();
  const [embeddingHealth, setEmbeddingHealth] = useState<EmbeddingHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Refresh RAG metrics from hook
      refetchRAG();
      // Get embedding health
      const { data: knowledgeEntries } = await supabase
        .from('coach_knowledge_base')
        .select('id, title, coach_id');

      const { data: embeddings } = await supabase
        .from('knowledge_base_embeddings')
        .select('knowledge_id, content_chunk');

      if (knowledgeEntries && embeddings) {
        const embeddedKnowledgeIds = new Set(embeddings.map(e => e.knowledge_id));
        const missingEmbeddings = knowledgeEntries.filter(
          entry => !embeddedKnowledgeIds.has(entry.id)
        );

        const avgChunkSize = embeddings.reduce((sum, e) => sum + e.content_chunk.length, 0) / embeddings.length;
        
        setEmbeddingHealth({
          totalEmbeddings: embeddings.length,
          totalKnowledge: knowledgeEntries.length,
          coveragePercentage: (embeddedKnowledgeIds.size / knowledgeEntries.length) * 100,
          missingEmbeddings: missingEmbeddings.map(e => ({ title: e.title, coach_id: e.coach_id, id: e.id })),
          avgChunkSize: Math.round(avgChunkSize),
          qualityScore: Math.min(100, (embeddedKnowledgeIds.size / knowledgeEntries.length) * 100)
        });
      }

      // Real metrics are now provided by useRAGMetrics hook
      // No need to set simulated data anymore

    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        title: "Fehler",
        description: "Metriken konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeEmbeddings = async () => {
    setIsOptimizing(true);
    try {
      const { data: missingEmbeddings } = await supabase
        .from('coach_knowledge_base')
        .select('id')
        .not('id', 'in', `(${Array.from(new Set(embeddingHealth?.missingEmbeddings?.map(e => e.id) || [])).join(',')})`);

      if (missingEmbeddings && missingEmbeddings.length > 0) {
        // Call embedding generation function
        const { error } = await supabase.functions.invoke('generate-embeddings', {
          body: { regenerateAll: false }
        });

        if (error) throw error;

        toast({
          title: "Optimierung gestartet",
          description: "Fehlende Embeddings werden generiert.",
        });
        
        // Reload metrics after optimization
        setTimeout(loadMetrics, 2000);
      }
    } catch (error) {
      console.error('Error optimizing embeddings:', error);
      toast({
        title: "Optimierung fehlgeschlagen",
        description: "Embeddings konnten nicht optimiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">RAG Performance Monitor</h2>
        <div className="flex gap-2">
          <Button
            onClick={loadMetrics}
            disabled={isLoading || ragLoading}
            size="sm"
            variant="outline"
          >
            {(isLoading || ragLoading) ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Aktualisieren
          </Button>
          <Button
            onClick={optimizeEmbeddings}
            disabled={isOptimizing || !embeddingHealth?.missingEmbeddings?.length}
            size="sm"
          >
            {isOptimizing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
            Optimieren
          </Button>
        </div>
      </div>

      {/* Embedding Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Embedding-Gesundheit
          </CardTitle>
          <CardDescription>
            Status der Wissensbasis-Vektorisierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {embeddingHealth && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">{embeddingHealth.totalEmbeddings}</div>
                  <div className="text-sm text-muted-foreground">Embeddings</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{embeddingHealth.totalKnowledge}</div>
                  <div className="text-sm text-muted-foreground">Knowledge Entries</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{embeddingHealth.coveragePercentage.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Abdeckung</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{embeddingHealth.avgChunkSize}</div>
                  <div className="text-sm text-muted-foreground">Ø Chunk-Größe</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Qualitäts-Score</span>
                  <span className="text-sm">{embeddingHealth.qualityScore.toFixed(1)}%</span>
                </div>
                <Progress value={embeddingHealth.qualityScore} className="w-full" />
              </div>

              {embeddingHealth.missingEmbeddings.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      {embeddingHealth.missingEmbeddings.length} Einträge ohne Embeddings gefunden
                    </div>
                    <details>
                      <summary className="cursor-pointer">Details anzeigen</summary>
                      <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {embeddingHealth.missingEmbeddings.slice(0, 10).map((entry, index) => (
                          <li key={index} className="text-xs">
                            <Badge variant="outline" className="mr-2">{entry.coach_id}</Badge>
                            {entry.title}
                          </li>
                        ))}
                        {embeddingHealth.missingEmbeddings.length > 10 && (
                          <li className="text-xs text-muted-foreground">
                            ... und {embeddingHealth.missingEmbeddings.length - 10} weitere
                          </li>
                        )}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {ragMetrics && (
        <>
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Query Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Gesamt Anfragen</span>
                  <span className="font-semibold">{ragMetrics.totalQueries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Ø Antwortzeit</span>
                  <span className="font-semibold">{ragMetrics.avgResponseTime.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cache Hit Rate</span>
                  <span className="font-semibold">{(ragMetrics.cacheHitRate * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Coach Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ragMetrics.coachUsage.length > 0 ? ragMetrics.coachUsage.map((coach) => (
                  <div key={coach.coach_id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{coach.coach_id}</Badge>
                      <span className="text-sm">{coach.queries}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(coach.avgRelevance * 100).toFixed(0)}% rel.
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Keine RAG-Aktivitäten gefunden
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Top Suchbegriffe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ragMetrics.topSearchTerms.length > 0 ? ragMetrics.topSearchTerms.map((term, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{term.term}</span>
                    <Badge variant="outline">{term.count}</Badge>
                  </div>
                )) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Keine Suchbegriffe verfügbar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Erkannte Wissenslücken
              </CardTitle>
              <CardDescription>
                Bereiche mit häufigen, aber unvollständig beantworteten Anfragen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ragMetrics.knowledgeGaps.length > 0 ? ragMetrics.knowledgeGaps.map((gap, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{gap.area}</div>
                      <div className="text-sm text-muted-foreground">
                        {gap.missingQueries} unvollständige Anfragen
                      </div>
                    </div>
                    <Badge variant="destructive">{gap.missingQueries}</Badge>
                  </div>
                )) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Keine Wissenslücken erkannt
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RAGPerformanceMonitor;