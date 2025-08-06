import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious,
  type CarouselApi 
} from '@/components/ui/carousel';
import { 
  Dialog,
  DialogContent,
  DialogTrigger
} from '@/components/ui/dialog';
import { CalendarIcon, ZoomInIcon, TrendingUpIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SwipeGalleryProps {
  photos: Array<{
    date: string;
    weight: number;
    body_fat_percentage?: number;
  }>;
  getImageUrl: (photo: any) => string;
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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Sort photos by date (newest first)
  const sortedPhotos = [...photos].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
      const selectedPhoto = sortedPhotos[api.selectedScrollSnap()];
      if (selectedPhoto && onPhotoSelect) {
        onPhotoSelect(selectedPhoto);
      }
    });
  }, [api, sortedPhotos, onPhotoSelect]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('de-DE', { month: 'long' }),
      year: date.getFullYear(),
      weekday: date.toLocaleDateString('de-DE', { weekday: 'long' })
    };
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    return `vor ${Math.floor(days / 30)} Monaten`;
  };

  if (sortedPhotos.length === 0) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-8 text-center">
          <TrendingUpIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-medium mb-2">Keine Fotos vorhanden</h3>
          <p className="text-sm text-muted-foreground">
            Beginne deine Transformation für {category}
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentPhoto = sortedPhotos[current - 1];
  const dateInfo = currentPhoto ? formatDate(currentPhoto.date) : null;

  return (
    <div className="space-y-4">
      {/* Gallery Header with Current Photo Info */}
      {currentPhoto && dateInfo && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-2"
        >
          <h3 className="text-lg font-semibold">
            {dateInfo.weekday}, {dateInfo.day}. {dateInfo.month} {dateInfo.year}
          </h3>
          <p className="text-sm text-muted-foreground">
            {getDaysAgo(currentPhoto.date)}
          </p>
          <div className="flex gap-2 justify-center">
            <Badge variant="secondary" className="text-xs">
              {currentPhoto.weight}kg
            </Badge>
            {currentPhoto.body_fat_percentage && (
              <Badge variant="outline" className="text-xs">
                {currentPhoto.body_fat_percentage}% KFA
              </Badge>
            )}
          </div>
        </motion.div>
      )}

      {/* Apple-like Swipe Gallery */}
      <Carousel 
        setApi={setApi} 
        className="w-full"
        opts={{
          align: "center",
          loop: false,
          skipSnaps: false,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {sortedPhotos.map((photo, index) => (
            <CarouselItem key={photo.date} className="pl-2 md:pl-4 basis-full">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="gradient-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative group">
                      <img
                        src={getImageUrl(photo)}
                        alt={`Fortschritt ${photo.date}`}
                        className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Overlay with Controls */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <div className="text-white">
                            <p className="text-sm font-medium">
                              {formatDate(photo.date).day}. {formatDate(photo.date).month}
                            </p>
                            <p className="text-xs opacity-80">
                              {photo.weight}kg
                            </p>
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
                                onClick={() => setEnlargedImage(getImageUrl(photo))}
                              >
                                <ZoomInIcon className="h-4 w-4 text-white" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
                              <div className="relative">
                                <img
                                  src={getImageUrl(photo)}
                                  alt={`Fortschritt ${photo.date}`}
                                  className="w-full h-auto rounded-lg"
                                />
                                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                                  <div className="text-white text-center">
                                    <p className="font-medium">
                                      {formatDate(photo.date).weekday}, {formatDate(photo.date).day}. {formatDate(photo.date).month} {formatDate(photo.date).year}
                                    </p>
                                    <p className="text-sm opacity-80 mt-1">
                                      {getDaysAgo(photo.date)} • {photo.weight}kg
                                      {photo.body_fat_percentage && ` • ${photo.body_fat_percentage}% KFA`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      {/* Latest Badge */}
                      {index === 0 && (
                        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                          Neuestes
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Custom Navigation Buttons */}
        <CarouselPrevious className="-left-12 bg-white/80 backdrop-blur-sm border-white/30 hover:bg-white/90" />
        <CarouselNext className="-right-12 bg-white/80 backdrop-blur-sm border-white/30 hover:bg-white/90" />
      </Carousel>

      {/* Progress Dots (Apple Style) */}
      <div className="flex justify-center gap-2 mt-4">
        {sortedPhotos.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === current - 1 
                ? 'bg-primary scale-125' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>

      {/* Gallery Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3 w-3" />
          <span>{current} von {count}</span>
        </div>
        
        {sortedPhotos.length > 1 && (
          <span>
            Zeitraum: {Math.floor((new Date(sortedPhotos[0].date).getTime() - new Date(sortedPhotos[sortedPhotos.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))} Tage
          </span>
        )}
      </div>
    </div>
  );
};