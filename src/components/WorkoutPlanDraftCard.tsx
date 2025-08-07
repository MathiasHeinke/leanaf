import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Target, Edit, Save, Eye, Dumbbell, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WorkoutPlanEditModal } from './WorkoutPlanEditModal';

interface WorkoutPlanDraftCardProps {
  id: string;
  name: string;
  goal: string;
  days_per_wk: number;
  structure?: any;
  onSaved?: () => void;
  userAnalytics?: {
    strengthProfile?: { [key: string]: number };
    recommendations?: string[];
    exerciseHistory?: any[];
  };
}

export const WorkoutPlanDraftCard: React.FC<WorkoutPlanDraftCardProps> = ({
  id,
  name,
  goal,
  days_per_wk,
  structure,
  onSaved,
  userAnalytics
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
    setIsEditModalOpen(true);
  };

  const handleSaveEdited = async (editedData: any) => {
    try {
      const { error } = await supabase
        .from('workout_plan_drafts')
        .update({
          plan_name: editedData.name,
          goal: editedData.goal,
          days_per_week: editedData.days_per_wk,
          plan_structure: editedData.structure
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Plan aktualisiert",
        description: "Deine Änderungen wurden gespeichert.",
      });

      setIsEditModalOpen(false);
      onSaved?.();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Fehler",
        description: "Plan konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg text-primary">💪 Trainingsplan-Entwurf</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="gap-1"
            >
              <Eye className="w-3 h-3" />
              Details
            </Button>
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

        {/* User Analytics Insights */}
        {userAnalytics?.recommendations && userAnalytics.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Basierend auf deinen Trainings:
            </h4>
            <div className="space-y-1">
              {userAnalytics.recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="text-xs text-blue-600 bg-blue-50 rounded p-2">
                  💡 {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {structure?.weekly_structure && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Aufbau:</h4>
            <div className="space-y-1">
              {structure.weekly_structure.slice(0, showDetails ? structure.weekly_structure.length : 3).map((day: any, index: number) => (
                <div key={index} className="text-xs text-muted-foreground bg-background/50 rounded p-2">
                  <span className="font-medium">{day.day}:</span> {day.focus}
                  {showDetails && day.main_exercises && (
                    <div className="mt-1 text-xs opacity-75">
                      Übungen: {day.main_exercises.slice(0, 3).join(', ')}
                      {day.main_exercises.length > 3 && ` +${day.main_exercises.length - 3} weitere`}
                    </div>
                  )}
                </div>
              ))}
              {!showDetails && structure.weekly_structure.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{structure.weekly_structure.length - 3} weitere Tage
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strength Profile Insights */}
        {showDetails && userAnalytics?.strengthProfile && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Deine Kraftwerte:</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(userAnalytics.strengthProfile).map(([exercise, weight]) => 
                weight > 0 ? (
                  <div key={exercise} className="text-xs bg-background/50 rounded p-2">
                    <span className="font-medium capitalize">{exercise}:</span> {weight}kg
                  </div>
                ) : null
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

      <WorkoutPlanEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdited}
        planData={{
          id,
          name,
          goal,
          days_per_wk,
          structure
        }}
      />
    </>
  );
};