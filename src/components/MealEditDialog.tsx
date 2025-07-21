import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
  meal_type: string;
  images?: string[];
}

interface MealEditDialogProps {
  meal: MealData | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (mealId: string, updates: Partial<MealData>) => void;
}

export const MealEditDialog = ({ meal, open, onClose, onUpdate }: MealEditDialogProps) => {
  const [editingMeal, setEditingMeal] = useState<MealData | null>(null);
  const [editMode, setEditMode] = useState<'manual' | 'portion'>('manual');
  const [portionAmount, setPortionAmount] = useState<number>(100);
  const [baseNutrition, setBaseNutrition] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });
  const [editingMealDate, setEditingMealDate] = useState<Date>(new Date());

  useEffect(() => {
    if (meal) {
      setEditingMeal(meal);
      setEditingMealDate(new Date(meal.created_at));
    }
  }, [meal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMeal) {
      // Create a timestamp that preserves the local date without timezone conversion
      const localDate = new Date(editingMealDate);
      localDate.setHours(12, 0, 0, 0); // Set to midday to avoid timezone issues
      
      onUpdate(editingMeal.id, {
        text: editingMeal.text,
        calories: editingMeal.calories,
        protein: editingMeal.protein,
        carbs: editingMeal.carbs,
        fats: editingMeal.fats,
        meal_type: editingMeal.meal_type,
        created_at: localDate.toISOString(),
      });
    }
  };

  if (!editingMeal) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold">Mahlzeit bearbeiten</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Edit Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={editMode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setEditMode('manual');
                setEditingMeal(editingMeal);
              }}
              className="flex-1 text-xs"
            >
              Manuell
            </Button>
            <Button
              type="button"
              variant={editMode === 'portion' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setEditMode('portion');
                const currentPortion = portionAmount / 100;
                setBaseNutrition({
                  calories: Math.round(editingMeal.calories / currentPortion),
                  protein: Math.round(editingMeal.protein / currentPortion),
                  carbs: Math.round(editingMeal.carbs / currentPortion),
                  fats: Math.round(editingMeal.fats / currentPortion)
                });
              }}
              className="flex-1 text-xs"
            >
              Portionen
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <Label htmlFor="text" className="text-sm font-medium">Was gegessen</Label>
              <Textarea
                id="text"
                value={editingMeal.text}
                onChange={(e) => setEditingMeal({...editingMeal, text: e.target.value})}
                className="mt-2 resize-none"
                rows={3}
                placeholder="Beschreibe deine Mahlzeit..."
              />
            </div>

            {editMode === 'portion' && (
              <>
                {/* Base Nutrition per 100g */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-medium">Nährwerte pro 100g</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="base_calories" className="text-xs">Kalorien</Label>
                      <Input
                        id="base_calories"
                        type="number"
                        value={baseNutrition.calories}
                        onChange={(e) => {
                          const newBase = {...baseNutrition, calories: Number(e.target.value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            calories: Math.round(newBase.calories * multiplier)
                          });
                        }}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_protein" className="text-xs">Protein (g)</Label>
                      <Input
                        id="base_protein"
                        type="number"
                        step="0.1"
                        value={baseNutrition.protein}
                        onChange={(e) => {
                          const newBase = {...baseNutrition, protein: Number(e.target.value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            protein: Math.round(newBase.protein * multiplier * 10) / 10
                          });
                        }}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_carbs" className="text-xs">Kohlenhydrate (g)</Label>
                      <Input
                        id="base_carbs"
                        type="number"
                        step="0.1"
                        value={baseNutrition.carbs}
                        onChange={(e) => {
                          const newBase = {...baseNutrition, carbs: Number(e.target.value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            carbs: Math.round(newBase.carbs * multiplier * 10) / 10
                          });
                        }}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_fats" className="text-xs">Fette (g)</Label>
                      <Input
                        id="base_fats"
                        type="number"
                        step="0.1"
                        value={baseNutrition.fats}
                        onChange={(e) => {
                          const newBase = {...baseNutrition, fats: Number(e.target.value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            fats: Math.round(newBase.fats * multiplier * 10) / 10
                          });
                        }}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Portion Size */}
                <div>
                  <Label htmlFor="portion" className="text-sm font-medium">Portionsgröße (g)</Label>
                  <Input
                    id="portion"
                    type="number"
                    value={portionAmount}
                    onChange={(e) => {
                      const newPortion = Number(e.target.value);
                      setPortionAmount(newPortion);
                      const multiplier = newPortion / 100;
                      setEditingMeal({
                        ...editingMeal,
                        calories: Math.round(baseNutrition.calories * multiplier),
                        protein: Math.round(baseNutrition.protein * multiplier * 10) / 10,
                        carbs: Math.round(baseNutrition.carbs * multiplier * 10) / 10,
                        fats: Math.round(baseNutrition.fats * multiplier * 10) / 10
                      });
                    }}
                    className="mt-2"
                    placeholder="100"
                  />
                </div>
              </>
            )}

            {/* Nutritional Values */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="calories" className="text-sm font-medium">Kalorien</Label>
                <Input
                  id="calories"
                  type="number"
                  value={editingMeal.calories}
                  onChange={(e) => setEditingMeal({...editingMeal, calories: Number(e.target.value)})}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
              <div>
                <Label htmlFor="protein" className="text-sm font-medium">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={editingMeal.protein}
                  onChange={(e) => setEditingMeal({...editingMeal, protein: Number(e.target.value)})}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-sm font-medium">Kohlenhydrate (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={editingMeal.carbs}
                  onChange={(e) => setEditingMeal({...editingMeal, carbs: Number(e.target.value)})}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
              <div>
                <Label htmlFor="fats" className="text-sm font-medium">Fette (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  step="0.1"
                  value={editingMeal.fats}
                  onChange={(e) => setEditingMeal({...editingMeal, fats: Number(e.target.value)})}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
            </div>

            {/* Meal Type */}
            <div>
              <Label htmlFor="meal_type" className="text-sm font-medium">Mahlzeitentyp</Label>
              <Select 
                value={editingMeal.meal_type} 
                onValueChange={(value) => setEditingMeal({...editingMeal, meal_type: value})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">🌅 Frühstück</SelectItem>
                  <SelectItem value="lunch">🌞 Mittagessen</SelectItem>
                  <SelectItem value="dinner">🌙 Abendessen</SelectItem>
                  <SelectItem value="snack">🍎 Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label className="text-sm font-medium">Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !editingMealDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingMealDate ? format(editingMealDate, "PPP", { locale: de }) : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editingMealDate}
                    onSelect={(date) => date && setEditingMealDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1">
                Speichern
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};