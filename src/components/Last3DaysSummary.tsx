import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const Last3DaysSummary = () => {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const loadSummaries = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generiere und lade Summaries in einem Schritt
      const { data, error } = await supabase.functions.invoke('generate-daily-summary-xl', {
        body: {
          userId: user.id,
          daysBack: 3,
          forceUpdate: false
        }
      });

      if (error) throw error;
      
      // Nach der Generation, lade die Summaries mit einer einfachen Supabase Query
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      // Verwende einen direkten SQL-artigen Ansatz über Edge Function
      const { data: summariesData, error: summariesError } = await supabase.functions.invoke('get-summaries', {
        body: {
          userId: user.id,
          startDate: threeDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }
      });

      if (summariesError) throw summariesError;
      setSummaries(summariesData?.summaries || []);

    } catch (error) {
      console.error('Error loading summaries:', error);
      toast({
        title: "Fehler",
        description: "Summaries konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummaries = async () => {
    try {
      setIsGenerating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      toast({
        title: "Erstelle Summaries...",
        description: "Analysiere deine letzten 3 Tage",
      });

      const { data, error } = await supabase.functions.invoke('generate-daily-summary-xl', {
        body: {
          userId: user.id,
          daysBack: 3,
          forceUpdate: true
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Summaries erstellt!",
        description: `${data.summary.created} neue Summaries generiert`,
      });

      // Lade Summaries neu
      await loadSummaries();

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

  useEffect(() => {
    loadSummaries();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade Summaries...
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Keine Summaries gefunden
          </CardTitle>
          <CardDescription>
            Für die letzten 3 Tage sind noch keine Summaries vorhanden. Soll ich sie erstellen?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={generateSummaries}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            📊 Summaries für die letzten 3 Tage erstellen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Letzte 3 Tage - Deine Summaries
          </h2>
          <p className="text-muted-foreground">
            Detaillierte Analyse deiner Fitness- und Ernährungsdaten
          </p>
        </div>
        <Button 
          onClick={generateSummaries}
          disabled={isGenerating}
          variant="outline"
          size="sm"
        >
          {isGenerating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          🔄 Aktualisieren
        </Button>
      </div>

      <div className="space-y-4">
        {summaries.map((summary, index) => (
          <Card key={summary.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {formatDate(summary.date)}
                </CardTitle>
                <Badge variant="outline">
                  {summary.date}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* KPIs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(summary.total_calories || 0)}</div>
                  <div className="text-xs text-muted-foreground">Kalorien</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(summary.total_protein || 0)}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(summary.workout_volume || 0)}</div>
                  <div className="text-xs text-muted-foreground">Workout Vol.</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{summary.workout_muscle_groups?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Muskelgruppen</div>
                </div>
              </div>

              {/* XL Summary */}
              {summary.summary_xl_md && (
                <div className="p-4 border-l-4 border-primary bg-primary/5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    XL-Summary (Detailliert)
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {summary.summary_xl_md}
                  </p>
                </div>
              )}

              {/* Standard Summary (Fallback) */}
              {!summary.summary_xl_md && summary.summary_md && (
                <div className="p-4 border-l-4 border-secondary bg-secondary/5">
                  <h4 className="font-semibold mb-2">Standard-Summary</h4>
                  <p className="text-sm leading-relaxed">
                    {summary.summary_md}
                  </p>
                </div>
              )}

              {/* Top Foods */}
              {summary.top_foods && summary.top_foods.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">🍽️ Top Lebensmittel</h5>
                  <div className="flex flex-wrap gap-2">
                    {summary.top_foods.map((food: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {food.food} ({food.count}x)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Muscle Groups */}
              {summary.workout_muscle_groups && summary.workout_muscle_groups.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">💪 Trainierte Muskelgruppen</h5>
                  <div className="flex flex-wrap gap-2">
                    {summary.workout_muscle_groups.map((group: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Macro Distribution */}
              {summary.macro_distribution && (
                <div>
                  <h5 className="font-medium mb-2">📊 Makro-Verteilung</h5>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-semibold">{summary.macro_distribution.protein_percent || 0}%</div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-semibold">{summary.macro_distribution.carbs_percent || 0}%</div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="font-semibold">{summary.macro_distribution.fats_percent || 0}%</div>
                      <div className="text-xs text-muted-foreground">Fette</div>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Last3DaysSummary;