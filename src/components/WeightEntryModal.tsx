import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Scale, Upload, X, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { uploadFilesWithProgress } from '@/utils/uploadHelpers';
import { getCurrentDateString } from '@/utils/dateHelpers';

interface WeightEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    profileData?: any;
    dailyGoals?: any;
    weightHistory?: any[];
    currentWeight?: number;
    targetWeight?: number;
    weightTrend?: 'up' | 'down' | 'stable';
  };
}

export const WeightEntryModal = ({ isOpen, onClose, contextData }: WeightEntryModalProps) => {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { awardPoints, updateStreak, getPointsForActivity } = usePointsSystem();

  // Pre-fill with context data if available
  useEffect(() => {
    if (contextData?.currentWeight) {
      setWeight(contextData.currentWeight.toString());
    }
  }, [contextData]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (selectedFiles.length + imageFiles.length > 3) {
      toast.error('Maximal 3 Bilder erlaubt');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !weight) return;

    setIsSubmitting(true);
    try {
      const weightValue = parseFloat(weight.replace(',', '.'));
      const bodyFatValue = bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null;
      const muscleMassValue = muscleMass ? parseFloat(muscleMass.replace(',', '.')) : null;

      if (isNaN(weightValue) || weightValue <= 0 || weightValue > 1000) {
        toast.error('Bitte gib ein gültiges Gewicht zwischen 1 und 1000 kg ein');
        return;
      }

      const today = getCurrentDateString();
      
      // Upload photos if any
      let photoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const uploadResult = await uploadFilesWithProgress(selectedFiles, user.id);
        if (uploadResult.success) {
          photoUrls = uploadResult.urls;
        } else {
          toast.error('Fehler beim Hochladen der Bilder');
          return;
        }
      }

      const weightData = {
        user_id: user.id,
        weight: weightValue,
        date: today,
        body_fat_percentage: bodyFatValue,
        muscle_percentage: muscleMassValue,
        photo_urls: photoUrls,
        notes: notes || null
      };

      const { error } = await supabase
        .from('weight_history')
        .upsert(weightData, { onConflict: 'user_id, date' });

      if (error) throw error;

      // Award points
      await awardPoints('weight_measured', getPointsForActivity('weight_measured'), 'Gewicht eingetragen');
      await updateStreak('weight_tracking');

      toast.success('Gewicht erfolgreich eingetragen!');
      triggerDataRefresh();
      onClose();
    } catch (error) {
      console.error('Error saving weight:', error);
      toast.error('Fehler beim Speichern des Gewichts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrendIndicator = () => {
    if (!contextData?.weightTrend) return null;
    
    switch (contextData.weightTrend) {
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'up':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Gewicht eingeben
            {getTrendIndicator()}
          </DialogTitle>
        </DialogHeader>

        {/* Context Summary */}
        {contextData && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="text-sm space-y-1">
              {contextData.currentWeight && (
                <p>Aktuelles Gewicht: <span className="font-semibold">{contextData.currentWeight} kg</span></p>
              )}
              {contextData.targetWeight && (
                <p>Zielgewicht: <span className="font-semibold">{contextData.targetWeight} kg</span></p>
              )}
              {contextData.weightTrend && (
                <p>Trend: <span className="font-semibold">
                  {contextData.weightTrend === 'down' ? '↓ Abnehmend' : 
                   contextData.weightTrend === 'up' ? '↑ Zunehmend' : '→ Stabil'}
                </span></p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Gewicht (kg) *</Label>
            <NumericInput
              id="weight"
              value={weight}
              onChange={(value) => setWeight(value)}
              placeholder="z.B. 75.5"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bodyFat">Körperfett (%)</Label>
              <NumericInput
                id="bodyFat"
                value={bodyFat}
                onChange={(value) => setBodyFat(value)}
                placeholder="z.B. 15.2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="muscleMass">Muskelmasse (%)</Label>
              <NumericInput
                id="muscleMass"
                value={muscleMass}
                onChange={(value) => setMuscleMass(value)}
                placeholder="z.B. 35.8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wie fühlst du dich? Besonderheiten?"
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Fortschrittsfotos (optional)</Label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="w-full"
                disabled={selectedFiles.length >= 3}
              >
                <Upload className="h-4 w-4 mr-2" />
                Fotos hinzufügen ({selectedFiles.length}/3)
              </Button>
              
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !weight}
              className="flex-1"
            >
              {isSubmitting ? 'Speichern...' : 'Gewicht speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};