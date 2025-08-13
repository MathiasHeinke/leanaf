import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Plus, Edit, CheckCircle, Upload, X, TrendingUp, TrendingDown, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { getCurrentDateString } from "@/utils/dateHelpers";
import { InfoButton } from "@/components/InfoButton";
import { PointsBadge } from "@/components/PointsBadge";
import { uploadFilesWithProgress } from "@/utils/uploadHelpers";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuickWeightInputProps {
  onWeightAdded?: () => void;
  todaysWeight?: any;
}

// Utility function to safely parse photo_urls
const parsePhotoUrls = (photoUrls: any): string[] => {
  if (!photoUrls) return [];
  
  try {
    if (typeof photoUrls === 'string') {
      const parsed = JSON.parse(photoUrls);
      return Array.isArray(parsed) ? parsed.filter(url => typeof url === 'string') : [];
    }
    
    if (Array.isArray(photoUrls)) {
      return photoUrls.filter(url => typeof url === 'string');
    }
  } catch (e) {
    console.error('Failed to parse photo_urls:', e);
  }
  
  return [];
};

function SmartChip({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border bg-secondary/50 hover:bg-secondary px-3 py-1 text-xs transition-colors"
    >
      <Scale className="h-3.5 w-3.5 mr-1.5" />
      <span className="truncate max-w-[10rem]">{text}</span>
    </button>
  );
}

