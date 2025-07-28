import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExerciseSet {
  reps: number;
  weight: number;
  rpe?: number;
}

interface ExercisePreviewData {
  exercise_name: string;
  sets: ExerciseSet[];
  overall_rpe?: number;
}

interface ExercisePreviewCardProps {
  data: ExercisePreviewData;
  onSave: (data: ExercisePreviewData) => Promise<void>;
  onEdit?: (editedData: ExercisePreviewData) => void;
  onCancel: () => void;
}

export const ExercisePreviewCard: React.FC<ExercisePreviewCardProps> = ({
  data,
  onSave,
  onEdit,
  onCancel
}) => {
  const [exerciseData, setExerciseData] = useState<ExercisePreviewData>({
    exercise_name: data?.exercise_name || '',
    sets: data?.sets || [],
    overall_rpe: data?.overall_rpe
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateSet = (index: number, field: keyof ExerciseSet, value: number) => {
    const newSets = [...exerciseData.sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setExerciseData({ ...exerciseData, sets: newSets });
    onEdit?.(exerciseData);
  };

  const addSet = () => {
    const lastSet = exerciseData.sets[exerciseData.sets.length - 1] || { reps: 10, weight: 0 };
    const newSet: ExerciseSet = {
      reps: lastSet.reps,
      weight: lastSet.weight,
      rpe: lastSet.rpe
    };
    setExerciseData({
      ...exerciseData,
      sets: [...exerciseData.sets, newSet]
    });
  };

  const removeSet = (index: number) => {
    if (exerciseData.sets.length > 1) {
      const newSets = exerciseData.sets.filter((_, i) => i !== index);
      setExerciseData({ ...exerciseData, sets: newSets });
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(exerciseData);
      toast.success('Übung erfolgreich gespeichert!');
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast.error('Fehler beim Speichern der Übung');
    } finally {
      setIsSaving(false);
    }
  };

  const updateOverallRpe = (rpe: number) => {
    setExerciseData({ ...exerciseData, overall_rpe: rpe });
  };

  return (
    <Card className="w-full border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            🏋️ {exerciseData.exercise_name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-8 w-8 p-0"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sets Overview */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground">Sätze</h4>
          {exerciseData.sets.map((set, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant="outline" className="min-w-[60px] justify-center">
                Satz {index + 1}
              </Badge>
              
              {isEditing ? (
                <>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(index, 'reps', parseInt(e.target.value) || 0)}
                      className="w-16 h-8"
                      placeholder="Wdh"
                    />
                    <span className="text-xs text-muted-foreground">Wdh</span>
                  </div>
                  
                  <span className="text-muted-foreground">×</span>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-16 h-8"
                      placeholder="kg"
                      step="0.5"
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={set.rpe || ''}
                      onChange={(e) => updateSet(index, 'rpe', parseInt(e.target.value) || undefined)}
                      className="w-16 h-8"
                      placeholder="RPE"
                      min="1"
                      max="10"
                    />
                    <span className="text-xs text-muted-foreground">RPE</span>
                  </div>
                  
                  {exerciseData.sets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSet(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-4 flex-1">
                  <span className="font-medium">{set.reps} Wiederholungen</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="font-medium">{set.weight} kg</span>
                  {set.rpe && (
                    <Badge variant="secondary" className="ml-auto">
                      RPE {set.rpe}/10
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={addSet}
              className="w-full h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              Satz hinzufügen
            </Button>
          )}
        </div>

        {/* Overall RPE */}
        {!exerciseData.sets.some(set => set.rpe) && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Gesamtintensität (RPE)</h4>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={exerciseData.overall_rpe || ''}
                onChange={(e) => updateOverallRpe(parseInt(e.target.value) || 0)}
                className="w-20"
                placeholder="1-10"
                min="1"
                max="10"
              />
              <span className="text-sm text-muted-foreground">von 10 (1=sehr leicht, 10=maximal)</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Speichere...' : 'Übung speichern'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Abbrechen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};