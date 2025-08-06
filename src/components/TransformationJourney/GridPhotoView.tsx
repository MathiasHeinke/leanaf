import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, Filter, Tag, WandIcon, EyeIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';

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
    ai_generated_from_photo_id?: string | null;
  }>;
  onPhotosUpdated?: () => void;
  onViewTransformation?: (photo: any) => void;
  onCreateTransformation?: (photo: any) => void;
}

export const GridPhotoView: React.FC<GridPhotoViewProps> = ({ photos, targetImages = [], onPhotosUpdated, onViewTransformation, onCreateTransformation }) => {
  const { updatePhotoMetadata } = useProgressPhotos();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [updatingPhoto, setUpdatingPhoto] = useState<string | null>(null);
  const [localPhotos, setLocalPhotos] = useState(photos);

  // Update local photos when props change
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  // Get all photo URLs with metadata
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
    }> = [];

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

    return entries;
  };

  const photoEntries = getPhotoEntries();
  
  // Filter photos by category
  const filteredEntries = filterCategory === 'all' 
    ? photoEntries 
    : photoEntries.filter(entry => entry.category === filterCategory);

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'front': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'back': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'side': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const updatePhotoCategory = async (entry: any, newCategory: string) => {
    if (entry.originalCategory === newCategory) return;
    
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
    front: photoEntries.filter(e => e.category === 'front').length,
    back: photoEntries.filter(e => e.category === 'back').length,
    side: photoEntries.filter(e => e.category === 'side').length,
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
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {sortedEntries.length} von {photoEntries.length} Fotos
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                <Badge className={`text-xs ${getCategoryColor(entry.category)}`}>
                  {getCategoryLabel(entry.category)}
                </Badge>
                {hasAiTransformation(entry.entryId) && (
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

              {/* Zoom Button */}
              <button
                onClick={() => setSelectedPhoto(entry)}
                className="absolute bottom-2 right-2 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/30"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{formatDate(entry.date)}</p>
                  <div className="flex justify-between text-xs">
                    <span>{entry.weight}kg</span>
                    {entry.body_fat_percentage && (
                      <span>{entry.body_fat_percentage}% KFA</span>
                    )}
                  </div>
                  
                  {/* KI Action Button */}
                  <div className="mt-2">
                    {hasAiTransformation(entry.entryId) ? (
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

            {/* Category Selector */}
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
    </div>
  );
};