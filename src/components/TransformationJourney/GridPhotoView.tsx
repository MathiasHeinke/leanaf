import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, Filter, Tag, WandIcon, EyeIcon, CropIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { UniversalCropModal } from './UniversalCropModal';
import { useImageCropping } from '@/hooks/useImageCropping';

interface GridPhotoViewProps {
  photos: Array<{
    id: string;
    date: string;
    weight: number;
    body_fat_percentage?: number;
    photo_urls?: any;
    photo_metadata?: any;
  }>;
  targetImages?: Array<{
    id: string;
    ai_generated_from_photo_id?: string | null;
    image_url: string;
    image_type: string;
    generation_prompt?: string;
    image_category?: string;
    target_weight_kg?: number;
    target_body_fat_percentage?: number;
  }>;
  onPhotosUpdated?: () => void;
  onViewTransformation?: (photo: any) => void;
  onCreateTransformation?: (photo: any) => void;
  startCropWorkflow?: (files: File[], weight?: number, bodyFat?: number, muscleMass?: number, notes?: string) => void;
}

export const GridPhotoView: React.FC<GridPhotoViewProps> = ({ photos, targetImages = [], onPhotosUpdated, onViewTransformation, onCreateTransformation, startCropWorkflow }) => {
  const { updatePhotoMetadata } = useProgressPhotos();
  const { croppingState, openCropModal, closeCropModal, handleCropComplete, handleRegenerateAI } = useImageCropping();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [updatingPhoto, setUpdatingPhoto] = useState<string | null>(null);
  const [localPhotos, setLocalPhotos] = useState(photos);

  // Update local photos when props change
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  // Get all photo URLs with metadata, including AI images
  const getPhotoEntries = () => {
    const entries: Array<{
      url: string;
      category: string;
      date: string;
      weight: number;
      body_fat_percentage?: number;
      confidence?: number;
      photo: any;
      entryId: string;
      originalCategory: string;
      isAI?: boolean;
      aiImageId?: string;
      originalPrompt?: string;
      targetWeight?: number;
      targetBodyFat?: number;
    }> = [];

    // Add progress photos
    localPhotos.forEach((photo) => {
      if (photo.photo_urls) {
        // Front photo
        if (photo.photo_urls.front) {
          entries.push({
            url: photo.photo_urls.front,
            category: 'front',
            date: photo.date,
            weight: photo.weight,
            body_fat_percentage: photo.body_fat_percentage,
            confidence: photo.photo_metadata?.front?.confidence || 0,
            photo,
            entryId: photo.id,
            originalCategory: 'front'
          });
        }
        // Back photo
        if (photo.photo_urls.back) {
          entries.push({
            url: photo.photo_urls.back,
            category: 'back',
            date: photo.date,
            weight: photo.weight,
            body_fat_percentage: photo.body_fat_percentage,
            confidence: photo.photo_metadata?.back?.confidence || 0,
            photo,
            entryId: photo.id,
            originalCategory: 'back'
          });
        }
        // Side photo
        if (photo.photo_urls.side) {
          entries.push({
            url: photo.photo_urls.side,
            category: 'side',
            date: photo.date,
            weight: photo.weight,
            body_fat_percentage: photo.body_fat_percentage,
            confidence: photo.photo_metadata?.side?.confidence || 0,
            photo,
            entryId: photo.id,
            originalCategory: 'side'
          });
        }
      }
    });

    // Add AI-generated target images
    targetImages.forEach((aiImage) => {
      entries.push({
        url: aiImage.image_url,
        category: aiImage.image_category || 'unspecified',
        date: new Date().toISOString().split('T')[0], // Use current date for AI images
        weight: 0, // AI images don't have weight
        body_fat_percentage: aiImage.target_body_fat_percentage || undefined,
        confidence: 1, // AI images have full confidence
        photo: null, // No associated photo object
        entryId: aiImage.id,
        originalCategory: aiImage.image_category || 'unspecified',
        isAI: true,
        aiImageId: aiImage.id,
        originalPrompt: aiImage.generation_prompt || undefined,
        targetWeight: aiImage.target_weight_kg || undefined,
        targetBodyFat: aiImage.target_body_fat_percentage || undefined
      });
    });

    return entries;
  };

  const photoEntries = getPhotoEntries();
  
  // Filter photos by category
  const filteredEntries = filterCategory === 'all' 
    ? photoEntries 
    : filterCategory === 'ai'
    ? photoEntries.filter(entry => entry.isAI)
    : photoEntries.filter(entry => entry.category === filterCategory && !entry.isAI);

  // Sort by date (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: 'numeric', 
      month: 'short',
      year: '2-digit'
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'front': return 'Front';
      case 'back': return 'Rücken';
      case 'side': return 'Seite';
      default: return category;
    }
  };

  const getCategoryColor = (category: string, isAI?: boolean) => {
    if (isAI) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
    switch (category) {
      case 'front': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'back': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'side': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const updatePhotoCategory = async (entry: any, newCategory: string) => {
    if (entry.originalCategory === newCategory || entry.isAI) return; // Don't allow category changes for AI images
    
    const uniqueKey = `${entry.entryId}-${entry.originalCategory}`;
    setUpdatingPhoto(uniqueKey);
    
    // Optimistic update - immediately update local state
    setLocalPhotos(currentPhotos => 
      currentPhotos.map(photo => {
        if (photo.id === entry.entryId) {
          const newUrls = { ...photo.photo_urls };
          const urlToMove = newUrls[entry.originalCategory];
          
          if (urlToMove) {
            // Remove from old category
            delete newUrls[entry.originalCategory];
            // Add to new category
            newUrls[newCategory] = urlToMove;
          }
          
          return { ...photo, photo_urls: newUrls };
        }
        return photo;
      })
    );
    
    try {
      const success = await updatePhotoMetadata(
        entry.entryId, 
        entry.originalCategory as 'front' | 'back' | 'side', 
        newCategory as 'front' | 'back' | 'side'
      );
      
      if (success) {
        toast.success(`Foto als ${getCategoryLabel(newCategory)} markiert`);
        // Trigger parent component to refresh photos from database
        onPhotosUpdated?.();
      } else {
        // Rollback optimistic update
        setLocalPhotos(photos);
        toast.error('Fehler beim Aktualisieren der Kategorie');
      }
    } catch (error) {
      console.error('Error updating photo category:', error);
      // Rollback optimistic update
      setLocalPhotos(photos);
      toast.error('Fehler beim Aktualisieren der Kategorie');
    } finally {
      setUpdatingPhoto(null);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { color: 'bg-green-100 text-green-800', text: 'Hoch' };
    if (confidence >= 0.6) return { color: 'bg-yellow-100 text-yellow-800', text: 'Mittel' };
    return { color: 'bg-red-100 text-red-800', text: 'Niedrig' };
  };

  const hasAiTransformation = (photoId: string) => {
    return targetImages.some(target => target.ai_generated_from_photo_id === photoId);
  };

  const categoryCounts = {
    all: photoEntries.length,
    front: photoEntries.filter(e => e.category === 'front' && !e.isAI).length,
    back: photoEntries.filter(e => e.category === 'back' && !e.isAI).length,
    side: photoEntries.filter(e => e.category === 'side' && !e.isAI).length,
    ai: photoEntries.filter(e => e.isAI).length,
  };

  if (photoEntries.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Tag className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium text-muted-foreground">Keine Fotos vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">Lade Fortschrittsfotos hoch, um sie hier zu verwalten</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-50">
              <SelectItem value="all">Alle Fotos ({categoryCounts.all})</SelectItem>
              <SelectItem value="front">Front ({categoryCounts.front})</SelectItem>
              <SelectItem value="back">Rücken ({categoryCounts.back})</SelectItem>
              <SelectItem value="side">Seite ({categoryCounts.side})</SelectItem>
              <SelectItem value="ai">KI-Bilder ({categoryCounts.ai})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {sortedEntries.length} von {photoEntries.length} Fotos
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-4">
        {sortedEntries.map((entry, index) => (
          <Card key={`${entry.date}-${entry.category}`} className="overflow-hidden group hover:shadow-lg transition-all duration-200">
            <div className="relative aspect-[3/4]">
              <img
                src={entry.url}
                alt={`${getCategoryLabel(entry.category)} - ${formatDate(entry.date)}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Overlay with gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              
              {/* Category Badge */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <Badge className={`text-xs ${getCategoryColor(entry.category, entry.isAI)}`}>
                  {entry.isAI ? 'KI-Generiert' : getCategoryLabel(entry.category)}
                </Badge>
                {!entry.isAI && hasAiTransformation(entry.entryId) && (
                  <Badge className="bg-purple-500/90 hover:bg-purple-600 text-white text-xs">
                    <WandIcon className="h-3 w-3 mr-1" />
                    KI-Transformiert
                  </Badge>
                )}
              </div>

              {/* Confidence Badge */}
              {entry.confidence > 0 && (
                <div className="absolute top-2 right-2">
                  <Badge className={`text-xs ${getConfidenceBadge(entry.confidence).color}`}>
                    KI: {getConfidenceBadge(entry.confidence).text}
                  </Badge>
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => setSelectedPhoto(entry)}
                  className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/30"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => openCropModal(
                    entry.url, 
                    entry.isAI ? 'ai' : 'progress',
                    {
                      imageId: entry.aiImageId,
                      originalPrompt: entry.originalPrompt,
                      imageCategory: entry.category,
                      targetWeight: entry.targetWeight,
                      targetBodyFat: entry.targetBodyFat
                    }
                  )}
                  className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/30"
                  title="Bild zuschneiden"
                >
                  <CropIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {entry.isAI ? 'KI-Zielbild' : formatDate(entry.date)}
                  </p>
                  <div className="flex justify-between text-xs">
                    {entry.isAI ? (
                      <span>Zielgewicht: {entry.targetWeight || 'N/A'}kg</span>
                    ) : (
                      <span>{entry.weight}kg</span>
                    )}
                    {entry.body_fat_percentage && (
                      <span>{entry.body_fat_percentage}% KFA</span>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-2 space-y-1">
                    {entry.isAI ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (entry.originalPrompt) {
                            handleRegenerateAI(entry.originalPrompt + ', 3:4 aspect ratio, perfect framing');
                          }
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Neu generieren
                      </Button>
                    ) : hasAiTransformation(entry.entryId) ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTransformation?.(entry.photo);
                        }}
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        Transformation ansehen
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateTransformation?.(entry.photo);
                        }}
                      >
                        <WandIcon className="h-3 w-3 mr-1" />
                        Mit KI transformieren
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Category Selector - Only for progress photos */}
            {!entry.isAI && (
              <CardContent className="p-3">
                <Select
                  value={entry.category}
                  onValueChange={(newCategory) => updatePhotoCategory(entry, newCategory)}
                  disabled={updatingPhoto === `${entry.entryId}-${entry.originalCategory}`}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    <SelectItem value="front">Front</SelectItem>
                    <SelectItem value="back">Rücken</SelectItem>
                    <SelectItem value="side">Seite</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            )}
            
            {/* AI Image Info for AI images */}
            {entry.isAI && (
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-medium">KI-Generiertes Zielbild</div>
                  <div className="flex justify-between">
                    <span>Kategorie: {getCategoryLabel(entry.category)}</span>
                  </div>
                  {entry.targetWeight && (
                    <div>Zielgewicht: {entry.targetWeight}kg</div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl max-h-[95vh] p-0 border-0 bg-black/95 backdrop-blur-xl">
            <div className="relative">
              <img
                src={selectedPhoto.url}
                alt={`${getCategoryLabel(selectedPhoto.category)} - ${formatDate(selectedPhoto.date)}`}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
              
              {/* Photo details overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
                <div className="text-white space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getCategoryColor(selectedPhoto.category)}`}>
                      {getCategoryLabel(selectedPhoto.category)}
                    </Badge>
                    {selectedPhoto.confidence > 0 && (
                      <Badge className={`${getConfidenceBadge(selectedPhoto.confidence).color}`}>
                        KI-Erkennung: {getConfidenceBadge(selectedPhoto.confidence).text}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{formatDate(selectedPhoto.date)}</h3>
                    </div>
                    <div className="text-right">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{selectedPhoto.weight} kg</p>
                        {selectedPhoto.body_fat_percentage && (
                          <p className="text-sm opacity-80">{selectedPhoto.body_fat_percentage}% Körperfett</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white border-0 rounded-full backdrop-blur-sm"
                onClick={() => setSelectedPhoto(null)}
              >
                <span className="text-lg">×</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Universal Crop Modal */}
      <UniversalCropModal
        image={croppingState.image}
        imageType={croppingState.imageType}
        isOpen={croppingState.isOpen}
        onClose={closeCropModal}
        onCropComplete={(file) => handleCropComplete(file, (croppedFile) => {
          // Handle the cropped file - could trigger upload or other actions
          console.log('Cropped file:', croppedFile);
          onPhotosUpdated?.(); // Refresh photos after cropping
        })}
        onRegenerateAI={handleRegenerateAI}
        originalPrompt={croppingState.originalPrompt}
        imageCategory={croppingState.imageCategory}
        targetWeight={croppingState.targetWeight}
        targetBodyFat={croppingState.targetBodyFat}
      />
    </div>
  );
};