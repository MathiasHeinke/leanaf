import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TargetIcon, TrendingUpIcon, ImageIcon } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { ImageTimeline } from './ImageTimeline';
import { ProgressCard } from './ProgressCard';

interface ComparisonViewProps {
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
  currentPhoto?: {
    image_url: string;
    category: string;
    date: string;
  };
  onDeleteTarget: (id: string) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  targetImages,
  progressPhotos,
  currentPhoto,
  onDeleteTarget
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('front');
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(null);

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

  const getProgressPhotoUrl = (photo: any) => {
    switch (selectedCategory) {
      case 'front': return photo.photo_front_url;
      case 'back': return photo.photo_back_url;
      case 'side_left':
      case 'side_right': return photo.photo_side_url;
      default: return photo.photo_front_url;
    }
  };

  const selectedProgressPhoto = selectedTimelineDate 
    ? filteredProgress.find(p => p.date === selectedTimelineDate)
    : filteredProgress[filteredProgress.length - 1]; // Latest photo

  const targetImage = filteredTargets[0]; // Use first target for this category

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Main 3-Panel Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Panel */}
        <Card className="gradient-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Heute
            </CardTitle>
            {selectedProgressPhoto && (
              <Badge variant="outline" className="text-xs">
                {new Date(selectedProgressPhoto.date).toLocaleDateString('de-DE')}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {selectedProgressPhoto ? (
              <ProgressCard
                imageUrl={getProgressPhotoUrl(selectedProgressPhoto)}
                date={selectedProgressPhoto.date}
                weight={selectedProgressPhoto.weight}
                bodyFat={selectedProgressPhoto.body_fat_percentage}
                category={selectedCategory}
                isLatest={!selectedTimelineDate}
              />
            ) : currentPhoto && currentPhoto.category === selectedCategory ? (
              <ProgressCard
                imageUrl={currentPhoto.image_url}
                date={currentPhoto.date}
                category={selectedCategory}
                isLatest={true}
              />
            ) : (
              <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Kein Foto für {selectedCategory}</p>
                  <p className="text-xs mt-1">Lade ein Foto hoch</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Panel */}
        <Card className="gradient-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <TrendingUpIcon className="h-5 w-5 text-primary" />
              Reise
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {filteredProgress.length} Fotos
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <ImageTimeline
              photos={filteredProgress}
              selectedDate={selectedTimelineDate}
              onDateSelect={setSelectedTimelineDate}
              getImageUrl={getProgressPhotoUrl}
              category={selectedCategory}
            />
          </CardContent>
        </Card>

        {/* Target Panel */}
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

      {/* Progress Summary */}
      {selectedProgressPhoto && targetImage && (
        <Card className="gradient-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {Math.abs(targetImage.target_weight_kg - selectedProgressPhoto.weight).toFixed(1)}kg
                </p>
                <p className="text-sm text-muted-foreground">bis zum Ziel</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {filteredProgress.length}
                </p>
                <p className="text-sm text-muted-foreground">Fortschrittsfotos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(((filteredProgress.length - 1) / Math.max(1, (new Date().getTime() - new Date(filteredProgress[0]?.date || new Date()).getTime()) / (1000 * 60 * 60 * 24 * 7)))).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Fotos/Woche</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {selectedProgressPhoto.body_fat_percentage && targetImage.target_body_fat_percentage
                    ? Math.abs(targetImage.target_body_fat_percentage - selectedProgressPhoto.body_fat_percentage).toFixed(1) + '%'
                    : '-'
                  }
                </p>
                <p className="text-sm text-muted-foreground">Körperfett bis Ziel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};