import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Activity, Zap, Brain, Eye, Database, Gauge } from 'lucide-react';

interface PerformanceMetric {
  function_name: string;
  model: string;
  avg_duration: number;
  total_calls: number;
  avg_tokens: number;
  success_rate: number;
  last_call: string;
}

const modelCategories = {
  'gpt-4.1-2025-04-14': { 
    type: 'Reasoning', 
    icon: Brain, 
    color: 'bg-purple-500', 
    description: 'Tiefes Schlussfolgern, beste Instruktions-Treue'
  },
  'gpt-4o': { 
    type: 'Vision Fast', 
    icon: Eye, 
    color: 'bg-blue-500', 
    description: 'Vision + rasches Feedback (≤3s)'
  },
  'gpt-4o-mini': { 
    type: 'Bulk', 
    icon: Zap, 
    color: 'bg-green-500', 
    description: 'Massendurchsatz, unkritisch'
  },
  'text-embedding-3-small': { 
    type: 'Embeddings', 
    icon: Database, 
    color: 'bg-orange-500', 
    description: '~30% bessere MRR als Ada-002'
  },
  'whisper-1': { 
    type: 'Voice', 
    icon: Activity, 
    color: 'bg-indigo-500', 
    description: 'Beste WER bei 30s-Chunks'
  }
};

const OpenAIPerformanceDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      // Simulated metrics - in real app, this would come from Supabase analytics
      const mockMetrics: PerformanceMetric[] = [
        {
          function_name: 'coach-workout-analysis',
          model: 'gpt-4.1-2025-04-14',
          avg_duration: 2300,
          total_calls: 156,
          avg_tokens: 850,
          success_rate: 99.4,
          last_call: new Date().toISOString()
        },
        {
          function_name: 'unified-coach-engine',
          model: 'gpt-4o-mini',
          avg_duration: 1200,
          total_calls: 2340,
          avg_tokens: 450,
          success_rate: 98.9,
          last_call: new Date().toISOString()
        },
        {
          function_name: 'analyze-meal',
          model: 'gpt-4o',
          avg_duration: 1800,
          total_calls: 890,
          avg_tokens: 650,
          success_rate: 99.1,
          last_call: new Date().toISOString()
        },
        {
          function_name: 'generate-day-summaries',
          model: 'gpt-4o-mini',
          avg_duration: 900,
          total_calls: 450,
          avg_tokens: 320,
          success_rate: 99.8,
          last_call: new Date().toISOString()
        },
        {
          function_name: 'enhanced-coach-rag',
          model: 'text-embedding-3-small',
          avg_duration: 500,
          total_calls: 1200,
          avg_tokens: 0,
          success_rate: 99.9,
          last_call: new Date().toISOString()
        }
      ];

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      toast({
        title: "Fehler",
        description: "Performance-Metriken konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateEmbeddings = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimized-embeddings', {
        body: { action: 'regenerate_all' }
      });

      if (error) throw error;

      toast({
        title: "Embeddings aktualisiert",
        description: `${data.processed} Embeddings mit text-embedding-3-small regeneriert`,
      });
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      toast({
        title: "Fehler",
        description: "Embeddings konnten nicht aktualisiert werden",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPerformanceStatus = (duration: number) => {
    if (duration < 1000) return { status: 'Excellent', color: 'bg-green-500' };
    if (duration < 2000) return { status: 'Good', color: 'bg-blue-500' };
    if (duration < 5000) return { status: 'Fair', color: 'bg-yellow-500' };
    return { status: 'Slow', color: 'bg-red-500' };
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Anmeldung erforderlich</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">OpenAI Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Optimiert für maximale Geschwindigkeit + Qualität (Kosten ignoriert)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchMetrics} 
            variant="outline" 
            disabled={loading}
          >
            <Gauge className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
          <Button 
            onClick={regenerateEmbeddings} 
            disabled={isRefreshing}
          >
            <Database className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Aktualisiere...' : 'Embeddings optimieren'}
          </Button>
        </div>
      </div>

      {/* Model Strategy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(modelCategories).map(([model, config]) => {
          const Icon = config.icon;
          const modelMetrics = metrics.filter(m => m.model === model);
          const totalCalls = modelMetrics.reduce((sum, m) => sum + m.total_calls, 0);
          const avgDuration = modelMetrics.length > 0 
            ? modelMetrics.reduce((sum, m) => sum + m.avg_duration, 0) / modelMetrics.length 
            : 0;

          return (
            <Card key={model} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${config.color}`} />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <CardTitle className="text-sm">{config.type}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Aufrufe</span>
                    <span className="text-sm font-medium">{totalCalls.toLocaleString()}</span>
                  </div>
                  {avgDuration > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Avg. Latenz</span>
                      <Badge variant={avgDuration < 2000 ? 'default' : 'secondary'} className="text-xs">
                        {avgDuration.toFixed(0)}ms
                      </Badge>
                    </div>
                  )}
                  <div className="text-xs font-mono text-muted-foreground mt-2 truncate">
                    {model}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Function Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.map((metric) => {
          const modelConfig = modelCategories[metric.model as keyof typeof modelCategories];
          const performance = getPerformanceStatus(metric.avg_duration);
          const Icon = modelConfig?.icon || Activity;

          return (
            <Card key={`${metric.function_name}-${metric.model}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-lg">{metric.function_name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {modelConfig?.type || 'Other'}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${performance.color}`} />
                  </div>
                </div>
                <CardDescription className="font-mono text-xs">
                  {metric.model}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Latenz</span>
                      <span className="text-sm font-medium">{metric.avg_duration}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Aufrufe</span>
                      <span className="text-sm font-medium">{metric.total_calls.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Erfolgsrate</span>
                      <span className="text-sm font-medium">{metric.success_rate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {metric.avg_tokens > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg. Tokens</span>
                        <span className="text-sm font-medium">{metric.avg_tokens}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={performance.status === 'Excellent' ? 'default' : 'secondary'}>
                        {performance.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Aktive Optimierungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
                ✅ Modell-Routing
              </h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                GPT-4.1 für Reasoning, GPT-4o für Vision, GPT-4o-mini für Bulk
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                ✅ Retry-Policy
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Exponentielles Backoff (200ms-2s), max 3 Versuche
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">
                ✅ Optimierte Embeddings
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                text-embedding-3-small, 256 Token Chunks, 32 Token Overlap
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpenAIPerformanceDashboard;