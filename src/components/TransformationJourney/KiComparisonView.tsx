import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { SparklesIcon, ImageIcon } from 'lucide-react';

interface KiComparisonViewProps {
  targetImages: any[];
  progressPhotos: any[];
}

export const KiComparisonView: React.FC<KiComparisonViewProps> = ({
  targetImages,
  progressPhotos
}) => {
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number>(0);

  // Get target images that have a linked progress photo
  const linkedTargetImages = targetImages.filter(target => 
    target.ai_generated_from_photo_id && target.is_active
  );

  if (linkedTargetImages.length === 0) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-8 text-center">
          <SparklesIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Keine KI-Zielbilder verfügbar</h3>
          <p className="text-muted-foreground mb-6">
            Erstelle zuerst ein KI-Zielbild aus einem deiner Fortschrittsfotos, um einen Vergleich zu sehen.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedTarget = linkedTargetImages[selectedTargetIndex];
  const originalPhoto = progressPhotos.find(photo => 
    photo.id === selectedTarget?.ai_generated_from_photo_id
  );

  // Get the original photo URL based on category
  const getOriginalPhotoUrl = () => {
    if (!originalPhoto || !selectedTarget) return null;
    
    const category = selectedTarget.image_category || 'front';
    if (originalPhoto.photo_urls) {
      return originalPhoto.photo_urls[category] || null;
    }
    return originalPhoto[`photo_${category}_url`] || null;
  };

  const originalPhotoUrl = getOriginalPhotoUrl();

  return (
    <div className="space-y-6">
      {/* Target Image Selection */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            KI-Vergleich
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vergleiche deine Originalfotos mit den generierten KI-Zielbildern
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">KI-Zielbild auswählen:</label>
            <Select 
              value={selectedTargetIndex.toString()} 
              onValueChange={(value) => setSelectedTargetIndex(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkedTargetImages.map((target, index) => {
                  const linkedPhoto = progressPhotos.find(photo => 
                    photo.id === target.ai_generated_from_photo_id
                  );
                  return (
                    <SelectItem key={index} value={index.toString()}>
                      <div className="flex items-center gap-3">
                        <img
                          src={target.image_url}
                          alt="KI-Zielbild"
                          className="w-8 h-8 object-cover rounded"
                        />
                        <div className="text-left">
                          <div className="font-medium">
                            KI-Zielbild ({target.image_category || 'unspecified'})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Erstellt am {format(new Date(target.created_at), 'dd.MM.yyyy', { locale: de })}
                            {linkedPhoto && ` • Basis: ${linkedPhoto.date}`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Before/After Comparison */}
      {originalPhotoUrl && selectedTarget && (
        <Card className="gradient-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-center">
              Original vs. KI-Zielbild
            </CardTitle>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <div>Kategorie: {selectedTarget.image_category || 'unspecified'}</div>
              {originalPhoto && (
                <div>Basis-Foto: {format(new Date(originalPhoto.date), 'dd.MM.yyyy', { locale: de })}</div>
              )}
              {selectedTarget.target_weight_kg && (
                <div>Zielgewicht: {selectedTarget.target_weight_kg}kg</div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <BeforeAfterSlider
              beforeImage={originalPhotoUrl}
              afterImage={selectedTarget.image_url}
              beforeLabel="Original"
              afterLabel="KI-Zielbild"
              className="aspect-[3/4] w-full"
            />
          </CardContent>
        </Card>
      )}

      {/* Generation Details */}
      {selectedTarget?.generation_prompt && (
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4" />
              Generierungsdetails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                {selectedTarget.target_weight_kg && (
                  <div>
                    <span className="text-muted-foreground">Zielgewicht:</span>
                    <span className="ml-2 font-medium">{selectedTarget.target_weight_kg}kg</span>
                  </div>
                )}
                {selectedTarget.target_body_fat_percentage && (
                  <div>
                    <span className="text-muted-foreground">Ziel-Körperfett:</span>
                    <span className="ml-2 font-medium">{selectedTarget.target_body_fat_percentage}%</span>
                  </div>
                )}
              </div>
              {selectedTarget.generation_prompt && (
                <div>
                  <span className="text-muted-foreground block mb-1">KI-Prompt:</span>
                  <p className="text-xs bg-muted/50 p-3 rounded border italic">
                    {selectedTarget.generation_prompt}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};