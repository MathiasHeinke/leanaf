import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Play, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmbeddingStats {
  total_knowledge: number;
  with_embeddings: number;
  coverage_percentage: number;
}

export function EmbeddingStatus() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmbeddingStats = async () => {
    try {
      setLoading(true);
      
      // Get knowledge entries with embeddings
      const { data: withEmbeddings, error: embError } = await supabase
        .from('knowledge_base_embeddings')
        .select('knowledge_id')
        .not('knowledge_id', 'is', null);
      
      // Get total knowledge count
      const { count: totalCount, error: countError } = await supabase
        .from('coach_knowledge_base')
        .select('*', { count: 'exact', head: true });
      
      if (embError || countError) {
        throw new Error('Database query failed');
      }
      
      if (totalCount !== null) {
        const uniqueEmbeddings = new Set(withEmbeddings?.map(e => e.knowledge_id) || []);
        const embeddingCount = uniqueEmbeddings.size;
        
        setStats({
          total_knowledge: totalCount,
          with_embeddings: embeddingCount,
          coverage_percentage: totalCount > 0 ? (embeddingCount / totalCount) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch embedding stats:', error);
      // Use realistic fallback values
      setStats({
        total_knowledge: 354,
        with_embeddings: 0,
        coverage_percentage: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEmbeddings = async () => {
    setIsGenerating(true);
    try {
      console.log('🔥 Starting embedding generation for all knowledge entries...');
      
      const { data, error } = await supabase.functions.invoke('optimized-embeddings', {
        body: { action: 'regenerate_all' }
      });
      
      if (error) {
        console.error('Embedding generation error:', error);
        throw error;
      }
      
      console.log('✅ Embedding generation response:', data);
      
      toast({
        title: "Embeddings Generation Started",
        description: `Processing ${stats?.total_knowledge || 354} knowledge entries. This may take a few minutes.`,
      });
      
      // Poll for updates every 5 seconds
      const pollInterval = setInterval(async () => {
        await fetchEmbeddingStats();
        
        // Check if we've reached good coverage
        if (stats && stats.coverage_percentage > 90) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          toast({
            title: "Embeddings Complete!",
            description: "Lucy's knowledge base is now fully searchable.",
          });
        }
      }, 5000);
      
      // Auto-stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsGenerating(false);
      }, 300000);
      
    } catch (error: any) {
      console.error('Failed to generate embeddings:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate embeddings. Check console for details.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchEmbeddingStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchEmbeddingStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading embedding status...</span>
        </CardContent>
      </Card>
    );
  }

  const coverageColor = stats ? (
    stats.coverage_percentage >= 95 ? 'text-green-600' :
    stats.coverage_percentage >= 50 ? 'text-yellow-600' :
    'text-red-600'
  ) : 'text-gray-600';

  const needsGeneration = stats && stats.coverage_percentage < 95;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Lucy's Knowledge Base</CardTitle>
        <Brain className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${coverageColor} mb-2`}>
          {stats ? `${stats.coverage_percentage.toFixed(1)}%` : 'Loading...'}
        </div>
        
        {stats && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {stats.with_embeddings} / {stats.total_knowledge} knowledge entries searchable
            </p>
            
            <Progress value={stats.coverage_percentage} className="mb-4" />
            
            <div className="flex items-center gap-2 mb-3">
              {stats.coverage_percentage >= 95 ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  RAG System Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {stats.total_knowledge - stats.with_embeddings} missing
                </Badge>
              )}
              
              {isGenerating && (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </Badge>
              )}
            </div>

            {needsGeneration && (
              <>
                <div className="text-sm text-muted-foreground mb-3">
                  Lucy needs embeddings to access her knowledge base. Without them, she can't answer questions about training, nutrition, or coaching.
                </div>
                
                <Button
                  size="sm"
                  onClick={generateEmbeddings}
                  disabled={isGenerating}
                  className="w-full"
                >
                  <Play className="w-3 h-3 mr-2" />
                  {isGenerating ? 'Generating Embeddings...' : 'Generate Knowledge Embeddings'}
                </Button>
              </>
            )}
            
            {stats.coverage_percentage >= 95 && (
              <div className="text-sm text-green-600 dark:text-green-400">
                ✅ Lucy has full access to her knowledge base and can provide expert coaching advice!
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}