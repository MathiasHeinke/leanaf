import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calendar, TrendingUp, Target } from 'lucide-react';

const SummaryGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const generateSummaries = async (daysBack: number = 14, forceUpdate: boolean = false) => {
    try {
      setIsGenerating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Fehler",
          description: "Du musst angemeldet sein",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "XL-Summaries werden erstellt...",
        description: `Verarbeite die letzten ${daysBack} Tage`,
      });

      const { data, error } = await supabase.functions.invoke('generate-daily-summary-xl', {
        body: {
          userId: user.id,
          daysBack,
          forceUpdate
        }
      });

      if (error) throw error;

      setResults(data);
      
      toast({
        title: "🎯 XL-Summaries erstellt!",
        description: `${data.summary.created} neue Summaries, ${data.summary.skipped} übersprungen`,
      });

    } catch (error) {
      console.error('Error generating summaries:', error);
      toast({
        title: "Fehler",
        description: "Summaries konnten nicht erstellt werden",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            XL-Memory Summary Generator
          </CardTitle>
          <CardDescription>
            Erstellt detaillierte tägliche Zusammenfassungen (240 Wörter) aller deiner Fitness- und Ernährungsdaten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => generateSummaries(7)}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Letzte 7 Tage
            </Button>
            
            <Button 
              onClick={() => generateSummaries(14)}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              Letzte 2 Wochen
            </Button>
            
            <Button 
              onClick={() => generateSummaries(30)}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Letzter Monat
            </Button>
          </div>

          <Button 
            onClick={() => generateSummaries(14, true)}
            disabled={isGenerating}
            variant="secondary"
            className="w-full"
          >
            🔄 Bestehende Summaries überschreiben (Force Update)
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Ergebnisse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.summary.created}</div>
                <div className="text-sm text-muted-foreground">Erstellt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{results.summary.skipped}</div>
                <div className="text-sm text-muted-foreground">Übersprungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{results.summary.errors}</div>
                <div className="text-sm text-muted-foreground">Fehler</div>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.results.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-mono text-sm">{result.date}</span>
                  <Badge 
                    variant={
                      result.status === 'success' ? 'default' : 
                      result.status === 'skipped' ? 'secondary' : 'destructive'
                    }
                  >
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryGenerator;