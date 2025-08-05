import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoaderIcon, CheckIcon, ImageIcon } from 'lucide-react';
import { useTargetImages } from '@/hooks/useTargetImages';
import { toast } from 'sonner';

interface TargetImageSelectorProps {
  generatedImages: {
    imageUrls: string[];
    count: number;
    prompt: string;
    hasProgressPhoto: boolean;
    currentWeight: number;
    targetWeight: number;
    currentBodyFat: number;
    targetBodyFat: number;
  };
  onImageSelected: () => void;
}

export const TargetImageSelector: React.FC<TargetImageSelectorProps> = ({
  generatedImages,
  onImageSelected
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { saveSelectedTargetImage } = useTargetImages();

  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleSaveSelected = async () => {
    if (selectedImageIndex === null) {
      toast.error('Bitte wähle ein Bild aus');
      return;
    }

    setSaving(true);
    try {
      const selectedImageUrl = generatedImages.imageUrls[selectedImageIndex];
      
      await saveSelectedTargetImage(selectedImageUrl, {
        targetWeight: generatedImages.targetWeight,
        targetBodyFat: generatedImages.targetBodyFat,
        prompt: generatedImages.prompt,
        hasProgressPhoto: generatedImages.hasProgressPhoto,
        currentWeight: generatedImages.currentWeight,
        currentBodyFat: generatedImages.currentBodyFat
      });

      onImageSelected();
    } catch (error) {
      console.error('Error saving selected image:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Wähle dein Zielbild aus
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            Zielgewicht: {generatedImages.targetWeight}kg
          </Badge>
          <Badge variant="outline">
            Körperfett: {generatedImages.targetBodyFat}%
          </Badge>
          {generatedImages.hasProgressPhoto && (
            <Badge variant="secondary">Mit Progress Foto</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {generatedImages.imageUrls.map((imageUrl, index) => (
            <div
              key={index}
              className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                selectedImageIndex === index
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleImageSelect(index)}
            >
              <img
                src={imageUrl}
                alt={`Zielbild Option ${index + 1}`}
                className="w-full h-48 object-cover"
              />
              
              {selectedImageIndex === index && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <CheckIcon className="h-4 w-4" />
                </div>
              )}
              
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                Option {index + 1}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSaveSelected}
            disabled={selectedImageIndex === null || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              'Ausgewähltes Bild speichern'
            )}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground border-t pt-4">
          <p className="font-medium mb-1">Generation Details:</p>
          <p className="text-xs">{generatedImages.prompt.substring(0, 200)}...</p>
        </div>
      </CardContent>
    </Card>
  );
};