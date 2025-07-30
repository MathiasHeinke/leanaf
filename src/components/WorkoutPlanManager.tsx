import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Edit, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
}

const categoryColors = {
  'Push': 'bg-red-500/10 text-red-700 border-red-200',
  'Pull': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Legs': 'bg-green-500/10 text-green-700 border-green-200',
  'Full Body': 'bg-purple-500/10 text-purple-700 border-purple-200',
  'Cardio': 'bg-orange-500/10 text-orange-700 border-orange-200'
};

export const WorkoutPlanManager: React.FC<WorkoutPlanManagerProps> = ({ onStartPlan, className }) => {
  const { user } = useAuth();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Neuen Plan erstellen
        </Button>
      </div>

      {workoutPlans.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Noch keine Trainingspläne vorhanden</p>
            <Button variant="outline" className="mt-3">
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
                    onClick={() => handleDuplicatePlan(plan)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};