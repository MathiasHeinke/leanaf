import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Camera, Upload, X, Plus, Target, Zap, Image as ImageIcon } from 'lucide-react';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useTargetImages } from '@/hooks/useTargetImages';
import { toast } from 'sonner';

export const TrainingProgressPhotoUpload: React.FC = () => {
  const { uploadProgressPhoto } = useProgressPhotos();
  const { targetImages, generateTargetImage, loading: targetLoading } = useTargetImages();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Bitte mindestens ein Bild auswählen');
      return;
    }

    setIsUploading(true);
    try {
      const weightValue = weight ? parseFloat(weight.replace(',', '.')) : undefined;
      const bodyFatValue = bodyFat ? parseFloat(bodyFat.replace(',', '.')) : undefined;
      const muscleMassValue = muscleMass ? parseFloat(muscleMass.replace(',', '.')) : undefined;

      // Validation
      if (weightValue !== undefined && (isNaN(weightValue) || weightValue <= 0 || weightValue > 1000)) {
        toast.error('Bitte gültiges Gewicht zwischen 1 und 1000 kg eingeben');
        return;
      }

      if (bodyFatValue !== undefined && (isNaN(bodyFatValue) || bodyFatValue < 0 || bodyFatValue > 100)) {
        toast.error('Körperfettanteil muss zwischen 0 und 100% liegen');
        return;
      }

      if (muscleMassValue !== undefined && (isNaN(muscleMassValue) || muscleMassValue < 0 || muscleMassValue > 100)) {
        toast.error('Muskelanteil muss zwischen 0 und 100% liegen');
        return;
      }

      await uploadProgressPhoto(selectedFiles, weightValue, bodyFatValue, muscleMassValue, notes);
      
      // Reset form
      setSelectedFiles([]);
      setWeight('');
      setBodyFat('');
      setMuscleMass('');
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-muted bg-muted/30 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Camera className="h-4 w-4" />
          Fortschrittsfotos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-20 border-dashed border-2 text-muted-foreground hover:border-primary hover:text-primary"
            disabled={selectedFiles.length >= 3}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-5 w-5" />
              <span className="text-sm">
                {selectedFiles.length === 0 ? 'Fotos auswählen' : `${selectedFiles.length}/3 Fotos`}
              </span>
            </div>
          </Button>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body Data Inputs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="weight" className="text-xs">Gewicht (kg)</Label>
            <Input
              id="weight"
              type="number"
              placeholder="70.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bodyFat" className="text-xs">KFA (%)</Label>
            <Input
              id="bodyFat"
              type="number"
              placeholder="15.0"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="muscleMass" className="text-xs">Muskeln (%)</Label>
            <Input
              id="muscleMass"
              type="number"
              placeholder="45.0"
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs">Notizen (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Wie fühlst du dich heute? Trainingsfortschritte, Motivation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Fortschrittsfotos hochladen
            </>
          )}
        </Button>

        <Separator className="my-6" />

        {/* AI Target Image Generation Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI-Zielbild erstellen</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Lass die AI ein realistisches Zielbild basierend auf deinem aktuellen Fortschritt und deinen Zielen erstellen.
          </p>

          <Button
            onClick={async () => {
              toast.info('Dein AI-Zielbild wird erstellt...', {
                description: 'Dies kann einen Moment dauern'
              });
              await generateTargetImage();
            }}
            disabled={targetLoading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg"
          >
            {targetLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                AI erstellt dein Zielbild...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                🎯 AI-Zielbild erstellen
              </>
            )}
          </Button>

          {/* Display Generated Target Images */}
          {targetImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Deine Zielbilder</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {targetImages.slice(0, 4).map((image) => (
                  <div
                    key={image.id}
                    className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity cursor-pointer relative"
                  >
                    <img
                      src={image.image_url}
                      alt="AI Generated Target"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <div className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1">
                        {image.image_type === 'ai_generated' ? (
                          <>
                            <Zap className="h-3 w-3" />
                            AI
                          </>
                        ) : (
                          'Upload'
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};