import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { RAGEmbeddingManager } from "@/utils/ragEmbeddingManager";
import { supabase } from "@/integrations/supabase/client";
import { 
  TestTube, 
  Search, 
  MessageSquare, 
  BarChart3, 
  CheckCircle, 
  XCircle,
  Clock,
  Target,
  Zap,
  RefreshCw
} from "lucide-react";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  details?: string;
  score?: number;
}

interface RAGTestMetrics {
  embeddingGeneration: TestResult;
  semanticSearch: TestResult;
  hybridSearch: TestResult;
  coachIntegration: TestResult;
  performanceMonitoring: TestResult;
}

const testQueries = [
  "Wie kann ich meine Maximalkraft verbessern?",
  "Was ist der beste Trainingsplan für Muskelaufbau?",
  "Wie optimiere ich meine Ernährung für Fettverbrennung?",
  "Welche Supplemente sind wissenschaftlich belegt?",
  "Wie wichtig ist Schlaf für die Regeneration?"
];

export const RAGTestingSuite: React.FC = () => {
  const [testMetrics, setTestMetrics] = useState<RAGTestMetrics>({
    embeddingGeneration: { name: 'Embedding-Generierung', status: 'pending' },
    semanticSearch: { name: 'Semantische Suche', status: 'pending' },
    hybridSearch: { name: 'Hybrid-Suche', status: 'pending' },
    coachIntegration: { name: 'Coach-Integration', status: 'pending' },
    performanceMonitoring: { name: 'Performance-Monitoring', status: 'pending' }
  });
  
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();

  const updateTestResult = (testKey: keyof RAGTestMetrics, result: Partial<TestResult>) => {
    setTestMetrics(prev => ({
      ...prev,
      [testKey]: { ...prev[testKey], ...result }
    }));
  };

  // Test 1: Embedding-Generierung
  const testEmbeddingGeneration = async (): Promise<void> => {
    const startTime = Date.now();
    updateTestResult('embeddingGeneration', { status: 'running' });
    
    try {
      // Prüfe Embedding-Status
      const status = await RAGEmbeddingManager.checkEmbeddingStatus();
      
      // Teste einzelne Embedding-Generierung
      const { data: latestEntry } = await supabase
        .from('coach_knowledge_base')
        .select('id, title')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestEntry) {
        await RAGEmbeddingManager.generateSingleEmbedding(latestEntry.id);
      }

      const duration = Date.now() - startTime;
      const completionRate = status.completion_percentage;
      
      updateTestResult('embeddingGeneration', {
        status: completionRate === 100 ? 'success' : 'error',
        duration,
        details: `${status.embedded_entries}/${status.total_knowledge_entries} Embeddings (${completionRate}%)`,
        score: completionRate
      });
    } catch (error) {
      updateTestResult('embeddingGeneration', {
        status: 'error',
        duration: Date.now() - startTime,
        details: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // Test 2: Semantische Suche
  const testSemanticSearch = async (): Promise<void> => {
    const startTime = Date.now();
    updateTestResult('semanticSearch', { status: 'running' });
    
    try {
      const results = [];
      
      for (const query of testQueries.slice(0, 3)) {
        const result = await RAGEmbeddingManager.performRAGSearch(query, 'sascha', {
          searchMethod: 'semantic',
          maxResults: 5,
          contextWindow: 2000
        });
        results.push(result);
      }
      
      const avgRelevance = results.reduce((sum, r) => sum + r.metadata.relevance_score, 0) / results.length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.metadata.response_time_ms, 0) / results.length;
      
      updateTestResult('semanticSearch', {
        status: avgRelevance > 0.7 ? 'success' : 'error',
        duration: Date.now() - startTime,
        details: `Ø Relevanz: ${(avgRelevance * 100).toFixed(1)}%, Ø Zeit: ${Math.round(avgResponseTime)}ms`,
        score: avgRelevance * 100
      });
    } catch (error) {
      updateTestResult('semanticSearch', {
        status: 'error',
        duration: Date.now() - startTime,
        details: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // Test 3: Hybrid-Suche
  const testHybridSearch = async (): Promise<void> => {
    const startTime = Date.now();
    updateTestResult('hybridSearch', { status: 'running' });
    
    try {
      const results = [];
      
      for (const query of testQueries.slice(0, 3)) {
        const result = await RAGEmbeddingManager.performRAGSearch(query, 'sascha', {
          searchMethod: 'hybrid',
          maxResults: 5,
          contextWindow: 2000
        });
        results.push(result);
      }
      
      const avgRelevance = results.reduce((sum, r) => sum + r.metadata.relevance_score, 0) / results.length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.metadata.response_time_ms, 0) / results.length;
      
      updateTestResult('hybridSearch', {
        status: avgRelevance > 0.75 ? 'success' : 'error',
        duration: Date.now() - startTime,
        details: `Ø Relevanz: ${(avgRelevance * 100).toFixed(1)}%, Ø Zeit: ${Math.round(avgResponseTime)}ms`,
        score: avgRelevance * 100
      });
    } catch (error) {
      updateTestResult('hybridSearch', {
        status: 'error',
        duration: Date.now() - startTime,
        details: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // Test 4: Coach-Integration
  const testCoachIntegration = async (): Promise<void> => {
    const startTime = Date.now();
    updateTestResult('coachIntegration', { status: 'running' });
    
    try {
      // Teste RAG-Integration mit dem Coach-Chat
      const testQuery = "Wie kann ich meine Maximalkraft verbessern?";
      
      const ragResult = await RAGEmbeddingManager.performRAGSearch(testQuery, 'sascha', {
        searchMethod: 'hybrid',
        maxResults: 3
      });
      
      // Simuliere Coach-Chat mit RAG-Kontext
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: testQuery,
          coachId: 'sascha',
          ragContext: ragResult.context
        }
      });
      
      if (error) throw error;
      
      const hasContext = ragResult.context.length > 0;
      const hasResponse = data && data.response;
      const responseQuality = hasResponse && data.response.length > 100;
      
      updateTestResult('coachIntegration', {
        status: hasContext && hasResponse && responseQuality ? 'success' : 'error',
        duration: Date.now() - startTime,
        details: `RAG-Kontext: ${ragResult.context.length} Chunks, Antwort: ${hasResponse ? 'OK' : 'Fehler'}`,
        score: hasContext && hasResponse ? 100 : 0
      });
    } catch (error) {
      updateTestResult('coachIntegration', {
        status: 'error',
        duration: Date.now() - startTime,
        details: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // Test 5: Performance-Monitoring
  const testPerformanceMonitoring = async (): Promise<void> => {
    const startTime = Date.now();
    updateTestResult('performanceMonitoring', { status: 'running' });
    
    try {
      // Hole Performance-Metriken
      const metrics = await RAGEmbeddingManager.getPerformanceMetrics('sascha', 7);
      
      // Prüfe RAG-Performance-Tabelle
      const { data: recentMetrics } = await supabase
        .from('rag_performance_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      const hasMetrics = metrics && metrics.total_queries > 0;
      const hasRecentData = recentMetrics && recentMetrics.length > 0;
      const avgResponseTime = metrics?.avg_response_time || 0;
      
      updateTestResult('performanceMonitoring', {
        status: hasMetrics && hasRecentData && avgResponseTime < 3000 ? 'success' : 'error',
        duration: Date.now() - startTime,
        details: `${metrics?.total_queries || 0} Anfragen, Ø ${Math.round(avgResponseTime)}ms`,
        score: avgResponseTime < 3000 ? 100 : Math.max(0, 100 - avgResponseTime / 30)
      });
    } catch (error) {
      updateTestResult('performanceMonitoring', {
        status: 'error',
        duration: Date.now() - startTime,
        details: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setOverallProgress(0);
    
    const tests = [
      { key: 'embeddingGeneration', func: testEmbeddingGeneration, name: 'Embedding-Generierung' },
      { key: 'semanticSearch', func: testSemanticSearch, name: 'Semantische Suche' },
      { key: 'hybridSearch', func: testHybridSearch, name: 'Hybrid-Suche' },
      { key: 'coachIntegration', func: testCoachIntegration, name: 'Coach-Integration' },
      { key: 'performanceMonitoring', func: testPerformanceMonitoring, name: 'Performance-Monitoring' }
    ];
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      
      try {
        await test.func();
      } catch (error) {
        console.error(`Test ${test.name} failed:`, error);
      }
      
      setOverallProgress(((i + 1) / tests.length) * 100);
      
      // Kurze Pause zwischen Tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setCurrentTest('');
    setIsRunningTests(false);
    
    toast({
      title: "RAG-Tests abgeschlossen",
      description: "Alle Tests wurden durchgeführt. Prüfe die Ergebnisse.",
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'running': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const calculateOverallScore = () => {
    const completedTests = Object.values(testMetrics).filter(t => t.status !== 'pending' && t.status !== 'running');
    if (completedTests.length === 0) return 0;
    
    const totalScore = completedTests.reduce((sum, test) => sum + (test.score || 0), 0);
    return Math.round(totalScore / completedTests.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            RAG-System Test Suite
          </CardTitle>
          <CardDescription>
            Vollständige Validierung der RAG-Integration und Performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunningTests}
              className="flex items-center gap-2"
            >
              {isRunningTests ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isRunningTests ? 'Tests laufen...' : 'Alle Tests starten'}
            </Button>
            
            {isRunningTests && (
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Aktuell: {currentTest}</span>
                  <Badge variant="outline">{Math.round(overallProgress)}%</Badge>
                </div>
                <Progress value={overallProgress} className="w-full" />
              </div>
            )}
            
            {!isRunningTests && calculateOverallScore() > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Gesamt-Score:</span>
                <Badge variant={calculateOverallScore() > 80 ? "default" : "secondary"}>
                  {calculateOverallScore()}%
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(testMetrics).map(([key, test]) => (
          <Card key={key} className={`border-2 ${getStatusColor(test.status)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  {test.name}
                </span>
                {test.score !== undefined && (
                  <Badge variant="outline">{Math.round(test.score)}%</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {test.duration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {test.duration}ms
                  </div>
                )}
                {test.details && (
                  <p className="text-xs text-muted-foreground">{test.details}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Test-Anfragen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {testQueries.map((query, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                <Target className="w-3 h-3 text-muted-foreground" />
                {query}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Erfolgs-Kriterien</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Ziel-Metriken:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Embedding-Vollständigkeit: 100%</li>
                <li>• Semantische Relevanz: {'>'}70%</li>
                <li>• Hybrid-Relevanz: {'>'}75%</li>
                <li>• Antwortzeit: {'<'}3000ms</li>
                <li>• Coach-Integration: Erfolgreich</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🎯 Erwartete Verbesserungen:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Kontextuelle Coach-Antworten</li>
                <li>• Wissenschaftlich fundierte Empfehlungen</li>
                <li>• Konsistente Antwortqualität</li>
                <li>• Skalierbare Performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};