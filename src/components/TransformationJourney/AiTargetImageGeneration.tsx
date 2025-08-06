import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Zap, 
  Scale, 
  Activity, 
  Clock, 
  TrendingUp,
  Brain,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTargetImages } from '@/hooks/useTargetImages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState as useReactState } from 'react';
// Format date utility function
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
import { toast } from 'sonner';

interface AiTargetImageGenerationProps {
  selectedProgressPhoto?: {
    url: string;
    id: string;
    weight?: number;
    bodyFat?: number;
    date: Date;
  };
  onGenerationComplete?: (result: any) => void;
}

export const AiTargetImageGeneration = ({ 
  selectedProgressPhoto,
  onGenerationComplete 
}: AiTargetImageGenerationProps) => {
  const { user } = useAuth();
  const { generateTargetImage, loading } = useTargetImages();
  
  const [musclePriority, setMusclePriority] = useState([3]);
  const [realismFactor, setRealismFactor] = useState([0.7]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [profileData, setProfileData] = useReactState<any>(null);

  // Fetch profile data from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      setProfileData(data);
    };
    
    fetchProfile();
  }, [user]);

  const currentWeight = profileData?.weight || selectedProgressPhoto?.weight || 70;
  const targetWeight = profileData?.target_weight || currentWeight;
  const currentBodyFat = selectedProgressPhoto?.bodyFat || 20;
  const targetBodyFat = profileData?.target_body_fat_percentage || 15;
  
  // Calculate realistic timeframe
  const targetDate = profileData?.target_date ? new Date(profileData.target_date) : null;
  const monthsToTarget = targetDate ? 
    Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)) : 6;
  
  // Calculate realism score
  const weightChange = Math.abs(targetWeight - currentWeight);
  const bodyFatChange = Math.abs(targetBodyFat - currentBodyFat);
  const realismScore = Math.min(100, Math.max(20, 
    100 - (weightChange * 2) - (bodyFatChange * 3) + (monthsToTarget * 5)
  ));

  const getMuscleDescription = (priority: number) => {
    const descriptions = [
      'Minimal - Nur leichte Definition',
      'Gering - Athletisch definiert', 
      'Moderat - Gut trainiert',
      'Hoch - Sehr muskulös',
      'Maximal - Bodybuilder-Level'
    ];
    return descriptions[priority - 1] || descriptions[2];
  };

  const getRealismDescription = (factor: number) => {
    if (factor > 0.7) return 'Maximal realistisch - sehr konservativ';
    if (factor > 0.4) return 'Realistisch - ausgewogen und erreichbar';
    return 'Unrealistisch - experimentell';
  };

  const generatePrompt = () => {
    const basePrompt = `Transform this ${profileData?.gender || 'person'} realistically over ${monthsToTarget} months period:`;
    const weightInfo = `Target weight: ${currentWeight}kg → ${targetWeight}kg`;
    const bodyFatInfo = `Body fat: ${currentBodyFat}% → ${targetBodyFat}%`;
    const muscleInfo = `Muscle priority: ${getMuscleDescription(musclePriority[0])}`;
    const realismInfo = `Realistic transformation timeline: ${getRealismDescription(realismFactor[0])}`;
    const ageInfo = profileData?.age ? `Age-appropriate fitness level for ${profileData.age} year old` : '';
    const constraints = 'Natural lighting, achievable physique, not overly muscular';
    
    return [basePrompt, weightInfo, bodyFatInfo, muscleInfo, realismInfo, ageInfo, constraints]
      .filter(Boolean)
      .join('. ');
  };

  const handleGenerate = async () => {
    if (!selectedProgressPhoto) {
      toast.error('Wähle zuerst ein Fortschrittsfoto aus');
      return;
    }

    setIsGenerating(true);
    
    try {
      const enhancedPrompt = generatePrompt();
      console.log('Enhanced AI Prompt:', enhancedPrompt);
      
      const result = await generateTargetImage(
        targetWeight,
        targetBodyFat,
        (stage, progress) => {
          setGenerationStage(stage);
          setGenerationProgress(progress || 0);
        },
        selectedProgressPhoto.url,
        'enhanced_generation',
        selectedProgressPhoto.id,
        musclePriority[0],
        realismFactor[0]
      );
      
      if (result) {
        toast.success('4 realistische Zielbilder erstellt!');
        onGenerationComplete?.(result);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Fehler beim Erstellen der Zielbilder');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStage('');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          KI Ziel-Bild Generieren
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Goals Overview */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Deine Ziele aus dem Profil
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Gewicht</span>
              </div>
              <div className="text-sm font-medium">
                {currentWeight}kg → {targetWeight}kg
              </div>
              <div className="text-xs text-muted-foreground">
                {targetWeight > currentWeight ? '+' : ''}{(targetWeight - currentWeight).toFixed(1)}kg
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Körperfett</span>
              </div>
              <div className="text-sm font-medium">
                {currentBodyFat}% → {targetBodyFat}%
              </div>
              <div className="text-xs text-muted-foreground">
                {targetBodyFat < currentBodyFat ? '-' : '+'}{Math.abs(targetBodyFat - currentBodyFat).toFixed(1)}%
              </div>
            </div>
          </div>
          
          {targetDate && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Zeitrahmen</span>
              </div>
              <div className="text-sm font-medium">
                {monthsToTarget} Monate bis {formatDate(targetDate)}
              </div>
              <div className="text-xs text-muted-foreground">
                ca. {(weightChange / monthsToTarget).toFixed(1)}kg/Monat
              </div>
              
              {/* Realism Assessment under timeframe */}
              <div className="mt-2 pt-2 border-t border-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Realismus-Bewertung</span>
                  <Badge variant={realismScore > 70 ? 'default' : realismScore > 40 ? 'secondary' : 'destructive'} className="text-xs">
                    {realismScore.toFixed(0)}%
                  </Badge>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      realismScore > 70 ? 'bg-green-500' : 
                      realismScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(realismScore, 5)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {realismScore > 70 && "Ambitionierte aber machbare Ziele - erfordert Disziplin"}
                  {realismScore > 40 && realismScore <= 70 && "Sehr ambitionierte Ziele"}
                  {realismScore <= 40 && "Extrem ambitioniert - längerer Zeitrahmen empfohlen"}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Advanced Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Erweiterte Einstellungen
          </h3>
          
          {/* Muscle Priority */}
          <div className="space-y-2">
            <Label className="text-xs">
              Muskelaufbau-Priorität: {musclePriority[0]}/5
            </Label>
            <Slider
              value={musclePriority}
              onValueChange={setMusclePriority}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {getMuscleDescription(musclePriority[0])}
            </p>
          </div>

          {/* Realism Factor */}
          <div className="space-y-2">
            <Label className="text-xs">
              Realismus-Faktor: {Math.round(realismFactor[0] * 100)}%
            </Label>
            <Slider
              value={realismFactor}
              onValueChange={setRealismFactor}
              min={0.2}
              max={1.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {getRealismDescription(realismFactor[0])}
            </p>
          </div>
        </div>


        <Separator />

        {/* Selected Photo Info */}
        {selectedProgressPhoto && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Ausgewähltes Foto</span>
            </div>
            <div className="flex items-center gap-3">
              <img 
                src={selectedProgressPhoto.url} 
                alt="Selected"
                className="w-12 h-12 object-cover rounded"
              />
              <div className="text-xs text-muted-foreground">
                <div>Datum: {formatDate(selectedProgressPhoto.date)}</div>
                {selectedProgressPhoto.weight && (
                  <div>Gewicht: {selectedProgressPhoto.weight}kg</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{generationStage}</span>
            </div>
            <Progress value={generationProgress} className="w-full" />
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!selectedProgressPhoto || isGenerating || loading}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          size="lg"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Erstelle 4 realistische Bilder...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              KI-Zielbilder generieren
            </>
          )}
        </Button>

        {!selectedProgressPhoto && (
          <p className="text-xs text-center text-muted-foreground bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            👆 Wähle zuerst ein Fortschrittsfoto aus, um realistische Zielbilder zu erstellen
          </p>
        )}
      </CardContent>
    </Card>
  );
};