import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, TrendingUp, Plus, X } from 'lucide-react';
import { useStrengthGoals } from '@/hooks/useStrengthGoals';
import { toast } from 'sonner';

export const StrengthGoalsWidget: React.FC = () => {
  const { goals, addStrengthGoal, deleteStrengthGoal } = useStrengthGoals();
  const [newGoal, setNewGoal] = useState({ exercise: '', current: '', target: '' });

  const handleAddGoal = async () => {
    if (!newGoal.exercise || !newGoal.target) {
      toast.error('Bitte Übung und Zielgewicht eingeben');
      return;
    }

    await addStrengthGoal({
      exercise_name: newGoal.exercise,
      current_1rm_kg: newGoal.current ? parseFloat(newGoal.current) : undefined,
      target_1rm_kg: parseFloat(newGoal.target)
    });

    setNewGoal({ exercise: '', current: '', target: '' });
  };

  const commonExercises = [
    'Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken',
    'Langhantelrudern', 'Klimmzüge', 'Dips', 'Bizep Curls'
  ];

  return (
    <Card className="border-muted bg-muted/30 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Dumbbell className="h-4 w-4" />
          Kraftziele
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Goals */}
        {goals.length > 0 && (
          <div className="space-y-2">
            {goals.slice(0, 5).map((goal) => (
              <div
                key={goal.id}
                className="bg-background/60 rounded-lg p-3 border border-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{goal.exercise_name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteStrengthGoal(goal.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {goal.current_1rm_kg && (
                        <span>{goal.current_1rm_kg}kg</span>
                      )}
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium text-primary">
                        {goal.target_1rm_kg}kg
                      </span>
                      {goal.estimated_weeks && (
                        <span className="ml-auto">
                          ~{goal.estimated_weeks}w
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Goal */}
        <div className="bg-muted/50 rounded-lg p-3 border border-dashed border-border">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input
              placeholder="Übung"
              value={newGoal.exercise}
              onChange={(e) => setNewGoal(prev => ({ ...prev, exercise: e.target.value }))}
              className="h-8 text-xs"
              list="exercises"
            />
            <datalist id="exercises">
              {commonExercises.map(exercise => (
                <option key={exercise} value={exercise} />
              ))}
            </datalist>
            <Input
              placeholder="Aktuell (kg)"
              value={newGoal.current}
              onChange={(e) => setNewGoal(prev => ({ ...prev, current: e.target.value }))}
              className="h-8 text-xs"
              type="number"
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ziel (kg)"
              value={newGoal.target}
              onChange={(e) => setNewGoal(prev => ({ ...prev, target: e.target.value }))}
              className="h-8 text-xs flex-1"
              type="number"
            />
            <Button
              size="sm"
              onClick={handleAddGoal}
              className="h-8 px-3"
              disabled={!newGoal.exercise || !newGoal.target}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ziel
            </Button>
          </div>
        </div>

        {goals.length === 0 && (
          <div className="bg-muted/50 rounded-lg p-6 border border-dashed border-border text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Noch keine Kraftziele definiert</p>
            <p className="text-xs text-muted-foreground mt-1">
              Setze dir Ziele für deine Lieblings-Übungen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};