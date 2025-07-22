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
import { Scale, CalendarIcon, Plus, TrendingUp, TrendingDown, Minus, Trash2, Upload, X, Eye, Camera, Edit2, Check, XIcon } from "lucide-react";
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
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
  // Enhanced inline editing states
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'weight' | 'body_fat_percentage' | 'muscle_percentage' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  
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

  // Enhanced inline editing functions with debugging
  const startEditing = (entryId: string, field: 'weight' | 'body_fat_percentage' | 'muscle_percentage', currentValue: number | undefined) => {
    console.log('🖊️ [WeightHistory] Starting edit:', { entryId, field, currentValue });
    setEditingEntry(entryId);
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEditing = () => {
    console.log('❌ [WeightHistory] Cancelling edit');
    setEditingEntry(null);
    setEditingField(null);
    setEditValue('');
  };

  const saveInlineEdit = async () => {
    if (!editingEntry || !editingField || !user) return;

    const numValue = parseFloat(editValue.replace(',', '.'));
    
    console.log('💾 [WeightHistory] Saving inline edit:', { 
      editingEntry, 
      editingField, 
      originalValue: editValue,
      parsedValue: numValue 
    });

    // Enhanced validation with better error messages
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Bitte gib einen gültigen Wert ein');
      console.warn('⚠️ [WeightHistory] Invalid value:', numValue);
      return;
    }

    if ((editingField === 'body_fat_percentage' || editingField === 'muscle_percentage') && 
        (numValue < 0 || numValue > 100)) {
      toast.error('Prozentangaben müssen zwischen 0 und 100% liegen');
      console.warn('⚠️ [WeightHistory] Percentage out of range:', numValue);
      return;
    }

    if (editingField === 'weight' && (numValue > 1000)) {
      toast.error('Gewicht muss unter 1000 kg liegen');
      console.warn('⚠️ [WeightHistory] Weight too high:', numValue);
      return;
    }

    setIsUpdating(true);

    try {
      const updateData: any = {};
      updateData[editingField] = numValue;
      updateData.updated_at = new Date().toISOString();

      console.log('🔄 [WeightHistory] Updating database:', updateData);

      const { error } = await supabase
        .from('weight_history')
        .update(updateData)
        .eq('id', editingEntry);

      if (error) {
        console.error('❌ [WeightHistory] Database update failed:', error);
        throw error;
      }

      console.log('✅ [WeightHistory] Database update successful');
      toast.success('Wert erfolgreich aktualisiert');
      onDataUpdate();
      cancelEditing();
    } catch (error: any) {
      console.error('💥 [WeightHistory] Error updating weight entry:', error);
      toast.error('Fehler beim Aktualisieren des Werts');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('⌨️ [WeightHistory] Enter pressed - saving');
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      console.log('⌨️ [WeightHistory] Escape pressed - cancelling');
      cancelEditing();
    }
  };

  // Enhanced mobile touch handling
  const handleTouchStart = (entryId: string, field: 'weight' | 'body_fat_percentage' | 'muscle_percentage', currentValue: number | undefined) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    
    console.log('📱 [WeightHistory] Touch detected:', { entryId, field, timeDiff });
    
    if (timeDiff < 300) {
      // Double tap detected
      console.log('👆 [WeightHistory] Double tap - starting edit');
      startEditing(entryId, field, currentValue);
    }
    
    setLastTap(now);
  };

  const addWeightEntry = async () => {
    if (!user || !newWeight) return;
    
    try {
      // Parse and validate input with locale-safe number parsing
      const weight = parseFloat(newWeight.replace(',', '.'));
      const bodyFat = newBodyFat ? parseFloat(newBodyFat.replace(',', '.')) : null;
      const muscleMass = newMuscleMass ? parseFloat(newMuscleMass.replace(',', '.')) : null;

      // Enhanced validation
      if (isNaN(weight) || weight <= 0 || weight > 1000) {
        toast.error('Bitte gib ein gültiges Gewicht zwischen 1 und 1000 kg ein');
        return;
      }

      if (bodyFat !== null && (isNaN(bodyFat) || bodyFat < 0 || bodyFat > 100)) {
        toast.error('Körperfettanteil muss zwischen 0 und 100% liegen');
        return;
      }

      if (muscleMass !== null && (isNaN(muscleMass) || muscleMass < 0 || muscleMass > 100)) {
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

      console.log('💾 [WeightHistory] Saving weight entry:', {
        userId: user.id,
        weight: weight,
        date: selectedDateStr,
        isToday: selectedDateStr === today
      });

      // Upload photos if any
      let photoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        console.log('📸 [WeightHistory] Uploading photos...');
        const uploadResult = await uploadFilesWithProgress(selectedFiles, user.id);
        if (uploadResult.success) {
          photoUrls = uploadResult.urls;
          console.log('📸 [WeightHistory] Photos uploaded successfully:', photoUrls);
        } else {
          console.error('📸 [WeightHistory] Photo upload failed:', uploadResult.errors);
          toast.error('Fehler beim Hochladen der Bilder');
          return;
        }
      }

      // Check for existing entry for this date
      const existingEntry = weightHistory.find(entry => entry.date === selectedDateStr);
      
      let result;
      if (existingEntry) {
        // Update existing entry
        console.log('🔄 [WeightHistory] Updating existing entry with ID:', existingEntry.id);
        
        const { error } = await supabase
          .from('weight_history')
          .update({ 
            weight: weight,
            body_fat_percentage: bodyFat,
            muscle_percentage: muscleMass,
            photo_urls: photoUrls,
            notes: newNotes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id);

        if (error) {
          console.error('🔄 [WeightHistory] Update failed:', error);
          throw error;
        }
        
        result = 'updated';
        console.log('✅ [WeightHistory] Weight entry updated successfully');
        toast.success('Gewicht erfolgreich aktualisiert');
      } else {
        // Insert new entry with fallback strategy
        console.log('🆕 [WeightHistory] Creating new weight entry');
        
        const weightData = {
          user_id: user.id,
          weight: weight,
          body_fat_percentage: bodyFat,
          muscle_percentage: muscleMass,
          photo_urls: photoUrls,
          notes: newNotes || null,
          date: selectedDateStr
        };

        try {
          // Try upsert first (preferred method with unique constraint)
          const { error: upsertError } = await supabase
            .from('weight_history')
            .upsert(weightData, { 
              onConflict: 'user_id, date'
            });

          if (upsertError) {
            console.warn('⚠️ [WeightHistory] Upsert failed, trying insert fallback:', upsertError);
            
            // Fallback: Try direct insert
            const { error: insertError } = await supabase
              .from('weight_history')
              .insert(weightData);

            if (insertError) {
              console.error('🆕 [WeightHistory] Insert failed:', insertError);
              throw insertError;
            }
            
            console.log('✅ [WeightHistory] Fallback insert successful');
          } else {
            console.log('✅ [WeightHistory] Upsert successful');
          }
        } catch (saveError) {
          console.error('💥 [WeightHistory] All save strategies failed:', saveError);
          throw saveError;
        }
        
        result = 'inserted';

        // Award points and update streak only for today's entries
        if (selectedDateStr === today) {
          console.log('🎯 [WeightHistory] Awarding points for weight measurement today');
          try {
            await awardPoints('weight_measured', 3, 'Gewicht gemessen');
            await updateStreak('daily_tracking', selectedDate);
            toast.success('Gewicht erfolgreich hinzugefügt! +3 Punkte erhalten');
            console.log('🎯 [WeightHistory] Points awarded successfully');
          } catch (pointsError) {
            console.error('🎯 [WeightHistory] Points award failed (non-critical):', pointsError);
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
      setShowPhotoUpload(false);
      onDataUpdate();
    } catch (error: any) {
      console.error('💥 [WeightHistory] Critical error adding/updating weight:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      
      // Enhanced error messages based on error type
      let errorMessage = 'Fehler beim Speichern des Gewichts';
      
      if (error?.message?.includes('duplicate')) {
        errorMessage = 'Ein Gewichtseintrag für dieses Datum existiert bereits.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.';
      } else if (error?.code === '23505') {
        errorMessage = 'Gewichtseintrag für dieses Datum bereits vorhanden.';
      }
      
      toast.error(errorMessage);
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

  const renderEditableValue = (entry: WeightEntry, field: 'weight' | 'body_fat_percentage' | 'muscle_percentage', value: number | undefined, unit: string, color?: string) => {
    const isEditing = editingEntry === entry.id && editingField === field;
    
    if (!value && !isEditing) return null;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1 min-w-0">
          <Input
            type="number"
            step="0.1"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={saveInlineEdit}
            className="w-20 h-7 text-xs p-1 border-primary/50 focus:border-primary"
            autoFocus
            disabled={isUpdating}
            placeholder={value?.toString() || ''}
          />
          <span className={cn("text-xs whitespace-nowrap", color)}>{unit}</span>
          {isUpdating && (
            <div className="animate-spin rounded-full h-3 w-3 border-b border-primary flex-shrink-0"></div>
          )}
          <div className="flex gap-0.5 ml-1">
            <button
              onClick={saveInlineEdit}
              disabled={isUpdating}
              className="text-green-600 hover:text-green-700 p-0.5 rounded transition-colors"
              title="Speichern (Enter)"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={cancelEditing}
              disabled={isUpdating}
              className="text-red-500 hover:text-red-600 p-0.5 rounded transition-colors"
              title="Abbrechen (Esc)"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => startEditing(entry.id!, field, value)}
          onTouchStart={() => handleTouchStart(entry.id!, field, value)}
          className={cn(
            "text-xs hover:bg-muted/50 active:bg-muted/70 px-2 py-1 rounded transition-all duration-200 group flex items-center gap-1 min-h-[28px] touch-manipulation",
            "border border-transparent hover:border-muted-foreground/20 focus:border-primary focus:outline-none",
            "cursor-pointer select-none",
            color
          )}
          title="Zum Bearbeiten klicken (Mobil: Doppel-Tap)"
        >
          <span className="font-medium">{value}{unit}</span>
          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-60 group-active:opacity-80 transition-opacity flex-shrink-0" />
        </button>
        
        {/* Alternative: Direct edit button for better mobile UX */}
        <button
          onClick={() => startEditing(entry.id!, field, value)}
          className="text-muted-foreground hover:text-primary p-1 rounded transition-colors opacity-0 group-hover:opacity-100 md:hidden"
          title="Bearbeiten"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      </div>
    );
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

            {/* Photo Upload Toggle */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                className="w-full mb-2"
              >
                <Camera className="h-4 w-4 mr-2" />
                {showPhotoUpload ? 'Fotos ausblenden' : 'Progress Fotos hinzufügen (optional)'}
              </Button>
              
              {showPhotoUpload && (
                <>
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
                      <span className="text-sm text-muted-foreground">Bilder auswählen (max. 3)</span>
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
                </>
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
                <div className="flex items-center gap-2">
                  {renderEditableValue(weightHistory[0], 'weight', weightHistory[0].weight, ' kg', 'text-2xl font-bold text-primary')}
                </div>
                <div className="text-sm text-muted-foreground">Aktuelles Gewicht</div>
                <div className="text-xs text-muted-foreground">{weightHistory[0].displayDate}</div>
                
                {/* Body Composition with enhanced editing */}
                {(weightHistory[0].body_fat_percentage || weightHistory[0].muscle_percentage) && (
                  <div className="flex gap-4 mt-2 flex-wrap">
                    {weightHistory[0].body_fat_percentage && (
                      <div className="flex items-center gap-1 group">
                        <span className="text-xs text-muted-foreground">KFA:</span>
                        {renderEditableValue(weightHistory[0], 'body_fat_percentage', weightHistory[0].body_fat_percentage, '%', 'text-red-600')}
                      </div>
                    )}
                    {weightHistory[0].muscle_percentage && (
                      <div className="flex items-center gap-1 group">
                        <span className="text-xs text-muted-foreground">Muskeln:</span>
                        {renderEditableValue(weightHistory[0], 'muscle_percentage', weightHistory[0].muscle_percentage, '%', 'text-blue-600')}
                      </div>
                    )}
                  </div>
                )}

                {/* Photos */}
                {weightHistory[0].photo_urls && weightHistory[0].photo_urls.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {weightHistory[0].photo_urls.slice(0, 3).map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageUrl(url)}
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt={`Progress ${index + 1}`}
                          className="w-12 h-12 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {weightHistory[0].notes && (
                  <div className="mt-2 text-xs text-muted-foreground italic">
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
            <Card key={`${entry.date}-${index + 1}`} className="p-4 hover:bg-muted/30 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {renderEditableValue(entry, 'weight', entry.weight, ' kg', 'font-semibold')}
                    </div>
                    <div className="text-sm text-muted-foreground">{entry.displayDate}</div>
                    
                    {/* Body Composition with enhanced editing */}
                    {(entry.body_fat_percentage || entry.muscle_percentage) && (
                      <div className="flex gap-4 mt-1 flex-wrap">
                        {entry.body_fat_percentage && (
                          <div className="flex items-center gap-1 group">
                            <span className="text-xs text-muted-foreground">KFA:</span>
                            {renderEditableValue(entry, 'body_fat_percentage', entry.body_fat_percentage, '%', 'text-red-600')}
                          </div>
                        )}
                        {entry.muscle_percentage && (
                          <div className="flex items-center gap-1 group">
                            <span className="text-xs text-muted-foreground">Muskeln:</span>
                            {renderEditableValue(entry, 'muscle_percentage', entry.muscle_percentage, '%', 'text-blue-600')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    {entry.photo_urls && entry.photo_urls.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.photo_urls.slice(0, 3).map((url, photoIndex) => (
                          <button
                            key={photoIndex}
                            onClick={() => setSelectedImageUrl(url)}
                            className="relative group"
                          >
                            <img
                              src={url}
                              alt={`Progress ${photoIndex + 1}`}
                              className="w-10 h-10 object-cover rounded border hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <Eye className="h-3 w-3 text-white" />
                            </div>
                          </button>
                        ))}
                        {entry.photo_urls.length > 3 && (
                          <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                            +{entry.photo_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-1 text-xs text-muted-foreground italic">
                        "{entry.notes}"
                      </div>
                    )}
                  </div>
                </div>
                
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
