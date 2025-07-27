import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, Zap, Database, Target } from 'lucide-react';

const TRAINING_AREAS = [
  "Periodization", "VO2max Training", "Military Conditioning", "Biomechanics",
  "Strength Training", "Recovery", "Metabolic Conditioning", "Special Operations",
  "Sports Psychology", "Injury Prevention"
];

export const PerplexityKnowledgePipeline = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [currentArea, setCurrentArea] = useState('');
  const { toast } = useToast();

  const startPipeline = async (area = null) => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setCurrentArea(area || 'Alle Bereiche');

    try {
      toast({
        title: "🧠 Perplexity-Pipeline gestartet",
        description: `Automatisierte Wissensbasis-Erweiterung für ${area || 'alle Trainingsbereiche'}`,
      });

      const { data, error } = await supabase.functions.invoke('perplexity-knowledge-pipeline', {
        body: { 
          area,
          batchSize: area ? 1 : 3
        }
      });

      if (error) throw error;

      setResults(data.results || []);
      setProgress(100);
      
      toast({
        title: "✅ Pipeline erfolgreich abgeschlossen",
        description: `${data.results?.length || 0} neue Wissenseinträge hinzugefügt`,
      });

    } catch (error) {
      console.error('Pipeline error:', error);
      toast({
        title: "❌ Pipeline Fehler",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentArea('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Perplexity Knowledge Pipeline
          </CardTitle>
          <CardDescription>
            Automatisierte Erweiterung der Sascha Coach Wissensbasis mit aktueller Forschung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pipeline Controls */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => startPipeline()} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Alle Bereiche durchlaufen
            </Button>
            
            {TRAINING_AREAS.slice(0, 3).map(area => (
              <Button
                key={area}
                variant="outline"
                onClick={() => startPipeline(area)}
                disabled={isRunning}
                size="sm"
              >
                {area}
              </Button>
            ))}
          </div>

          {/* Progress Display */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Verarbeitung: {currentArea}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results Display */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Verarbeitete Themen ({results.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <span className="text-sm font-medium">{result.topic}</span>
                      <p className="text-xs text-muted-foreground">{result.category}</p>
                    </div>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status === 'success' ? '✓' : '✗'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">10</div>
              <div className="text-xs text-muted-foreground">Kategorien</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">40+</div>
              <div className="text-xs text-muted-foreground">Themen pro Lauf</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">1000+</div>
              <div className="text-xs text-muted-foreground">Ziel Einträge</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Areas Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Trainingsbereiche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {TRAINING_AREAS.map(area => (
              <Button
                key={area}
                variant="ghost"
                size="sm"
                onClick={() => startPipeline(area)}
                disabled={isRunning}
                className="justify-start h-auto p-2 text-left"
              >
                {area}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};