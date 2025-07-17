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
        .single();
      
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
    <div className="space-y-6">
      {/* Smaller Personal Session Request Button */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold mb-1">Persönliche Beratung</h3>
              <p className="text-sm text-muted-foreground">
                Erreiche deine Ziele definitiv!
              </p>
            </div>
            <Button 
              onClick={requestPersonalSession}
              className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
              size="sm"
            >
              <Phone className="h-4 w-4" />
              Gespräch anfordern
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Goals and Current Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ziele und aktueller Stand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-accent/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Tagesziel</div>
              <div className="text-xl font-bold text-primary">{dailyGoals?.calories || 1323} kcal</div>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Ø Kalorien</div>
              <div className="text-xl font-bold text-blue-600">{averages.calories} kcal</div>
              <div className="text-xs text-muted-foreground">
                {historyData.filter(entry => entry.meals.length > 0).length} ausgefüllte Tage
              </div>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Zielerreichung</div>
              <div className="text-xl font-bold text-green-600">
                {averages.calories > 0 ? Math.round((averages.calories / (dailyGoals?.calories || 1323)) * 100) : 0}%
              </div>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Heute</div>
              <div className="text-xl font-bold text-orange-600">{todaysTotals.calories} kcal</div>
            </div>
          </div>
          
          {/* Macro Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-protein/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Protein Ø</div>
              <div className="text-lg font-bold text-protein">{averages.protein}g</div>
              <div className="text-xs text-muted-foreground">Ziel: {dailyGoals?.protein || 116}g</div>
            </div>
            <div className="text-center p-3 bg-carbs/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Kohlenhydrate Ø</div>
              <div className="text-lg font-bold text-carbs">{averages.carbs}g</div>
              <div className="text-xs text-muted-foreground">Ziel: {dailyGoals?.carbs || 99}g</div>
            </div>
            <div className="text-center p-3 bg-fats/10 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Fette Ø</div>
              <div className="text-lg font-bold text-fats">{averages.fats}g</div>
              <div className="text-xs text-muted-foreground">Ziel: {dailyGoals?.fats || 51}g</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coaching Bot */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="text-2xl">🤖</div>
            Coaching Bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {generateBotMessage()}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toast.info("Chat-Feature kommt bald!")}
            >
              💬 Frage stellen
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateRecommendations}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              🔄 Neue Analyse
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Coach;