export const QuickWeightInput = ({ onWeightAdded, todaysWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState("");
  const [debouncedWeight, setDebouncedWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if weight already exists for today
  const hasWeightToday = todaysWeight && todaysWeight.weight !== null;

  useEffect(() => {
    if (hasWeightToday && !isEditing && !isTyping) {
      const weightValue = todaysWeight.weight?.toString() || "";
      setWeight(weightValue);
      setDebouncedWeight(weightValue);
      setBodyFat(todaysWeight.body_fat_percentage?.toString() || "");
      setMuscleMass(todaysWeight.muscle_percentage?.toString() || "");
      setNotes(todaysWeight.notes || "");
      setExistingPhotos(parsePhotoUrls(todaysWeight.photo_urls));
      setShowPhotoUpload(parsePhotoUrls(todaysWeight.photo_urls).length > 0);
    }
  }, [hasWeightToday, todaysWeight, isEditing, isTyping]);

  // Debounce weight input for processing (4000ms delay to prevent interference)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedWeight(weight);
      setIsTyping(false);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [weight]);

  // Track when user is actively typing
  useEffect(() => {
    if (weight !== debouncedWeight) {
      setIsTyping(true);
    }
  }, [weight, debouncedWeight]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    const totalImages = selectedFiles.length + existingPhotos.length;
    if (totalImages + imageFiles.length > 3) {
      toast.error('Maximal 3 Bilder erlaubt');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !debouncedWeight) return;

    setIsSubmitting(true);
    try {
      // Parse and validate input with locale-safe number parsing
      const weightValue = parseFloat(debouncedWeight.replace(',', '.'));
      const bodyFatValue = bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null;
      const muscleMassValue = muscleMass ? parseFloat(muscleMass.replace(',', '.')) : null;

      // Enhanced validation
      if (isNaN(weightValue) || weightValue <= 0 || weightValue > 1000) {
        toast.error('Bitte gib ein gültiges Gewicht zwischen 1 und 1000 kg ein');
        return;
      }

      if (bodyFatValue !== null && (isNaN(bodyFatValue) || bodyFatValue < 0 || bodyFatValue > 100)) {
        toast.error('Körperfettanteil muss zwischen 0 und 100% liegen');
        return;
      }

      if (muscleMassValue !== null && (isNaN(muscleMassValue) || muscleMassValue < 0 || muscleMassValue > 100)) {
        toast.error('Muskelanteil muss zwischen 0 und 100% liegen');
        return;
      }

      const today = getCurrentDateString();
      
      // Upload new photos if any
      let newPhotoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const uploadResult = await uploadFilesWithProgress(selectedFiles, user.id);
        if (uploadResult.success) {
          newPhotoUrls = uploadResult.urls;
        } else {
          console.error('📸 [QuickWeightInput] Photo upload failed:', uploadResult.errors);
          toast.error('Fehler beim Hochladen der Bilder');
          return;
        }
      }

      // Combine existing and new photos
      const allPhotoUrls = [...existingPhotos, ...newPhotoUrls];

      const weightData = {
        user_id: user.id,
        weight: weightValue,
        date: today,
        body_fat_percentage: bodyFatValue,
        muscle_percentage: muscleMassValue,
        photo_urls: allPhotoUrls,
        notes: notes || null
      };

      if (hasWeightToday && todaysWeight?.id) {
        // Update existing weight entry - no points awarded
        const { error } = await supabase
          .from('weight_history')
          .update({
            weight: weightValue,
            body_fat_percentage: bodyFatValue,
            muscle_percentage: muscleMassValue,
            photo_urls: allPhotoUrls,
            notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', todaysWeight.id);

        if (error) {
          console.error('🔄 [QuickWeightInput] Update failed:', error);
          throw error;
        }
      } else {
        // Create new weight entry with fallback strategy
        try {
          // Try upsert first (preferred method with unique constraint)
          const { error: upsertError } = await supabase
            .from('weight_history')
            .upsert(weightData, { 
              onConflict: 'user_id, date'
            });

          if (upsertError) {
            console.warn('⚠️ [QuickWeightInput] Upsert failed, trying insert/update fallback:', upsertError);
            
            // Fallback: Try insert first, then update if constraint violation
            try {
              const { error: insertError } = await supabase
                .from('weight_history')
                .insert(weightData);

              if (insertError) {
                // If insert fails due to duplicate, try update
                if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
                  const { error: updateError } = await supabase
                    .from('weight_history')
                    .update({
                      weight: weightValue,
                      body_fat_percentage: bodyFatValue,
                      muscle_percentage: muscleMassValue,
                      photo_urls: allPhotoUrls,
                      notes: notes || null,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('date', today);

                  if (updateError) {
                    console.error('🔄 [QuickWeightInput] Fallback update failed:', updateError);
                    throw updateError;
                  }
                } else {
                  console.error('🆕 [QuickWeightInput] Insert failed with non-duplicate error:', insertError);
                  throw insertError;
                }
              }
            } catch (fallbackError) {
              console.error('💥 [QuickWeightInput] All fallback strategies failed:', fallbackError);
              throw fallbackError;
            }
          }

          // Award points for weight tracking (only for new entries)
          try {
            await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht eingetragen');
            await updateStreak('weight_tracking');

            // Show points animation
            setShowPointsAnimation(true);
            setTimeout(() => setShowPointsAnimation(false), 3000);
          } catch (pointsError) {
            console.error('🎯 [QuickWeightInput] Points award failed (non-critical):', pointsError);
          }

        toast.success('Gewicht erfolgreich eingetragen!');
        } catch (saveError) {
          console.error('💥 [QuickWeightInput] All save strategies failed:', saveError);
          throw saveError;
        }
      }

      triggerDataRefresh();
      setIsEditing(false);
      setSelectedFiles([]);
      setShowPhotoUpload(false);
      onWeightAdded?.();
    } catch (error: any) {
      console.error('💥 [QuickWeightInput] Critical error saving weight:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      
      // Enhanced error messages based on error type
      let errorMessage = 'Fehler beim Speichern des Gewichts';
      
      if (error?.message?.includes('duplicate')) {
        errorMessage = 'Ein Gewichtseintrag für heute existiert bereits. Bitte aktualisiere ihn stattdessen.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.';
      } else if (error?.code === '23505') {
        errorMessage = 'Gewichtseintrag für heute bereits vorhanden. Lade die Seite neu und versuche es erneut.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = hasWeightToday && !isEditing;

  // Smart Chips for quick weight actions
  const weightChips = [
    { label: "+0.5kg", action: () => {
      if (hasWeightToday) {
        setWeight((parseFloat(todaysWeight.weight) + 0.5).toString());
        setIsEditing(true);
      }
    }},
    { label: "-0.5kg", action: () => {
      if (hasWeightToday) {
        setWeight(Math.max(0, parseFloat(todaysWeight.weight) - 0.5).toString());
        setIsEditing(true);
      }
    }},
    { label: "Foto hinzufügen", action: () => {
      setShowPhotoUpload(true);
      setIsEditing(true);
    }}
  ];

  return (
  <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-4">
        <div className="flex items-center justify-between" onClick={() => !open && setOpen(true)}>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Gewicht</h2>
          </div>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center h-8 w-8 justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsed summary when card is closed */}
        {!open && isCompleted && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-3">
              <div className="font-semibold">
                {parseFloat(todaysWeight.weight).toFixed(1)} kg
                {todaysWeight.body_fat_percentage && ` • ${parseFloat(todaysWeight.body_fat_percentage).toFixed(1)}% KFA`}
              </div>
              <div className="h-2 w-2 rounded-full bg-primary"></div>
            </div>
          </div>
        )}

        {/* Smart Chips for quick actions - visible in both collapsed and expanded states */}
        {hasWeightToday && weightChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {weightChips.map((chip, index) => (
              <SmartChip key={index} text={chip.label} onClick={chip.action} />
            ))}
          </div>
        )}

        <CollapsibleContent>
          {hasWeightToday && !isEditing ? (
            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Gewicht erfasst! 📊</h3>
                </div>
                <div className="flex items-center gap-2">
                  <InfoButton
                    title="Gewichts-Tracking"
                    description="Regelmäßige Gewichtsmessungen helfen dir, deine Fortschritte zu verfolgen und deine Ziele zu erreichen."
                    scientificBasis="Studien zeigen: Tägliches Wiegen kann beim Abnehmen doppelt so effektiv sein wie wöchentliches Wiegen."
                    tips={[
                      "Wiege dich immer zur gleichen Tageszeit",
                      "Am besten morgens nach dem Aufstehen",
                      "Natürliche Schwankungen sind völlig normal",
                      "Der Wochentrend ist wichtiger als Einzelwerte"
                    ]}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Points badges directly under title */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <PointsBadge 
                  points={2} 
                  bonusPoints={todaysWeight.bonus_points > 0 ? todaysWeight.bonus_points : undefined}
                  icon="⚖️"
                  animated={false}
                  variant="secondary"
                />
              </div>
              
              <p className="text-sm text-muted-foreground">
                {parseFloat(todaysWeight.weight).toFixed(1)} kg
                {todaysWeight.body_fat_percentage && ` • ${parseFloat(todaysWeight.body_fat_percentage).toFixed(1)}% KFA`}
                {todaysWeight.muscle_percentage && ` • ${parseFloat(todaysWeight.muscle_percentage).toFixed(1)}% Muskeln`}
              </p>
              
              {showPointsAnimation && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <PointsBadge 
                    points={5} 
                    bonusPoints={todaysWeight.bonus_points > 0 ? todaysWeight.bonus_points : undefined}
                    icon="⚖️"
                    animated={showPointsAnimation}
                    variant="secondary"
                  />
                </div>
              )}
              
              {(() => {
                const photos = parsePhotoUrls(todaysWeight.photo_urls);
                return photos.length > 0 ? (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Fortschrittsfotos:
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo} 
                            alt={`Fortschrittsfoto ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              
              {/* Tips in matching theme */}
              <div className="bg-muted/30 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Tipp:</strong> Wiege dich zur gleichen Tageszeit für beste Vergleichbarkeit!
                </p>
                <p className="text-xs text-muted-foreground">
                  • Morgens nach dem Aufstehen und Toilettengang
                  • Vor dem Frühstück und ohne Kleidung
                  • Natürliche Schwankungen von ±1kg sind normal
                  • Der Trend über mehrere Wochen ist wichtiger als einzelne Werte
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 p-4 rounded-2xl border">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-muted rounded-xl">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {hasWeightToday ? 'Gewicht bearbeiten' : 'Gewicht erfassen'}
                  </h3>
                </div>
                <InfoButton
                  title="Gewichts-Tracking"
                  description="Regelmäßige Gewichtsmessungen helfen dir, deine Fortschritte zu verfolgen und deine Ziele zu erreichen."
                  scientificBasis="Studien zeigen: Tägliches Wiegen kann beim Abnehmen doppelt so effektiv sein wie wöchentliches Wiegen."
                  tips={[
                    "Wiege dich immer zur gleichen Tageszeit",
                    "Am besten morgens nach dem Aufstehen",
                    "Natürliche Schwankungen sind völlig normal",
                    "Der Wochentrend ist wichtiger als Einzelwerte"
                  ]}
                />
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Gewicht (kg) *</Label>
                    <NumericInput
                      id="weight"
                      value={weight}
                      onChange={(value) => setWeight(value)}
                      placeholder="75.5"
                      step={0.1}
                      min={1}
                      max={500}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bodyFat">Körperfett (%)</Label>
                    <NumericInput
                      id="bodyFat"
                      value={bodyFat}
                      onChange={(value) => setBodyFat(value)}
                      placeholder="15.0"
                      step={0.1}
                      min={0}
                      max={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="muscleMass">Muskelmasse (%)</Label>
                    <NumericInput
                      id="muscleMass"
                      value={muscleMass}
                      onChange={(value) => setMuscleMass(value)}
                      placeholder="40.0"
                      step={0.1}
                      min={0}
                      max={100}
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
                    {showPhotoUpload ? 'Progress Fotos ausblenden' : 'Progress Fotos hinzufügen (optional)'}
                  </Button>
                  
                  {showPhotoUpload && (
                    <>
                      {/* Existing Photos */}
                      {existingPhotos.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">Vorhandene Fotos:</p>
                          <div className="flex gap-2 flex-wrap">
                            {existingPhotos.map((url, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={url}
                                  alt={`Existing ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded border"
                                />
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => removeExistingPhoto(index)}
                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/80"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New Photos Upload */}
                      <div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="flex items-center justify-center w-full p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-border/80 transition-colors"
                        >
                          <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Neue Bilder hinzufügen</span>
                        </label>
                      </div>
                      
                      {/* Selected New Files */}
                      {selectedFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Neue Fotos:</p>
                          <div className="flex gap-2 flex-wrap">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`New Preview ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/80"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notizen..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !debouncedWeight}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Speichere...' : (isEditing ? 'Aktualisieren' : 'Gewicht hinzufügen')}
                  </Button>
                  
                  {isEditing && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setWeight('');
                        setBodyFat('');
                        setMuscleMass('');
                        setNotes('');
                        setSelectedFiles([]);
                      }}
                    >
                      Abbrechen
                    </Button>
                  )}
                </div>
              </form>
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
