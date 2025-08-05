import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Play, Database, BarChart3, FileText, Activity, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getCurrentDateString } from '@/utils/dateHelpers';

export const SingleDaySummaryGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [existingSummary, setExistingSummary] = useState<any>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  const loadExistingSummary = async (date: string) => {
    if (!user || !date) return;

    setIsLoading(true);
    setExistingSummary(null);
    setResponse(null);

    try {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: "Verbindungsfehler",
          description: "Kann nicht auf die Datenbank zugreifen. Bitte versuchen Sie es später erneut.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setExistingSummary(data);
        toast({
          title: "Bestehender Summary gefunden",
          description: `Summary für ${date} bereits vorhanden`,
        });
      } else {
        toast({
          title: "Kein Summary vorhanden",
          description: `Für ${date} wurde noch kein Summary erstellt`,
        });
      }
    } catch (error: any) {
      console.error('Error loading existing summary:', error);
      toast({
        title: "Netzwerkfehler",
        description: "Verbindungsprobleme zur Datenbank. Bitte prüfen Sie Ihre Internetverbindung.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!user || !selectedDate) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Datum aus",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('day-summary', {
        body: {
          userId: user.id,
          date: selectedDate,
          forceUpdate: true
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast({
          title: "Server-Fehler",
          description: "Der Summary-Service ist temporär nicht verfügbar. Bitte versuchen Sie es später erneut.",
          variant: "destructive"
        });
        return;
      }

      setResponse(data);
      
      toast({
        title: "Erfolgreich",
        description: `Summary für ${selectedDate} ${data.status === 'success' ? 'neu erstellt' : data.status === 'skipped' ? 'übersprungen (bereits vorhanden)' : 'teilweise erstellt'}`,
        variant: data.status === 'success' ? "default" : "destructive"
      });

      // Lade den aktualisierten Summary nach einer kurzen Verzögerung
      setTimeout(() => {
        loadExistingSummary(selectedDate);
      }, 1000);

    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Netzwerkfehler",
        description: "Verbindungsprobleme zum Server. Bitte prüfen Sie Ihre Internetverbindung.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Tages-Summary Generator
        </CardTitle>
        <CardDescription>
          Erstellen Sie eine detaillierte Summary für einen spezifischen Tag
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              Datum auswählen
            </label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (e.target.value) {
                  loadExistingSummary(e.target.value);
                }
              }}
              max={getCurrentDateString()}
            />
          </div>
          <Button 
            onClick={handleGenerateSummary}
            disabled={!selectedDate || isGenerating}
            variant={existingSummary ? "outline" : "default"}
            className="min-w-[120px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Lädt...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {existingSummary ? 'Neu generieren' : 'Erstellen'}
              </>
            )}
          </Button>
        </div>

        {/* Bestehender Summary anzeigen */}
        {existingSummary && !response && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Bestehender Summary - {existingSummary.date}
              </CardTitle>
              <CardDescription>
                Dieser Summary wurde bereits erstellt am {new Date(existingSummary.created_at).toLocaleString('de-DE')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* KPIs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(existingSummary.total_calories || 0)}</div>
                  <div className="text-xs text-muted-foreground">Kalorien</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(existingSummary.total_protein || 0)}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(existingSummary.workout_volume || 0)}</div>
                  <div className="text-xs text-muted-foreground">Workout Vol.</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{existingSummary.workout_muscle_groups?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Muskelgruppen</div>
                </div>
              </div>

              {/* XL Summary */}
              {existingSummary.summary_xl_md && (
                <div className="p-4 border-l-4 border-primary bg-primary/5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    XL-Summary (Detailliert)
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {existingSummary.summary_xl_md}
                  </p>
                </div>
              )}

              {/* Standard Summary (Fallback) */}
              {!existingSummary.summary_xl_md && existingSummary.summary_md && (
                <div className="p-4 border-l-4 border-secondary bg-secondary/5">
                  <h4 className="font-semibold mb-2">Standard-Summary</h4>
                  <p className="text-sm leading-relaxed">
                    {existingSummary.summary_md}
                  </p>
                </div>
              )}

              {/* Top Foods */}
              {existingSummary.top_foods && existingSummary.top_foods.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">🍽️ Top Lebensmittel</h5>
                  <div className="flex flex-wrap gap-2">
                    {existingSummary.top_foods.map((food: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {food.food} ({food.count}x)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Muscle Groups */}
              {existingSummary.workout_muscle_groups && existingSummary.workout_muscle_groups.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">💪 Trainierte Muskelgruppen</h5>
                  <div className="flex flex-wrap gap-2">
                    {existingSummary.workout_muscle_groups.map((group: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Macro Distribution */}
              {existingSummary.macro_distribution && (
                <div>
                  <h5 className="font-medium mb-2">📊 Makro-Verteilung</h5>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-protein-light dark:bg-protein-light rounded">
                      <div className="font-semibold text-protein dark:text-protein">{existingSummary.macro_distribution.protein_percent || 0}%</div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center p-2 bg-carbs-light dark:bg-carbs-light rounded">
                      <div className="font-semibold text-carbs dark:text-carbs">{existingSummary.macro_distribution.carbs_percent || 0}%</div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center p-2 bg-fats-light dark:bg-fats-light rounded">
                      <div className="font-semibold text-fats dark:text-fats">{existingSummary.macro_distribution.fats_percent || 0}%</div>
                      <div className="text-xs text-muted-foreground">Fette</div>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

{response && (
          <div className="space-y-6 mt-6">
            {/* Status & Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Summary Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Datum:</span> {response.date}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge className={`ml-2 ${
                      response.status === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                      response.status === 'skipped' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                      'bg-red-100 text-red-800 hover:bg-red-100'
                    }`} variant="secondary">
                      {response.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Tokens verwendet:</span> {response.tokens_used || 0}
                  </div>
                  <div>
                    <span className="font-medium">Credits verbraucht:</span> {response.credits_used || 0}
                  </div>
                </div>
                
                {response.flags && response.flags.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium">Auffälligkeiten:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {response.flags.map((flag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {response.reason && (
                  <div className="mt-4">
                    <span className="font-medium">Grund:</span> {response.reason}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Debug Information */}
            {response.debug && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    🔍 Gesammelte Daten
                  </CardTitle>
                  <CardDescription>
                    Übersicht der Daten, die für diesen Tag erfasst wurden
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {Object.entries(response.debug.dataCollected).map(([key, count]) => (
                      <div key={key} className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{count as number}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {key === 'meals' ? 'Mahlzeiten' :
                           key === 'workouts' ? 'Workouts' :
                           key === 'exerciseSets' ? 'Übungssätze' :
                           key === 'weightEntries' ? 'Gewichtseinträge' :
                           key === 'bodyMeasurements' ? 'Körpermessungen' :
                           key === 'supplementEntries' ? 'Supplements' :
                           key === 'sleepEntries' ? 'Schlafeinträge' :
                           key === 'fluidEntries' ? 'Flüssigkeitseinträge' :
                           key === 'coachConversations' ? 'Coach-Gespräche' : key}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs */}
            {response.debug?.calculatedKPIs && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    📊 Berechnete KPIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{response.debug.calculatedKPIs.totalCalories || 0}</div>
                      <div className="text-sm text-muted-foreground">Gesamtkalorien</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{response.debug.calculatedKPIs.totalProtein || 0}g</div>
                      <div className="text-sm text-muted-foreground">Protein</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{response.debug.calculatedKPIs.workoutVolume || 0}</div>
                      <div className="text-sm text-muted-foreground">Trainingsvolumen</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{response.debug.calculatedKPIs.sleepScore || 0}/10</div>
                      <div className="text-sm text-muted-foreground">Schlaf-Score</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{response.debug.calculatedKPIs.hydrationScore || 0}/10</div>
                      <div className="text-sm text-muted-foreground">Hydration-Score</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{response.debug.calculatedKPIs.muscleGroups?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Muskelgruppen</div>
                    </div>
                  </div>
                  
                  {response.debug.calculatedKPIs.muscleGroups && response.debug.calculatedKPIs.muscleGroups.length > 0 && (
                    <div className="mt-4">
                      <span className="font-medium text-sm">Trainierte Muskelgruppen:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {response.debug.calculatedKPIs.muscleGroups.map((muscle: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary Lengths & Previews */}
            {response.debug?.summaryLengths && response.summary_preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    📝 Summary Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold text-primary">{response.debug.summaryLengths.standard}</div>
                      <div className="text-sm text-muted-foreground">Standard Wörter</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold text-primary">{response.debug.summaryLengths.xl}</div>
                      <div className="text-sm text-muted-foreground">XL Wörter</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold text-primary">{response.debug.summaryLengths.xxl}</div>
                      <div className="text-sm text-muted-foreground">XXL Wörter</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <span className="font-medium">Standard Summary Preview</span>
                        <span className="text-xs text-muted-foreground">Klicken zum erweitern</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{response.summary_preview.standard}</p>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <span className="font-medium">XL Summary Preview</span>
                        <span className="text-xs text-muted-foreground">Klicken zum erweitern</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{response.summary_preview.xl}</p>
                      </CollapsibleContent>
                    </Collapsible>

                     <Collapsible>
                       <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                         <span className="font-medium">XXL Summary Full Text</span>
                         <span className="text-xs text-muted-foreground">Klicken zum erweitern</span>
                       </CollapsibleTrigger>
                       <CollapsibleContent className="mt-2 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                         <div className="text-sm whitespace-pre-line font-mono text-xs leading-relaxed">
                           {response.summary_xxl_full || response.summary_preview?.xxl || 'Kein XXL Text verfügbar'}
                         </div>
                       </CollapsibleContent>
                     </Collapsible>
                   </div>
                 </CardContent>
               </Card>
             )}

             {/* Structured JSON Data */}
             {response.structured_summary && (
               <Card>
                 <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Code className="h-5 w-5" />
                     🤖 Strukturierte JSON-Daten
                   </CardTitle>
                   <CardDescription>
                     Maschinenlesbare Daten mit Supplements, Coach-Gesprächen und detaillierten Informationen
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <span className="font-medium">JSON-Daten anzeigen</span>
                        <span className="text-xs text-muted-foreground">Alle strukturierten Daten</span>
                      </CollapsibleTrigger>
                     <CollapsibleContent className="mt-2">
                       <div className="space-y-4">
                          {/* Nutrition Section */}
                          {response.structured_summary.nutrition && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold mb-3">🍽️ Ernährung</h4>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                               <div>
                                 <span className="font-medium">Kalorien:</span> {response.structured_summary.nutrition.totalCalories || 0}
                               </div>
                               <div>
                                 <span className="font-medium">Protein:</span> {response.structured_summary.nutrition.totalProtein || 0}g
                               </div>
                               <div>
                                 <span className="font-medium">Kohlenhydrate:</span> {response.structured_summary.nutrition.totalCarbs || 0}g
                               </div>
                               <div>
                                 <span className="font-medium">Fette:</span> {response.structured_summary.nutrition.totalFats || 0}g
                               </div>
                             </div>
                             {response.structured_summary.nutrition.topFoods && response.structured_summary.nutrition.topFoods.length > 0 && (
                               <div className="mt-3">
                                 <span className="font-medium text-sm">Top Lebensmittel:</span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {response.structured_summary.nutrition.topFoods.map((food: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {food}
                                      </Badge>
                                    ))}
                                 </div>
                               </div>
                             )}
                           </div>
                         )}

                          {/* Training Section */}
                          {response.structured_summary.training && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold mb-3">💪 Training</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="font-medium">Volumen:</span> {response.structured_summary.training.totalVolume || 0}kg
                                </div>
                                <div>
                                  <span className="font-medium">Sessions:</span> {response.structured_summary.training.totalSessions || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Übungen:</span> {response.structured_summary.training.totalExercises || 0}
                                </div>
                              </div>
                              {response.structured_summary.training.muscleGroups && response.structured_summary.training.muscleGroups.length > 0 && (
                                <div className="mt-3">
                                  <span className="font-medium text-sm">Muskelgruppen:</span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {response.structured_summary.training.muscleGroups.map((muscle: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {muscle}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Body Section */}
                          {response.structured_summary.body && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold mb-3">⚖️ Körper</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                {response.structured_summary.body.weight && (
                                  <div>
                                    <span className="font-medium">Gewicht:</span> {response.structured_summary.body.weight}kg
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">Messungen:</span> {response.structured_summary.body.measurementCount || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Hydration:</span> {response.structured_summary.body.hydrationScore || 0}/10
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Supplements Section */}
                          {response.structured_summary.supplements && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold mb-3">💊 Supplements</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="font-medium">Einnahmen:</span> {response.structured_summary.supplements.totalIntakes || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Compliance:</span> {response.structured_summary.supplements.complianceScore || 0}/10
                                </div>
                                <div>
                                  <span className="font-medium">Verschiedene:</span> {response.structured_summary.supplements.uniqueSupplements || 0}
                                </div>
                              </div>
                              {response.structured_summary.supplements.supplementDetails && response.structured_summary.supplements.supplementDetails.length > 0 && (
                                <div className="mt-3">
                                  <span className="font-medium text-sm">Details:</span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {response.structured_summary.supplements.supplementDetails.map((supplement: any, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {supplement.name || supplement}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Coach Conversations Section */}
                          {response.structured_summary.coaching && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold mb-3">🧠 Coach-Gespräche</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="font-medium">Nachrichten:</span> {response.structured_summary.coaching.totalMessages || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Themen:</span> {response.structured_summary.coaching.mainTopics?.length || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Stimmung:</span> {response.structured_summary.coaching.emotionalTone || 'neutral'}
                                </div>
                              </div>
                              {response.structured_summary.coaching.mainTopics && response.structured_summary.coaching.mainTopics.length > 0 && (
                                <div className="mt-3">
                                  <span className="font-medium text-sm">Themen:</span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {response.structured_summary.coaching.mainTopics.map((topic: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {response.structured_summary.coaching.keyInsights && (
                                <div className="mt-3">
                                  <span className="font-medium text-sm">Erkenntnisse:</span>
                                  <p className="text-xs mt-1 text-muted-foreground">{response.structured_summary.coaching.keyInsights}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Activity Section */}
                          {response.structured_summary.activity && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold mb-3">🚶 Aktivität</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="font-medium">Schritte:</span> {response.structured_summary.activity.steps || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Distanz:</span> {response.structured_summary.activity.distance || 0}km
                                </div>
                                <div>
                                  <span className="font-medium">Aktive Min:</span> {response.structured_summary.activity.activeMinutes || 0}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Raw JSON for developers */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                              <span className="font-medium text-sm">Raw JSON anzeigen</span>
                              <span className="text-xs text-muted-foreground">Für Entwickler</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg max-h-64 overflow-y-auto">
                              <pre className="text-xs font-mono whitespace-pre-wrap">
                                {JSON.stringify(response.structured_summary, null, 2)}
                              </pre>
                            </CollapsibleContent>
                          </Collapsible>
                       </div>
                     </CollapsibleContent>
                   </Collapsible>
                 </CardContent>
               </Card>
             )}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };