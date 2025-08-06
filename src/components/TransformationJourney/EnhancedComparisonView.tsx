import React, { useState, useEffect } from 'react';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, TargetIcon, TrendingUpIcon, ImageIcon, SplitIcon } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { SwipeGallery } from './SwipeGallery';
import { ProgressCard } from './ProgressCard';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { ManualCropModal } from '@/components/AvatarSelector';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedComparisonViewProps {
  targetImages: Array<{
    id: string;
    image_url: string;
    image_category: string;
    target_weight_kg: number;
    target_body_fat_percentage: number;
    ai_generated_from_photo_id?: string;
    created_at: string;
  }>;
  progressPhotos: Array<{
    id: string;
    date: string;
    photo_front_url?: string;
    photo_back_url?: string;
    photo_side_url?: string;
    weight: number;
    body_fat_percentage?: number;
  }>;
  onDeleteTarget: (id: string) => void;
  onViewTransformation?: (photo: any) => void;
  onCreateTransformation?: (photo: any, category?: string) => void;
  onUpdateTargetImage?: (targetImageId: string, newImageUrl: string) => void;
}

export const EnhancedComparisonView: React.FC<EnhancedComparisonViewProps> = ({
  targetImages,
  progressPhotos,
  onDeleteTarget,
  onViewTransformation,
  onCreateTransformation,
  onUpdateTargetImage
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('front');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [comparisonMode, setComparisonMode] = useState<'vergleich' | 'timeline' | 'split'>('split');
  const [selectedAiImageId, setSelectedAiImageId] = useState<string | null>(null);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [datePhotos, setDatePhotos] = useState<any[]>([]);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedTargetImageForCrop, setSelectedTargetImageForCrop] = useState<any>(null);

  // Listen for data refresh events
  useDataRefresh(() => {
    console.log('🔄 Data refresh triggered in EnhancedComparisonView');
    // Force component re-render by updating a timestamp
    setSelectedPhoto(prev => ({ ...prev, _refreshTimestamp: Date.now() }));
  });

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

  // Create linked photo pairs for Before/After slider with improved error handling
  const getLinkedPhotoPairs = () => {
    console.log('🔗 Getting linked pairs:', {
      filteredTargets: filteredTargets.length,
      progressPhotos: progressPhotos.length,
      targetImagesWithPhotoId: filteredTargets.filter(t => t.ai_generated_from_photo_id).length
    });

    const pairs = filteredTargets
      .filter(target => target.ai_generated_from_photo_id)
      .map(target => {
        const originalPhoto = progressPhotos.find(photo => 
          photo.id === target.ai_generated_from_photo_id
        );
        
        console.log(`🔍 Looking for photo ${target.ai_generated_from_photo_id}:`, {
          found: !!originalPhoto,
          targetImageId: target.id,
          targetImageUrl: target.image_url
        });
        
        if (originalPhoto) {
          const originalUrl = getProgressPhotoUrl(originalPhoto);
          const pair = {
            originalPhoto,
            targetImage: target,
            originalUrl,
            targetUrl: target.image_url
          };
          
          console.log('✅ Created pair:', {
            originalUrl: originalUrl?.substring(0, 50) + '...',
            targetUrl: target.image_url?.substring(0, 50) + '...',
            hasOriginalUrl: !!originalUrl,
            hasTargetUrl: !!target.image_url
          });
          
          return pair;
        }
        return null;
      })
      .filter(pair => pair !== null && pair.originalUrl && pair.targetUrl);

    console.log('🎯 Final linked pairs:', pairs.length);
    return pairs;
  };


  // Helper function to find photos from the same date
  const getPhotosFromSameDate = (photo: any) => {
    if (!photo) return [];
    const photoDate = photo.date;
    return progressPhotos.filter(p => p.date === photoDate && getProgressPhotoUrl(p));
  };

  // Handle date click in Split View
  const handleDateClick = (photo: any) => {
    const sameDatePhotos = getPhotosFromSameDate(photo);
    if (sameDatePhotos.length > 1) {
      setDatePhotos(sameDatePhotos);
      setShowDateSelector(true);
    }
  };

  // Handle photo selection from date dialog
  const handlePhotoSelection = (photo: any) => {
    setSelectedPhoto(photo);
    setShowDateSelector(false);
  };

  const linkedPairs = getLinkedPhotoPairs();
  const currentPair = linkedPairs[0]; // Use first linked pair for now
  const targetImage = filteredTargets[0];
  const latestPhoto = filteredProgress[0]; // SwipeGallery sorts newest first

  // Auto-select latest photo on category change
  useEffect(() => {
    if (filteredProgress.length > 0) {
      setSelectedPhoto(filteredProgress[0]);
    }
  }, [selectedCategory, filteredProgress]);

  const currentPhoto = selectedPhoto || latestPhoto;

  // Get AI images for current photo - must be after currentPhoto is defined
  const getAiImagesForCurrentPhoto = () => {
    if (!currentPhoto) return [];
    
    return filteredTargets.filter(target => 
      target.ai_generated_from_photo_id === currentPhoto.id
    );
  };

  // Handle opening crop modal for AI image
  const handleOpenCropModal = (targetImage: any) => {
    if (!currentPhoto) return;
    setSelectedTargetImageForCrop(targetImage);
    setCropModalOpen(true);
  };

  // Handle saving cropped image
  const handleSaveCroppedImage = async (croppedImageUrl: string) => {
    if (!selectedTargetImageForCrop || !onUpdateTargetImage) return;
    
    try {
      // Convert blob URL to actual file and upload
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      
      // Create FormData and upload to Supabase
      const formData = new FormData();
      formData.append('file', blob, 'cropped-ai-image.jpg');
      
      // For now, just use the blob URL - in production you'd upload to storage
      await onUpdateTargetImage(selectedTargetImageForCrop.id, croppedImageUrl);
      
      setCropModalOpen(false);
      setSelectedTargetImageForCrop(null);
    } catch (error) {
      console.error('Error saving cropped image:', error);
    }
  };

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
            variant={comparisonMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('split')}
            className="rounded-md"
          >
            <SplitIcon className="h-4 w-4 mr-2" />
            Split View
          </Button>
          <Button
            variant={comparisonMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('timeline')}
            className="rounded-md"
          >
            <TrendingUpIcon className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          {linkedPairs.length > 0 && (
            <Button
              variant={comparisonMode === 'vergleich' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setComparisonMode('vergleich')}
              className="rounded-md"
            >
              <SplitIcon className="h-4 w-4 mr-2" />
              Vergleich
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {comparisonMode === 'vergleich' && linkedPairs.length > 0 ? (
          <motion.div
            key="vergleich"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Before/After Slider */}
            <Card className="gradient-card">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <SplitIcon className="h-5 w-5 text-primary" />
                  Original vs. KI-Transformiert
                </CardTitle>
                <div className="flex gap-2 justify-center">
                  <Badge variant="outline" className="text-xs">
                    {new Date(currentPair.originalPhoto.date).toLocaleDateString('de-DE')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentPair.originalPhoto.weight}kg
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <BeforeAfterSlider
                  beforeImage={currentPair.originalUrl}
                  afterImage={currentPair.targetUrl}
                  beforeLabel="Original"
                  afterLabel="KI-Generiert"
                />
              </CardContent>
            </Card>

            {/* Progress Stats */}
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
                        {currentPair.originalPhoto.weight}kg
                      </p>
                      <p className="text-sm text-muted-foreground">Original Gewicht</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {currentPair.targetImage.target_weight_kg}kg
                      </p>
                      <p className="text-sm text-muted-foreground">Zielgewicht</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {Math.abs(currentPair.targetImage.target_weight_kg - currentPair.originalPhoto.weight).toFixed(1)}kg
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {currentPair.targetImage.target_weight_kg > currentPair.originalPhoto.weight ? 'zunehmen' : 'abnehmen'}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {currentPair.originalPhoto.body_fat_percentage?.toFixed(1) || '-'}%
                      </p>
                      <p className="text-sm text-muted-foreground">Körperfett</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : comparisonMode === 'timeline' ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Simplified Swipe Gallery */}
            <Card className="gradient-card">
              <CardContent className="p-6">
                <SwipeGallery
                  photos={filteredProgress}
                  getImageUrl={getProgressPhotoUrl}
                  category={selectedCategory}
                  targetImages={targetImages}
                  onPhotoSelect={setSelectedPhoto}
                  onViewTransformation={onViewTransformation}
                  onCreateTransformation={onCreateTransformation}
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
            {/* Use BeforeAfterSlider for linked pairs, otherwise fallback to side-by-side */}
            {currentPair ? (
              <Card className="gradient-card">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <SplitIcon className="h-5 w-5 text-primary" />
                    Original vs. KI-Zielbild
                  </CardTitle>
                  <div className="flex gap-2 justify-center">
                    <Badge variant="outline" className="text-xs">
                      {new Date(currentPair.originalPhoto.date).toLocaleDateString('de-DE')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {currentPair.originalPhoto.weight}kg
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <BeforeAfterSlider
                    beforeImage={currentPair.originalUrl}
                    afterImage={currentPair.targetUrl}
                    beforeLabel="Original"
                    afterLabel="KI-Zielbild"
                  />
                </CardContent>
              </Card>
            ) : (
              /* Progress Photo Comparison with BeforeAfterSlider */
              <>
                {filteredProgress.length >= 2 && (
                  <Card className="gradient-card mb-6">
                    <CardHeader className="text-center">
                      <CardTitle className="flex items-center justify-center gap-2 text-lg">
                        <SplitIcon className="h-5 w-5 text-primary" />
                        Progress Vergleich
                      </CardTitle>
                      <div className="flex gap-2 justify-center">
                        <Badge variant="outline" className="text-xs">
                          {new Date(filteredProgress[filteredProgress.length - 1].date).toLocaleDateString('de-DE')} vs {new Date(filteredProgress[0].date).toLocaleDateString('de-DE')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {filteredProgress[filteredProgress.length - 1].weight}kg vs {filteredProgress[0].weight}kg
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <BeforeAfterSlider
                        beforeImage={getProgressPhotoUrl(filteredProgress[0])}
                        afterImage={getProgressPhotoUrl(filteredProgress[filteredProgress.length - 1])}
                        beforeLabel={`Start (${new Date(filteredProgress[0].date).toLocaleDateString('de-DE')})`}
                        afterLabel={`Aktuell (${new Date(filteredProgress[filteredProgress.length - 1].date).toLocaleDateString('de-DE')})`}
                      />
                    </CardContent>
                  </Card>
                )}

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
                         <div className="flex gap-2 justify-center">
                           <Badge 
                             variant="outline" 
                             className={`text-xs transition-colors ${
                               getPhotosFromSameDate(currentPhoto).length > 1 
                                 ? 'cursor-pointer hover:bg-primary/10 hover:border-primary/50' 
                                 : ''
                             }`}
                             onClick={() => handleDateClick(currentPhoto)}
                           >
                             {new Date(currentPhoto.date).toLocaleDateString('de-DE')}
                             {getPhotosFromSameDate(currentPhoto).length > 1 && (
                               <span className="ml-1 text-primary font-medium">({getPhotosFromSameDate(currentPhoto).length})</span>
                             )}
                           </Badge>
                           <Badge variant="outline" className="text-xs">
                             {currentPhoto.weight}kg
                           </Badge>
                         </div>
                       )}
                    </CardHeader>
                     <CardContent className="p-4">
                       {currentPhoto ? (
                         <>
                           <ProgressCard
                             imageUrl={getProgressPhotoUrl(currentPhoto)}
                             date={currentPhoto.date}
                             weight={currentPhoto.weight}
                             bodyFat={currentPhoto.body_fat_percentage}
                             category={selectedCategory}
                             isLatest={!selectedPhoto}
                             hasAiTransformation={targetImages.some(t => t.ai_generated_from_photo_id === currentPhoto.id)}
                             onViewTransformation={() => onViewTransformation?.(currentPhoto)}
                             onCreateTransformation={() => onCreateTransformation?.(currentPhoto, selectedCategory)}
                           />
                           
                           {/* AI Images for current photo */}
                           {(() => {
                             const aiImages = getAiImagesForCurrentPhoto();
                             if (aiImages.length === 0) return null;
                             
                             return (
                               <div className="mt-4 space-y-2">
                                 <h4 className="text-sm font-medium text-muted-foreground">KI-Bilder:</h4>
                                 <div className="flex flex-wrap gap-2">
                                   {aiImages.map((aiImage) => (
                                     <div 
                                       key={aiImage.id}
                                       className="relative group cursor-pointer"
                                       onClick={() => handleOpenCropModal(aiImage)}
                                     >
                                       <div className="w-16 h-20 rounded-md overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors">
                                         <img
                                           src={aiImage.image_url}
                                           alt="KI Transformation"
                                           className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                         />
                                       </div>
                                       <div className="absolute -top-1 -right-1">
                                         <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                                           KI
                                         </Badge>
                                       </div>
                                       <div className="absolute -bottom-1 left-0 right-0">
                                         <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-background/80 backdrop-blur-sm">
                                           {aiImage.target_weight_kg}kg
                                         </Badge>
                                       </div>
                                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                         <span className="text-white text-xs font-medium">Bearbeiten</span>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             );
                           })()}
                         </>
                       ) : (
                          <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Kein Foto für {selectedCategory}</p>
                              <p className="text-xs mt-1">Lade dein erstes Foto hoch</p>
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
                         <p className="text-xs mt-1">Erstelle dein Zielbild im KI Tab</p>
                       </div>
                     </div>
                  )}
                </CardContent>
              </Card>
              </div>
              </>
            )}

            {/* Interactive Before/After Slider */}
            {(() => {
              const availableAiImages = getAiImagesForCurrentPhoto();
              const selectedAiImage = selectedAiImageId 
                ? availableAiImages.find(img => img.id === selectedAiImageId)
                : availableAiImages[0];

              if (!currentPhoto || !selectedAiImage) return null;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="gradient-card">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-2">
                          <h3 className="text-lg font-semibold">Vorher/Nachher Vergleich</h3>
                          <p className="text-sm text-muted-foreground">Ziehe den Slider um zwischen Original und Zielbild zu wechseln</p>
                          
                          {availableAiImages.length > 1 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">KI-Bild:</span>
                              <select 
                                value={selectedAiImageId || availableAiImages[0]?.id || ''}
                                onChange={(e) => setSelectedAiImageId(e.target.value)}
                                className="px-3 py-1 text-sm border rounded-md bg-background"
                              >
                                {availableAiImages.map((img, index) => (
                                  <option key={img.id} value={img.id}>
                                    {img.image_category} - Variante {index + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        
                        <div className="w-full max-w-2xl mx-auto">
                          <BeforeAfterSlider
                            beforeImage={getProgressPhotoUrl(currentPhoto, selectedAiImage.image_category)}
                            afterImage={selectedAiImage.image_url}
                            beforeLabel={`Original (${selectedAiImage.image_category === 'front' ? 'Vorne' : selectedAiImage.image_category === 'back' ? 'Hinten' : 'Seite'})`}
                            afterLabel="KI Zielbild"
                            className="aspect-[3/4] rounded-lg overflow-hidden"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })()}

            {/* Progress to Goal */}
            {currentPhoto && targetImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
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

      {/* Date Photo Selector Dialog */}
      {showDateSelector && (
        <Dialog open={showDateSelector} onOpenChange={setShowDateSelector}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Foto vom {datePhotos[0]?.date ? new Date(datePhotos[0].date).toLocaleDateString('de-DE') : ''} auswählen
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
              {datePhotos.map((photo, index) => (
                <div 
                  key={index}
                  className="cursor-pointer group"
                  onClick={() => handlePhotoSelection(photo)}
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-lg border-2 border-transparent group-hover:border-primary transition-colors">
                    <img
                      src={getProgressPhotoUrl(photo)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium">{photo.weight}kg</p>
                    {photo.body_fat_percentage && (
                      <p className="text-xs text-muted-foreground">{photo.body_fat_percentage}% KFA</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {selectedCategory === 'front' && 'Frontansicht'}
                      {selectedCategory === 'back' && 'Rückansicht'}
                      {(selectedCategory === 'side_left' || selectedCategory === 'side_right') && 'Seitenansicht'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Crop Modal */}
      {cropModalOpen && selectedTargetImageForCrop && currentPhoto && (
        <ManualCropModal
          isOpen={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          originalImage={getProgressPhotoUrl(currentPhoto)}
          aiImage={selectedTargetImageForCrop.image_url}
          targetWeight={selectedTargetImageForCrop.target_weight_kg}
          onSave={handleSaveCroppedImage}
        />
      )}
    </div>
  );
};