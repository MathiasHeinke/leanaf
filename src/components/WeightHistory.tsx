
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Scale, CalendarIcon, Plus, TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { toast } from "sonner";

interface WeightEntry {
  id?: string;
  date: string;
  weight: number;
  displayDate: string;
}

interface WeightHistoryProps {
  weightHistory: WeightEntry[];
  loading: boolean;
  onDataUpdate: () => void;
}

export const WeightHistory = ({ weightHistory, loading, onDataUpdate }: WeightHistoryProps) => {
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ show: boolean; existingEntry?: WeightEntry }>({ show: false });
  const { user } = useAuth();
  const { awardPoints, updateStreak } = usePointsSystem();

  const addWeightEntry = async (forceOverwrite = false) => {
    if (!user || !newWeight) return;
    
    try {
      const weight = parseFloat(newWeight);
      if (isNaN(weight) || weight <= 0) {
        toast.error('Bitte gib ein gültiges Gewicht ein');
        return;
      }

      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      // Validate date - no future entries allowed
      if (selectedDateStr > today) {
        toast.error('Du kannst kein Gewicht für die Zukunft eintragen');
        return;
      }

      // Check for existing entry for this date
      const existingEntry = weightHistory.find(entry => entry.date === selectedDateStr);
      
      if (existingEntry && !forceOverwrite) {
        setConfirmOverwrite({ show: true, existingEntry });
        return;
      }

      let result;
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('weight_history')
          .update({ weight: weight })
          .eq('id', existingEntry.id);

        if (error) throw error;
        result = 'updated';
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('weight_history')
          .insert({
            user_id: user.id,
            weight: weight,
            date: selectedDateStr
          });

        if (error) throw error;
        result = 'inserted';
      }

      // Award points and update streak only for today's entries
      if (selectedDateStr === today && result === 'inserted') {
        console.log('🎯 Awarding points for weight measurement today');
        try {
          await awardPoints('weight_measured', 3, 'Gewicht gemessen');
          await updateStreak('daily_tracking', selectedDate);
          toast.success('Gewicht erfolgreich hinzugefügt! +3 Punkte erhalten');
        } catch (pointsError) {
          console.error('Error awarding points:', pointsError);
          toast.success('Gewicht erfolgreich hinzugefügt');
        }
      } else if (result === 'updated') {
        toast.success('Gewicht erfolgreich aktualisiert');
      } else {
        toast.success('Gewicht erfolgreich hinzugefügt');
      }

      setNewWeight('');
      setSelectedDate(new Date());
      setIsAddingWeight(false);
      setConfirmOverwrite({ show: false });
      onDataUpdate();
    } catch (error: any) {
      console.error('Error adding/updating weight:', error);
      toast.error('Fehler beim Speichern des Gewichts');
    }
  };

  const deleteWeightEntry = async (entryId: string) => {
    if (!user) return;
    
    setDeletingId(entryId);
    
    try {
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Gewichtseintrag gelöscht');
      onDataUpdate();
    } catch (error: any) {
      console.error('Error deleting weight entry:', error);
      toast.error('Fehler beim Löschen des Gewichtseintrags');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Lade Gewichtsdaten...</p>
      </div>
    );
  }

  // Calculate trend
  const getTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const difference = latest - previous;
    return {
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
      amount: Math.abs(difference)
    };
  };

  const trend = getTrend();

  return (
    <div className="space-y-4">
      {/* Add Weight Button */}
      <Dialog open={isAddingWeight} onOpenChange={setIsAddingWeight}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Gewicht hinzufügen
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Gewicht hinzufügen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">Gewicht (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="75.5"
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: de }) : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                Du kannst kein Gewicht für die Zukunft eintragen
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddingWeight(false)} className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={() => addWeightEntry(false)} className="flex-1">
                Hinzufügen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Overwrite Dialog */}
      <AlertDialog open={confirmOverwrite.show} onOpenChange={(open) => setConfirmOverwrite({ show: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gewicht bereits vorhanden</AlertDialogTitle>
            <AlertDialogDescription>
              Für das Datum {confirmOverwrite.existingEntry?.displayDate} ist bereits ein Gewichtseintrag vorhanden ({confirmOverwrite.existingEntry?.weight} kg). 
              Möchtest du diesen überschreiben?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOverwrite({ show: false })}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => addWeightEntry(true)}>
              Überschreiben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Weight History List */}
      {weightHistory.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Scale className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Noch keine Gewichtsdaten vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Füge dein erstes Gewicht hinzu, um den Verlauf zu verfolgen
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Latest Weight Card */}
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-2xl font-bold text-primary">{weightHistory[0].weight} kg</div>
                <div className="text-sm text-muted-foreground">Aktuelles Gewicht</div>
                <div className="text-xs text-muted-foreground">{weightHistory[0].displayDate}</div>
              </div>
              
              <div className="flex items-center gap-3">
                {trend && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {trend.direction === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : trend.direction === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        trend.direction === 'up' ? "text-red-500" :
                        trend.direction === 'down' ? "text-green-500" : "text-muted-foreground"
                      )}>
                        {trend.direction === 'stable' ? '±0.0' : `${trend.direction === 'up' ? '+' : '-'}${trend.amount.toFixed(1)}`} kg
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">vs. letzter Eintrag</div>
                  </div>
                )}
                
                {weightHistory[0].id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === weightHistory[0].id}
                        className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Gewichtseintrag löschen</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchtest du diesen Gewichtseintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteWeightEntry(weightHistory[0].id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </Card>

          {/* Weight History */}
          {weightHistory.slice(1).map((entry, index) => (
            <Card key={`${entry.date}-${index + 1}`} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{entry.weight} kg</div>
                    <div className="text-sm text-muted-foreground">{entry.displayDate}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Show trend for historical entries */}
                  {index + 1 < weightHistory.length - 1 && (
                    <div className="text-right">
                      {(() => {
                        const current = entry.weight;
                        const previous = weightHistory[index + 2].weight;
                        const diff = current - previous;
                        
                        return (
                          <div className="flex items-center gap-1">
                            {diff > 0 ? (
                              <TrendingUp className="h-3 w-3 text-red-500" />
                            ) : diff < 0 ? (
                              <TrendingDown className="h-3 w-3 text-green-500" />
                            ) : (
                              <Minus className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={cn(
                              "text-xs",
                              diff > 0 ? "text-red-500" :
                              diff < 0 ? "text-green-500" : "text-muted-foreground"
                            )}>
                              {diff === 0 ? '±0.0' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`} kg
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {entry.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === entry.id}
                          className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          {deletingId === entry.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Gewichtseintrag löschen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchtest du den Gewichtseintrag vom {entry.displayDate} ({entry.weight} kg) wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteWeightEntry(entry.id!)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
