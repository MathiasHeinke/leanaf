import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, Save, Edit2, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupplementRecommendation {
  name: string;
  dosage: string;
  unit: string;
  timing: string[];
  goal?: string;
  notes?: string;
}

interface SupplementPreviewData {
  title: string;
  supplements: SupplementRecommendation[];
  description?: string;
}

interface SupplementPreviewCardProps {
  data: SupplementPreviewData;
  onSave: (data: SupplementPreviewData) => Promise<void>;
  onEdit?: (editedData: SupplementPreviewData) => void;
  onCancel: () => void;
}

const timingOptions = [
  { value: 'morning', label: 'Morgens' },
  { value: 'noon', label: 'Mittags' },
  { value: 'evening', label: 'Abends' },
  { value: 'pre_workout', label: 'Vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training' },
  { value: 'before_bed', label: 'Vor dem Schlafengehen' }
];

const unitOptions = ['mg', 'g', 'mcg', 'IU', 'ml', 'Tablette', 'Kapsel', 'Messlöffel', 'Tropfen'];

export const SupplementPreviewCard: React.FC<SupplementPreviewCardProps> = ({
  data,
  onSave,
  onEdit,
  onCancel
}) => {
  const { user } = useAuth();
  const [supplementData, setSupplementData] = useState<SupplementPreviewData>(data);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateSupplement = (index: number, field: keyof SupplementRecommendation, value: any) => {
    const newSupplements = [...supplementData.supplements];
    newSupplements[index] = { ...newSupplements[index], [field]: value };
    setSupplementData({ ...supplementData, supplements: newSupplements });
    onEdit?.({ ...supplementData, supplements: newSupplements });
  };

  const updateSupplementTiming = (index: number, timing: string, add: boolean) => {
    const newSupplements = [...supplementData.supplements];
    const currentTiming = newSupplements[index].timing || [];
    
    if (add && !currentTiming.includes(timing)) {
      newSupplements[index].timing = [...currentTiming, timing];
    } else if (!add) {
      newSupplements[index].timing = currentTiming.filter(t => t !== timing);
    }
    
    setSupplementData({ ...supplementData, supplements: newSupplements });
    onEdit?.({ ...supplementData, supplements: newSupplements });
  };

  const addSupplement = () => {
    const newSupplement: SupplementRecommendation = {
      name: '',
      dosage: '',
      unit: 'mg',
      timing: ['morning']
    };
    setSupplementData({
      ...supplementData,
      supplements: [...supplementData.supplements, newSupplement]
    });
  };

  const removeSupplement = (index: number) => {
    if (supplementData.supplements.length > 1) {
      const newSupplements = supplementData.supplements.filter((_, i) => i !== index);
      setSupplementData({ ...supplementData, supplements: newSupplements });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Du musst angemeldet sein, um Supplements zu speichern');
      return;
    }

    try {
      setIsSaving(true);

      // Save each supplement to user_supplements table
      for (const supplement of supplementData.supplements) {
        if (supplement.name && supplement.dosage && supplement.unit) {
          const { error } = await supabase
            .from('user_supplements')
            .insert({
              user_id: user.id,
              custom_name: supplement.name,
              dosage: supplement.dosage,
              unit: supplement.unit,
              timing: supplement.timing,
              goal: supplement.goal || null,
              notes: supplement.notes || null
            });

          if (error) throw error;
        }
      }

      // Trigger refresh event for QuickSupplementInput
      window.dispatchEvent(new CustomEvent('supplement-recommendations-saved'));
      
      await onSave(supplementData);
      toast.success('Supplement-Empfehlungen erfolgreich gespeichert!');
    } catch (error) {
      console.error('Error saving supplements:', error);
      toast.error('Fehler beim Speichern der Supplements');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTitle = (title: string) => {
    setSupplementData({ ...supplementData, title });
  };

  const updateDescription = (description: string) => {
    setSupplementData({ ...supplementData, description });
  };

  return (
    <div className="w-full max-h-[85vh] overflow-y-auto">
      <Card className="w-full border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="sticky top-0 bg-gradient-to-br from-background to-muted/30 z-10 border-b border-border/50">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary flex items-center gap-2">
              <Pill className="h-5 w-5" />
              {isEditing ? (
                <Input
                  value={supplementData.title}
                  onChange={(e) => updateTitle(e.target.value)}
                  className="h-8 text-lg font-bold"
                  placeholder="Supplement Plan Titel"
                />
              ) : (
                supplementData.title
              )}
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
          {supplementData.description && (
            <div className="text-sm text-muted-foreground">
              {isEditing ? (
                <Textarea
                  value={supplementData.description}
                  onChange={(e) => updateDescription(e.target.value)}
                  className="min-h-[60px]"
                  placeholder="Beschreibung des Supplement Plans"
                />
              ) : (
                <p>{supplementData.description}</p>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4 pb-20">
          {/* Supplements List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Empfohlene Supplements</h4>
            <div className="space-y-3">
              {supplementData.supplements.map((supplement, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="min-w-[80px] justify-center">
                      Supplement {index + 1}
                    </Badge>
                    {isEditing && supplementData.supplements.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSupplement(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    {isEditing ? (
                      <Input
                        value={supplement.name}
                        onChange={(e) => updateSupplement(index, 'name', e.target.value)}
                        placeholder="z.B. Vitamin D3"
                        className="h-8"
                      />
                    ) : (
                      <p className="font-medium text-sm">{supplement.name}</p>
                    )}
                  </div>

                  {/* Dosage & Unit */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Dosierung</label>
                      {isEditing ? (
                        <Input
                          value={supplement.dosage}
                          onChange={(e) => updateSupplement(index, 'dosage', e.target.value)}
                          placeholder="z.B. 1000"
                          className="h-8"
                        />
                      ) : (
                        <p className="text-sm">{supplement.dosage}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Einheit</label>
                      {isEditing ? (
                        <Select
                          value={supplement.unit}
                          onValueChange={(value) => updateSupplement(index, 'unit', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border z-50">
                            {unitOptions.map(unit => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{supplement.unit}</p>
                      )}
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Einnahmezeitpunkt</label>
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1">
                        {timingOptions.map(timing => (
                          <Badge
                            key={timing.value}
                            variant={supplement.timing?.includes(timing.value) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => updateSupplementTiming(
                              index, 
                              timing.value, 
                              !supplement.timing?.includes(timing.value)
                            )}
                          >
                            {timing.label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {supplement.timing?.map(timing => {
                          const timingLabel = timingOptions.find(t => t.value === timing)?.label || timing;
                          return (
                            <Badge key={timing} variant="secondary" className="text-xs">
                              {timingLabel}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Goal (optional) */}
                  {(isEditing || supplement.goal) && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Ziel</label>
                      {isEditing ? (
                        <Input
                          value={supplement.goal || ''}
                          onChange={(e) => updateSupplement(index, 'goal', e.target.value)}
                          placeholder="z.B. Besserer Schlaf, Immunsystem"
                          className="h-8"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{supplement.goal}</p>
                      )}
                    </div>
                  )}

                  {/* Notes (optional) */}
                  {(isEditing || supplement.notes) && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                      {isEditing ? (
                        <Textarea
                          value={supplement.notes || ''}
                          onChange={(e) => updateSupplement(index, 'notes', e.target.value)}
                          placeholder="Zusätzliche Hinweise..."
                          className="min-h-[50px]"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{supplement.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={addSupplement}
                className="w-full h-8"
              >
                <Plus className="h-4 w-4 mr-2" />
                Supplement hinzufügen
              </Button>
            )}
          </div>
        </CardContent>
        
        {/* Fixed Action Buttons */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background to-background/95 p-4 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Speichere...' : 'Supplements speichern'}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};