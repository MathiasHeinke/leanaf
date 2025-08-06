import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTargetImages } from '@/hooks/useTargetImages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedComparisonView } from './EnhancedComparisonView';
import { EnhancedTargetImageSelector } from '../TargetImageSelector/EnhancedTargetImageSelector';
import { 
  ImageIcon, 
  SparklesIcon, 
  TrendingUpIcon, 
  PlusIcon,
  UploadIcon 
} from 'lucide-react';
import { toast } from 'sonner';

interface ProgressPhoto {
  date: string;
  photo_front_url?: string;
  photo_back_url?: string;
  photo_side_url?: string;
  weight: number;
  body_fat_percentage?: number;
}

export const TransformationJourneyWidget: React.FC = () => {
  const { user } = useAuth();
  const { targetImages, deleteTargetImage, generateTargetImage, refreshTargetImages } = useTargetImages();
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTarget, setGeneratingTarget] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('journey');

  // Load progress photos from weight_history
  const loadProgressPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .not('photo_urls', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;
      
      const photos: ProgressPhoto[] = (data || []).map(entry => {
        const photoUrls = entry.photo_urls as any;
        return {
          date: entry.date,
          photo_front_url: photoUrls?.front || null,
          photo_back_url: photoUrls?.back || null,
          photo_side_url: photoUrls?.side || null,
          weight: entry.weight,
          body_fat_percentage: entry.body_fat_percentage
        };
      });

      setProgressPhotos(photos);
    } catch (error) {
      console.error('Error loading progress photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProgressPhotos();
    }
  }, [user]);

  const handleGenerateTarget = async () => {
    setGeneratingTarget(true);
    try {
      const result = await generateTargetImage(
        undefined, // targetWeight
        undefined, // targetBodyFat
        (stage, progress) => {
          console.log(`Generation stage: ${stage}, progress: ${progress}%`);
        },
        progressPhotos[0]?.photo_front_url // Use latest progress photo
      );
      
      if (result) {
        setGeneratedImages(result);
        setActiveTab('selector');
      }
    } catch (error) {
      console.error('Error generating target image:', error);
      toast.error('Fehler beim Generieren des Zielbilds');
    } finally {
      setGeneratingTarget(false);
    }
  };

  const handleImageSelected = () => {
    setGeneratedImages(null);
    setActiveTab('journey');
    refreshTargetImages();
    loadProgressPhotos();
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
      {/* Header - Apple-style */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-3">
                <TrendingUpIcon className="h-7 w-7 text-primary" />
                Transformation Journey
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Verfolge deinen Fortschritt mit Apple-like Swipe Navigation
              </p>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="font-medium">{progressPhotos.length} Fortschrittsfotos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-secondary rounded-full"></div>
                <span className="font-medium">{targetImages.length} Zielbilder</span>
              </div>
            </div>
          </div>
          {progressPhotos.length > 0 && (
            <div className="mt-4 text-right">
              <p className="text-sm font-medium text-primary">
                🎯 Deine Transformation läuft großartig!
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="journey">
            <TrendingUpIcon className="h-4 w-4 mr-2" />
            Fortschritt
          </TabsTrigger>
          <TabsTrigger value="generate">
            <SparklesIcon className="h-4 w-4 mr-2" />
            KI Zielbild
          </TabsTrigger>
          <TabsTrigger value="selector" disabled={!generatedImages}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Auswahl
          </TabsTrigger>
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
              {progressPhotos.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <img
                      src={progressPhotos[0]?.photo_front_url}
                      alt="Aktuelles Foto"
                      className="w-12 h-12 object-cover rounded-md"
                    />
                    <div>
                      <p className="text-sm font-medium">Aktuelles Fortschrittsfoto verfügbar</p>
                      <p className="text-xs text-muted-foreground">
                        Wird als Basis für die KI-Generation verwendet
                      </p>
                    </div>
                  </div>
                  
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
                <div className="text-center p-6 border-2 border-dashed border-border rounded-lg">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Lade zuerst ein Fortschrittsfoto hoch, um ein personalisiertes Zielbild zu erstellen
                  </p>
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
          {generatedImages && (
            <EnhancedTargetImageSelector
              generatedImages={generatedImages}
              onImageSelected={handleImageSelected}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};