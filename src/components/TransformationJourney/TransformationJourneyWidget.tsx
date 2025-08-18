import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTargetImages } from '@/hooks/useTargetImages';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { EnhancedComparisonView } from './EnhancedComparisonView';
import { GridPhotoView } from './GridPhotoView';
import { EnhancedTargetImageSelector } from '../TargetImageSelector/EnhancedTargetImageSelector';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { AiTargetImageGeneration } from './AiTargetImageGeneration';
import { KiComparisonView } from './KiComparisonView';
import { ProgressComparisonView } from './ProgressComparisonView';
import { 
  ImageIcon, 
  SparklesIcon, 
  TrendingUpIcon, 
  UploadIcon 
} from 'lucide-react';
import { toast } from 'sonner';

export const TransformationJourneyWidget: React.FC = () => {
  const { targetImages, deleteTargetImage, generateTargetImage, updateTargetImageUrl, refreshTargetImages, getLinkedPhotoPairs } = useTargetImages();
  const { 
    photos: rawProgressPhotos, 
    loading, 
    refreshPhotos, 
    startCropWorkflow,
    ProgressPhotoCropModal 
  } = useProgressPhotos();
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('front');
  
  // Transform progress photos to expected format for EnhancedComparisonView
  const progressPhotos = rawProgressPhotos.map(photo => ({
    date: photo.date,
    weight: photo.weight,
    body_fat_percentage: photo.body_fat_percentage,
    photo_front_url: photo.photo_urls?.front,
    photo_side_url: photo.photo_urls?.side,
    photo_back_url: photo.photo_urls?.back,
    id: photo.id,
    notes: photo.notes
  }));

  // Debug logging
  console.log('Raw Progress Photos:', rawProgressPhotos.length);
  console.log('Transformed Progress Photos:', progressPhotos.length);
  if (rawProgressPhotos.length > 0) {
    console.log('First raw photo:', rawProgressPhotos[0]);
    console.log('First transformed photo:', progressPhotos[0]);
  }
  const [generatingTarget, setGeneratingTarget] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [selectedProgressPhotoIndex, setSelectedProgressPhotoIndex] = useState(0);
  const [showSlider, setShowSlider] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<{
    originalPhoto: string;
    generatedImage: string;
  } | null>(null);

  // Helper function to get photo URL from raw progress photo (for AI generation)
  const getProgressPhotoUrl = (entry: any, category: 'front' | 'side' | 'back') => {
    if (!entry?.photo_urls) return null;
    return entry.photo_urls[category] || null;
  };

  const handleGenerateTarget = async () => {
    setGeneratingTarget(true);
    setGenerationProgress(0);
    setGenerationStage('Starte Generierung...');
    
    // Use selectedPhoto if available (from transformation button), otherwise use index
    const photoToUse = selectedPhoto || rawProgressPhotos[selectedProgressPhotoIndex];
    const categoryToUse = selectedPhoto?.selectedCategory || selectedCategory;
    const originalPhotoUrl = getProgressPhotoUrl(photoToUse, categoryToUse as 'front' | 'side' | 'back');
    
    console.log('🎯 Generate Target Image:', {
      photoToUse: photoToUse?.id,
      categoryToUse,
      originalPhotoUrl,
      selectedPhoto: selectedPhoto?.id,
      selectedCategory
    });
    
    try {
      const result = await generateTargetImage(
        undefined, // targetWeight
        undefined, // targetBodyFat
        (stage, progress) => {
          setGenerationStage(stage);
          setGenerationProgress(progress || 0);
        },
        originalPhotoUrl, // Use selected progress photo
        categoryToUse, // Pass the correct category
        photoToUse?.id // Pass the photo ID for linking
      );
      
      if (result) {
        // Store category and photo ID for saving later
        result.selectedCategory = categoryToUse;
        result.selectedPhotoId = photoToUse?.id;
        setGeneratedImages(result);
        
        // Set up for slider view if we have both images
        if (originalPhotoUrl) {
          setLastGeneratedImage({
            originalPhoto: originalPhotoUrl,
            generatedImage: result.images?.[0]?.imageURL || ""
          });
          setShowSlider(true);
        }
      }
    } catch (error) {
      console.error('Error generating target image:', error);
      toast.error('Fehler beim Generieren des Zielbilds');
    } finally {
      setGeneratingTarget(false);
      setGenerationProgress(0);
      setGenerationStage('');
    }
  };

  const handleImageSelected = async () => {
    setGeneratedImages(null);
    setActiveTab('timeline');
    // Force refresh both data sources and wait for completion
    await Promise.all([
      refreshTargetImages(),
      refreshPhotos()
    ]);
    // Trigger data refresh event for other components
    import('@/hooks/useDataRefresh').then(({ triggerDataRefresh }) => {
      triggerDataRefresh();
    });
  };

  const handleDeleteTarget = async (id: string) => {
    try {
      await deleteTargetImage(id);
      toast.success('Zielbild entfernt');
    } catch (error) {
      console.error('Error deleting target image:', error);
      toast.error('Fehler beim Entfernen des Zielbilds');
    }
  };

  const handleViewTransformation = (photo: any) => {
    // Find the photo index in raw progress photos
    const photoIndex = rawProgressPhotos.findIndex(p => p.id === photo.id);
    if (photoIndex !== -1) {
      setSelectedProgressPhotoIndex(photoIndex);
    }
    setActiveTab("timeline");
    // The Split View will automatically show the transformation
  };

  const handleCreateTransformation = (photo: any, category?: string) => {
    // Find the photo index in raw progress photos
    const photoIndex = rawProgressPhotos.findIndex(p => p.id === photo.id);
    if (photoIndex !== -1) {
      setSelectedProgressPhotoIndex(photoIndex);
    }
    setSelectedPhoto(photo);
    if (category) {
      setSelectedCategory(category);
    }
    setActiveTab("generate");
  };

  if (loading) {
    return (
      <Card className="w-full border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded-full w-3/4"></div>
              <div className="h-4 bg-muted rounded-full w-1/2"></div>
            </div>
            <div className="h-80 bg-muted rounded-2xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <ProgressPhotoCropModal />
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="ki-vergleich">KI-Vergleich</TabsTrigger>
          <TabsTrigger value="progress-vergleich">Progress-Vergleich</TabsTrigger>
          <TabsTrigger value="generate">KI Zielbild</TabsTrigger>
          <TabsTrigger value="photos">Alle Fotos</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          {targetImages.length > 0 || progressPhotos.length > 0 ? (
            <EnhancedComparisonView
              targetImages={targetImages}
              progressPhotos={progressPhotos}
              onDeleteTarget={handleDeleteTarget}
              onViewTransformation={handleViewTransformation}
              onCreateTransformation={handleCreateTransformation}
              onUpdateTargetImage={updateTargetImageUrl}
            />
          ) : (
            <Card className="gradient-card">
              <CardContent className="p-8 text-center">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Starte deine Transformation</h3>
                <p className="text-muted-foreground mb-6">
                  Lade dein erstes Fortschrittsfoto hoch oder erstelle ein KI-Zielbild
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" size="sm">
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Foto hochladen
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('generate')}>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    KI Zielbild erstellen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ki-vergleich" className="space-y-6">
          <KiComparisonView
            targetImages={targetImages}
            progressPhotos={progressPhotos}
          />
        </TabsContent>

        <TabsContent value="progress-vergleich" className="space-y-6">
          <ProgressComparisonView
            progressPhotos={progressPhotos}
          />
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <GridPhotoView 
            photos={rawProgressPhotos} 
            targetImages={targetImages}
            onPhotosUpdated={refreshPhotos}
            startCropWorkflow={startCropWorkflow}
            onViewTransformation={handleViewTransformation}
            onCreateTransformation={handleCreateTransformation}
          />
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          {/* Progress photo selection and AI generation UI */}
          {rawProgressPhotos.length > 0 ? (
            <div className="space-y-6">
              {/* Photo Selection Card */}
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Fortschrittsfoto auswählen
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Wähle ein Foto und eine Kategorie für die KI-Generation
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category Selector */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Kategorie auswählen:</label>
                    <Select 
                      value={selectedCategory} 
                      onValueChange={setSelectedCategory}
                    >
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

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Fortschrittsfoto für KI-Generation auswählen:</label>
                    <Select 
                      value={selectedProgressPhotoIndex.toString()} 
                      onValueChange={(value) => setSelectedProgressPhotoIndex(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rawProgressPhotos
                          .filter(photo => getProgressPhotoUrl(photo, selectedCategory as 'front' | 'side' | 'back'))
                          .map((photo, filterIndex) => {
                            const originalIndex = rawProgressPhotos.findIndex(p => p.id === photo.id);
                            return (
                          <SelectItem key={filterIndex} value={originalIndex.toString()}>
                            <div className="flex items-center gap-3">
                              <img
                                src={getProgressPhotoUrl(photo, selectedCategory as 'front' | 'side' | 'back')}
                                alt={`Foto vom ${photo.date}`}
                                className="w-8 h-8 object-cover rounded"
                              />
                              <div className="text-left">
                                <div className="font-medium">{photo.date}</div>
                                <div className="text-xs text-muted-foreground">
                                  {photo.weight}kg {photo.body_fat_percentage && `• ${photo.body_fat_percentage}% KFA`}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* AI Generation Component */}
              <AiTargetImageGeneration 
                selectedProgressPhoto={{
                  url: selectedPhoto ? getProgressPhotoUrl(selectedPhoto, selectedCategory as 'front' | 'side' | 'back') : getProgressPhotoUrl(rawProgressPhotos[selectedProgressPhotoIndex], selectedCategory as 'front' | 'side' | 'back'),
                  id: (selectedPhoto || rawProgressPhotos[selectedProgressPhotoIndex])?.id,
                  weight: (selectedPhoto || rawProgressPhotos[selectedProgressPhotoIndex])?.weight,
                  bodyFat: (selectedPhoto || rawProgressPhotos[selectedProgressPhotoIndex])?.body_fat_percentage,
                  date: new Date((selectedPhoto || rawProgressPhotos[selectedProgressPhotoIndex])?.date)
                }}
                onGenerationComplete={(result) => {
                  if (result) {
                    // Store category and photo ID for saving later
                    result.selectedCategory = selectedCategory;
                    result.selectedPhotoId = (selectedPhoto || rawProgressPhotos[selectedProgressPhotoIndex])?.id;
                    setGeneratedImages(result);
                    
                    // Set up for slider view if we have both images
                    const originalPhotoUrl = selectedPhoto ? getProgressPhotoUrl(selectedPhoto, selectedCategory as 'front' | 'side' | 'back') : getProgressPhotoUrl(rawProgressPhotos[selectedProgressPhotoIndex], selectedCategory as 'front' | 'side' | 'back');
                    if (originalPhotoUrl) {
                      setLastGeneratedImage({
                        originalPhoto: originalPhotoUrl,
                        generatedImage: result.images?.[0]?.imageURL || ""
                      });
                      setShowSlider(true);
                    }
                  }
                }}
              />

              {/* Show generated images directly here for selection */}
              {generatedImages && (
                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5" />
                      Generierte Bilder zur Auswahl
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EnhancedTargetImageSelector
                      generatedImages={generatedImages}
                      onImageSelected={handleImageSelected}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="gradient-card">
              <CardContent className="p-8 text-center">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Kein Fortschrittsfoto verfügbar</h3>
                <p className="text-muted-foreground mb-6">
                  Lade zuerst ein Fortschrittsfoto hoch, um personalisierte KI-Zielbilder zu erstellen
                </p>
                <Button onClick={() => setActiveTab('photos')} variant="outline">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Zu Foto-Upload gehen
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
};