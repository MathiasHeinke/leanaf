import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Scale, Target, Camera, Plus, Upload, Zap, X, Calendar, Users, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useTargetImages } from '@/hooks/useTargetImages';
import { TargetImageSelector } from '@/components/TargetImageSelector';
import { supabase } from '@/integrations/supabase/client';

import { toast } from 'sonner';

export const QuickBodyDataWidget: React.FC = () => {
  const { user } = useAuth();
  const { photos, uploadProgressPhoto } = useProgressPhotos();
  const { targetImages, uploadTargetImage, generateTargetImage, loading: targetLoading } = useTargetImages();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any>(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Load user profile on mount
  React.useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    setUserProfile(profile);
  };

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

  const handleUploadWithData = async () => {
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
        
        {/* Zieldaten anzeigen */}
        {userProfile && (
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Deine Ziele</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {userProfile.target_weight && (
                <div className="flex items-center gap-2">
                  <Scale className="h-3 w-3 text-muted-foreground" />
                  <span>Zielgewicht: <strong>{userProfile.target_weight}kg</strong></span>
                </div>
              )}
              {userProfile.target_body_fat_percentage && (
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span>Ziel-KFA: <strong>{userProfile.target_body_fat_percentage}%</strong></span>
                </div>
              )}
              {userProfile.target_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Bis: <strong>{new Date(userProfile.target_date).toLocaleDateString('de-DE')}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Photos Section with Details */}
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
            <div className="space-y-3">
              {photos.slice(0, 3).map((photo) => {
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
                
                if (photoUrls.length === 0) return null;
                
                return (
                  <div key={photo.id} className="bg-card rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex gap-2">
                        {photoUrls.slice(0, 3).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Progress ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(url)}
                          />
                        ))}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {new Date(photo.date).toLocaleDateString('de-DE')}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {photo.weight && (
                            <div className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              <span>{photo.weight}kg</span>
                            </div>
                          )}
                          {photo.body_fat_percentage && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span>{photo.body_fat_percentage}% KFA</span>
                            </div>
                          )}
                          {photo.muscle_percentage && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{photo.muscle_percentage}% MM</span>
                            </div>
                          )}
                        </div>
                        {photo.notes && (
                          <p className="text-xs text-muted-foreground italic">{photo.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 border border-dashed border-border text-center">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Fortschrittsfotos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dokumentiere deinen Fortschritt mit Fotos und Körperdaten
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Detailed Photo Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Neue Fortschrittsfotos</span>
          </div>
          
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
                {selectedFiles.length === 0 ? 'Fotos auswählen (max. 3)' : `${selectedFiles.length}/3 Fotos ausgewählt`}
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

          {/* Body Data Inputs */}
          {selectedFiles.length > 0 && (
            <>
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
                onClick={handleUploadWithData}
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
                    Fortschrittsfotos mit Daten speichern
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <Separator />

        {/* AI Target Image Generation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI-Zielbild erstellen</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Erstelle 4 realistische Zielbilder basierend auf deinen Progress-Fotos und Zielen.
          </p>

          <Button
            onClick={async () => {
              try {
                toast.info('4 AI-Zielbilder werden erstellt...', {
                  description: 'Dies kann einen Moment dauern'
                });
                const result = await generateTargetImage();
                if (result && result.imageUrls && result.imageUrls.length > 0) {
                  setGeneratedImages(result);
                  setShowImageSelector(true);
                } else {
                  toast.error('Keine Bilder generiert');
                }
              } catch (error) {
                console.error('Error generating images:', error);
              }
            }}
            disabled={targetLoading || photos.length === 0}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {targetLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                AI erstellt 4 Zielbilder...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                🎯 4 AI-Zielbilder erstellen
              </>
            )}
          </Button>

          {photos.length === 0 && (
            <p className="text-xs text-muted-foreground text-center bg-muted/50 p-3 rounded-lg">
              ⚠️ Lade erst Progress-Fotos hoch, damit die AI realistische Zielbilder erstellen kann
            </p>
          )}
        </div>

        {/* Target Images Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Deine Zielbilder</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => targetInputRef.current?.click()}
              className="h-8 px-3"
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
          
          {targetImages.length > 0 ? (
            <div className="space-y-3">
              {targetImages.slice(0, 4).map((image) => (
                <div key={image.id} className="bg-card rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={image.image_url}
                      alt="Target"
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(image.image_url)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={image.image_type === 'ai_generated' ? 'default' : 'secondary'} className="text-xs">
                          {image.image_type === 'ai_generated' ? '🤖 AI-generiert' : '📁 Hochgeladen'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {image.target_weight_kg && (
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            <span>Ziel: {image.target_weight_kg}kg</span>
                          </div>
                        )}
                        {image.target_body_fat_percentage && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>KFA: {image.target_body_fat_percentage}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
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


        {/* Image Selector Modal */}
        {showImageSelector && generatedImages && (
          <div className="mt-6">
            <TargetImageSelector
              generatedImages={generatedImages}
              onImageSelected={() => {
                setShowImageSelector(false);
                setGeneratedImages(null);
                toast.success('Zielbild wurde gespeichert!');
              }}
            />
          </div>
        )}

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