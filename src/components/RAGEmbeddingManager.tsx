import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { RAGEmbeddingManager } from "@/utils/ragEmbeddingManager";
import { Database, Activity, Zap, BarChart3, RefreshCw, CheckCircle } from "lucide-react";
import { PerplexityKnowledgePipeline } from './PerplexityKnowledgePipeline';
import { RAGTestingSuite } from './RAGTestingSuite';
import { AutomatedPipelineManager } from './AutomatedPipelineManager';
import { EnhancedCoachTopicManager } from './EnhancedCoachTopicManager';

interface EmbeddingStatus {
  total_knowledge_entries: number;
  embedded_entries: number;
  missing_embeddings: string[];
  completion_percentage: number;
}

interface PerformanceMetrics {
  total_queries: number;
  avg_response_time: number;
  avg_relevance: number;
  search_methods: Record<string, number>;
  cache_hit_rate: number;
}

export const RAGEmbeddingManagerComponent: React.FC = () => {
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [status, metrics] = await Promise.all([
        RAGEmbeddingManager.checkEmbeddingStatus(),
        RAGEmbeddingManager.getPerformanceMetrics('sascha', 7)
      ]);
      
      setEmbeddingStatus(status);
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Error loading RAG data:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Konnte RAG-Daten nicht laden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateAllEmbeddings = async () => {
    try {
      setIsGenerating(true);
      
      toast({
        title: "Embedding-Generierung gestartet",
        description: "Dies kann einige Minuten dauern...",
      });

      const result = await RAGEmbeddingManager.generateAllEmbeddings();
      
      toast({
        title: "Embeddings erfolgreich generiert",
        description: `${result.processed} von ${result.total} Einträgen verarbeitet (${result.failed} Fehler)`,
      });

      // Daten neu laden
      await loadData();
    } catch (error) {
      console.error('Error generating embeddings:', error);
      toast({
        title: "Fehler bei Embedding-Generierung",
        description: "Embeddings konnten nicht generiert werden",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const testRAGSearch = async () => {
    try {
      const testQuery = "Wie kann ich meine Maximalkraft verbessern?";
      
      toast({
        title: "RAG-Test gestartet",
        description: `Teste Suchanfrage: "${testQuery}"`,
      });

      const result = await RAGEmbeddingManager.performRAGSearch(testQuery, 'sascha', {
        searchMethod: 'hybrid',
        maxResults: 3
      });

      if (result.success && result.context.length > 0) {
        toast({
          title: "RAG-Test erfolgreich",
          description: `${result.metadata.results_count} Ergebnisse in ${result.metadata.response_time_ms}ms (Relevanz: ${result.metadata.relevance_score.toFixed(2)})`,
        });
      } else {
        toast({
          title: "RAG-Test fehlgeschlagen",
          description: "Keine relevanten Ergebnisse gefunden",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing RAG:', error);
      toast({
        title: "RAG-Test Fehler",
        description: "Test konnte nicht durchgeführt werden",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            RAG-System wird geladen...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            RAG Embedding Manager - Phase 1.5
          </CardTitle>
          <CardDescription>
            Verwalte das Vector-Embedding-System für Saschas Enhanced RAG
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Enhanced Coach Topic Manager */}
      <EnhancedCoachTopicManager />

      {/* Automated Pipeline Manager */}
      <AutomatedPipelineManager />

      {/* Perplexity Knowledge Pipeline */}
      <PerplexityKnowledgePipeline />

      {/* RAG Testing Suite */}
      <RAGTestingSuite />

      {/* Embedding Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Embedding-Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {embeddingStatus && (
            <>
              <div className="flex items-center justify-between">
                <span>Fortschritt:</span>
                <Badge variant={embeddingStatus.completion_percentage === 100 ? "default" : "secondary"}>
                  {embeddingStatus.embedded_entries}/{embeddingStatus.total_knowledge_entries} 
                  ({embeddingStatus.completion_percentage}%)
                </Badge>
              </div>
              
              <Progress value={embeddingStatus.completion_percentage} className="w-full" />
              
              {embeddingStatus.missing_embeddings.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>Fehlende Embeddings:</strong><br />
                    {embeddingStatus.missing_embeddings.slice(0, 3).join(', ')}
                    {embeddingStatus.missing_embeddings.length > 3 && ` und ${embeddingStatus.missing_embeddings.length - 3} weitere`}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateAllEmbeddings}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isGenerating ? 'Generiere...' : 'Alle Embeddings generieren'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={testRAGSearch}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  RAG-System testen
                </Button>
                
                <Button
                  variant="outline"
                  onClick={loadData}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Aktualisieren
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance-Metriken (7 Tage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{performanceMetrics.total_queries}</div>
                <div className="text-sm text-muted-foreground">Anfragen</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(performanceMetrics.avg_response_time)}ms
                </div>
                <div className="text-sm text-muted-foreground">Ø Antwortzeit</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {(performanceMetrics.avg_relevance * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Ø Relevanz</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {performanceMetrics.cache_hit_rate.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Cache-Rate</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">Suchmethoden:</h4>
              <div className="flex gap-2">
                {Object.entries(performanceMetrics.search_methods).map(([method, count]) => (
                  <Badge key={method} variant="outline">
                    {method}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 1 Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Implementiert:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Vector-Embeddings mit OpenAI</li>
                <li>• Semantische Suche (PostgreSQL pgvector)</li>
                <li>• Hybrid-Search (Semantic + Keyword)</li>
                <li>• Intelligentes Text-Chunking</li>
                <li>• Performance-Tracking</li>
                <li>• Query-Caching System</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🎯 Erwartete Verbesserungen:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 3x bessere Relevanz</li>
                <li>• 2x schnellere Antwortzeiten</li>
                <li>• Intelligente Kontext-Auswahl</li>
                <li>• Automatisches Performance-Monitoring</li>
                <li>• Skalierbare Vector-Suche</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};