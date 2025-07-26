
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, TrendingUp, TrendingDown, Target, Scale, Upload, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadFilesWithProgress } from "@/utils/uploadHelpers";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { CoachFeedbackCard } from "./CoachFeedbackCard";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  body_fat_percentage?: number;
  muscle_percentage?: number;
  photo_urls?: string[];
  notes?: string;
}

interface WeightTrackerProps {
  weightHistory: WeightEntry[];
  onWeightAdded: () => void;
}

export const WeightTracker = ({ weightHistory, onWeightAdded }: WeightTrackerProps) => {
  const [newWeight, setNewWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const { user } = useAuth();

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

  const handleAddWeight = async () => {
    if (!user || !newWeight) return;

    setIsUploading(true);
    try {
      const weightValue = parseLocaleFloat(newWeight);
      const bodyFatValue = bodyFat ? parseLocaleFloat(bodyFat) : null;
      const muscleMassValue = muscleMass ? parseLocaleFloat(muscleMass) : null;

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

      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: weightValue,
          date: new Date().toISOString().split('T')[0],
          body_fat_percentage: bodyFatValue,
          muscle_percentage: muscleMassValue,
          photo_urls: photoUrls,
          notes: notes || null
        });

      if (error) throw error;

      // Check if this is the first weight entry (no start_weight set)
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('start_weight')
        .eq('user_id', user.id)
        .single();

      if (profileCheckError) throw profileCheckError;

      // Update profile with current weight and set start_weight if first entry
      const updateData: any = { weight: weightValue };
      if (!profileData.start_weight) {
        updateData.start_weight = weightValue;
      }

      await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      // Reset form
      setNewWeight('');
      setBodyFat('');
      setMuscleMass('');
      setNotes('');
      setSelectedFiles([]);
      setShowPhotoUpload(false);
      
      toast.success('Gewicht erfolgreich hinzugefügt!');
      onWeightAdded();
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Fehler beim Hinzufügen des Gewichts');
    } finally {
      setIsUploading(false);
    }
  };

  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil', bgColor: 'bg-gray-100' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg`, bgColor: 'bg-red-50' };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg`, bgColor: 'bg-green-50' };
  };

  const trend = getWeightTrend();

  return (
    <Card className="glass-card hover-scale">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <h4 className="font-medium text-foreground">Gewicht & Body Composition</h4>
        </div>
        
        <div className="space-y-4">
          {/* Weight Input */}
          <div>
            <Label htmlFor="weight" className="text-sm font-medium">Gewicht (kg) *</Label>
            <NumericInput
              id="weight"
              value={newWeight}
              onChange={(value) => setNewWeight(value)}
              placeholder="z.B. 72.5"
              step={0.1}
              className="mt-1"
            />
          </div>

          {/* Body Composition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bodyFat" className="text-sm font-medium">Körperfett (%)</Label>
              <NumericInput
                id="bodyFat"
                value={bodyFat}
                onChange={(value) => setBodyFat(value)}
                placeholder="z.B. 15.5"
                step={0.1}
                min={0}
                max={100}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="muscleMass" className="text-sm font-medium">Muskelmasse (%)</Label>
              <NumericInput
                id="muscleMass"
                value={muscleMass}
                onChange={(value) => setMuscleMass(value)}
                placeholder="z.B. 45.0"
                step={0.1}
                min={0}
                max={100}
                className="mt-1"
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
                <div className="mt-1">
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
                    className="flex items-center justify-center w-full p-3 border-2 border-dashed border-muted-foreground/20 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bilder auswählen (max. 3)</span>
                  </label>
                </div>
                
                {/* Selected Files */}
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
            <Label htmlFor="notes" className="text-sm font-medium">Notizen (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Training heute, gute Form..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleAddWeight} 
            disabled={!newWeight || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Speichern...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Eintrag hinzufügen
              </div>
            )}
          </Button>

          {/* Trend Badge */}
          {trend && (
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className={`${trend.color} border-current`}>
                <trend.icon className="h-3 w-3 mr-1" />
                {trend.text}
              </Badge>
            </div>
          )}

          {/* Coach Feedback after successful entry */}
          {weightHistory.length > 0 && (
            <div className="mt-4">
              <CoachFeedbackCard 
                coachName="Lucy"
                coachAvatar="/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png"
                weightData={weightHistory[0]}
                userId={user?.id}
                type="weight"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
