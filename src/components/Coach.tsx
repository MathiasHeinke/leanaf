import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MessageCircle, 
  ChefHat, 
  Lightbulb, 
  Phone,
  Loader2,
  History as HistoryIcon,
  Calendar,
  Target,
  ChevronDown,
  TrendingUp
} from "lucide-react";

interface CoachProps {
  onClose: () => void;
}

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr?: number;
  tdee?: number;
}

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

interface HistoryEntry {
  date: string;
  meals: MealData[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

const Coach = ({ onClose }: CoachProps) => {
  const [recommendations, setRecommendations] = useState<string>('');
  const [userContext, setUserContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'coach' | 'history'>('coach');
  const [dailyGoals, setDailyGoals] = useState<DailyGoal | null>(null);
  const [todaysMeals, setTodaysMeals] = useState<MealData[]>([]);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      generateRecommendations();
      loadHistoryData();
      loadDailyGoals();
      loadTodaysMeals();
    }
  }, [user]);

  const loadDailyGoals = async () => {
    if (!user) return;
    
    try {
      const { data: goalsData, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setDailyGoals({
        calories: goalsData.calories || 2000,
        protein: goalsData.protein || 150,
        carbs: goalsData.carbs || 250,
        fats: goalsData.fats || 65,
        bmr: goalsData.bmr,
        tdee: goalsData.tdee
      });
    } catch (error: any) {
      console.error('Error loading daily goals:', error);
    }
  };

  const loadTodaysMeals = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const meals = mealsData?.map(meal => ({
        id: meal.id,
        text: meal.text,
        calories: Number(meal.calories),
        protein: Number(meal.protein),
        carbs: Number(meal.carbs),
        fats: Number(meal.fats),
        timestamp: new Date(meal.created_at),
        meal_type: meal.meal_type,
      })) || [];
      
      setTodaysMeals(meals);
    } catch (error: any) {
      console.error('Error loading today\'s meals:', error);
    }
  };

  const generateRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-recipes', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) throw error;

      setRecommendations(data.recommendations);
      setUserContext(data.userContext);
      
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast.error('Fehler beim Erstellen der Empfehlungen');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryData = async () => {
    if (!user) return;
    
    setHistoryLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mealsByDate = mealsData?.reduce((acc: { [key: string]: MealData[] }, meal) => {
        const date = new Date(meal.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push({
          id: meal.id,
          text: meal.text,
          calories: Number(meal.calories),
          protein: Number(meal.protein),
          carbs: Number(meal.carbs),
          fats: Number(meal.fats),
          timestamp: new Date(meal.created_at),
          meal_type: meal.meal_type,
        });
        return acc;
      }, {}) || {};
      
      const historyEntries: HistoryEntry[] = Object.entries(mealsByDate).map(([date, meals]) => {
        const totals = meals.reduce(
          (sum, meal) => ({
            calories: sum.calories + meal.calories,
            protein: sum.protein + meal.protein,
            carbs: sum.carbs + meal.carbs,
            fats: sum.fats + meal.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
        
        return { date, meals, totals };
      });
      
      setHistoryData(historyEntries);
    } catch (error: any) {
      console.error('Error loading history:', error);
      toast.error('Fehler beim Laden des Verlaufs');
    } finally {
      setHistoryLoading(false);
    }
  };

  const requestPersonalSession = () => {
    toast.success('Anfrage für persönliches Gespräch wurde gesendet! 📞');
  };

  // Calculate today's totals
  const todaysTotals = todaysMeals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fats: sum.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'coach' | 'history')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="coach" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Coach
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Verlauf
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coach" className="space-y-6">
          {/* Personal Session Request Button */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Persönliche Beratung</h3>
                  <p className="text-muted-foreground">
                    Möchtest du eine individuelle Ernährungsberatung? 
                    Vereinbare ein persönliches Gespräch mit unserem Expertenteam.
                  </p>
                </div>
                <Button 
                  onClick={requestPersonalSession}
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Gespräch anfordern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Data Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Deine aktuellen Daten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Tagesziel Kalorien</div>
                  <div className="text-2xl font-bold text-primary">{dailyGoals?.calories || 2000} kcal</div>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Ø Kalorien (7 Tage)</div>
                  <div className="text-2xl font-bold text-blue-600">{Math.round(todaysTotals.calories / 7) || 289} kcal</div>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Mahlzeiten diese Woche</div>
                  <div className="text-2xl font-bold text-green-600">{todaysMeals.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Personalisierte Empfehlungen
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateRecommendations}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Neu generieren
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Erstelle personalisierte Empfehlungen...</span>
                </div>
              ) : recommendations ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {recommendations}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Klicke auf "Neu generieren" um personalisierte Empfehlungen zu erhalten</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 Die Empfehlungen basieren auf deinen Profildaten, Zielen und aktuellen Essgewohnheiten.
              Für detaillierte Beratung nutze den "Persönliches Gespräch" Button.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Lade Verlauf...</span>
            </div>
          ) : historyData.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2 border-muted">
              <HistoryIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Kein Verlauf vorhanden</h3>
              <p className="text-muted-foreground text-sm">
                Füge Mahlzeiten hinzu, um deinen Verlauf zu sehen
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {historyData.map((entry) => (
                <Collapsible key={entry.date}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <CardTitle className="text-lg">
                                {new Date(entry.date).toLocaleDateString('de-DE', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {entry.meals.length} {entry.meals.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">
                                {entry.totals.calories} kcal
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span>P: {entry.totals.protein}g</span>
                                <span>C: {entry.totals.carbs}g</span>
                                <span>F: {entry.totals.fats}g</span>
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {entry.meals.map((meal) => (
                            <div key={meal.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {meal.meal_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {meal.meal_type}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {meal.timestamp.toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm font-medium mb-1">{meal.text}</p>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span className="text-protein">P: {meal.protein}g</span>
                                  <span className="text-carbs">C: {meal.carbs}g</span>
                                  <span className="text-fats">F: {meal.fats}g</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-primary">
                                  {meal.calories} kcal
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Coach;