import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderIcon, CheckIcon, ImageIcon, ExpandIcon } from 'lucide-react';
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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
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
      console.log('Saving selected image:', selectedImageUrl);
      
      await saveSelectedTargetImage(selectedImageUrl, {
        targetWeight: generatedImages.targetWeight,
        targetBodyFat: generatedImages.targetBodyFat,
        prompt: generatedImages.prompt,
        hasProgressPhoto: generatedImages.hasProgressPhoto,
        currentWeight: generatedImages.currentWeight,
        currentBodyFat: generatedImages.currentBodyFat
      });

      console.log('Target image saved successfully, calling callback');
      onImageSelected();
      
      toast.success('Zielbild erfolgreich gespeichert!');
    } catch (error) {
      console.error('Error saving selected image:', error);
      toast.error('Fehler beim Speichern des Zielbilds');
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
              className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                selectedImageIndex === index
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <img
                src={imageUrl}
                alt={`Zielbild Option ${index + 1}`}
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => handleImageSelect(index)}
              />
              
              {selectedImageIndex === index && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <CheckIcon className="h-4 w-4" />
                </div>
              )}
              
              {/* Enlarge Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedImage(imageUrl);
                }}
                className="absolute top-2 left-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors"
                aria-label="Bild vergrößern"
              >
                <ExpandIcon className="h-3 w-3" />
              </button>
              
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

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Zielbild Vorschau</DialogTitle>
            </DialogHeader>
            <div className="aspect-auto overflow-hidden rounded-lg">
              <img
                src={enlargedImage}
                alt="Vergrößerte Ansicht des Zielbilds"
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};