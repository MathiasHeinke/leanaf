import React, { useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, Camera } from 'lucide-react';

interface SwipeGalleryProps {
  photos: Array<{
    date: string;
    weight: number;
    body_fat_percentage?: number;
    photo_urls?: any;
  }>;
  getImageUrl: (photo: any, category: string) => string;
  category: string;
  onPhotoSelect?: (photo: any) => void;
}

export const SwipeGallery: React.FC<SwipeGalleryProps> = ({
  photos,
  getImageUrl,
  category,
  onPhotoSelect
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  // Sort photos by date (newest first)
  const sortedPhotos = [...photos].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
      const selectedPhoto = sortedPhotos[api.selectedScrollSnap()];
      if (selectedPhoto && onPhotoSelect) {
        onPhotoSelect(selectedPhoto);
      }
    });
  }, [api, sortedPhotos, onPhotoSelect]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    return `vor ${Math.floor(days / 30)} Monaten`;
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Camera className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium text-muted-foreground">Noch keine Fortschrittsfotos</p>
          <p className="text-sm text-muted-foreground mt-1">Lade dein erstes Foto hoch, um deine Transformation zu verfolgen</p>
        </div>
      </div>
    );
  }

  const currentPhoto = sortedPhotos[current];

  return (
    <div className="space-y-6">
      {/* Removed redundant header - info is in photo overlays */}

      {/* Apple-style carousel */}
      <Carousel 
        setApi={setApi} 
        className="w-full"
        opts={{
          align: "center",
          loop: false,
        }}
      >
        <CarouselContent className="-ml-4">
          {sortedPhotos.map((photo, index) => (
          <CarouselItem key={index} className="relative pl-4">
            <div className="aspect-[4/5] relative bg-muted rounded-2xl overflow-hidden group shadow-lg">
              <img
                src={getImageUrl(photo, category)}
                alt={`Fortschrittsfoto vom ${formatDate(photo.date)}`}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Photo info overlay - Always visible on mobile, hover on desktop */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-base font-semibold">{formatDate(photo.date)}</p>
                    <p className="text-sm opacity-90">{getDaysAgo(photo.date)}</p>
                  </div>
                  <div className="text-right">
                    {photo.weight && (
                      <p className="text-base font-semibold">{photo.weight} kg</p>
                    )}
                    {photo.body_fat_percentage && (
                      <p className="text-sm opacity-90">{photo.body_fat_percentage}% KFA</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Zoom button */}
              <button
                onClick={() => setSelectedPhoto(photo)}
                className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/30 hover:scale-110 shadow-lg"
              >
                <ZoomIn className="w-6 h-6" />
              </button>
            </div>
          </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation - Apple-style */}
        <div className="relative">
          <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:bg-white/90" />
          <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:bg-white/90" />
        </div>

        {/* Progress dots - Apple-style */}
        <div className="flex justify-center gap-2 mt-8">
          {sortedPhotos.map((_, index) => (
            <button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current 
                  ? 'bg-primary w-8 shadow-sm' 
                  : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Footer stats - Apple-style */}
        <div className="text-center mt-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
            <span className="text-sm font-medium">
              {current + 1} von {count}
            </span>
            <div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
            <span className="text-sm text-muted-foreground">
              {Math.abs(Math.round((new Date(sortedPhotos[count - 1]?.date || new Date()).getTime() - new Date(sortedPhotos[0]?.date || new Date()).getTime()) / (1000 * 60 * 60 * 24)))} Tage
            </span>
          </div>
        </div>
      </Carousel>

      {/* Photo Detail Modal - Apple-style */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0 border-0 bg-black/95 backdrop-blur-xl">
            <div className="relative">
              <img
                src={getImageUrl(selectedPhoto, category)}
                alt={`Fortschrittsfoto vom ${formatDate(selectedPhoto.date)}`}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
              
              {/* Photo details overlay - Apple-style */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-8">
                <div className="text-white">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{formatDate(selectedPhoto.date)}</h3>
                      <p className="text-lg opacity-80">{getDaysAgo(selectedPhoto.date)}</p>
                    </div>
                    <div className="text-right">
                      {selectedPhoto.weight && (
                        <div className="mb-3">
                          <p className="text-sm opacity-70 uppercase tracking-wide">Gewicht</p>
                          <p className="text-2xl font-bold">{selectedPhoto.weight} kg</p>
                        </div>
                      )}
                      {selectedPhoto.body_fat_percentage && (
                        <div>
                          <p className="text-sm opacity-70 uppercase tracking-wide">Körperfett</p>
                          <p className="text-2xl font-bold">{selectedPhoto.body_fat_percentage}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Close button - Apple-style */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white border-0 rounded-full backdrop-blur-sm transition-all duration-200"
                onClick={() => setSelectedPhoto(null)}
              >
                <span className="text-xl">×</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};