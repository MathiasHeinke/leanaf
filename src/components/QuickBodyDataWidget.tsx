import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Scale, Target, Camera, Plus, Upload, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useTargetImages } from '@/hooks/useTargetImages';

import { toast } from 'sonner';

export const QuickBodyDataWidget: React.FC = () => {
  const { user } = useAuth();
  const { photos, uploadProgressPhoto } = useProgressPhotos();
  const { targetImages, uploadTargetImage, generateTargetImage } = useTargetImages();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);


  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await uploadProgressPhoto(files);
    }
  };

  const handleTargetImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadTargetImage(file);
    }
  };


  return (
    <Card className="border-muted bg-muted/30 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Scale className="h-4 w-4" />
          Körper & Ziele
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Progress Photos Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Fortschrittsfotos</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => photoInputRef.current?.click()}
              className="h-8 px-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              Foto
            </Button>
          </div>
          
          {photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(0, 4).map((photo) => {
                // Handle photo_urls which can be array or JSON string
                let photoUrls: string[] = [];
                if (typeof photo.photo_urls === 'string') {
                  try {
                    photoUrls = JSON.parse(photo.photo_urls);
                  } catch (e) {
                    photoUrls = [];
                  }
                } else if (Array.isArray(photo.photo_urls)) {
                  photoUrls = photo.photo_urls.filter((url): url is string => typeof url === 'string');
                }
                
                const firstImageUrl = photoUrls[0];
                if (!firstImageUrl) return null;
                
                return (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(firstImageUrl)}
                  >
                    <img
                      src={firstImageUrl}
                      alt="Progress"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              }).filter(Boolean)}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 border border-dashed border-border text-center">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Fortschrittsfotos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dokumentiere deinen Fortschritt mit Fotos
              </p>
            </div>
          )}
        </div>

        {/* Target Image Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Zielbild</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => targetInputRef.current?.click()}
                className="h-8 px-3"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  toast.info('AI-Bild wird generiert...');
                  await generateTargetImage();
                }}
                className="h-8 px-3"
              >
                <Zap className="h-3 w-3 mr-1" />
                AI
              </Button>
            </div>
          </div>
          
          {targetImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {targetImages.slice(0, 2).map((image) => (
                <div
                  key={image.id}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative"
                  onClick={() => setSelectedImage(image.image_url)}
                >
                  <img
                    src={image.image_url}
                    alt="Target"
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs"
                  >
                    {image.image_type === 'ai_generated' ? 'AI' : 'Upload'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 border border-dashed border-border text-center">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Kein Zielbild definiert</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lade ein Foto hoch oder erstelle eins mit AI
              </p>
            </div>
          )}
        </div>


        {/* Hidden File Inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <input
          ref={targetInputRef}
          type="file"
          accept="image/*"
          onChange={handleTargetImageUpload}
          className="hidden"
        />

        {/* Image Modal */}
        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bild ansehen</DialogTitle>
              </DialogHeader>
              <div className="aspect-square overflow-hidden rounded-lg">
                <img
                  src={selectedImage}
                  alt="Full size view"
                  className="w-full h-full object-cover"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};