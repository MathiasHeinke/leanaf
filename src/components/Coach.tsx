import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  const [botMessage, setBotMessage] = useState<string>('');
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
        .maybeSingle();
      
      if (error) throw error;
      
      setDailyGoals({
        calories: goalsData.calories || 1323,
        protein: goalsData.protein || 116,
        carbs: goalsData.carbs || 99,
        fats: goalsData.fats || 51,
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

  // Calculate averages based on filled days only
  const calculateAverages = () => {
    const daysWithData = historyData.filter(entry => entry.meals.length > 0);
    if (daysWithData.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    const totals = daysWithData.reduce(
      (sum, entry) => ({
        calories: sum.calories + entry.totals.calories,
        protein: sum.protein + entry.totals.protein,
        carbs: sum.carbs + entry.totals.carbs,
        fats: sum.fats + entry.totals.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    
    return {
      calories: Math.round(totals.calories / daysWithData.length),
      protein: Math.round(totals.protein / daysWithData.length),
      carbs: Math.round(totals.carbs / daysWithData.length),
      fats: Math.round(totals.fats / daysWithData.length),
    };
  };

  const averages = calculateAverages();

  // Generate coaching bot message
  const generateBotMessage = () => {
    const calorieGoal = dailyGoals?.calories || 1323;
    const calorieAverage = averages.calories;
    const progress = calorieAverage > 0 ? ((calorieAverage / calorieGoal) * 100).toFixed(0) : 0;
    
    const messages = [
      `🎯 Hallo! Dein Kalorienziel liegt bei ${calorieGoal} kcal täglich. Du erreichst derzeit ${progress}% davon mit durchschnittlich ${calorieAverage} kcal.`,
      calorieAverage < calorieGoal * 0.8 ? 
        "📊 Deine Kalorienaufnahme ist etwas niedrig. Möchtest du wissen, wie du gesund mehr Kalorien zu dir nehmen kannst?" :
        calorieAverage > calorieGoal * 1.2 ? 
        "⚡ Du liegst über deinem Kalorienziel. Lass uns schauen, wie wir das optimieren können!" :
        "✅ Deine Kalorienaufnahme ist gut im Zielbereich! Wie fühlst du dich dabei?",
      "💪 Hast du Fragen zu deiner Ernährung oder brauchst du Unterstützung?"
    ];
    
    return messages.join('\n\n');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section - Personal Coaching */}
      <Card className="border-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-pattern opacity-20"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <ChefHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Dein persönlicher Coach 🏆</h2>
                <p className="text-white/90 text-lg">
                  Erreiche deine Ziele mit professioneller Unterstützung
                </p>
              </div>
            </div>
            <Button 
              onClick={requestPersonalSession}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white shadow-lg"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Beratung buchen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardContent className="p-4 text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary mb-1">{dailyGoals?.calories || 1323}</div>
            <div className="text-sm text-muted-foreground">kcal Tagesziel</div>
          </CardContent>
        </Card>
        
        <Card className="hover-scale">
          <CardContent className="p-4 text-center">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">{averages.calories}</div>
            <div className="text-sm text-muted-foreground">kcal Durchschnitt</div>
          </CardContent>
        </Card>
        
        <Card className="hover-scale">
          <CardContent className="p-4 text-center">
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="text-xl">🎯</div>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {averages.calories > 0 ? Math.round((averages.calories / (dailyGoals?.calories || 1323)) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Zielerreichung</div>
          </CardContent>
        </Card>
        
        <Card className="hover-scale">
          <CardContent className="p-4 text-center">
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600 mb-1">{todaysTotals.calories}</div>
            <div className="text-sm text-muted-foreground">kcal heute</div>
          </CardContent>
        </Card>
      </div>

      {/* Makronährstoffe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <div className="text-lg">📊</div>
            </div>
            Makronährstoffe Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative p-6 bg-gradient-to-br from-protein/10 to-protein/20 rounded-xl border border-protein/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-protein/20 rounded-lg flex items-center justify-center">
                  <div className="text-lg">🥩</div>
                </div>
                <Badge variant="outline" className="border-protein text-protein">
                  {averages.protein > 0 ? Math.round((averages.protein / (dailyGoals?.protein || 116)) * 100) : 0}%
                </Badge>
              </div>
              <h3 className="font-semibold text-protein mb-2">Protein</h3>
              <div className="text-2xl font-bold text-protein mb-1">{averages.protein}g</div>
              <div className="text-sm text-muted-foreground">Ziel: {dailyGoals?.protein || 116}g</div>
              <div className="w-full bg-protein/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-protein h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (averages.protein / (dailyGoals?.protein || 116)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="relative p-6 bg-gradient-to-br from-carbs/10 to-carbs/20 rounded-xl border border-carbs/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-carbs/20 rounded-lg flex items-center justify-center">
                  <div className="text-lg">🍞</div>
                </div>
                <Badge variant="outline" className="border-carbs text-carbs">
                  {averages.carbs > 0 ? Math.round((averages.carbs / (dailyGoals?.carbs || 99)) * 100) : 0}%
                </Badge>
              </div>
              <h3 className="font-semibold text-carbs mb-2">Kohlenhydrate</h3>
              <div className="text-2xl font-bold text-carbs mb-1">{averages.carbs}g</div>
              <div className="text-sm text-muted-foreground">Ziel: {dailyGoals?.carbs || 99}g</div>
              <div className="w-full bg-carbs/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-carbs h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (averages.carbs / (dailyGoals?.carbs || 99)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="relative p-6 bg-gradient-to-br from-fats/10 to-fats/20 rounded-xl border border-fats/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-fats/20 rounded-lg flex items-center justify-center">
                  <div className="text-lg">🥑</div>
                </div>
                <Badge variant="outline" className="border-fats text-fats">
                  {averages.fats > 0 ? Math.round((averages.fats / (dailyGoals?.fats || 51)) * 100) : 0}%
                </Badge>
              </div>
              <h3 className="font-semibold text-fats mb-2">Fette</h3>
              <div className="text-2xl font-bold text-fats mb-1">{averages.fats}g</div>
              <div className="text-sm text-muted-foreground">Ziel: {dailyGoals?.fats || 51}g</div>
              <div className="w-full bg-fats/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-fats h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (averages.fats / (dailyGoals?.fats || 51)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Coaching Assistant */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">AI Coach Assistant</div>
              <div className="text-sm text-muted-foreground font-normal">Dein intelligenter Ernährungsberater</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-border/50">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="text-lg">🤖</div>
              </div>
              <div className="flex-1">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {generateBotMessage()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              className="flex-1 min-w-0"
              onClick={() => toast.info("Chat-Feature kommt bald! 💬")}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat starten
            </Button>
            <Button 
              variant="outline"
              className="flex-1 min-w-0"
              onClick={generateRecommendations}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
              )}
              Neue Empfehlungen
            </Button>
          </div>
          
          {recommendations && (
            <Collapsible className="mt-6">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-4 h-auto bg-primary/5 hover:bg-primary/10">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-primary" />
                    <span className="font-medium">Personalisierte Rezeptempfehlungen anzeigen</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {recommendations}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Coach;