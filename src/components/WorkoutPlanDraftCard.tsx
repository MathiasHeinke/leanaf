import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Target, Edit, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WorkoutPlanDraftCardProps {
  id: string;
  name: string;
  goal: string;
  days_per_wk: number;
  structure?: any;
  onSaved?: () => void;
}

export const WorkoutPlanDraftCard: React.FC<WorkoutPlanDraftCardProps> = ({
  id,
  name,
  goal,
  days_per_wk,
  structure,
  onSaved
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('enhanced-coach-non-streaming', {
        body: {
          conversation: [
            {
              role: 'user',
              content: `Speichere den Trainingsplan-Entwurf mit ID: ${id}`
            }
          ],
          toolContext: {
            tool: 'savePlanDraft',
            args: { draft_id: id }
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Trainingsplan gespeichert",
        description: `${name} wurde erfolgreich als aktiver Trainingsplan gespeichert.`,
      });

      onSaved?.();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Fehler",
        description: "Trainingsplan konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    toast({
      title: "Bearbeitung",
      description: "Bearbeitungsfunktion wird bald verfügbar sein.",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-lg text-primary">📋 Trainingsplan-Entwurf</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">{name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="w-3 h-3" />
            <span>Ziel: {goal}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {days_per_wk} Tage/Woche
            </Badge>
          </div>
        </div>

        {structure?.weekly_structure && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Aufbau:</h4>
            <div className="space-y-1">
              {structure.weekly_structure.slice(0, 3).map((day: any, index: number) => (
                <div key={index} className="text-xs text-muted-foreground bg-background/50 rounded p-2">
                  <span className="font-medium">{day.day}:</span> {day.focus}
                </div>
              ))}
              {structure.weekly_structure.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{structure.weekly_structure.length - 3} weitere Tage
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex-1 gap-1"
          >
            <Edit className="w-3 h-3" />
            Bearbeiten
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 gap-1"
          >
            <Save className="w-3 h-3" />
            {isSaving ? 'Speichere...' : 'Speichern'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};