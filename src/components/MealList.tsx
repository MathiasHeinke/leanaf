
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Clock, Edit, Trash2, Camera, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealEditDialog } from "@/components/MealEditDialog";
import { MealPointsDisplay } from "@/components/MealPointsDisplay";
import { supabase } from "@/integrations/supabase/client";

interface Meal {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  created_at: string;
  meal_type: string;
  quality_score?: number;
  bonus_points?: number;
  ai_feedback?: string;
}

interface MealListProps {
  dailyMeals: Meal[];
  onEditMeal: (meal: Meal) => void;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal: () => void;
}

export const MealList = ({ dailyMeals, onEditMeal, onDeleteMeal, onUpdateMeal }: MealListProps) => {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealImages, setMealImages] = useState<{ [key: string]: string[] }>({});

  // Load meal images for each meal
  const loadMealImages = async (mealId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_images')
        .select('image_url')
        .eq('meal_id', mealId);

      if (error) throw error;
      
      const imageUrls = data?.map(img => img.image_url) || [];
      setMealImages(prev => ({ ...prev, [mealId]: imageUrls }));
    } catch (error) {
      console.error('Error loading meal images:', error);
    }
  };

  // Load images for all meals when component mounts or meals change
  useState(() => {
    dailyMeals.forEach(meal => {
      if (!mealImages[meal.id]) {
        loadMealImages(meal.id);
      }
    });
  });

  const getMealTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Frühstück';
      case 'lunch': return 'Mittagessen';
      case 'dinner': return 'Abendessen';
      case 'snack': return 'Snack';
      default: return 'Mahlzeit';
    }
  };

  const getMealTypeEmoji = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  if (dailyMeals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Noch keine Mahlzeiten heute eingetragen.</p>
        <p className="text-sm mt-2">Nutze das Eingabefeld unten, um deine erste Mahlzeit zu tracken!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {dailyMeals.map((meal) => {
          const hasImages = mealImages[meal.id]?.length > 0;
          
          return (
            <Card key={meal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getMealTypeEmoji(meal.meal_type)}</span>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {getMealTypeLabel(meal.meal_type)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(meal.timestamp, 'HH:mm', { locale: de })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMeal(meal)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMeal(meal.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">{meal.text}</p>
                  
                  {/* Display meal images if available */}
                  {hasImages && (
                    <div className="flex gap-2 mb-2 overflow-x-auto">
                      {mealImages[meal.id]?.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Mahlzeit ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-md border"
                        />
                      ))}
                    </div>
                  )}

                  {/* Points display */}
                  <MealPointsDisplay
                    hasPhoto={hasImages}
                    qualityScore={meal.quality_score}
                    bonusPoints={meal.bonus_points}
                    className="mb-2"
                  />

                  {/* AI Feedback if available */}
                  {meal.ai_feedback && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mt-2">
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-700">
                          <strong>Coach-Feedback:</strong> {meal.ai_feedback}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-medium">{Math.round(meal.calories)}</div>
                    <div className="text-muted-foreground">kcal</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-medium">{Math.round(meal.protein)}g</div>
                    <div className="text-muted-foreground">Protein</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-medium">{Math.round(meal.carbs)}g</div>
                    <div className="text-muted-foreground">Kohlenh.</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-medium">{Math.round(meal.fats)}g</div>
                    <div className="text-muted-foreground">Fett</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editingMeal && (
        <MealEditDialog
          meal={editingMeal}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onUpdate={onUpdateMeal}
        />
      )}
    </>
  );
};
