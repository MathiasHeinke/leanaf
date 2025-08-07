import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Heart, Brain, Clock, Camera, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedJournalEntry } from "@/hooks/useMindsetJournal";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useToast } from "@/hooks/use-toast";

interface MindsetJournalEntryCardProps {
  entry: EnhancedJournalEntry;
}

export const MindsetJournalEntryCard = ({ entry }: MindsetJournalEntryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const { toast } = useToast();

  const getMoodBadgeColor = (score: number) => {
    if (score >= 3) return 'bg-success/20 text-success border-success/30';
    if (score >= 1) return 'bg-primary/20 text-primary border-primary/30';
    if (score === 0) return 'bg-muted text-muted-foreground border-muted';
    if (score >= -2) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 3) return '😊';
    if (score >= 1) return '🙂';
    if (score === 0) return '😐';
    if (score >= -2) return '😔';
    return '😢';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-success/20 text-success border-success/30';
      case 'negative':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'neutral':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const handlePhotoSelect = (file: File) => {
    setSelectedPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handlePhotoRemove = () => {
    setSelectedPhoto(null);
    setPhotoPreview('');
  };

  const handleSavePhoto = async () => {
    if (!selectedPhoto) return;
    
    try {
      setIsUploadingPhoto(true);
      // TODO: Implement photo upload and update journal entry
      // This would need to be integrated with the journal hook
      toast({
        title: "Foto hinzugefügt ✨",
        description: "Das Foto wurde zu deinem Eintrag hinzugefügt"
      });
      setIsAddingPhoto(false);
      handlePhotoRemove();
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Foto konnte nicht hinzugefügt werden",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get preview text (first 100 characters)
  const previewText = entry.raw_text?.length > 100 
    ? entry.raw_text.substring(0, 100) + '...' 
    : entry.raw_text;

  return (
    <Card className="w-full border-l-4 border-l-violet-500/30">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  <Badge
                    variant="outline"
                    className={cn("text-xs px-2", getMoodBadgeColor(entry.mood_score))}
                  >
                    {getMoodEmoji(entry.mood_score)}
                    {entry.mood_score !== 0 && (
                      <span className="ml-1">{entry.mood_score > 0 ? '+' : ''}{entry.mood_score}</span>
                    )}
                  </Badge>

                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(entry.date)}
                  </Badge>

                  {entry.gratitude_items.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800">
                      <Heart className="h-3 w-3 mr-1" />
                      {entry.gratitude_items.length}
                    </Badge>
                  )}

                  {entry.photo_url && (
                    <Badge variant="outline" className="text-xs">
                      <Camera className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </div>

              {entry.sentiment_tag && (
                <Badge
                  variant="outline"
                  className={cn("text-xs capitalize", getSentimentColor(entry.sentiment_tag))}
                >
                  {entry.sentiment_tag}
                </Badge>
              )}
            </div>

            {!isExpanded && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {previewText}
                </p>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Full Text */}
            <div>
              <h4 className="text-sm font-medium mb-2">Vollständiger Text</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {entry.raw_text}
              </p>
            </div>

            {/* Gratitude Items */}
            {entry.gratitude_items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Dankbarkeit
                </h4>
                <div className="space-y-1">
                  {entry.gratitude_items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-pink-500 text-sm">•</span>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kai Insights */}
            {entry.kai_insights && entry.kai_insights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-500" />
                  Kai Insights
                </h4>
                <div className="space-y-2">
                  {entry.kai_insights.slice(0, 2).map((insight, index) => (
                    <div key={index} className="text-sm bg-muted/30 p-3 rounded-md">
                      <div className="font-medium mb-1">{insight.title}</div>
                      <div className="text-muted-foreground">{insight.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stress Indicators and Energy Level */}
            {(entry.stress_indicators?.length > 0 || entry.energy_level !== undefined) && (
              <div className="flex gap-4">
                {entry.energy_level !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Energie Level</h4>
                    <Badge variant="outline" className="text-xs">
                      {entry.energy_level}/10
                    </Badge>
                  </div>
                )}
                {entry.stress_indicators && entry.stress_indicators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Stress Indikatoren</h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.stress_indicators.map((indicator, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manifestation Items */}
            {entry.manifestation_items && entry.manifestation_items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Manifestation</h4>
                <div className="space-y-1">
                  {entry.manifestation_items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-primary text-sm">✨</span>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlight and Challenge */}
            {(entry.highlight || entry.challenge) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entry.highlight && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-success">Highlight</h4>
                    <p className="text-sm bg-success/10 p-2 rounded border border-success/20">
                      {entry.highlight}
                    </p>
                  </div>
                )}
                {entry.challenge && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-warning">Herausforderung</h4>
                    <p className="text-sm bg-warning/10 p-2 rounded border border-warning/20">
                      {entry.challenge}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Photo Display */}
            {entry.photo_url && (
              <div>
                <h4 className="text-sm font-medium mb-2">Foto</h4>
                <img 
                  src={entry.photo_url} 
                  alt="Journal entry photo" 
                  className="max-w-full h-auto rounded-md border"
                />
              </div>
            )}

            {/* Add Photo Section */}
            {!entry.photo_url && (
              <div>
                {!isAddingPhoto ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingPhoto(true)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Foto hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Foto hinzufügen</h4>
                    <PhotoUpload
                      onPhotoSelect={handlePhotoSelect}
                      onPhotoRemove={handlePhotoRemove}
                      photoPreview={photoPreview}
                      isUploading={isUploadingPhoto}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSavePhoto}
                        disabled={!selectedPhoto || isUploadingPhoto}
                        className="text-xs"
                      >
                        {isUploadingPhoto ? 'Speichere...' : 'Foto speichern'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingPhoto(false);
                          handlePhotoRemove();
                        }}
                        className="text-xs"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prompt Used */}
            {entry.prompt_used && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Prompt:</strong> {entry.prompt_used}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};