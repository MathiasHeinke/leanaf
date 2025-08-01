import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

const Generate14DaysSummary = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentDate, setCurrentDate] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [finalResults, setFinalResults] = useState<any>(null);
  const { toast } = useToast();

  const generate14DaysSummaries = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setResults([]);
      setFinalResults(null);
      
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
        title: "🚀 Starte 14-Tage XL-Summary Generation",
        description: "Analysiere jeden Tag einzeln und erstelle detaillierte Summaries",
      });

      // Zeige aktuelle Verarbeitung an
      setCurrentDate("Starte Verarbeitung...");

      const { data, error } = await supabase.functions.invoke('generate-daily-summary-xl', {
        body: {
          userId: user.id,
          daysBack: 14,
          forceUpdate: true // Überschreibe bestehende Summaries
        }
      });

      if (error) {
        console.error('Error generating summaries:', error);
        throw error;
      }

      setFinalResults(data);
      setProgress(100);
      setCurrentDate("Abgeschlossen!");

      // Zeige detaillierte Ergebnisse
      if (data.results) {
        setResults(data.results);
      }

      toast({
        title: "✅ 14-Tage XL-Summaries erfolgreich erstellt!",
        description: `${data.summary.created} neue Summaries, ${data.summary.skipped} übersprungen, ${data.summary.errors} Fehler`,
      });

    } catch (error) {
      console.error('Error generating 14-day summaries:', error);
      toast({
        title: "❌ Fehler bei der Summary-Generation",
        description: error.message || "Unbekannter Fehler aufgetreten",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'skipped':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            14-Tage XL-Summary Generator
          </CardTitle>
          <CardDescription>
            Erstellt für jeden der letzten 14 Tage eine separate, detaillierte Summary (240 Wörter) 
            mit allen Fitness- und Ernährungsdaten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {!isGenerating && !finalResults && (
            <Button 
              onClick={generate14DaysSummaries}
              className="w-full h-12 text-lg"
            >
              <Calendar className="h-5 w-5 mr-2" />
              📊 Starte 14-Tage XL-Summary Generation
            </Button>
          )}

          {isGenerating && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {currentDate}
                </p>
              </div>
              
              <Progress value={progress} className="w-full" />
              
              <div className="text-center text-sm text-muted-foreground">
                Analysiere jeden Tag einzeln und erstelle detaillierte XL-Summaries...
              </div>
            </div>
          )}

          {finalResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{finalResults.summary.created}</div>
                  <div className="text-sm text-muted-foreground">Neu erstellt</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{finalResults.summary.skipped}</div>
                  <div className="text-sm text-muted-foreground">Übersprungen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{finalResults.summary.errors}</div>
                  <div className="text-sm text-muted-foreground">Fehler</div>
                </div>
              </div>

              <Button 
                onClick={generate14DaysSummaries}
                variant="outline"
                className="w-full"
              >
                🔄 Erneut ausführen (Force Update)
              </Button>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Detaillierte Ergebnisse */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Detaillierte Ergebnisse - Tag für Tag</CardTitle>
            <CardDescription>
              Übersicht aller verarbeiteten Tage mit Status und Details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium">
                        {formatDate(result.date)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.date}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {result.status === 'success' && result.kpis && (
                      <div className="text-right text-xs text-muted-foreground mr-2">
                        <div>{Math.round(result.kpis.totalCalories || 0)} kcal</div>
                        <div>{Math.round(result.kpis.totalProtein || 0)}g Protein</div>
                      </div>
                    )}
                    
                    <Badge variant={getStatusColor(result.status)}>
                      {result.status === 'success' ? '✅ Erstellt' : 
                       result.status === 'skipped' ? '⏭️ Übersprungen' : 
                       result.status === 'error' ? '❌ Fehler' : result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground text-center">
              💾 Alle Summaries wurden einzeln in der Datenbank gespeichert
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900">
                Was passiert bei der 14-Tage XL-Summary Generation?
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Jeder Tag wird einzeln analysiert (14 separate Durchgänge)</li>
                <li>• Sammelt alle Daten: Mahlzeiten, Workouts, Gewicht, Supplements</li>
                <li>• Berechnet erweiterte KPIs: Makros, Top-Foods, Muskelgruppen</li>
                <li>• Erstellt XL-Summaries (240 Wörter) mit OpenAI GPT-4o</li>
                <li>• Speichert jeden Tag als separaten Datenbankeintrag</li>
                <li>• Lucy kann danach auf 14 Tage detaillierte Memory zugreifen</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Generate14DaysSummary;