import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Plus, Edit, CheckCircle, Upload, X, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { InfoButton } from "@/components/InfoButton";
import { PointsBadge } from "@/components/PointsBadge";
import { uploadFilesWithProgress } from "@/utils/uploadHelpers";

interface QuickWeightInputProps {
  onWeightAdded?: () => void;
  todaysWeight?: any;
}

export const QuickWeightInput = ({ onWeightAdded, todaysWeight }: QuickWeightInputProps) => {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Check if weight already exists for today
  const hasWeightToday = todaysWeight && todaysWeight.weight !== null;

  useEffect(() => {
    if (hasWeightToday && !isEditing) {
      setWeight(todaysWeight.weight?.toString() || "");
      setBodyFat(todaysWeight.body_fat_percentage?.toString() || "");
      setMuscleMass(todaysWeight.muscle_percentage?.toString() || "");
      setNotes(todaysWeight.notes || "");
      setExistingPhotos(todaysWeight.photo_urls || []);
    }
  }, [hasWeightToday, todaysWeight, isEditing]);

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
    if (!user || !weight) return;

    setIsSubmitting(true);
    try {
      const weightValue = parseFloat(weight);
      const bodyFatValue = bodyFat ? parseFloat(bodyFat) : null;
      const muscleMassValue = muscleMass ? parseFloat(muscleMass) : null;

      // Validate values
      if (isNaN(weightValue) || weightValue <= 0) {
        toast.error('Bitte gib ein gültiges Gewicht ein');
        return;
      }

      if (bodyFatValue !== null && (bodyFatValue < 0 || bodyFatValue > 100)) {
        toast.error('Körperfettanteil muss zwischen 0 und 100% liegen');
        return;
      }

      if (muscleMassValue !== null && (muscleMassValue < 0 || muscleMassValue > 100)) {
        toast.error('Muskelanteil muss zwischen 0 und 100% liegen');
        return;
      }

      // Upload new photos if any
      let newPhotoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const uploadResult = await uploadFilesWithProgress(selectedFiles, user.id);
        if (uploadResult.success) {
          newPhotoUrls = uploadResult.urls;
        } else {
          console.error('Photo upload failed:', uploadResult.errors);
          toast.error('Fehler beim Hochladen der Bilder');
        }
      }

      // Combine existing and new photos
      const allPhotoUrls = [...existingPhotos, ...newPhotoUrls];

      const weightData = {
        user_id: user.id,
        weight: weightValue,
        date: new Date().toISOString().split('T')[0],
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

        if (error) throw error;
        toast.success('Gewicht aktualisiert!');
      } else {
        // Create new weight entry
        const { error } = await supabase
          .from('weight_history')
          .upsert(weightData, { 
            onConflict: 'user_id, date'
          });

        if (error) throw error;

        // Award points for weight tracking
        await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht eingetragen');
        await updateStreak('weight_tracking');

        // Show points animation
        setShowPointsAnimation(true);
        setTimeout(() => setShowPointsAnimation(false), 3000);

        toast.success('Gewicht erfolgreich eingetragen!');
      }

      setIsEditing(false);
      setSelectedFiles([]);
      onWeightAdded?.();
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show read-only summary if weight exists and not editing
  if (hasWeightToday && !isEditing) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-200">Gewicht eingetragen! ⚖️</h3>
            <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <p><strong>Gewicht:</strong> {todaysWeight.weight || 0} kg</p>
              {todaysWeight.body_fat_percentage && (
                <p><strong>Körperfett:</strong> {todaysWeight.body_fat_percentage}%</p>
              )}
              {todaysWeight.muscle_percentage && (
                <p><strong>Muskelmasse:</strong> {todaysWeight.muscle_percentage}%</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton
              title="Gewichts-Tracking"
              description="Regelmäßiges Wiegen mit Body Composition hilft dir dabei, deinen Fortschritt detailliert zu verfolgen."
              scientificBasis="Studien zeigen: Tägliches Wiegen kombiniert mit Körperfettmessung gibt bessere Einblicke in echte Fortschritte."
              tips={[
                "Wiege dich immer zur gleichen Zeit",
                "Am besten morgens nach dem Aufstehen",
                "Nutze die gleiche Waage für Konsistenz",
                "Körperfettmessungen am Morgen sind am genauesten"
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
        
        {/* Progress Photos */}
        {todaysWeight.photo_urls && todaysWeight.photo_urls.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Progress Fotos:</p>
            <div className="flex gap-2">
              {todaysWeight.photo_urls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url}
                  alt={`Progress ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border border-green-200"
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <PointsBadge 
            points={3} 
            icon="⚖️"
            animated={showPointsAnimation}
            variant="secondary"
          />
        </div>
        
        <div className="bg-green-100/50 dark:bg-green-900/30 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300 mb-2">
            <strong>Tipp:</strong> Konsistenz ist der Schlüssel zum Erfolg!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            • Schwankungen von ±1kg sind völlig normal
            • Der Trend über mehrere Tage ist wichtiger
            • Körperfett und Muskelmasse geben bessere Einblicke
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
          <Scale className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            {hasWeightToday ? 'Gewicht bearbeiten' : 'Gewicht & Body Composition eintragen'}
          </h3>
        </div>
        <InfoButton
          title="Gewichts-Tracking"
          description="Regelmäßiges Wiegen mit Body Composition hilft dir dabei, deinen Fortschritt detailliert zu verfolgen."
          scientificBasis="Studien zeigen: Tägliches Wiegen kombiniert mit Körperfettmessung gibt bessere Einblicke in echte Fortschritte."
          tips={[
            "Wiege dich immer zur gleichen Zeit",
            "Am besten morgens nach dem Aufstehen",
            "Nutze die gleiche Waage für Konsistenz",
            "Körperfettmessungen am Morgen sind am genauesten"
          ]}
        />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Weight */}
        <div>
          <Label htmlFor="weight" className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
            Gewicht (kg) *
          </Label>
          <Input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="z.B. 75.5"
            step="0.1"
            min="1"
            max="500"
            className="bg-white dark:bg-green-950/50 border-green-200 dark:border-green-700 focus:border-green-500"
            required
          />
        </div>

        {/* Body Composition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bodyFat" className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
              Körperfett (%)
            </Label>
            <Input
              id="bodyFat"
              type="number"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="z.B. 15.5"
              step="0.1"
              min="0"
              max="100"
              className="bg-white dark:bg-green-950/50 border-green-200 dark:border-green-700 focus:border-green-500"
            />
          </div>
          <div>
            <Label htmlFor="muscleMass" className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
              Muskelmasse (%)
            </Label>
            <Input
              id="muscleMass"
              type="number"
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
              placeholder="z.B. 45.0"
              step="0.1"
              min="0"
              max="100"
              className="bg-white dark:bg-green-950/50 border-green-200 dark:border-green-700 focus:border-green-500"
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <Label className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
            Progress Fotos (max. 3)
          </Label>
          
          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">Vorhandene Fotos:</p>
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
              className="flex items-center justify-center w-full p-3 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg cursor-pointer hover:border-green-500 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400">Neue Bilder hinzufügen</span>
            </label>
          </div>
          
          {/* Selected New Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">Neue Fotos:</p>
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
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
            Notizen (optional)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. Training heute, gute Form..."
            className="bg-white dark:bg-green-950/50 border-green-200 dark:border-green-700 focus:border-green-500 min-h-[60px]"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isSubmitting || !weight}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Speichern...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {hasWeightToday ? 'Aktualisieren' : 'Eintragen'}
              </div>
            )}
          </Button>
          
          {hasWeightToday && isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-green-300 text-green-600"
            >
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
