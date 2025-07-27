
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon, Camera, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { uploadFilesWithProgress } from "@/utils/uploadHelpers";
import { useAuth } from "@/hooks/useAuth";

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
  leftover_images?: string[];
  consumption_percentage?: number;
  leftover_analysis_metadata?: any;
}

interface MealEditDialogProps {
  meal: MealData | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (mealId: string, updates: Partial<MealData>) => void;
}

export const MealEditDialog = ({ meal, open, onClose, onUpdate }: MealEditDialogProps) => {
  const { user } = useAuth();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Leftover functionality state
  const [leftoverMode, setLeftoverMode] = useState(false);
  const [leftoverImages, setLeftoverImages] = useState<string[]>([]);
  const [isAnalyzingLeftovers, setIsAnalyzingLeftovers] = useState(false);
  const [originalCalories, setOriginalCalories] = useState<number>(0);
  const [originalProtein, setOriginalProtein] = useState<number>(0);
  const [originalCarbs, setOriginalCarbs] = useState<number>(0);
  const [originalFats, setOriginalFats] = useState<number>(0);

  useEffect(() => {
    if (meal) {
      setEditingMeal(meal);
      setEditingMealDate(new Date(meal.created_at));
      setLeftoverImages(meal.leftover_images || []);
      setLeftoverMode(meal.leftover_images && meal.leftover_images.length > 0);
      // Store original values for leftover calculation
      setOriginalCalories(meal.calories);
      setOriginalProtein(meal.protein);
      setOriginalCarbs(meal.carbs);
      setOriginalFats(meal.fats);
    }
  }, [meal]);

  const handleLeftoverImageUpload = async (files: File[]) => {
    if (!user) return;

    try {
      setIsAnalyzingLeftovers(true);
      const uploadResult = await uploadFilesWithProgress(files, user.id);
      
      if (uploadResult.success && uploadResult.urls) {
        setLeftoverImages([...leftoverImages, ...uploadResult.urls]);
        toast.success('Reste-Foto hochgeladen');
      } else {
        toast.error('Fehler beim Hochladen des Fotos');
      }
    } catch (error) {
      console.error('Error uploading leftover image:', error);
      toast.error('Fehler beim Hochladen des Fotos');
    } finally {
      setIsAnalyzingLeftovers(false);
    }
  };

  const analyzeLeftovers = async () => {
    if (!editingMeal || !editingMeal.images?.length || !leftoverImages.length) {
      toast.error('Original- und Reste-Bilder sind erforderlich');
      return;
    }

    setIsAnalyzingLeftovers(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal-leftovers', {
        body: {
          originalImages: editingMeal.images,
          leftoverImages: leftoverImages,
          mealDescription: editingMeal.text
        }
      });

      if (error) throw error;

      const consumptionPercentage = data.consumption_percentage || 75;
      
      // Calculate consumed amounts based on original values
      const consumedCalories = Math.round(originalCalories * (consumptionPercentage / 100));
      const consumedProtein = Math.round(originalProtein * (consumptionPercentage / 100) * 10) / 10;
      const consumedCarbs = Math.round(originalCarbs * (consumptionPercentage / 100) * 10) / 10;
      const consumedFats = Math.round(originalFats * (consumptionPercentage / 100) * 10) / 10;

      setEditingMeal({
        ...editingMeal,
        calories: consumedCalories,
        protein: consumedProtein,
        carbs: consumedCarbs,
        fats: consumedFats,
        consumption_percentage: consumptionPercentage,
        leftover_analysis_metadata: data
      });

      toast.success(`Analyse abgeschlossen: ${consumptionPercentage}% verzehrt`);
    } catch (error) {
      console.error('Error analyzing leftovers:', error);
      toast.error('Fehler bei der Reste-Analyse');
    } finally {
      setIsAnalyzingLeftovers(false);
    }
  };

  const removeLeftoverImage = (index: number) => {
    const newImages = leftoverImages.filter((_, i) => i !== index);
    setLeftoverImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Create a timestamp that preserves the local date without timezone conversion
      const localDate = new Date(editingMealDate);
      localDate.setHours(12, 0, 0, 0); // Set to midday to avoid timezone issues
      
      const updates = {
        text: editingMeal.text,
        calories: editingMeal.calories,
        protein: editingMeal.protein,
        carbs: editingMeal.carbs,
        fats: editingMeal.fats,
        meal_type: editingMeal.meal_type,
        created_at: localDate.toISOString(),
        leftover_images: leftoverImages,
        consumption_percentage: editingMeal.consumption_percentage,
        leftover_analysis_metadata: editingMeal.leftover_analysis_metadata,
      };

      // Update in database
      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', editingMeal.id);

      if (error) {
        console.error('Error updating meal:', error);
        toast.error('Fehler beim Speichern der Mahlzeit');
        return;
      }

      toast.success('Mahlzeit erfolgreich aktualisiert');
      
      // Call the onUpdate callback to refresh the UI
      onUpdate(editingMeal.id, updates);
      onClose();
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Fehler beim Speichern der Mahlzeit');
    } finally {
      setIsSubmitting(false);
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
                      <NumericInput
                        value={baseNutrition.calories}
                        onChange={(value) => {
                          const newBase = {...baseNutrition, calories: Number(value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            calories: Math.round(newBase.calories * multiplier)
                          });
                        }}
                        allowDecimals={false}
                        min={0}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_protein" className="text-xs">Protein (g)</Label>
                      <NumericInput
                        value={baseNutrition.protein}
                        onChange={(value) => {
                          const newBase = {...baseNutrition, protein: Number(value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            protein: Math.round(newBase.protein * multiplier * 10) / 10
                          });
                        }}
                        allowDecimals={true}
                        min={0}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_carbs" className="text-xs">Kohlenhydrate (g)</Label>
                      <NumericInput
                        value={baseNutrition.carbs}
                        onChange={(value) => {
                          const newBase = {...baseNutrition, carbs: Number(value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            carbs: Math.round(newBase.carbs * multiplier * 10) / 10
                          });
                        }}
                        allowDecimals={true}
                        min={0}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_fats" className="text-xs">Fette (g)</Label>
                      <NumericInput
                        value={baseNutrition.fats}
                        onChange={(value) => {
                          const newBase = {...baseNutrition, fats: Number(value)};
                          setBaseNutrition(newBase);
                          const multiplier = portionAmount / 100;
                          setEditingMeal({
                            ...editingMeal,
                            fats: Math.round(newBase.fats * multiplier * 10) / 10
                          });
                        }}
                        allowDecimals={true}
                        min={0}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Portion Size */}
                <div>
                  <Label htmlFor="portion" className="text-sm font-medium">Portionsgröße (g)</Label>
                  <NumericInput
                    value={portionAmount}
                    onChange={(value) => {
                      const newPortion = Number(value);
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
                    allowDecimals={false}
                    min={1}
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
                <NumericInput
                  value={editingMeal.calories}
                  onChange={(value) => setEditingMeal({...editingMeal, calories: Number(value)})}
                  allowDecimals={false}
                  min={0}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
              <div>
                <Label htmlFor="protein" className="text-sm font-medium">Protein (g)</Label>
                <NumericInput
                  value={editingMeal.protein}
                  onChange={(value) => setEditingMeal({...editingMeal, protein: Number(value)})}
                  allowDecimals={true}
                  min={0}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-sm font-medium">Kohlenhydrate (g)</Label>
                <NumericInput
                  value={editingMeal.carbs}
                  onChange={(value) => setEditingMeal({...editingMeal, carbs: Number(value)})}
                  allowDecimals={true}
                  min={0}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
              <div>
                <Label htmlFor="fats" className="text-sm font-medium">Fette (g)</Label>
                <NumericInput
                  value={editingMeal.fats}
                  onChange={(value) => setEditingMeal({...editingMeal, fats: Number(value)})}
                  allowDecimals={true}
                  min={0}
                  className="mt-2"
                  disabled={editMode === 'portion'}
                />
              </div>
            </div>

            {/* Leftover Analysis */}
            {editingMeal.images && editingMeal.images.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Reste-Analyse</Label>
                  <Switch
                    checked={leftoverMode}
                    onCheckedChange={setLeftoverMode}
                  />
                </div>
                
                {leftoverMode && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Lade ein Foto der Reste hoch, um die tatsächlich verzehrte Menge zu berechnen.
                    </p>
                    
                    {/* Leftover Images */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {leftoverImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Reste ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeLeftoverImage(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        id="leftover-images"
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            handleLeftoverImageUpload(files);
                          }
                        }}
                      />
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('leftover-images')?.click()}
                        disabled={isAnalyzingLeftovers}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isAnalyzingLeftovers ? 'Lade hoch...' : 'Reste-Foto hinzufügen'}
                      </Button>
                    </div>

                    {/* Analysis Button */}
                    {leftoverImages.length > 0 && (
                      <div className="space-y-3">
                        <Button
                          type="button"
                          onClick={analyzeLeftovers}
                          disabled={isAnalyzingLeftovers}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {isAnalyzingLeftovers ? 'Analysiere...' : 'Reste analysieren'}
                        </Button>
                        
                        {editingMeal.consumption_percentage && (
                          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                            <div className="text-sm font-medium text-center">
                              Verzehrt: {editingMeal.consumption_percentage}%
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${editingMeal.consumption_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="flex-1"
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
