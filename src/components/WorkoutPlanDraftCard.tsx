import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Target, Edit, Save, Eye, Dumbbell, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WorkoutPlanEditModal } from './WorkoutPlanEditModal';

interface WorkoutPlanDraftCardProps {
  planData: {
    name: string;
    goal: string;
    daysPerWeek: number;
    structure?: any;
    analysis?: string;
  };
  onSave: (planData: any) => Promise<void>;
  onEdit: (planData: any) => void;
  userAnalytics?: {
    strengthProfile?: { [key: string]: number };
    recommendations?: string[];
    exerciseHistory?: any[];
  };
}

export const WorkoutPlanDraftCard: React.FC<WorkoutPlanDraftCardProps> = ({
  planData,
  onSave,
  onEdit,
  userAnalytics
}) => {
  const { name, goal, daysPerWeek, structure, analysis } = planData;
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Namen für den Trainingsplan ein.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      await onSave(planData);
    } catch (error) {
      console.error('Error saving workout plan:', error);
      toast({
        title: "Fehler",
        description: "Trainingsplan konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveEdited = async (editedPlanData: any) => {
    if (!editedPlanData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Namen für den Trainingsplan ein.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      await onSave(editedPlanData);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating workout plan:', error);
      toast({
        title: "Fehler",
        description: "Trainingsplan konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
                {daysPerWeek} Tage/Woche
              </Badge>
            </div>
          </div>

          {analysis && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">{analysis}</p>
            </div>
          )}

          {showDetails && structure && (
            <div className="mt-4 space-y-4">
              {/* Training Structure */}
              {structure.weekly_structure && (
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Dumbbell className="w-4 h-4" />
                    Trainingsstruktur
                  </h4>
                  <div className="space-y-3">
                    {structure.weekly_structure.map((day: any, index: number) => (
                      <div key={index} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">{day.name || `Tag ${index + 1}`}</h5>
                          <Badge variant="outline" className="text-xs">
                            {day.focus || 'Training'}
                          </Badge>
                        </div>
                        {day.exercises && day.exercises.length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {day.exercises.slice(0, 3).map((exercise: any, exerciseIndex: number) => (
                              <div key={exerciseIndex} className="flex justify-between">
                                <span>{exercise.name}</span>
                                <span>{exercise.sets}x{exercise.reps}</span>
                              </div>
                            ))}
                            {day.exercises.length > 3 && (
                              <div className="text-center text-muted-foreground">
                                +{day.exercises.length - 3} weitere Übungen
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
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
          id: `draft-${Date.now()}`, // Generate temporary ID for draft
          name: name,
          goal: goal,
          days_per_wk: daysPerWeek,
          structure: structure
        }}
      />
    </>
  );
};