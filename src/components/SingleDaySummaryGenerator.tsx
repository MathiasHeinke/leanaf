import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Play } from 'lucide-react';

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
    <Card className="w-full max-w-2xl mx-auto">
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
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Antwort</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Datum:</span> {response.date}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      response.status === 'success' ? 'bg-green-100 text-green-800' :
                      response.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {response.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Tokens verwendet:</span> {response.tokens_used || 0}
                  </div>
                  <div>
                    <span className="font-medium">Credits verbraucht:</span> {response.credits_used || 0}
                  </div>
                </div>
                
                {response.flags && response.flags.length > 0 && (
                  <div>
                    <span className="font-medium">Auffälligkeiten:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {response.flags.map((flag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {response.reason && (
                  <div>
                    <span className="font-medium">Grund:</span> {response.reason}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};