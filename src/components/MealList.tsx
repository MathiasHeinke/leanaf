
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Heart, Check, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

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
  onUpdateMeal: (mealId: string, updates: Partial<MealData>) => void;
}

export const MealList = ({ dailyMeals, onEditMeal, onDeleteMeal, onUpdateMeal }: MealListProps) => {
  const { t } = useTranslation();
  const [editingField, setEditingField] = useState<{mealId: string, field: string} | null>(null);
  const [editingAllFields, setEditingAllFields] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: string}>({});
  const [editValue, setEditValue] = useState<string>('');

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
  
  const startEditingAll = (meal: MealData) => {
    setEditingAllFields(meal.id);
    setEditValues({
      text: meal.text,
      meal_type: meal.meal_type || 'other',
      calories: meal.calories.toString(),
      protein: meal.protein.toString(),
      carbs: meal.carbs.toString(),
      fats: meal.fats.toString()
    });
    // Clear single field editing
    setEditingField(null);
  };

  const saveAllEdits = (mealId: string) => {
    const updates: Partial<MealData> = {
      text: editValues.text,
      meal_type: editValues.meal_type,
      calories: parseFloat(editValues.calories) || 0,
      protein: parseFloat(editValues.protein) || 0,
      carbs: parseFloat(editValues.carbs) || 0,
      fats: parseFloat(editValues.fats) || 0
    };
    
    onUpdateMeal(mealId, updates);
    setEditingAllFields(null);
    setEditValues({});
  };

  const cancelAllEdits = () => {
    setEditingAllFields(null);
    setEditValues({});
  };

  const startEditing = (mealId: string, field: string, currentValue: string | number) => {
    // Don't allow single field editing if all fields are being edited
    if (editingAllFields === mealId) return;
    
    setEditingField({ mealId, field });
    setEditValue(currentValue.toString());
  };

  const saveEdit = (mealId: string, field: string) => {
    if (!editValue.trim()) return;
    
    let updateValue: any = editValue;
    if (field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fats') {
      updateValue = parseFloat(editValue) || 0;
    }
    
    onUpdateMeal(mealId, { [field]: updateValue });
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const isEditing = (mealId: string, field: string) => {
    return editingField?.mealId === mealId && editingField?.field === field;
  };

  const isEditingAll = (mealId: string) => {
    return editingAllFields === mealId;
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg mb-3">{t('meal.todaysMeals')}</h3>
      {dailyMeals.map((meal) => {
        const mealDisplay = getMealTypeDisplay(meal.meal_type);
        return (
          <Card key={meal.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {/* Editable Meal Type */}
                  {isEditingAll(meal.id) ? (
                    <Select value={editValues.meal_type} onValueChange={(value) => setEditValues(prev => ({...prev, meal_type: value}))}>
                      <SelectTrigger className="w-32 h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">{t('mealTypes.breakfast')}</SelectItem>
                        <SelectItem value="lunch">{t('mealTypes.lunch')}</SelectItem>
                        <SelectItem value="dinner">{t('mealTypes.dinner')}</SelectItem>
                        <SelectItem value="snack">{t('mealTypes.snack')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : isEditing(meal.id, 'meal_type') ? (
                    <div className="flex items-center gap-1">
                      <Select value={editValue} onValueChange={setEditValue}>
                        <SelectTrigger className="w-32 h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">{t('mealTypes.breakfast')}</SelectItem>
                          <SelectItem value="lunch">{t('mealTypes.lunch')}</SelectItem>
                          <SelectItem value="dinner">{t('mealTypes.dinner')}</SelectItem>
                          <SelectItem value="snack">{t('mealTypes.snack')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(meal.id, 'meal_type')}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge 
                      variant="secondary" 
                      className={`${mealDisplay.color} cursor-pointer hover:opacity-80`}
                      onClick={() => startEditing(meal.id, 'meal_type', meal.meal_type || 'other')}
                    >
                      {mealDisplay.label}
                    </Badge>
                  )}
                  
                  <span className="text-xs text-muted-foreground">
                    {meal.timestamp.toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                {/* Editable Meal Text */}
                {isEditingAll(meal.id) ? (
                  <Input 
                    value={editValues.text} 
                    onChange={(e) => setEditValues(prev => ({...prev, text: e.target.value}))}
                    className="text-sm font-medium mb-2"
                  />
                ) : isEditing(meal.id, 'text') ? (
                  <div className="flex items-center gap-1 mb-2">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-sm font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(meal.id, 'text');
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => saveEdit(meal.id, 'text')}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={cancelEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p 
                    className="text-sm font-medium mb-2 line-clamp-2 cursor-pointer hover:bg-muted/20 rounded px-1 py-0.5" 
                    onClick={() => startEditing(meal.id, 'text', meal.text)}
                  >
                    {meal.text}
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                {isEditingAll(meal.id) ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      onClick={() => saveAllEdits(meal.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={cancelAllEdits}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => startEditingAll(meal)}
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
                  </>
                )}
              </div>
            </div>
            
            {/* Editable nutritional info */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              {/* Calories */}
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                {isEditingAll(meal.id) ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValues.calories} 
                      onChange={(e) => setEditValues(prev => ({...prev, calories: e.target.value}))}
                      className="h-6 text-xs text-center"
                    />
                    <div className="text-orange-500 dark:text-orange-300">{t('ui.kcal')}</div>
                  </div>
                ) : isEditing(meal.id, 'calories') ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-6 text-xs text-center"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(meal.id, 'calories');
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => saveEdit(meal.id, 'calories')}>
                        <Check className="h-2 w-2" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={cancelEdit}>
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="font-semibold text-orange-600 dark:text-orange-400 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-800/30 rounded px-1"
                      onClick={() => startEditing(meal.id, 'calories', meal.calories)}
                    >
                      {meal.calories}
                    </div>
                    <div className="text-orange-500 dark:text-orange-300">{t('ui.kcal')}</div>
                  </>
                )}
              </div>
              
              {/* Protein */}
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                {isEditingAll(meal.id) ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValues.protein} 
                      onChange={(e) => setEditValues(prev => ({...prev, protein: e.target.value}))}
                      className="h-6 text-xs text-center"
                    />
                    <div className="text-blue-500 dark:text-blue-300">{t('macros.protein')}</div>
                  </div>
                ) : isEditing(meal.id, 'protein') ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-6 text-xs text-center"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(meal.id, 'protein');
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => saveEdit(meal.id, 'protein')}>
                        <Check className="h-2 w-2" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={cancelEdit}>
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded px-1"
                      onClick={() => startEditing(meal.id, 'protein', meal.protein)}
                    >
                      {meal.protein}g
                    </div>
                    <div className="text-blue-500 dark:text-blue-300">{t('macros.protein')}</div>
                  </>
                )}
              </div>
              
              {/* Carbs */}
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                {isEditingAll(meal.id) ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValues.carbs} 
                      onChange={(e) => setEditValues(prev => ({...prev, carbs: e.target.value}))}
                      className="h-6 text-xs text-center"
                    />
                    <div className="text-green-500 dark:text-green-300">{t('macros.carbs')}</div>
                  </div>
                ) : isEditing(meal.id, 'carbs') ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-6 text-xs text-center"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(meal.id, 'carbs');
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => saveEdit(meal.id, 'carbs')}>
                        <Check className="h-2 w-2" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={cancelEdit}>
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="font-semibold text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/30 rounded px-1"
                      onClick={() => startEditing(meal.id, 'carbs', meal.carbs)}
                    >
                      {meal.carbs}g
                    </div>
                    <div className="text-green-500 dark:text-green-300">{t('macros.carbs')}</div>
                  </>
                )}
              </div>
              
              {/* Fats */}
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                {isEditingAll(meal.id) ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValues.fats} 
                      onChange={(e) => setEditValues(prev => ({...prev, fats: e.target.value}))}
                      className="h-6 text-xs text-center"
                    />
                    <div className="text-purple-500 dark:text-purple-300">{t('macros.fats')}</div>
                  </div>
                ) : isEditing(meal.id, 'fats') ? (
                  <div className="space-y-1">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-6 text-xs text-center"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(meal.id, 'fats');
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => saveEdit(meal.id, 'fats')}>
                        <Check className="h-2 w-2" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={cancelEdit}>
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="font-semibold text-purple-600 dark:text-purple-400 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800/30 rounded px-1"
                      onClick={() => startEditing(meal.id, 'fats', meal.fats)}
                    >
                      {meal.fats}g
                    </div>
                    <div className="text-purple-500 dark:text-purple-300">{t('macros.fats')}</div>
                  </>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
