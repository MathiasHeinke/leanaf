
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Heart } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { MealEditForm } from "@/components/MealEditForm";

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  meal_type?: string;
}

interface MealListProps {
  dailyMeals: MealData[];
  onEditMeal: (meal: MealData) => void;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal: () => void;
}

export const MealList = ({ dailyMeals, onEditMeal, onDeleteMeal, onUpdateMeal }: MealListProps) => {
  const { t } = useTranslation();
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  const getMealTypeDisplay = (mealType?: string) => {
    switch (mealType) {
      case 'breakfast': 
        return { 
          label: t('mealTypes.breakfast'), 
          color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' 
        };
      case 'lunch': 
        return { 
          label: t('mealTypes.lunch'), 
          color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
        };
      case 'dinner': 
        return { 
          label: t('mealTypes.dinner'), 
          color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
        };
      case 'snack': 
        return { 
          label: t('mealTypes.snack'), 
          color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' 
        };
      default: 
        return { 
          label: t('mealTypes.other'), 
          color: 'bg-muted/50 text-muted-foreground' 
        };
    }
  };

  if (dailyMeals.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2 border-muted">
        <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">{t('meal.noMealsToday')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('meal.addFirstMeal')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg mb-3">{t('meal.todaysMeals')}</h3>
      {dailyMeals.map((meal) => {
        const mealDisplay = getMealTypeDisplay(meal.meal_type);
        
        // Show edit form if this meal is being edited
        if (editingMealId === meal.id) {
          return (
            <MealEditForm
              key={meal.id}
              meal={meal}
              onSave={() => {
                setEditingMealId(null);
                onUpdateMeal();
              }}
              onCancel={() => setEditingMealId(null)}
            />
          );
        }
        
        return (
          <Card key={meal.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={mealDisplay.color}>
                    {mealDisplay.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {meal.timestamp.toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm font-medium mb-2 line-clamp-2">
                  {meal.text}
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditingMealId(meal.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDeleteMeal(meal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Nutritional info display */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                <div className="font-semibold text-orange-600 dark:text-orange-400">
                  {meal.calories}
                </div>
                <div className="text-orange-500 dark:text-orange-300">{t('ui.kcal')}</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {meal.protein}g
                </div>
                <div className="text-blue-500 dark:text-blue-300">{t('macros.protein')}</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {meal.carbs}g
                </div>
                <div className="text-green-500 dark:text-green-300">{t('macros.carbs')}</div>
              </div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  {meal.fats}g
                </div>
                <div className="text-purple-500 dark:text-purple-300">{t('macros.fats')}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
