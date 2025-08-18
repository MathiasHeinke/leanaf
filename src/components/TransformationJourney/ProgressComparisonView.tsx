import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TrendingUpIcon } from 'lucide-react';

interface ProgressComparisonViewProps {
  progressPhotos: any[];
}

export const ProgressComparisonView: React.FC<ProgressComparisonViewProps> = ({
  progressPhotos
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('front');
  const [selectedBeforeIndex, setSelectedBeforeIndex] = useState<number>(0);
  const [selectedAfterIndex, setSelectedAfterIndex] = useState<number>(
    progressPhotos.length > 1 ? progressPhotos.length - 1 : 0
  );

  // Filter photos that have the selected category
  const availablePhotos = progressPhotos.filter(photo => {
    const categoryUrl = getCategoryUrl(photo, selectedCategory as 'front' | 'side' | 'back');
    return categoryUrl !== null;
  });

  function getCategoryUrl(photo: any, category: 'front' | 'side' | 'back') {
    if (photo.photo_urls) {
      return photo.photo_urls[category] || null;
    }
    return photo[`photo_${category}_url`] || null;
  }

  const beforePhoto = availablePhotos[selectedBeforeIndex];
  const afterPhoto = availablePhotos[selectedAfterIndex];

  const beforeUrl = beforePhoto ? getCategoryUrl(beforePhoto, selectedCategory as 'front' | 'side' | 'back') : null;
  const afterUrl = afterPhoto ? getCategoryUrl(afterPhoto, selectedCategory as 'front' | 'side' | 'back') : null;

  if (availablePhotos.length < 2) {
    return (
      <Card className="gradient-card">
        <CardContent className="p-8 text-center">
          <TrendingUpIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nicht genügend Bilder für Vergleich</h3>
          <p className="text-muted-foreground">
            Du benötigst mindestens 2 Fortschrittsfotos der gleichen Kategorie, um einen Progress-Vergleich zu erstellen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category and Photo Selection */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Progress-Vergleich
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vergleiche deine Fortschrittsfotos aus verschiedenen Zeiträumen
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Foto-Kategorie:</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front">
                  <div className="flex items-center gap-2">
                    <span>📷</span>
                    <span>Frontansicht</span>
                  </div>
                </SelectItem>
                <SelectItem value="side">
                  <div className="flex items-center gap-2">
                    <span>📸</span>
                    <span>Seitenansicht</span>
                  </div>
                </SelectItem>
                <SelectItem value="back">
                  <div className="flex items-center gap-2">
                    <span>🔄</span>
                    <span>Rückansicht</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before Photo Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vorher (älteres Foto):</label>
              <Select 
                value={selectedBeforeIndex.toString()} 
                onValueChange={(value) => setSelectedBeforeIndex(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePhotos.map((photo, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      <div className="flex items-center gap-3">
                        <img
                          src={getCategoryUrl(photo, selectedCategory as 'front' | 'side' | 'back')}
                          alt={`Foto vom ${photo.date}`}
                          className="w-8 h-8 object-cover rounded"
                        />
                        <div className="text-left">
                          <div className="font-medium">
                            {format(new Date(photo.date), 'dd.MM.yyyy', { locale: de })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {photo.weight}kg {photo.body_fat_percentage && `• ${photo.body_fat_percentage}% KFA`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* After Photo Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nachher (neueres Foto):</label>
              <Select 
                value={selectedAfterIndex.toString()} 
                onValueChange={(value) => setSelectedAfterIndex(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePhotos.map((photo, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      <div className="flex items-center gap-3">
                        <img
                          src={getCategoryUrl(photo, selectedCategory as 'front' | 'side' | 'back')}
                          alt={`Foto vom ${photo.date}`}
                          className="w-8 h-8 object-cover rounded"
                        />
                        <div className="text-left">
                          <div className="font-medium">
                            {format(new Date(photo.date), 'dd.MM.yyyy', { locale: de })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {photo.weight}kg {photo.body_fat_percentage && `• ${photo.body_fat_percentage}% KFA`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Before/After Comparison */}
      {beforeUrl && afterUrl && (
        <Card className="gradient-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-center">
              {format(new Date(beforePhoto.date), 'dd.MM.yyyy', { locale: de })} vs{' '}
              {format(new Date(afterPhoto.date), 'dd.MM.yyyy', { locale: de })}
            </CardTitle>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <div>Gewicht: {beforePhoto.weight}kg → {afterPhoto.weight}kg</div>
              {beforePhoto.body_fat_percentage && afterPhoto.body_fat_percentage && (
                <div>KFA: {beforePhoto.body_fat_percentage}% → {afterPhoto.body_fat_percentage}%</div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <BeforeAfterSlider
              beforeImage={beforeUrl}
              afterImage={afterUrl}
              beforeLabel={`Vorher (${format(new Date(beforePhoto.date), 'dd.MM.yyyy', { locale: de })})`}
              afterLabel={`Nachher (${format(new Date(afterPhoto.date), 'dd.MM.yyyy', { locale: de })})`}
              className="aspect-[3/4] w-full"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};