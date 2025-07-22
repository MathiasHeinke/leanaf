
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Scale, CalendarIcon, Plus, TrendingUp, TrendingDown, Minus, Trash2, Upload, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { toast } from "sonner";
import { uploadFilesWithProgress } from "@/utils/uploadHelpers";

interface WeightEntry {
  id?: string;
  date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  photo_urls?: string[];
  notes?: string;
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
  const [newBodyFat, setNewBodyFat] = useState<string>('');
  const [newMuscleMass, setNewMuscleMass] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { awardPoints, updateStreak } = usePointsSystem();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (selectedFiles.length + imageFiles.length > 3) {
      toast.error('Maximal 3 Bilder erlaubt');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles].slice(0, 3));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addWeightEntry = async () => {
    if (!user || !newWeight) return;
    
    try {
      const weight = parseFloat(newWeight);
      const bodyFat = newBodyFat ? parseFloat(newBodyFat) : null;
      const muscleMass = newMuscleMass ? parseFloat(newMuscleMass) : null;

      if (isNaN(weight) || weight <= 0) {
        toast.error('Bitte gib ein gültiges Gewicht ein');
        return;
      }

      if (bodyFat !== null && (bodyFat < 0 || bodyFat > 100)) {
        toast.error('Körperfettanteil muss zwischen 0 und 100% liegen');
        return;
      }

      if (muscleMass !== null && (muscleMass < 0 || muscleMass > 100)) {
        toast.error('Muskelanteil muss zwischen 0 und 100% liegen');
        return;
      }

      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      // Validate date - no future entries allowed
      if (selectedDateStr > today) {
        toast.error('Du kannst kein Gewicht für die Zukunft eintragen');
        return;
      }

      // Upload photos if any
      let photoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const uploadResult = await uploadFilesWithProgress(selectedFiles, user.id);
        if (uploadResult.success) {
          photoUrls = uploadResult.urls;
        } else {
          console.error('Photo upload failed:', uploadResult.errors);
          toast.error('Fehler beim Hochladen der Bilder');
        }
      }

      // Check for existing entry for this date
      const existingEntry = weightHistory.find(entry => entry.date === selectedDateStr);
      
      let result;
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('weight_history')
          .update({ 
            weight: weight,
            body_fat_percentage: bodyFat,
            muscle_percentage: muscleMass,
            photo_urls: photoUrls,
            notes: newNotes || null
          })
          .eq('id', existingEntry.id);

        if (error) throw error;
        result = 'updated';
        toast.success('Gewicht erfolgreich aktualisiert');
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('weight_history')
          .insert({
            user_id: user.id,
            weight: weight,
            body_fat_percentage: bodyFat,
            muscle_percentage: muscleMass,
            photo_urls: photoUrls,
            notes: newNotes || null,
            date: selectedDateStr
          });

        if (error) throw error;
        result = 'inserted';

        // Award points and update streak only for today's entries
        if (selectedDateStr === today) {
          console.log('🎯 Awarding points for weight measurement today');
          try {
            await awardPoints('weight_measured', 3, 'Gewicht gemessen');
            await updateStreak('daily_tracking', selectedDate);
            toast.success('Gewicht erfolgreich hinzugefügt! +3 Punkte erhalten');
          } catch (pointsError) {
            console.error('Error awarding points:', pointsError);
            toast.success('Gewicht erfolgreich hinzugefügt');
          }
        } else {
          toast.success('Gewicht erfolgreich hinzugefügt');
        }
      }

      // Reset form
      setNewWeight('');
      setNewBodyFat('');
      setNewMuscleMass('');
      setNewNotes('');
      setSelectedFiles([]);
      setSelectedDate(new Date());
      setIsAddingWeight(false);
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
      {/* Add Weight Dialog */}
      <Dialog open={isAddingWeight} onOpenChange={setIsAddingWeight}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Gewicht hinzufügen
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gewicht & Body Composition hinzufügen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Weight */}
            <div>
              <Label htmlFor="weight">Gewicht (kg) *</Label>
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

            {/* Body Composition */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bodyFat">Körperfett (%)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newBodyFat}
                  onChange={(e) => setNewBodyFat(e.target.value)}
                  placeholder="15.5"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="muscleMass">Muskelmasse (%)</Label>
                <Input
                  id="muscleMass"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newMuscleMass}
                  onChange={(e) => setNewMuscleMass(e.target.value)}
                  placeholder="45.0"
                  className="mt-2"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <Label>Progress Fotos (max. 3)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="dialog-photo-upload"
                />
                <label
                  htmlFor="dialog-photo-upload"
                  className="flex items-center justify-center w-full p-3 border-2 border-dashed border-muted-foreground/20 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Bilder auswählen</span>
                </label>
              </div>
              
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="z.B. Training heute, gute Form..."
                className="mt-2 min-h-[60px]"
              />
            </div>
            
            {/* Date */}
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
              <Button onClick={addWeightEntry} className="flex-1">
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {selectedImageUrl && (
        <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
          <DialogContent className="max-w-3xl">
            <img
              src={selectedImageUrl}
              alt="Progress Foto"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      )}

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
                
                {/* Body Composition - More prominent display */}
                {(weightHistory[0].body_fat_percentage || weightHistory[0].muscle_percentage) && (
                  <div className="flex gap-3 mt-3">
                    {weightHistory[0].body_fat_percentage && (
                      <div className="bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg text-sm border border-red-200 dark:border-red-800">
                        <span className="text-red-700 dark:text-red-300 font-medium">KFA: {weightHistory[0].body_fat_percentage}%</span>
                      </div>
                    )}
                    {weightHistory[0].muscle_percentage && (
                      <div className="bg-blue-50 dark:bg-blue-950/50 px-3 py-2 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Muskeln: {weightHistory[0].muscle_percentage}%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Photos - Larger and more prominent */}
                {weightHistory[0].photo_urls && weightHistory[0].photo_urls.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {weightHistory[0].photo_urls.slice(0, 3).map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageUrl(url)}
                        className="relative group border-2 border-primary/30 rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Progress ${index + 1}`}
                          className="w-16 h-16 object-cover hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="h-4 w-4 text-white drop-shadow-sm" />
                        </div>
                      </button>
                    ))}
                    {weightHistory[0].photo_urls.length > 3 && (
                      <div className="w-16 h-16 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground font-medium">
                        +{weightHistory[0].photo_urls.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {weightHistory[0].notes && (
                  <div className="mt-3 text-sm text-muted-foreground italic bg-muted/30 p-2 rounded-lg">
                    "{weightHistory[0].notes}"
                  </div>
                )}
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

          {/* Historical Weight Entries */}
          {weightHistory.slice(1).map((entry, index) => (
            <Card key={`${entry.date}-${index + 1}`} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{entry.weight} kg</div>
                    <div className="text-sm text-muted-foreground">{entry.displayDate}</div>
                    
                    {/* Body Composition - More prominent display */}
                    {(entry.body_fat_percentage || entry.muscle_percentage) && (
                      <div className="flex gap-3 mt-2">
                        {entry.body_fat_percentage && (
                          <div className="bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded text-sm border border-red-200 dark:border-red-800">
                            <span className="text-red-700 dark:text-red-300 font-medium">KFA: {entry.body_fat_percentage}%</span>
                          </div>
                        )}
                        {entry.muscle_percentage && (
                          <div className="bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded text-sm border border-blue-200 dark:border-blue-800">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">Muskeln: {entry.muscle_percentage}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Photos - Larger and more prominent */}
                    {entry.photo_urls && entry.photo_urls.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {entry.photo_urls.slice(0, 3).map((url, photoIndex) => (
                          <button
                            key={photoIndex}
                            onClick={() => setSelectedImageUrl(url)}
                            className="relative group border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary/40 transition-colors"
                          >
                            <img
                              src={url}
                              alt={`Progress ${photoIndex + 1}`}
                              className="w-16 h-16 object-cover hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-4 w-4 text-white drop-shadow-sm" />
                            </div>
                          </button>
                        ))}
                        {entry.photo_urls.length > 3 && (
                          <div className="w-16 h-16 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-sm text-muted-foreground font-medium">
                            +{entry.photo_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-2 text-sm text-muted-foreground italic bg-muted/30 p-2 rounded">
                        "{entry.notes}"
                      </div>
                    )}
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
