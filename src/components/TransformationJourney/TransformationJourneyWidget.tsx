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
import { 
  ImageIcon, 
  SparklesIcon, 
  TrendingUpIcon, 
  UploadIcon 
} from 'lucide-react';
import { toast } from 'sonner';

export const TransformationJourneyWidget: React.FC = () => {
  const { targetImages, deleteTargetImage, generateTargetImage, refreshTargetImages } = useTargetImages();
  const { photos: rawProgressPhotos, loading, refreshPhotos } = useProgressPhotos();
  
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
  const [activeTab, setActiveTab] = useState<string>('journey');
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
    const originalPhotoUrl = getProgressPhotoUrl(rawProgressPhotos[selectedProgressPhotoIndex], 'front');
    
    try {
      const result = await generateTargetImage(
        undefined, // targetWeight
        undefined, // targetBodyFat
        (stage, progress) => {
          setGenerationStage(stage);
          setGenerationProgress(progress || 0);
        },
        originalPhotoUrl // Use selected progress photo
      );
      
      if (result) {
        setGeneratedImages(result);
        
        // Set up for slider view if we have both images
        if (originalPhotoUrl && targetImages.length > 0) {
          setLastGeneratedImage({
            originalPhoto: originalPhotoUrl,
            generatedImage: targetImages[0]?.image_url || ""
          });
          setShowSlider(true);
        }
        
        setActiveTab('selector');
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

  const handleImageSelected = () => {
    setGeneratedImages(null);
    setActiveTab('journey');
    refreshTargetImages();
    refreshPhotos();
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
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="journey">Timeline</TabsTrigger>
          <TabsTrigger value="generate">KI Zielbild</TabsTrigger>
          <TabsTrigger value="photos">Alle Fotos</TabsTrigger>
          <TabsTrigger value="selector" disabled={!generatedImages}>Auswahl</TabsTrigger>
        </TabsList>

        <TabsContent value="journey" className="space-y-6">
          {targetImages.length > 0 || progressPhotos.length > 0 ? (
            <EnhancedComparisonView
              targetImages={targetImages}
              progressPhotos={progressPhotos}
              onDeleteTarget={handleDeleteTarget}
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

        <TabsContent value="photos" className="space-y-6">
          <GridPhotoView 
            photos={rawProgressPhotos} 
            onPhotosUpdated={refreshPhotos}
          />
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                KI Zielbild generieren
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Erstelle mit KI ein realistisches Bild deines Transformation-Ziels
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {rawProgressPhotos.length > 0 ? (
                <div className="space-y-4">
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
                        {rawProgressPhotos.map((photo, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            <div className="flex items-center gap-3">
                              <img
                                src={getProgressPhotoUrl(photo, 'front')}
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
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <img
                      src={getProgressPhotoUrl(rawProgressPhotos[selectedProgressPhotoIndex], 'front')}
                      alt="Ausgewähltes Foto"
                      className="w-12 h-12 object-cover rounded-md"
                    />
                    <div>
                      <p className="text-sm font-medium">Ausgewähltes Foto für KI-Generation</p>
                      <p className="text-xs text-muted-foreground">
                        {rawProgressPhotos[selectedProgressPhotoIndex]?.date} • {rawProgressPhotos[selectedProgressPhotoIndex]?.weight}kg
                        {rawProgressPhotos[selectedProgressPhotoIndex]?.body_fat_percentage && ` • ${rawProgressPhotos[selectedProgressPhotoIndex].body_fat_percentage}% KFA`}
                      </p>
                    </div>
                  </div>
                  
                  {generatingTarget && (
                    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{generationStage}</span>
                        <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleGenerateTarget}
                    disabled={generatingTarget}
                    className="w-full"
                  >
                    {generatingTarget ? (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
                        Generiere Zielbild...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Zielbild mit aktuellem Foto erstellen
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-border rounded-lg space-y-4">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Lade zuerst ein Fortschrittsfoto hoch, um ein personalisiertes Zielbild zu erstellen
                  </p>
                  
                  {generatingTarget && (
                    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{generationStage}</span>
                        <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleGenerateTarget}
                    disabled={generatingTarget}
                    variant="outline"
                  >
                    {generatingTarget ? (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Allgemeines Zielbild erstellen
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selector" className="space-y-6">
          {generatedImages ? (
            <div className="space-y-6">
              {showSlider && lastGeneratedImage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Vergleich: Original vs. Generiert</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSlider(false)}
                    >
                      Einzelbilder anzeigen
                    </Button>
                  </div>
                  <BeforeAfterSlider
                    beforeImage={lastGeneratedImage.originalPhoto}
                    afterImage={lastGeneratedImage.generatedImage}
                    beforeLabel="Original"
                    afterLabel="KI-Generiert"
                  />
                </div>
              )}
              
              {!showSlider && (
                <EnhancedTargetImageSelector
                  generatedImages={generatedImages}
                  onImageSelected={handleImageSelected}
                />
              )}
              
              {!showSlider && lastGeneratedImage && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowSlider(true)}
                >
                  Vergleich anzeigen
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-muted-foreground">Keine KI-Bilder generiert</p>
                <p className="text-sm text-muted-foreground mt-1">Generiere KI-Zielbilder im "KI Zielbild" Tab</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};