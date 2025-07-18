import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  History as HistoryIcon, 
  Calendar, 
  TrendingUp, 
  Target,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { getGoalStatus, UserGoal } from "@/utils/goalBasedMessaging";

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

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

interface DailyData {
  date: string;
  displayDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: MealData[];
}

interface HistoryProps {
  onClose?: () => void;
  dailyGoal?: DailyGoal;
  onAddMeal?: (selectedDate: string) => void;
}

const History = ({ onClose, dailyGoal = { calories: 2000, protein: 150, carbs: 250, fats: 65 }, onAddMeal }: HistoryProps) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [historyData, setHistoryData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingMeal, setEditingMeal] = useState<MealData | null>(null);
  const [editMode, setEditMode] = useState<'manual' | 'portion'>('manual');
  const [portionAmount, setPortionAmount] = useState<number>(100);
  const [baseNutrition, setBaseNutrition] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });
  const [userGoal, setUserGoal] = useState<UserGoal>('maintain');
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      loadHistoryData();
      loadUserGoal();
    }
  }, [user, timeRange]);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      const daysToLoad = timeRange === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLoad);

      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load images for all meals
      const mealIds = mealsData?.map(meal => meal.id) || [];
      const { data: imagesData, error: imagesError } = await supabase
        .from('meal_images')
        .select('*')
        .in('meal_id', mealIds);

      if (imagesError) {
        console.error('Error loading meal images:', imagesError);
      }

      // Group images by meal_id
      const imagesByMealId = new Map<string, string[]>();
      imagesData?.forEach(image => {
        if (!imagesByMealId.has(image.meal_id)) {
          imagesByMealId.set(image.meal_id, []);
        }
        imagesByMealId.get(image.meal_id)?.push(image.image_url);
      });

      // Group meals by date
      const groupedData = new Map<string, DailyData>();
      
      // Initialize empty days
      for (let i = 0; i < daysToLoad; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        groupedData.set(dateStr, {
          date: dateStr,
          displayDate: date.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          meals: []
        });
      }

      // Add meals to their respective days
      mealsData?.forEach(meal => {
        const date = new Date(meal.created_at).toISOString().split('T')[0];
        const day = groupedData.get(date);
        if (day) {
          const mealWithImages = {
            ...meal,
            images: imagesByMealId.get(meal.id) || []
          };
          day.meals.push(mealWithImages);
          day.calories += Number(meal.calories);
          day.protein += Number(meal.protein);
          day.carbs += Number(meal.carbs);
          day.fats += Number(meal.fats);
        }
      });

      setHistoryData(Array.from(groupedData.values()).sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Fehler beim Laden der Verlaufsdaten');
    } finally {
      setLoading(false);
    }
  };

  const loadUserGoal = async () => {
    if (!user) return;
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('goal')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (profileData?.goal) {
        setUserGoal(profileData.goal as UserGoal);
      }
    } catch (error: any) {
      console.error('Error loading user goal:', error);
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Mahlzeit gelöscht');
      await loadHistoryData();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Fehler beim Löschen der Mahlzeit');
    }
  };

  const updateMeal = async (mealId: string, updates: Partial<MealData>) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Mahlzeit aktualisiert');
      setEditingMeal(null); // Close modal immediately
      await loadHistoryData();
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Fehler beim Aktualisieren der Mahlzeit');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMeal) {
      updateMeal(editingMeal.id, {
        text: editingMeal.text,
        calories: editingMeal.calories,
        protein: editingMeal.protein,
        carbs: editingMeal.carbs,
        fats: editingMeal.fats,
        meal_type: editingMeal.meal_type,
      });
    }
  };

  const toggleExpanded = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const currentData = historyData;
  const daysWithMeals = currentData.filter(day => day.meals.length > 0);
  const averageCalories = daysWithMeals.length > 0 ? Math.round(
    daysWithMeals.reduce((sum, day) => sum + day.calories, 0) / daysWithMeals.length
  ) : 0;

  const goalsAchieved = currentData.filter(day => {
    const goalStatus = getGoalStatus(day.calories, dailyGoal.calories, userGoal);
    return goalStatus.status === 'success';
  }).length;

  return (
    <div className="space-y-4 pb-20">
      {/* Header Stats */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{averageCalories}</div>
            <div className="text-sm text-muted-foreground">Ø Kalorien/Tag</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{goalsAchieved}</div>
            <div className="text-sm text-muted-foreground">Ziele erreicht</div>
          </div>
        </div>
      </Card>

      {/* Zeitraum-Auswahl */}
      <div className="flex gap-2">
        <Button
          variant={timeRange === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('week')}
          className="flex-1"
        >
          7 Tage
        </Button>
        <Button
          variant={timeRange === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('month')}
          className="flex-1"
        >
          30 Tage
        </Button>
      </div>

      {/* Charts und Tabelle */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Verlauf</TabsTrigger>
          <TabsTrigger value="chart">Grafik</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Lade Daten...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentData.map((day, index) => (
                <Collapsible 
                  key={day.date} 
                  open={expandedDays.has(day.date)}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors duration-200"
                        onClick={() => toggleExpanded(day.date)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{day.displayDate}</div>
                            <div className="text-sm text-muted-foreground">
                              {day.meals.length} {day.meals.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-lg">{day.calories}</div>
                            <div className="text-xs text-muted-foreground">kcal</div>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            {(() => {
                              const goalStatus = getGoalStatus(day.calories, dailyGoal.calories, userGoal);
                              return (
                                <Badge 
                                  variant={goalStatus.status === 'success' ? 'default' : 
                                          goalStatus.status === 'warning' ? 'secondary' : 'destructive'} 
                                  className="text-xs"
                                >
                                  {goalStatus.status === 'success' ? '🎯 Ziel erreicht' :
                                   goalStatus.status === 'warning' ? '⚡ Nahe Ziel' :
                                   userGoal === 'lose' ? '⚠️ Über Ziel' :
                                   userGoal === 'gain' ? '⚠️ Zu wenig' : '⚠️ Nicht optimal'}
                                </Badge>
                              );
                            })()}
                          </div>
                          
                          <div className="transition-transform duration-200">
                            {expandedDays.has(day.date) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="transition-all duration-300 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="px-4 pb-4 bg-muted/30">
                        {/* Macro Summary */}
                        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-background/50 rounded-lg">
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-600">{day.protein}g</div>
                            <div className="text-xs text-muted-foreground">Protein</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-600">{day.carbs}g</div>
                            <div className="text-xs text-muted-foreground">Kohlenhydrate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-yellow-600">{day.fats}g</div>
                            <div className="text-xs text-muted-foreground">Fette</div>
                          </div>
                        </div>

                        {/* Meals */}
                        {day.meals.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                              <Calendar className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Keine Mahlzeiten an diesem Tag
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {day.meals.map((meal, mealIndex) => (
                              <div 
                                key={meal.id} 
                                className="bg-background rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in"
                                style={{ animationDelay: `${mealIndex * 100}ms` }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {meal.meal_type === 'breakfast' ? '🌅 Frühstück' :
                                         meal.meal_type === 'lunch' ? '🌞 Mittagessen' :
                                         meal.meal_type === 'dinner' ? '🌙 Abendessen' : '🍎 Snack'}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(meal.created_at).toLocaleTimeString('de-DE', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                    
                                    <div className="font-medium text-sm mb-2 line-clamp-2">
                                      {meal.text}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="font-medium">{meal.calories} kcal</span>
                                      <span>P: {meal.protein}g</span>
                                      <span>K: {meal.carbs}g</span>
                                      <span>F: {meal.fats}g</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Dialog open={editingMeal?.id === meal.id} onOpenChange={(open) => {
                                      if (!open) setEditingMeal(null);
                                    }}>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingMeal(meal)}
                                          className="h-8 w-8 p-0 hover:bg-primary/10"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      </DialogTrigger>
                                       <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                                         <DialogHeader className="text-left">
                                           <DialogTitle className="text-xl font-bold">Mahlzeit bearbeiten</DialogTitle>
                                         </DialogHeader>
                                         {editingMeal && (
                                           <div className="space-y-6">
                                             {/* Edit Mode Toggle */}
                                             <div className="flex gap-2 p-1 bg-muted rounded-lg">
                                               <Button
                                                 type="button"
                                                 variant={editMode === 'manual' ? 'default' : 'ghost'}
                                                 size="sm"
                                                 onClick={() => {
                                                   setEditMode('manual');
                                                   // Reset to current meal values
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
                                                   // Set base nutrition to current per 100g
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

                                             <form onSubmit={handleEditSubmit} className="space-y-4">
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

                                                   {/* Portion Amount */}
                                                   <div className="bg-primary/5 rounded-lg p-4">
                                                     <Label htmlFor="portion" className="text-sm font-medium">Menge in Gramm</Label>
                                                     <div className="flex items-center gap-3 mt-2">
                                                       <Input
                                                         id="portion"
                                                         type="number"
                                                         value={portionAmount}
                                                         onChange={(e) => {
                                                           const newAmount = Number(e.target.value);
                                                           setPortionAmount(newAmount);
                                                           const multiplier = newAmount / 100;
                                                           setEditingMeal({
                                                             ...editingMeal,
                                                             calories: Math.round(baseNutrition.calories * multiplier),
                                                             protein: Math.round(baseNutrition.protein * multiplier * 10) / 10,
                                                             carbs: Math.round(baseNutrition.carbs * multiplier * 10) / 10,
                                                             fats: Math.round(baseNutrition.fats * multiplier * 10) / 10
                                                           });
                                                         }}
                                                         className="flex-1"
                                                         placeholder="z.B. 150"
                                                       />
                                                       <span className="text-sm text-muted-foreground">g</span>
                                                     </div>
                                                   </div>
                                                 </>
                                               )}

                                               {/* Calculated/Manual Nutrition */}
                                               <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-4 space-y-3">
                                                 <Label className="text-sm font-medium">
                                                   {editMode === 'portion' ? 'Berechnete Nährwerte' : 'Nährwerte'}
                                                 </Label>
                                                 <div className="grid grid-cols-2 gap-3">
                                                   <div>
                                                     <Label htmlFor="calories" className="text-xs">Kalorien</Label>
                                                     <Input
                                                       id="calories"
                                                       type="number"
                                                       value={editingMeal.calories}
                                                       onChange={(e) => setEditingMeal({...editingMeal, calories: Number(e.target.value)})}
                                                       className="mt-1 text-sm font-medium"
                                                       readOnly={editMode === 'portion'}
                                                     />
                                                   </div>
                                                   <div>
                                                     <Label htmlFor="protein" className="text-xs">Protein (g)</Label>
                                                     <Input
                                                       id="protein"
                                                       type="number"
                                                       step="0.1"
                                                       value={editingMeal.protein}
                                                       onChange={(e) => setEditingMeal({...editingMeal, protein: Number(e.target.value)})}
                                                       className="mt-1 text-sm"
                                                       readOnly={editMode === 'portion'}
                                                     />
                                                   </div>
                                                   <div>
                                                     <Label htmlFor="carbs" className="text-xs">Kohlenhydrate (g)</Label>
                                                     <Input
                                                       id="carbs"
                                                       type="number"
                                                       step="0.1"
                                                       value={editingMeal.carbs}
                                                       onChange={(e) => setEditingMeal({...editingMeal, carbs: Number(e.target.value)})}
                                                       className="mt-1 text-sm"
                                                       readOnly={editMode === 'portion'}
                                                     />
                                                   </div>
                                                   <div>
                                                     <Label htmlFor="fats" className="text-xs">Fette (g)</Label>
                                                     <Input
                                                       id="fats"
                                                       type="number"
                                                       step="0.1"
                                                       value={editingMeal.fats}
                                                       onChange={(e) => setEditingMeal({...editingMeal, fats: Number(e.target.value)})}
                                                       className="mt-1 text-sm"
                                                       readOnly={editMode === 'portion'}
                                                     />
                                                   </div>
                                                 </div>
                                               </div>

                                               {/* Meal Type */}
                                               <div>
                                                 <Label htmlFor="meal_type" className="text-sm font-medium">Mahlzeit-Typ</Label>
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

                                               {/* Action Buttons */}
                                               <div className="flex gap-3 pt-2">
                                                 <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                                                   Speichern
                                                 </Button>
                                                 <Button 
                                                   type="button" 
                                                   variant="outline" 
                                                   onClick={() => {
                                                     setEditingMeal(null);
                                                     setEditMode('manual');
                                                     setPortionAmount(100);
                                                   }}
                                                   className="flex-1"
                                                 >
                                                   Abbrechen
                                                 </Button>
                                               </div>
                                             </form>
                                           </div>
                                         )}
                                       </DialogContent>
                                    </Dialog>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteMeal(meal.id)}
                                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Meal Images */}
                                {meal.images && meal.images.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border/50">
                                    <div className="text-xs text-muted-foreground mb-2">Bilder:</div>
                                    <div className="flex gap-2 overflow-x-auto">
                                      {meal.images.map((imageUrl, index) => (
                                        <img
                                          key={index}
                                          src={imageUrl}
                                          alt={`Mahlzeit ${index + 1}`}
                                          className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 hover-scale"
                                          onClick={() => window.open(imageUrl, '_blank')}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="chart" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Kalorien-Verlauf
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={currentData.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Makronährstoffe (letzte 7 Tage)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={currentData.slice(-7).reverse()}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="protein" fill="#3b82f6" name="Protein" radius={[2, 2, 0, 0]} />
                <Bar dataKey="carbs" fill="#f97316" name="Kohlenhydrate" radius={[2, 2, 0, 0]} />
                <Bar dataKey="fats" fill="#eab308" name="Fette" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  };
  
  export default History;