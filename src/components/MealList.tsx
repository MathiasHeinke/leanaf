
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Edit, Clock, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MealEditDialog } from '@/components/MealEditDialog';
import { PointsBadge } from '@/components/PointsBadge';
import { calculateMealBonusPoints, getMealPointsIcon, getMealBasePoints } from '@/utils/mealPointsHelper';

interface Meal {
  id: string;
  meal_type: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
  images?: string[];
  quality_score?: number;
  bonus_points?: number;
  ai_feedback?: string;
}

interface MealListProps {
  meals: Meal[];
  onMealUpdate: () => void;
  selectedDate: string;
}

export const MealList = ({ meals, onMealUpdate, selectedDate }: MealListProps) => {
  const { user } = useAuth();
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const deleteMeal = async (mealId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Mahlzeit gelöscht');
      onMealUpdate();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Fehler beim Löschen der Mahlzeit');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMealTypeLabel = (type: string) => {
    const labels = {
      breakfast: 'Frühstück',
      lunch: 'Mittagessen', 
      dinner: 'Abendessen',
      snack: 'Snack'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getMealTypeEmoji = (type: string) => {
    const emojis = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙', 
      snack: '🍎'
    };
    return emojis[type as keyof typeof emojis] || '🍽️';
  };

  if (meals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Noch keine Mahlzeiten für diesen Tag erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meals.map((meal) => {
        const hasImages = meal.images && meal.images.length > 0;
        const basePoints = getMealBasePoints(hasImages);
        const bonusPoints = calculateMealBonusPoints(meal.quality_score);
        const pointsIcon = getMealPointsIcon(hasImages);
        
        return (
          <Card key={meal.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{getMealTypeEmoji(meal.meal_type)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      {meal.text} ({getMealTypeLabel(meal.meal_type)})
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(meal.created_at)}
                      {hasImages && (
                        <>
                          <span className="mx-1">•</span>
                          <Camera className="h-3 w-3" />
                          <span>Foto</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Miniature images */}
                  {hasImages && (
                    <div className="flex gap-1 ml-2">
                      {meal.images?.slice(0, 3).map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Miniatur ${index + 1}`}
                          className="w-10 h-10 object-cover rounded border"
                        />
                      ))}
                      {meal.images && meal.images.length > 3 && (
                        <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                          +{meal.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMeal(meal)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMeal(meal.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{meal.calories}</div>
                    <div className="text-muted-foreground">kcal</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{meal.protein}g</div>
                    <div className="text-muted-foreground">Protein</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{meal.carbs}g</div>
                    <div className="text-muted-foreground">Kohlenhydrate</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{meal.fats}g</div>
                    <div className="text-muted-foreground">Fett</div>
                  </div>
                </div>
              </div>

              {/* Points badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <PointsBadge 
                  points={basePoints} 
                  icon={pointsIcon}
                  variant="secondary"
                />
                {bonusPoints > 0 && (
                  <PointsBadge 
                    points={0}
                    bonusPoints={bonusPoints}
                    icon="⭐"
                    variant="outline"
                  />
                )}
                {meal.quality_score && (
                  <div className="text-xs text-muted-foreground ml-1">
                    Qualität: {meal.quality_score}/10
                  </div>
                )}
              </div>

              {/* Large images if available */}
              {hasImages && meal.images && meal.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {meal.images.slice(0, 2).map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Mahlzeit ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  ))}
                </div>
              )}

              {/* AI Feedback if available */}
              {meal.ai_feedback && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>🤖 Coach-Feedback:</strong> {meal.ai_feedback}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {editingMeal && (
        <MealEditDialog
          meal={{
            id: editingMeal.id,
            text: editingMeal.text,
            calories: editingMeal.calories,
            protein: editingMeal.protein,
            carbs: editingMeal.carbs,
            fats: editingMeal.fats,
            created_at: editingMeal.created_at,
            meal_type: editingMeal.meal_type,
            images: editingMeal.images
          }}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onUpdate={(mealId, updates) => {
            onMealUpdate();
            setEditingMeal(null);
          }}
        />
      )}
    </div>
  );
};
