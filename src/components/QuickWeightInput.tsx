
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Scale, Plus, CheckCircle, Edit, ChevronDown, Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { uploadFilesWithProgress, UploadProgress } from "@/utils/uploadHelpers";
import { safeJsonParse, safeGet } from "@/utils/safeJsonHelpers";

interface QuickWeightInputProps {
  onWeightAdded?: (weightData: any) => void;
  currentWeight?: number;
  todaysWeight?: any;
}

export const QuickWeightInput = ({ onWeightAdded, currentWeight, todaysWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState("");
  const [bodyFatPercentage, setBodyFatPercentage] = useState("");
  const [musclePercentage, setMusclePercentage] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Safe weight validation with detailed logging
  const hasWeightToday = (() => {
    try {
      console.log('QuickWeightInput - Checking hasWeightToday:');
      console.log('- todaysWeight:', todaysWeight);
      
      if (!todaysWeight) {
        console.log('- No todaysWeight object');
        return false;
      }
      
      const weightValue = safeGet(todaysWeight, 'weight', null);
      console.log('- Weight value:', weightValue, typeof weightValue);
      
      const hasValidWeight = weightValue !== null && 
        weightValue !== undefined && 
        !isNaN(Number(weightValue)) && 
        Number(weightValue) > 0;
        
      console.log('- Has valid weight:', hasValidWeight);
      return hasValidWeight;
    } catch (error) {
      console.error('Error checking hasWeightToday:', error);
      return false;
    }
  })();

  console.log('QuickWeightInput - Final hasWeightToday:', hasWeightToday);

  useEffect(() => {
    try {
      if (hasWeightToday && !isEditing && todaysWeight) {
        console.log('Setting form values from todaysWeight:', todaysWeight);
        
        // Safe value extraction with fallbacks
        const weightValue = safeGet(todaysWeight, 'weight', '');
        const bodyFatValue = safeGet(todaysWeight, 'body_fat_percentage', '');
        const muscleValue = safeGet(todaysWeight, 'muscle_percentage', '');
        const notesValue = safeGet(todaysWeight, 'notes', '');
        const photoUrls = safeJsonParse(safeGet(todaysWeight, 'photo_urls', '[]'), []);
        
        setWeight(weightValue.toString());
        setBodyFatPercentage(bodyFatValue ? bodyFatValue.toString() : "");
        setMusclePercentage(muscleValue ? muscleValue.toString() : "");
        setNotes(notesValue || "");
        
        // Show advanced section if there's existing data
        const hasAdvancedData = bodyFatValue || muscleValue || notesValue || photoUrls.length > 0;
        if (hasAdvancedData) {
          setShowAdvanced(true);
        }
        
        console.log('Form values set successfully');
      }
    } catch (error) {
      console.error('Error in useEffect for form values:', error);
    }
  }, [hasWeightToday, todaysWeight, isEditing]);

  const isDateInFuture = (date: Date): boolean => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date > today;
    } catch (error) {
      console.error('Error in isDateInFuture:', error);
      return false;
    }
  };

  const isDateToday = (date: Date): boolean => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    } catch (error) {
      console.error('Error in isDateToday:', error);
      return false;
    }
  };

  // Handle file selection for photo upload
  const handleFileSelect = (files: FileList) => {
    try {
      const newFiles = Array.from(files).slice(0, 3 - selectedFiles.length); // Max 3 photos
      const validFiles = newFiles.filter(file => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} ist kein Bild`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} ist zu groß (max. 10MB)`);
          return false;
        }
        return true;
      });

      setSelectedFiles(prev => [...prev, ...validFiles]);
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      toast.error('Fehler beim Dateien auswählen');
    }
  };

  const removeFile = (index: number) => {
    try {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error in removeFile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !user) return;

    // Prevent duplicate submissions if weight already exists for today and not editing
    if (hasWeightToday && !isEditing) {
      toast.error('Gewicht für heute bereits eingetragen. Verwende den Bearbeiten-Button.');
      return;
    }

    setIsSubmitting(true);
    try {
      const weightValue = parseFloat(weight);
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      // Validate that we're not trying to enter weight for future dates
      if (isDateInFuture(today)) {
        toast.error('Gewicht kann nicht für zukünftige Daten eingetragen werden.');
        setIsSubmitting(false);
        return;
      }

      // Validate optional numeric fields
      const bodyFat = bodyFatPercentage ? parseFloat(bodyFatPercentage) : null;
      const muscle = musclePercentage ? parseFloat(musclePercentage) : null;
      
      if (bodyFat && (bodyFat < 0 || bodyFat > 100)) {
        toast.error('Körperfettanteil muss zwischen 0% und 100% liegen.');
        setIsSubmitting(false);
        return;
      }
      
      if (muscle && (muscle < 0 || muscle > 100)) {
        toast.error('Muskelanteil muss zwischen 0% und 100% liegen.');
        setIsSubmitting(false);
        return;
      }

      console.log('Starting weight submission process...');

      // Handle photo uploads first if there are selected files
      let photoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        try {
          const uploadResult = await uploadFilesWithProgress(
            selectedFiles,
            user.id,
            setUploadProgress
          );
          
          if (uploadResult.success) {
            photoUrls = uploadResult.urls;
          } else {
            toast.error('Einige Fotos konnten nicht hochgeladen werden.');
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          toast.error('Fehler beim Hochladen der Fotos.');
        } finally {
          setIsUploading(false);
        }
      }

      // Prepare data for database
      const weightData = {
        weight: weightValue,
        body_fat_percentage: bodyFat,
        muscle_percentage: muscle,
        notes: notes.trim() || null,
        photo_urls: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        date: dateStr
      };

      let resultData = null;

      if (hasWeightToday && todaysWeight?.id && isEditing) {
        // Update existing weight entry
        console.log('Updating existing weight entry with ID:', todaysWeight.id);
        const { data, error: historyError } = await supabase
          .from('weight_history')
          .update(weightData)
          .eq('id', todaysWeight.id)
          .select()
          .single();

        if (historyError) {
          console.error('Error updating weight:', historyError);
          throw historyError;
        }
        
        resultData = data;
        console.log('Weight updated successfully:', data);
        toast.success('Gewicht aktualisiert!');
      } else if (!hasWeightToday) {
        // Create new weight entry - but first double-check no entry exists
        console.log('Creating new weight entry');
        
        const { data: existingData, error: checkError } = await supabase
          .from('weight_history')
          .select('id, weight')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing entry:', checkError);
          throw checkError;
        }

        if (existingData) {
          // Found existing entry - this shouldn't happen but handle it gracefully
          console.log('Found unexpected existing entry, updating instead:', existingData.id);
          const { data, error: updateError } = await supabase
            .from('weight_history')
            .update(weightData)
            .eq('id', existingData.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating existing entry:', updateError);
            throw updateError;
          }
          
          resultData = data;
          console.log('Existing entry updated:', data);
          toast.success('Gewicht aktualisiert!');
        } else {
          // Safe to insert new entry
          const insertData = {
            user_id: user.id,
            ...weightData
          };

          const { data, error: insertError } = await supabase
            .from('weight_history')
            .insert(insertData)
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting new weight:', insertError);
            throw insertError;
          }
          
          resultData = data;
          console.log('New weight entry created:', data);

          // Only award points and update streak for today's entries
          if (isDateToday(today)) {
            await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht gemessen');
            await updateStreak('weight_tracking');
          }

          toast.success(t('weightInput.success'));
        }
      } else {
        // This case shouldn't happen - hasWeightToday is true but not in editing mode
        toast.error('Unerwarteter Zustand. Bitte versuche es erneut.');
        setIsSubmitting(false);
        return;
      }

      // Update profile with current weight and set start_weight if first entry
      console.log('Updating profile weight...');
      
      // Check if this is the first weight entry (no start_weight set)
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('start_weight')
        .eq('user_id', user.id)
        .single();

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
        throw profileCheckError;
      }

      // If no start_weight is set, set it to this weight
      const updateData: any = { weight: weightValue };
      if (!profileData.start_weight) {
        updateData.start_weight = weightValue;
        console.log('Setting start_weight to:', weightValue);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      console.log('Profile weight updated successfully');
      setIsEditing(false);
      setSelectedFiles([]);
      setBodyFatPercentage("");
      setMusclePercentage("");
      setNotes("");
      setShowAdvanced(false);
      console.log('Calling onWeightAdded callback with data:', resultData);
      onWeightAdded?.(resultData);
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts: ' + (error as any)?.message || 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  // Show read-only summary if weight exists and not editing
  if (hasWeightToday && !isEditing) {
    try {
      const bodyFatValue = safeGet(todaysWeight, 'body_fat_percentage', null);
      const muscleValue = safeGet(todaysWeight, 'muscle_percentage', null);
      const notesValue = safeGet(todaysWeight, 'notes', '');
      const photoUrlsValue = safeGet(todaysWeight, 'photo_urls', '[]');
      const photoUrls = safeJsonParse(photoUrlsValue, []);
      
      const hasBodyComposition = bodyFatValue || muscleValue;
      const hasPhotos = photoUrls.length > 0;
      const hasNotes = notesValue;

      return (
        <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/70 dark:from-green-950/25 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200/60 dark:border-green-800/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100/80 dark:bg-green-900/60 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">Gewicht eingetragen! ⚖️</h3>
              <div className="text-sm text-green-600 dark:text-green-400">
                <p className="font-medium">{safeGet(todaysWeight, 'weight', 0)}kg am {new Date().toLocaleDateString('de-DE')}</p>
                
                {hasBodyComposition && (
                  <div className="mt-2 flex gap-4 text-xs">
                    {bodyFatValue && (
                      <span>🧍 Körperfett: {bodyFatValue}%</span>
                    )}
                    {muscleValue && (
                      <span>💪 Muskeln: {muscleValue}%</span>
                    )}
                  </div>
                )}

                {hasPhotos && (
                  <div className="mt-2 flex gap-1">
                    {photoUrls.slice(0, 3).map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Gewichtsfoto ${index + 1}`}
                        className="w-8 h-8 object-cover rounded border cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {hasNotes && (
                  <p className="mt-2 text-xs italic">💭 "{notesValue}"</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <InfoButton
                title="Gewicht Tracking"
                description="Regelmäßiges Wiegen mit zusätzlichen Daten wie Körperfett und Fotos hilft dabei, den wahren Fortschritt zu verfolgen."
                scientificBasis="Studien zeigen: Die Kombination aus Gewicht, Körperkomposition und visueller Dokumentation gibt das vollständigste Bild der Körperveränderung."
                tips={[
                  "Gewicht + Körperfett = vollständiges Bild",
                  "Fotos zeigen oft mehr als die Waage",
                  "Morgens wiegen für beste Vergleichbarkeit"
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="bg-green-100/60 dark:bg-green-900/40 rounded-lg p-3">
            <p className="text-xs text-green-700 dark:text-green-300 mb-2">
              <strong>Vollständiges Tracking aktiv!</strong> 🎯
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              • Gewicht, Körperkomposition und visuelle Fortschritte werden erfasst<br />
              • Trends sind wichtiger als tägliche Schwankungen<br />
              • Deine Transformation wird vollständig dokumentiert
            </p>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering read-only summary:', error);
      return (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Fehler beim Anzeigen der Gewichtsdaten. Bitte neu laden.</p>
        </div>
      );
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/70 dark:from-green-950/25 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200/60 dark:border-green-800/60">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-green-100/80 dark:bg-green-900/60 rounded-xl">
          <Scale className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            {hasWeightToday ? 'Gewicht bearbeiten' : 'Gewicht eintragen'}
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            Vollständiges Tracking mit Körperkomposition & Fotos
          </p>
        </div>
        <InfoButton
          title="Erweiterte Gewichtsmessung"
          description="Die Kombination aus Gewicht, Körperfett, Muskelmasse und Fotos gibt ein vollständiges Bild deiner Transformation."
          scientificBasis="Studien zeigen: Körperkomposition ist aussagekräftiger als nur das Gewicht. Visuelle Dokumentation hilft bei der Motivation."
          tips={[
            "Körperfett und Muskelmasse ergänzen das Gewicht perfekt",
            "Fotos zeigen Veränderungen, die die Waage nicht erfasst",
            "Morgens messen für beste Vergleichbarkeit"
          ]}
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Weight Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            placeholder="Gewicht in kg (z.B. 70.5)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1"
            required
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!weight || isSubmitting || isUploading}
            className="bg-green-600 hover:bg-green-700 min-w-[44px]"
          >
            {(isSubmitting || isUploading) ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          
          {hasWeightToday && isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setSelectedFiles([]);
                setShowAdvanced(false);
              }}
              className="border-green-300 text-green-600"
            >
              Abbrechen
            </Button>
          )}
        </div>

        {/* Advanced Data Section */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-between text-green-700 hover:bg-green-100/50"
            >
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Erweiterte Daten (optional)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-3">
            {/* Body Composition */}
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="Körperfett %"
                value={bodyFatPercentage}
                onChange={(e) => setBodyFatPercentage(e.target.value)}
                className="text-sm"
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Muskeln %"
                value={musclePercentage}
                onChange={(e) => setMusclePercentage(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-green-700">
                Transformation Fotos (max. 3)
              </label>
              
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
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
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress.length > 0 && (
                <div className="space-y-1">
                  {uploadProgress.map((progress, index) => (
                    <div key={index} className="text-xs text-green-600">
                      <div className="flex justify-between">
                        <span>{progress.fileName}</span>
                        <span>{progress.status === 'completed' ? '✅' : `${progress.progress}%`}</span>
                      </div>
                      {progress.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full transition-all"
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* File Input */}
              {selectedFiles.length < 3 && (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:border-green-400 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-green-500" />
                      <p className="text-sm text-green-600">
                        Klicken oder Drag & Drop
                      </p>
                      <p className="text-xs text-green-500">
                        JPG, PNG (max. 10MB pro Bild)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <Textarea
              placeholder="Notizen (optional) - z.B. Gefühl, Besonderheiten..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none text-sm"
              rows={2}
            />
          </CollapsibleContent>
        </Collapsible>

        {!hasWeightToday && !showAdvanced && (
          <div className="bg-green-100/60 dark:bg-green-900/40 rounded-lg p-3">
            <p className="text-xs text-green-700 dark:text-green-300">
              <strong>💡 Tipp:</strong> Nutze "Erweiterte Daten" für vollständiges Tracking!
            </p>
          </div>
        )}
      </form>
    </div>
  );
};
