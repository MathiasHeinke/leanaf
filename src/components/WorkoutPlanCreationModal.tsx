import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, GripVertical, History, Zap, Dumbbell } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  sets?: number;
  reps?: number;
  weight?: number;
  rpe?: number;
  rest_seconds?: number;
}

interface ExerciseSession {
  id: string;
  session_name: string;
  date: string;
  exercise_sets: {
    exercise_id: string;
    exercises: {
      name: string;
      category: string;
    };
  }[];
}

interface WorkoutPlanTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty_level: number;
  estimated_duration_minutes: number;
  exercises: any;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkoutPlanCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: () => void;
  pastSessions?: ExerciseSession[];
}

export const WorkoutPlanCreationModal: React.FC<WorkoutPlanCreationModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
  pastSessions = []
}) => {
  const { user } = useAuth();
  const [planName, setPlanName] = useState('');
  const [planCategory, setPlanCategory] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutPlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');

  useEffect(() => {
    if (isOpen) {
      loadExercises();
      loadWorkoutTemplates();
    }
  }, [isOpen]);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_public', true)
        .order('name');

      if (error) throw error;
      setAvailableExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Fehler beim Laden der Übungen');
    }
  };

  const loadWorkoutTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_plan_templates')
        .select('*')
        .eq('is_public', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setWorkoutTemplates(data || []);
    } catch (error) {
      console.error('Error loading workout templates:', error);
      toast.error('Fehler beim Laden der Vorlagen');
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    const exerciseWithDefaults = {
      ...exercise,
      sets: 3,
      reps: 10,
      weight: 0,
      rpe: 7,
      rest_seconds: 90
    };
    setSelectedExercises([...selectedExercises, exerciseWithDefaults]);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedExercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedExercises(items);
  };

  const createPlanFromSession = (session: ExerciseSession) => {
    const uniqueExercises = new Map();
    
    session.exercise_sets.forEach(set => {
      if (!uniqueExercises.has(set.exercise_id)) {
        uniqueExercises.set(set.exercise_id, {
          id: set.exercise_id,
          name: set.exercises.name,
          category: set.exercises.category,
          muscle_groups: [],
          sets: 3,
          reps: 10,
          weight: 0,
          rpe: 7,
          rest_seconds: 90
        });
      }
    });

    const exercises = Array.from(uniqueExercises.values());
    setSelectedExercises(exercises);
    setPlanName(`${session.session_name} - Plan`);
    setPlanCategory(exercises[0]?.category || 'Full Body');
    setActiveTab('manual');
    toast.success('Training in Plan übernommen');
  };

  const createPlanFromTemplate = (template: WorkoutPlanTemplate) => {
    const exerciseArray = Array.isArray(template.exercises) ? template.exercises : [];
    const exercises = exerciseArray.map((exercise: any) => ({
      id: `template-${Math.random()}`,
      name: exercise.name,
      category: template.category,
      muscle_groups: exercise.muscle_groups || [],
      sets: exercise.sets || 3,
      reps: typeof exercise.reps === 'string' ? exercise.reps : exercise.reps || 10,
      weight: exercise.weight_percentage || 0,
      rpe: exercise.rpe || 7,
      rest_seconds: exercise.rest_seconds || 90
    }));

    setSelectedExercises(exercises);
    setPlanName(template.name);
    setPlanCategory(template.category);
    setEstimatedDuration(template.estimated_duration_minutes?.toString() || '');
    setActiveTab('manual');
    toast.success(`Template "${template.name}" übernommen`);
  };

  const handleSavePlan = async () => {
    if (!user || !planName || !planCategory || selectedExercises.length === 0) {
      toast.error('Bitte fülle alle Pflichtfelder aus und füge mindestens eine Übung hinzu');
      return;
    }

    setLoading(true);
    try {
      const exercisesData = selectedExercises.map((ex, index) => ({
        exercise_id: ex.id,
        name: ex.name,
        category: ex.category,
        muscle_groups: ex.muscle_groups,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        weight: ex.weight || 0,
        rpe: ex.rpe || 7,
        rest_seconds: ex.rest_seconds || 90,
        order: index + 1
      }));

      const { error } = await supabase
        .from('workout_plans')
        .insert({
          name: planName,
          category: planCategory,
          description: planDescription || null,
          exercises: exercisesData,
          estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration) : null,
          created_by: user.id,
          is_public: false
        });

      if (error) throw error;

      toast.success('Trainingsplan erfolgreich erstellt!');
      onPlanCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating workout plan:', error);
      toast.error('Fehler beim Erstellen des Trainingsplans');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPlanName('');
    setPlanCategory('');
    setPlanDescription('');
    setEstimatedDuration('');
    setSelectedExercises([]);
    setActiveTab('templates');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuen Trainingsplan erstellen</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Vorlagen</TabsTrigger>
            <TabsTrigger value="manual">Manuell erstellen</TabsTrigger>
            <TabsTrigger value="fromHistory">Aus Training erstellen</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="space-y-3">
              <Label>Vorgefertigte Trainingsplan-Vorlagen</Label>
              {workoutTemplates.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Keine Vorlagen verfügbar</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {workoutTemplates.map(template => (
                    <Card key={template.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                      <CardContent className="p-4" onClick={() => createPlanFromTemplate(template)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Level {template.difficulty_level}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{Array.isArray(template.exercises) ? template.exercises.length : 0} Übungen</span>
                              <span>~{template.estimated_duration_minutes} Min</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Dumbbell className="h-4 w-4 mr-2" />
                            Verwenden
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fromHistory" className="space-y-4">
            <div className="space-y-3">
              <Label>Vergangene Trainings</Label>
              {pastSessions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Keine vergangenen Trainings gefunden</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pastSessions.map(session => (
                    <Card key={session.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                      <CardContent className="p-4" onClick={() => createPlanFromSession(session)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{session.session_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.date).toLocaleDateString('de-DE')} • {session.exercise_sets.length} Übungen
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Verwenden
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            {/* Plan Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name *</Label>
                <Input
                  id="planName"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="z.B. Push Tag A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategorie *</Label>
                <Select value={planCategory} onValueChange={setPlanCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Push">Push</SelectItem>
                    <SelectItem value="Pull">Pull</SelectItem>
                    <SelectItem value="Legs">Legs</SelectItem>
                    <SelectItem value="Full Body">Full Body</SelectItem>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Beschreibe deinen Trainingsplan..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Geschätzte Dauer (Minuten)</Label>
              <Input
                id="duration"
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="z.B. 60"
              />
            </div>

            {/* Exercise Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Übungen auswählen</Label>
                <Badge variant="outline">{selectedExercises.length} Übungen</Badge>
              </div>

              {/* Add Exercise Button */}
              <div className="space-y-2">
                <Label className="text-sm">Übung hinzufügen</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {availableExercises.map(exercise => (
                    <Button
                      key={exercise.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddExercise(exercise)}
                      className="justify-start"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      {exercise.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Exercises */}
              {selectedExercises.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Ausgewählte Übungen</Label>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="exercises">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {selectedExercises.map((exercise, index) => (
                            <Draggable key={`${exercise.id}-${index}`} draggableId={`${exercise.id}-${index}`} index={index}>
                              {(provided) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium">{exercise.name}</div>
                                      <div className="grid grid-cols-5 gap-2 mt-2">
                                        <div>
                                          <Label className="text-xs">Sätze</Label>
                                          <Input
                                            type="number"
                                            value={exercise.sets}
                                            onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                                            className="h-8"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Wdh</Label>
                                          <Input
                                            type="number"
                                            value={exercise.reps}
                                            onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value))}
                                            className="h-8"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Gewicht</Label>
                                          <Input
                                            type="number"
                                            step="0.5"
                                            value={exercise.weight}
                                            onChange={(e) => updateExercise(index, 'weight', parseFloat(e.target.value))}
                                            className="h-8"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">RPE</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={exercise.rpe}
                                            onChange={(e) => updateExercise(index, 'rpe', parseInt(e.target.value))}
                                            className="h-8"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Pause (s)</Label>
                                          <Input
                                            type="number"
                                            value={exercise.rest_seconds}
                                            onChange={(e) => updateExercise(index, 'rest_seconds', parseInt(e.target.value))}
                                            className="h-8"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveExercise(index)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSavePlan} disabled={loading}>
            {loading ? 'Erstelle...' : 'Plan erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};