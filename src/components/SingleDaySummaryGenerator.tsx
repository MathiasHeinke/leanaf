import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Play, Database, BarChart3, FileText, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const SingleDaySummaryGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  const handleGenerateSummary = async () => {
    if (!user || !selectedDate) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Datum aus",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('day-summary', {
        body: {
          userId: user.id,
          date: selectedDate,
          forceUpdate
        }
      });

      if (error) throw error;

      setResponse(data);
      
      toast({
        title: "Erfolgreich",
        description: `Summary für ${selectedDate} ${data.status === 'success' ? 'erstellt' : data.status === 'skipped' ? 'übersprungen (bereits vorhanden)' : 'teilweise erstellt'}`,
        variant: data.status === 'success' ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Fehler",
        description: error.message || 'Fehler beim Erstellen der Summary',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="forceUpdate"
              checked={forceUpdate}
              onChange={(e) => setForceUpdate(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="forceUpdate" className="text-sm">
              Überschreiben
            </label>
          </div>
          <Button 
            onClick={handleGenerateSummary}
            disabled={!selectedDate || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Lädt...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Erstellen
              </>
            )}
          </Button>
        </div>

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
                      <div className="text-xl font-bold text-blue-600">{response.debug.summaryLengths.standard}</div>
                      <div className="text-sm text-muted-foreground">Standard Wörter</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold text-purple-600">{response.debug.summaryLengths.xl}</div>
                      <div className="text-sm text-muted-foreground">XL Wörter</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold text-green-600">{response.debug.summaryLengths.xxl}</div>
                      <div className="text-sm text-muted-foreground">XXL Wörter</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <span className="font-medium">Standard Summary Preview</span>
                        <span className="text-xs text-muted-foreground">Klicken zum erweitern</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{response.summary_preview.standard}</p>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <span className="font-medium">XL Summary Preview</span>
                        <span className="text-xs text-muted-foreground">Klicken zum erweitern</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{response.summary_preview.xl}</p>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <span className="font-medium">XXL Summary Preview</span>
                        <span className="text-xs text-muted-foreground">Klicken zum erweitern</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{response.summary_preview.xxl}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};