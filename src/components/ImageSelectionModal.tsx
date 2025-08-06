import React, { useState } from 'react';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Camera, X } from 'lucide-react';
import { uploadFilesWithProgress } from '@/utils/uploadHelpers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface ImageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (imageUrl: string) => void;
}

export const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({
  isOpen,
  onClose,
  onImageSelected
}) => {
  const { photos, loading } = useProgressPhotos();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleProgressPhotoSelect = (imageUrl: string) => {
    console.log('Progress photo selected:', imageUrl);
    setSelectedImageUrl(imageUrl);
    setUploadedImageUrl(null); // Clear uploaded image when selecting progress photo
    toast.success('Progress Photo ausgewählt');
  };

  // Remove this function - uploaded images are automatically selected

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!user || files.length === 0) return;
    
    console.log('🚀 Starting upload:', { 
      filesCount: files.length, 
      userId: user.id, 
      firstFile: files[0]?.name 
    });
    
    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      
      // Test storage permissions first
      const { data: testData, error: testError } = await supabase.storage
        .from('meal-images')
        .list('', { limit: 1 });
      
      if (testError) {
        console.error('Storage permission test failed:', testError);
        toast.error('Speicher-Zugriff fehlgeschlagen');
        return;
      }
      
      console.log('✅ Storage access verified, uploading...');
      const result = await uploadFilesWithProgress(fileArray, user.id);
      
      console.log('Upload result:', result);
      
      if (result.success && result.urls.length > 0) {
        const uploadedUrl = result.urls[0];
        setUploadedImageUrl(uploadedUrl);
        setSelectedImageUrl(null); // Clear progress photo selection
        toast.success('Bild erfolgreich hochgeladen und ausgewählt');
        console.log('✅ Image uploaded and auto-selected:', uploadedUrl);
      } else {
        console.error('Upload failed:', result.errors);
        toast.error(`Upload fehlgeschlagen: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error(`Fehler beim Hochladen: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleGenerate = () => {
    const finalImageUrl = uploadedImageUrl || selectedImageUrl;
    if (!finalImageUrl) {
      toast.error('Bitte wähle ein Bild aus oder lade eines hoch');
      return;
    }
    
    console.log('Selected image for AI generation:', finalImageUrl);
    onImageSelected(finalImageUrl);
    onClose();
  };

  const getProgressPhotoUrls = (entry: any): string[] => {
    if (!entry.photo_urls) return [];
    
    let photoUrls = entry.photo_urls;
    if (typeof photoUrls === 'string') {
      try {
        photoUrls = JSON.parse(photoUrls);
      } catch (e) {
        return [];
      }
    }
    
    return Array.isArray(photoUrls) ? photoUrls.filter(url => url && typeof url === 'string') : [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[85vh] p-4' : 'max-w-4xl max-h-[80vh]'} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Camera className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            Bild für AI-Generation auswählen
          </DialogTitle>
        </DialogHeader>

        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* Upload Section */}
          <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Neues Bild hochladen</h3>
            
            <div
              className={`border-2 border-dashed rounded-lg ${isMobile ? 'p-4' : 'p-8'} text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className={`animate-spin ${isMobile ? 'w-6 h-6' : 'w-8 h-8'} border-2 border-primary border-t-transparent rounded-full`} />
                  <p className="text-sm text-muted-foreground">Wird hochgeladen...</p>
                </div>
              ) : (
                <div className={`flex flex-col items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
                  <Upload className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} text-muted-foreground`} />
                  <div>
                    <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Bild hier ablegen oder</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      multiple={false}
                      id="file-upload-input"
                    />
                    <label htmlFor="file-upload-input">
                      <Button variant="outline" className="mt-2 cursor-pointer" asChild>
                        <span>Datei auswählen</span>
                      </Button>
                    </label>
                  </div>
                  {!isMobile && (
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG oder WEBP bis 50MB
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Show uploaded image preview - automatically selected */}
            {uploadedImageUrl && (
              <Card className="p-2 ring-2 ring-primary">
                <img
                  src={uploadedImageUrl}
                  alt="Hochgeladenes Bild"
                  className={`w-full ${isMobile ? 'h-32' : 'h-48'} object-cover rounded`}
                />
                <p className="text-xs text-center mt-2 text-primary font-medium">
                  ✓ Hochgeladenes Bild (automatisch ausgewählt)
                </p>
              </Card>
            )}
          </div>

          {/* Progress Photos Section */}
          <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Oder Progress Photo auswählen</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : photos.length === 0 ? (
              <Card className="p-8 text-center">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Keine Progress Photos verfügbar. Lade zuerst ein Bild hoch.
                </p>
              </Card>
            ) : (
              <div className={`grid ${isMobile ? 'grid-cols-3 gap-2 max-h-48' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64'} overflow-y-auto`}>
                {photos.map((entry) => {
                  const photoUrls = getProgressPhotoUrls(entry);
                  return photoUrls.map((url, index) => (
                    <Card
                      key={`${entry.id}-${index}`}
                      className={`p-2 cursor-pointer transition-all select-none touch-manipulation ${
                        selectedImageUrl === url 
                          ? 'ring-2 ring-primary' 
                          : 'hover:ring-1 hover:ring-primary/50'
                      }`}
                      onClick={() => handleProgressPhotoSelect(url)}
                      onTouchStart={() => handleProgressPhotoSelect(url)}
                    >
                      <img
                        src={url}
                        alt={`Progress Photo ${entry.date}`}
                        className={`w-full ${isMobile ? 'h-24' : 'h-32'} object-cover rounded`}
                      />
                      {!isMobile && (
                        <p className="text-xs text-center mt-1 text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('de-DE')}
                        </p>
                      )}
                      {selectedImageUrl === url && (
                        <p className="text-xs text-center text-primary font-medium">
                          ✓ Ausgewählt
                        </p>
                      )}
                    </Card>
                  ));
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'flex-col gap-2 pt-3' : 'justify-end gap-3 pt-4'} border-t sticky bottom-0 bg-background`}>
            {isMobile ? (
              <>
                <Button 
                  onClick={handleGenerate}
                  disabled={!selectedImageUrl && !uploadedImageUrl}
                  className="w-full"
                >
                  Jetzt generieren
                </Button>
                <Button variant="outline" onClick={onClose} className="w-full">
                  Abbrechen
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={!selectedImageUrl && !uploadedImageUrl}
                  className="min-w-32"
                >
                  Jetzt generieren
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};