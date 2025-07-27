import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Save, Edit2, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FormcheckSummaryData {
  exercise_name: string;
  media_urls: string[];
  coach_analysis: string;
  key_points: string[];
  form_rating: number;
  improvement_tips: string[];
}

interface FormcheckSummaryCardProps {
  data: FormcheckSummaryData;
  onSave?: (savedData: any) => void;
  onCancel?: () => void;
}

export const FormcheckSummaryCard: React.FC<FormcheckSummaryCardProps> = ({
  data,
  onSave,
  onCancel
}) => {
  const { user } = useAuth();
  const [formcheckData, setFormcheckData] = useState(data);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateExerciseName = (name: string) => {
    setFormcheckData(prev => ({ ...prev, exercise_name: name }));
  };

  const updateKeyPoint = (index: number, value: string) => {
    setFormcheckData(prev => ({
      ...prev,
      key_points: prev.key_points.map((point, i) => i === index ? value : point)
    }));
  };

  const addKeyPoint = () => {
    setFormcheckData(prev => ({
      ...prev,
      key_points: [...prev.key_points, '']
    }));
  };

  const removeKeyPoint = (index: number) => {
    setFormcheckData(prev => ({
      ...prev,
      key_points: prev.key_points.filter((_, i) => i !== index)
    }));
  };

  const updateImprovementTip = (index: number, value: string) => {
    setFormcheckData(prev => ({
      ...prev,
      improvement_tips: prev.improvement_tips.map((tip, i) => i === index ? value : tip)
    }));
  };

  const addImprovementTip = () => {
    setFormcheckData(prev => ({
      ...prev,
      improvement_tips: [...prev.improvement_tips, '']
    }));
  };

  const removeImprovementTip = (index: number) => {
    setFormcheckData(prev => ({
      ...prev,
      improvement_tips: prev.improvement_tips.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Du musst angemeldet sein, um Formchecks zu speichern');
      return;
    }

    setIsSaving(true);
    try {
      const { data: savedFormcheck, error } = await supabase
        .from('saved_formchecks')
        .insert({
          user_id: user.id,
          exercise_name: formcheckData.exercise_name,
          media_urls: formcheckData.media_urls,
          coach_analysis: formcheckData.coach_analysis,
          key_points: formcheckData.key_points.filter(point => point.trim() !== ''),
          form_rating: formcheckData.form_rating,
          improvement_tips: formcheckData.improvement_tips.filter(tip => tip.trim() !== '')
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Formcheck erfolgreich gespeichert!');
      onSave?.(savedFormcheck);
    } catch (error) {
      console.error('Fehler beim Speichern des Formchecks:', error);
      toast.error('Fehler beim Speichern des Formchecks');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 10 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? 'text-yellow-500 fill-yellow-500' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Formcheck Zusammenfassung
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-primary hover:text-primary/80"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Exercise Name */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Übung
          </label>
          {isEditing ? (
            <Input
              value={formcheckData.exercise_name}
              onChange={(e) => updateExerciseName(e.target.value)}
              placeholder="Übungsname"
              className="w-full"
            />
          ) : (
            <p className="text-foreground font-medium">{formcheckData.exercise_name}</p>
          )}
        </div>

        {/* Form Rating */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Form-Bewertung
          </label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {renderStars(formcheckData.form_rating)}
            </div>
            <span className="text-sm text-muted-foreground">
              {formcheckData.form_rating}/10
            </span>
          </div>
        </div>

        {/* Key Points */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Wichtigste Punkte
          </label>
          <div className="space-y-2">
            {formcheckData.key_points.map((point, index) => (
              <div key={index} className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Input
                      value={point}
                      onChange={(e) => updateKeyPoint(index, e.target.value)}
                      placeholder="Wichtiger Punkt"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKeyPoint(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      ×
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {point}
                  </Badge>
                )}
              </div>
            ))}
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={addKeyPoint}
                className="text-xs"
              >
                + Punkt hinzufügen
              </Button>
            )}
          </div>
        </div>

        {/* Improvement Tips */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Verbesserungstipps
          </label>
          <div className="space-y-2">
            {formcheckData.improvement_tips.map((tip, index) => (
              <div key={index} className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Input
                      value={tip}
                      onChange={(e) => updateImprovementTip(index, e.target.value)}
                      placeholder="Verbesserungstipp"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImprovementTip(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      ×
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-foreground">• {tip}</p>
                )}
              </div>
            ))}
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={addImprovementTip}
                className="text-xs"
              >
                + Tipp hinzufügen
              </Button>
            )}
          </div>
        </div>

        {/* Media Thumbnails */}
        {formcheckData.media_urls.length > 0 && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Analysierte Medien
            </label>
            <div className="flex gap-2 flex-wrap">
              {formcheckData.media_urls.slice(0, 3).map((url, index) => (
                <div
                  key={index}
                  className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border"
                >
                  {url.includes('video') ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Formcheck ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
              {formcheckData.media_urls.length > 3 && (
                <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{formcheckData.media_urls.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichere...' : 'Speichern'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Abbrechen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};