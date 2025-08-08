import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Edit, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { WorkoutPlanCreationModal } from './WorkoutPlanCreationModal';
import { WorkoutPlanEditModal } from './WorkoutPlanEditModal';

interface WorkoutPlan {
  id: string;
  name: string;
  category: string;
  description: string | null;
  exercises: any;
  estimated_duration_minutes: number | null;
}

interface WorkoutPlanManagerProps {
  onStartPlan: (plan: WorkoutPlan) => void;
  className?: string;
  pastSessions?: any[];
}

const categoryColors = {
  'Push': 'bg-red-500/10 text-red-700 border-red-200',
  'Pull': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Legs': 'bg-green-500/10 text-green-700 border-green-200',
  'Full Body': 'bg-purple-500/10 text-purple-700 border-purple-200',
  'Cardio': 'bg-orange-500/10 text-orange-700 border-orange-200'
};

export const WorkoutPlanManager: React.FC<WorkoutPlanManagerProps> = ({ onStartPlan, className, pastSessions = [] }) => {
  const { user } = useAuth();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [editingData, setEditingData] = useState<any | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    if (user) {
      loadWorkoutPlans();
    }
  }, [user]);

  const loadWorkoutPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .or(`created_by.eq.${user?.id},is_public.eq.true`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setWorkoutPlans(data || []);
    } catch (error) {
      console.error('Error loading workout plans:', error);
      toast.error('Fehler beim Laden der Trainingspläne');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlan = (plan: WorkoutPlan) => {
    onStartPlan(plan);
    toast.success(`Trainingsplan "${plan.name}" gestartet`);
  };

  const handleDuplicatePlan = async (plan: WorkoutPlan) => {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .insert({
          name: `${plan.name} (Kopie)`,
          category: plan.category,
          description: plan.description,
          exercises: plan.exercises,
          estimated_duration_minutes: plan.estimated_duration_minutes,
          created_by: user?.id
        });

      if (error) throw error;
      toast.success('Trainingsplan dupliziert');
      loadWorkoutPlans();
    } catch (error) {
      console.error('Error duplicating plan:', error);
      toast.error('Fehler beim Duplizieren des Plans');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Trainingsplan wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      toast.success('Trainingsplan gelöscht');
      loadWorkoutPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Fehler beim Löschen des Plans');
    }
  };

  const handleEditPlan = async (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    setLoadingEdit(true);
    try {
      // Load structured plan (days, exercises, sets) if available
      const { data: days, error } = await supabase
        .from('training_plan_days')
        .select('id, day_name, focus, position, training_exercises(id, exercise_name, position, training_sets(set_number, target_reps, target_reps_range, target_load_kg, target_rpe, rest_seconds))')
        .eq('plan_id', plan.id)
        .order('position', { ascending: true });

      if (error) throw error;

      const weekly_structure = (days || []).map((d: any) => ({
        day: d.day_name,
        focus: d.focus || '',
        exercises: (d.training_exercises || []).sort((a: any,b: any)=>a.position-b.position).map((ex: any) => {
          const sets = (ex.training_sets || []).sort((a: any,b: any)=>a.set_number-b.set_number);
          return {
            name: ex.exercise_name,
            sets: Math.max(sets.length, 3),
            reps: sets[0]?.target_reps_range || String(sets[0]?.target_reps || '8-12'),
            weight: sets[0]?.target_load_kg ? String(sets[0]?.target_load_kg) : '',
            rpe: sets[0]?.target_rpe ?? 8,
            rest_seconds: sets[0]?.rest_seconds ?? 120,
            _exercise_id: ex.id,
            _set_ids: sets.map((s:any)=>s.id)
          };
        })
      }));

      setEditingData({
        id: plan.id,
        name: plan.name,
        goal: plan.description || '',
        days_per_wk: weekly_structure.length || 3,
        structure: { weekly_structure }
      });
      setShowEditModal(true);
    } catch (e) {
      console.error('Fehler beim Laden des Plans:', e);
      toast.error('Plan konnte nicht geladen werden');
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSaveEditedPlan = async (updated: any) => {
    if (!editingPlan) return;
    try {
      // Update plan name/description
      const { error: upErr } = await supabase
        .from('workout_plans')
        .update({ name: updated.name, description: updated.goal })
        .eq('id', editingPlan.id);
      if (upErr) throw upErr;

      // Update exercises and sets (basic sync)
      const weekly = updated.structure?.weekly_structure || [];
      // Load fresh mapping of days -> exercises
      const { data: days } = await supabase
        .from('training_plan_days')
        .select('id, position, training_exercises(id, position, exercise_name)')
        .eq('plan_id', editingPlan.id)
        .order('position', { ascending: true });

      for (let i = 0; i < weekly.length; i++) {
        const dayRow = days?.[i];
        if (!dayRow) continue;
        const exList = weekly[i].exercises || [];
        // Sort exercises by current order
        for (let j = 0; j < exList.length; j++) {
          const exEdit = exList[j];
          const exRow = dayRow.training_exercises?.[j];
          if (!exRow) continue;
          // Update exercise name
          await supabase.from('training_exercises').update({ exercise_name: exEdit.name }).eq('id', exRow.id);
          // Load existing sets for this exercise
          const { data: setsRows } = await supabase
            .from('training_sets')
            .select('id, set_number')
            .eq('exercise_id', exRow.id)
            .order('set_number', { ascending: true });
          const targetCount = Math.max(parseInt(String(exEdit.sets)) || 3, 1);
          const currentCount = setsRows?.length || 0;
          // Adjust set count
          if (currentCount < targetCount) {
            const inserts = Array.from({ length: targetCount - currentCount }, (_, k) => ({
              exercise_id: exRow.id,
              set_number: currentCount + k + 1,
              rest_seconds: exEdit.rest_seconds || 120
            }));
            if (inserts.length) await supabase.from('training_sets').insert(inserts);
          } else if (currentCount > targetCount) {
            const toDelete = setsRows!.slice(targetCount).map(s => s.id);
            if (toDelete.length) await supabase.from('training_sets').delete().in('id', toDelete);
          }
          // Update all sets targets
          await supabase
            .from('training_sets')
            .update({
              target_reps_range: exEdit.reps || '8-12',
              target_load_kg: exEdit.weight ? parseFloat(exEdit.weight) : null,
              target_rpe: exEdit.rpe ?? null,
              rest_seconds: exEdit.rest_seconds || 120
            })
            .eq('exercise_id', exRow.id);
        }
      }

      toast.success('Plan aktualisiert');
      setShowEditModal(false);
      setEditingPlan(null);
      setEditingData(null);
      loadWorkoutPlans();
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      toast.error('Änderungen konnten nicht gespeichert werden');
    }
  };
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Trainingspläne</h3>
        <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neuen Plan erstellen
        </Button>
      </div>

      {workoutPlans.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Noch keine Trainingspläne vorhanden</p>
            <Button variant="outline" className="mt-3" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Plan erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        workoutPlans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{plan.name}</h4>
                    <Badge 
                      variant="outline" 
                      className={categoryColors[plan.category as keyof typeof categoryColors] || 'bg-gray-500/10 text-gray-700 border-gray-200'}
                    >
                      {plan.category}
                    </Badge>
                  </div>
                  
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{Array.isArray(plan.exercises) ? plan.exercises.length : 0} Übungen</span>
                    {plan.estimated_duration_minutes && (
                      <span>~{plan.estimated_duration_minutes} Min</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStartPlan(plan)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPlan(plan)}
                    title="Bearbeiten"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicatePlan(plan)}
                    title="Duplizieren"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePlan(plan.id)}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <WorkoutPlanCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPlanCreated={() => {
          loadWorkoutPlans();
          setShowCreateModal(false);
        }}
        pastSessions={pastSessions}
      />

      {showEditModal && editingData && (
        <WorkoutPlanEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEditedPlan}
          planData={editingData}
        />
      )}
    </div>
  );
};