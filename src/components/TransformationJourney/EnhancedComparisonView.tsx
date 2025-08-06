import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, TargetIcon, TrendingUpIcon, ImageIcon, SplitIcon } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { SwipeGallery } from './SwipeGallery';
import { ProgressCard } from './ProgressCard';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedComparisonViewProps {
  targetImages: Array<{
    id: string;
    image_url: string;
    image_category: string;
    target_weight_kg: number;
    target_body_fat_percentage: number;
    created_at: string;
  }>;
  progressPhotos: Array<{
    date: string;
    photo_front_url?: string;
    photo_back_url?: string;
    photo_side_url?: string;
    weight: number;
    body_fat_percentage?: number;
  }>;
  onDeleteTarget: (id: string) => void;
}

export const EnhancedComparisonView: React.FC<EnhancedComparisonViewProps> = ({
  targetImages,
  progressPhotos,
  onDeleteTarget
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('front');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [comparisonMode, setComparisonMode] = useState<'timeline' | 'split'>('timeline');

  // Filter images by category
  const filteredTargets = targetImages.filter(img => 
    img.image_category === selectedCategory || img.image_category === 'unspecified'
  );

  const filteredProgress = progressPhotos.filter(photo => {
    switch (selectedCategory) {
      case 'front': return photo.photo_front_url;
      case 'back': return photo.photo_back_url;
      case 'side_left':
      case 'side_right': return photo.photo_side_url;
      default: return photo.photo_front_url;
    }
  });

  const getProgressPhotoUrl = (photo: any, category?: string) => {
    const cat = category || selectedCategory;
    switch (cat) {
      case 'front': return photo.photo_front_url;
      case 'back': return photo.photo_back_url;
      case 'side_left':
      case 'side_right': return photo.photo_side_url;
      default: return photo.photo_front_url;
    }
  };

  const targetImage = filteredTargets[0];
  const latestPhoto = filteredProgress[0]; // SwipeGallery sorts newest first

  // Auto-select latest photo on category change
  useEffect(() => {
    if (filteredProgress.length > 0) {
      setSelectedPhoto(filteredProgress[0]);
    }
  }, [selectedCategory, filteredProgress]);

  const currentPhoto = selectedPhoto || latestPhoto;

  return (
    <div className="space-y-6">
      {/* Enhanced Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        photoCounts={{
          front: progressPhotos.filter(p => p.photo_front_url).length,
          back: progressPhotos.filter(p => p.photo_back_url).length,
          side_left: progressPhotos.filter(p => p.photo_side_url).length,
          side_right: progressPhotos.filter(p => p.photo_side_url).length,
          unspecified: 0,
        }}
      />

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-muted/50 rounded-lg p-1">
          <Button
            variant={comparisonMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('timeline')}
            className="rounded-md"
          >
            <TrendingUpIcon className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant={comparisonMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('split')}
            className="rounded-md"
          >
            <SplitIcon className="h-4 w-4 mr-2" />
            Vergleich
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {comparisonMode === 'timeline' ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Apple-like Swipe Gallery */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5 text-primary" />
                    Transformations-Timeline
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {filteredProgress.length} Fotos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <SwipeGallery
                  photos={filteredProgress}
                  getImageUrl={getProgressPhotoUrl}
                  category={selectedCategory}
                  onPhotoSelect={setSelectedPhoto}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {currentPhoto && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="gradient-card">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {currentPhoto.weight}kg
                        </p>
                        <p className="text-sm text-muted-foreground">Aktuelles Gewicht</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {filteredProgress.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Fortschrittsfotos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {filteredProgress.length > 1 
                            ? Math.floor((new Date(filteredProgress[0].date).getTime() - new Date(filteredProgress[filteredProgress.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))
                            : 0
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">Tage Fortschritt</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {currentPhoto.body_fat_percentage?.toFixed(1) || '-'}%
                        </p>
                        <p className="text-sm text-muted-foreground">Körperfett</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="split"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current/Selected Photo */}
              <Card className="gradient-card">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-lg">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    {selectedPhoto ? 'Ausgewählt' : 'Aktuell'}
                  </CardTitle>
                  {currentPhoto && (
                    <Badge variant="outline" className="text-xs">
                      {new Date(currentPhoto.date).toLocaleDateString('de-DE')}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {currentPhoto ? (
                    <ProgressCard
                      imageUrl={getProgressPhotoUrl(currentPhoto)}
                      date={currentPhoto.date}
                      weight={currentPhoto.weight}
                      bodyFat={currentPhoto.body_fat_percentage}
                      category={selectedCategory}
                      isLatest={!selectedPhoto}
                    />
                  ) : (
                    <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Kein Foto für {selectedCategory}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Target Image */}
              <Card className="gradient-card">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-lg">
                    <TargetIcon className="h-5 w-5 text-primary" />
                    Ziel
                  </CardTitle>
                  {targetImage && (
                    <div className="flex gap-2 justify-center">
                      <Badge variant="outline" className="text-xs">
                        {targetImage.target_weight_kg}kg
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {targetImage.target_body_fat_percentage}%
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {targetImage ? (
                    <ProgressCard
                      imageUrl={targetImage.image_url}
                      date={targetImage.created_at}
                      weight={targetImage.target_weight_kg}
                      bodyFat={targetImage.target_body_fat_percentage}
                      category={targetImage.image_category}
                      isTarget={true}
                      onDelete={() => onDeleteTarget(targetImage.id)}
                    />
                  ) : (
                    <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <TargetIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Kein Zielbild für {selectedCategory}</p>
                        <p className="text-xs mt-1">Erstelle ein Zielbild</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Progress to Goal */}
            {currentPhoto && targetImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="gradient-card">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <h3 className="text-lg font-semibold">Weg zum Ziel</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">
                            {Math.abs(targetImage.target_weight_kg - currentPhoto.weight).toFixed(1)}kg
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {targetImage.target_weight_kg > currentPhoto.weight ? 'zunehmen' : 'abnehmen'}
                          </p>
                        </div>
                        {currentPhoto.body_fat_percentage && targetImage.target_body_fat_percentage && (
                          <div className="text-center">
                            <p className="text-3xl font-bold text-primary">
                              {Math.abs(targetImage.target_body_fat_percentage - currentPhoto.body_fat_percentage).toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Körperfett-Differenz</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">
                            {Math.round(((currentPhoto.weight - targetImage.target_weight_kg) / (targetImage.target_weight_kg || 1)) * 100)}%
                          </p>
                          <p className="text-sm text-muted-foreground">Fortschritt</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};