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
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  onClose: () => void;
  dailyGoal: DailyGoal;
}

const History = ({ onClose, dailyGoal }: HistoryProps) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [historyData, setHistoryData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingMeal, setEditingMeal] = useState<MealData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadHistoryData();
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
          day.meals.push(meal);
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
  const averageCalories = currentData.length > 0 ? Math.round(
    currentData.reduce((sum, day) => sum + day.calories, 0) / currentData.length
  ) : 0;

  const goalsAchieved = currentData.filter(day => 
    day.calories >= dailyGoal.calories * 0.9 && day.calories <= dailyGoal.calories * 1.1
  ).length;

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-primary to-primary-glow p-2 rounded-lg">
              <HistoryIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold">Verlauf</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>

        {/* Zeitraum-Auswahl */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={timeRange === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            7 Tage
          </Button>
          <Button
            variant={timeRange === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            30 Tage
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-primary/5 rounded-xl">
            <div className="text-2xl font-bold text-primary">{averageCalories}</div>
            <div className="text-sm text-muted-foreground">Ø Kalorien/Tag</div>
          </div>
          <div className="text-center p-4 bg-success/5 rounded-xl">
            <div className="text-2xl font-bold text-success">{goalsAchieved}</div>
            <div className="text-sm text-muted-foreground">Ziele erreicht</div>
          </div>
        </div>
      </Card>

      {/* Charts und Tabelle */}
      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">Grafik</TabsTrigger>
          <TabsTrigger value="table">Tabelle</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Kalorien-Verlauf</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">Makronährstoffe</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={currentData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="protein" fill="hsl(var(--protein))" />
                <Bar dataKey="carbs" fill="hsl(var(--carbs))" />
                <Bar dataKey="fats" fill="hsl(var(--fats))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Detaillierte Übersicht</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Lade Daten...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentData.map((day) => (
                  <Collapsible key={day.date} open={expandedDays.has(day.date)}>
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleExpanded(day.date)}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{day.displayDate}</div>
                              <div className="text-sm text-muted-foreground">
                                {day.meals.length} Mahlzeiten
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{day.calories} kcal</div>
                            <div className="text-xs text-muted-foreground">
                              P: {day.protein}g • K: {day.carbs}g • F: {day.fats}g
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {day.calories >= dailyGoal.calories * 0.9 && day.calories <= dailyGoal.calories * 1.1 ? (
                              <Badge variant="default">Ziel erreicht</Badge>
                            ) : day.calories > dailyGoal.calories * 1.1 ? (
                              <Badge variant="destructive">Über Ziel</Badge>
                            ) : (
                              <Badge variant="secondary">Unter Ziel</Badge>
                            )}
                            {expandedDays.has(day.date) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 bg-background/50 border-t">
                          {day.meals.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-4">
                              Keine Mahlzeiten an diesem Tag
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {day.meals.map((meal) => (
                                <div key={meal.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{meal.text}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {meal.calories} kcal • P: {meal.protein}g • K: {meal.carbs}g • F: {meal.fats}g
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {meal.meal_type} • {new Date(meal.created_at).toLocaleTimeString('de-DE', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
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
                                           className="h-8 w-8 p-0"
                                         >
                                           <Edit2 className="h-3 w-3" />
                                         </Button>
                                       </DialogTrigger>
                                       <DialogContent>
                                         <DialogHeader>
                                           <DialogTitle>Mahlzeit bearbeiten</DialogTitle>
                                         </DialogHeader>
                                         {editingMeal && (
                                           <form onSubmit={handleEditSubmit} className="space-y-4">
                                             <div>
                                               <Label htmlFor="text">Was gegessen</Label>
                                               <Textarea
                                                 id="text"
                                                 value={editingMeal.text}
                                                 onChange={(e) => setEditingMeal({...editingMeal, text: e.target.value})}
                                                 className="mt-1"
                                               />
                                             </div>
                                             <div className="grid grid-cols-2 gap-4">
                                               <div>
                                                 <Label htmlFor="calories">Kalorien</Label>
                                                 <Input
                                                   id="calories"
                                                   type="number"
                                                   value={editingMeal.calories}
                                                   onChange={(e) => setEditingMeal({...editingMeal, calories: Number(e.target.value)})}
                                                   className="mt-1"
                                                 />
                                               </div>
                                               <div>
                                                 <Label htmlFor="protein">Protein (g)</Label>
                                                 <Input
                                                   id="protein"
                                                   type="number"
                                                   value={editingMeal.protein}
                                                   onChange={(e) => setEditingMeal({...editingMeal, protein: Number(e.target.value)})}
                                                   className="mt-1"
                                                 />
                                               </div>
                                               <div>
                                                 <Label htmlFor="carbs">Kohlenhydrate (g)</Label>
                                                 <Input
                                                   id="carbs"
                                                   type="number"
                                                   value={editingMeal.carbs}
                                                   onChange={(e) => setEditingMeal({...editingMeal, carbs: Number(e.target.value)})}
                                                   className="mt-1"
                                                 />
                                               </div>
                                               <div>
                                                 <Label htmlFor="fats">Fette (g)</Label>
                                                 <Input
                                                   id="fats"
                                                   type="number"
                                                   value={editingMeal.fats}
                                                   onChange={(e) => setEditingMeal({...editingMeal, fats: Number(e.target.value)})}
                                                   className="mt-1"
                                                 />
                                               </div>
                                             </div>
                                             <div>
                                               <Label htmlFor="meal_type">Mahlzeit-Typ</Label>
                                               <Select 
                                                 value={editingMeal.meal_type} 
                                                 onValueChange={(value) => setEditingMeal({...editingMeal, meal_type: value})}
                                               >
                                                 <SelectTrigger className="mt-1">
                                                   <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                   <SelectItem value="breakfast">Frühstück</SelectItem>
                                                   <SelectItem value="lunch">Mittagessen</SelectItem>
                                                   <SelectItem value="dinner">Abendessen</SelectItem>
                                                   <SelectItem value="snack">Snack</SelectItem>
                                                 </SelectContent>
                                               </Select>
                                             </div>
                                             <div className="flex gap-2">
                                               <Button type="submit" className="flex-1">
                                                 Speichern
                                               </Button>
                                               <Button 
                                                 type="button" 
                                                 variant="outline" 
                                                 onClick={() => setEditingMeal(null)}
                                                 className="flex-1"
                                               >
                                                 Abbrechen
                                               </Button>
                                             </div>
                                           </form>
                                         )}
                                       </DialogContent>
                                     </Dialog>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => deleteMeal(meal.id)}
                                       className="h-8 w-8 p-0"
                                     >
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;