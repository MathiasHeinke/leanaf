import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Plus, Edit, CheckCircle, Upload, X, TrendingUp, TrendingDown, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PointsBadge } from "@/components/PointsBadge";
import { uploadFilesWithProgress } from "@/utils/uploadHelpers";
import { CollapsibleQuickInput } from "./CollapsibleQuickInput";

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
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if weight already exists for today
  const hasWeightToday = todaysWeight && todaysWeight.weight !== null;

  useEffect(() => {
    if (hasWeightToday && !isEditing) {
      const weightValue = todaysWeight.weight?.toString() || "";
      setWeight(weightValue);
      setDebouncedWeight(weightValue);
      setBodyFat(todaysWeight.body_fat_percentage?.toString() || "");
      setMuscleMass(todaysWeight.muscle_percentage?.toString() || "");
      setNotes(todaysWeight.notes || "");
      setExistingPhotos(parsePhotoUrls(todaysWeight.photo_urls));
      setShowPhotoUpload(parsePhotoUrls(todaysWeight.photo_urls).length > 0);
    }
  }, [hasWeightToday, todaysWeight, isEditing]);

  // Debounce weight input for processing (500ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedWeight(weight);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [weight]);

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

      const today = new Date().toISOString().split('T')[0];
      
      console.log('💾 [QuickWeightInput] Saving weight entry:', {
        userId: user.id,
        weight: weightValue,
        date: today,
        hasExistingEntry: hasWeightToday,
        existingId: todaysWeight?.id
      });

      // Upload new photos if any
      let newPhotoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        console.log('📸 [QuickWeightInput] Uploading photos...');
        const uploadResult = await uploadFilesWithProgress(selectedFiles, user.id);
        if (uploadResult.success) {
          newPhotoUrls = uploadResult.urls;
          console.log('📸 [QuickWeightInput] Photos uploaded successfully:', newPhotoUrls);
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
        console.log('🔄 [QuickWeightInput] Updating existing entry with ID:', todaysWeight.id);
        
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
        
        console.log('✅ [QuickWeightInput] Weight entry updated successfully');
        toast.success('Gewicht aktualisiert!');
      } else {
        // Create new weight entry with fallback strategy
        console.log('🆕 [QuickWeightInput] Creating new weight entry');
        
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
                  console.log('🔄 [QuickWeightInput] Duplicate detected, updating existing entry...');
                  
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
                  
                  console.log('✅ [QuickWeightInput] Fallback update successful');
                } else {
                  console.error('🆕 [QuickWeightInput] Insert failed with non-duplicate error:', insertError);
                  throw insertError;
                }
              } else {
                console.log('✅ [QuickWeightInput] Insert successful');
              }
            } catch (fallbackError) {
              console.error('💥 [QuickWeightInput] All fallback strategies failed:', fallbackError);
              throw fallbackError;
            }
          } else {
            console.log('✅ [QuickWeightInput] Upsert successful');
          }

          // Award points for weight tracking (only for new entries)
          try {
            console.log('🎯 [QuickWeightInput] Awarding points for weight tracking');
            await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht eingetragen');
            await updateStreak('weight_tracking');

            // Show points animation
            setShowPointsAnimation(true);
            setTimeout(() => setShowPointsAnimation(false), 3000);
            
            console.log('🎯 [QuickWeightInput] Points awarded successfully');
          } catch (pointsError) {
            console.error('🎯 [QuickWeightInput] Points award failed (non-critical):', pointsError);
            // Continue without failing the entire operation
          }

          toast.success('Gewicht erfolgreich eingetragen!');
        } catch (saveError) {
          console.error('💥 [QuickWeightInput] All save strategies failed:', saveError);
          throw saveError;
        }
      }

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

  return (
    <CollapsibleQuickInput
      title="Gewicht & Body Composition"
      icon={<Scale className="h-4 w-4 text-white" />}
      isCompleted={isCompleted}
      defaultOpen={!isCompleted}
    >
      <div className="space-y-4">
        {showPointsAnimation && (
          <PointsBadge 
            points={3} 
            icon="⚖️"
            animated={showPointsAnimation}
            variant="secondary"
          />
        )}
        
        {hasWeightToday && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ Gewicht bereits eingetragen</h3>
              <div className="space-y-2 text-sm text-green-700">
                <div><strong>Gewicht:</strong> {todaysWeight.weight} kg</div>
                {todaysWeight.body_fat_percentage && (
                  <div><strong>Körperfett:</strong> {todaysWeight.body_fat_percentage}%</div>
                )}
                {todaysWeight.muscle_percentage && (
                  <div><strong>Muskelmasse:</strong> {todaysWeight.muscle_percentage}%</div>
                )}
              </div>
              
              {/* Progress Photos */}
              {(() => {
                const photos = parsePhotoUrls(todaysWeight.photo_urls);
                return photos.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-green-700 mb-2">Progress Fotos:</p>
                    <div className="flex gap-2">
                      {photos.map((url: string, index: number) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Progress ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border border-green-200"
                        />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        ) : (
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
                      <p className="text-xs text-gray-600 mb-1">Vorhandene Fotos:</p>
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
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
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
                      className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-500 transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="text-sm text-gray-600">Neue Bilder hinzufügen</span>
                    </label>
                  </div>
                  
                  {/* Selected New Files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Neue Fotos:</p>
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
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
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
        )}
      </div>
    </CollapsibleQuickInput>
  );
};
