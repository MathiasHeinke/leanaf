import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SavedItems } from "@/components/SavedItems";
import { FloatingCoachChat } from "@/components/FloatingCoachChat";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalCoachChat } from "@/hooks/useGlobalCoachChat";
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
  TrendingUp,
  Mic,
  MicOff,
  Send,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Brain,
  Heart,
  Clock,
  TrendingDown,
  Award,
  BarChart3
} from "lucide-react";
import { UserGoal } from "@/utils/goalBasedMessaging";

interface CoachProps {
  onClose?: () => void;
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

interface CoachMessage {
  type: 'motivation' | 'tip' | 'warning' | 'analysis';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIAnalysis {
  messages: CoachMessage[];
  dailyScore: number;
  summary: string;
}

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  preparation: string;
  mealType: string;
}

interface TrendData {
  weeklyAverage: number;
  monthlyAverage: number;
  trend: 'up' | 'down' | 'stable';
  improvement: string;
  weeklyGoalReach: number;
}

const Coach = ({ onClose }: CoachProps) => {
  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // Meal Suggestions State
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  
  // Saved Recipes State
  const [savedRecipeNames, setSavedRecipeNames] = useState<Set<string>>(new Set());
  const [savingRecipes, setSavingRecipes] = useState<Set<string>>(new Set());
  
  // Coach Tips State
  const [savedTips, setSavedTips] = useState<Set<string>>(new Set());
  const [savingTips, setSavingTips] = useState<Set<string>>(new Set());
  
  // Greeting State
  const [coachGreeting, setCoachGreeting] = useState<string>('');
  const [greetingLoading, setGreetingLoading] = useState(false);
  
  // Weight History State
  const [weightHistory, setWeightHistory] = useState<Array<{date: string, weight: number}>>([]);
  
  // Trend Analysis State
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  
  // Voice Coaching State
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  
  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Data State
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

  // Laden der bereits gespeicherten Rezeptnamen
  const loadSavedRecipeNames = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('title')
        .eq('user_id', user.id)
        .eq('type', 'recipe');
      
      if (error) throw error;
      
      const names = new Set(data?.map(item => item.title) || []);
      setSavedRecipeNames(names);
    } catch (error: any) {
      console.error('Error loading saved recipe names:', error);
    }
  };

  // Laden der bereits gespeicherten Tips
  const loadSavedTips = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('title')
        .eq('user_id', user.id)
        .eq('type', 'tip');
      
      if (error) throw error;
      
      const tips = new Set(data?.map(item => item.title) || []);
      setSavedTips(tips);
    } catch (error: any) {
      console.error('Error loading saved tips:', error);
    }
  };

  // Laden der Gewichtsverlauf
  const loadWeightHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      const history = data?.map(entry => ({
        date: entry.date,
        weight: Number(entry.weight)
      })) || [];
      
      setWeightHistory(history);
    } catch (error: any) {
      console.error('Error loading weight history:', error);
    }
  };

  // Speichern-Funktion für Rezepte
  const saveRecipe = async (meal: MealSuggestion) => {
    if (!user || savedRecipeNames.has(meal.name)) return;
    
    setSavingRecipes(prev => new Set([...prev, meal.name]));
    
    try {
      const { error } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          type: 'recipe',
          title: meal.name,
          content: `${meal.description}\n\nZutaten:\n${meal.ingredients.map(i => `• ${i}`).join('\n')}\n\nZubereitung:\n${meal.preparation}`,
          metadata: {
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
            mealType: meal.mealType
          }
        });
      
      if (error) throw error;
      
      // Füge zur Liste der gespeicherten Rezepte hinzu
      setSavedRecipeNames(prev => new Set([...prev, meal.name]));
      
      // Kurze Verzögerung für visuelles Feedback
      setTimeout(() => {
        setSavingRecipes(prev => {
          const newSet = new Set(prev);
          newSet.delete(meal.name);
          return newSet;
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      setSavingRecipes(prev => {
        const newSet = new Set(prev);
        newSet.delete(meal.name);
        return newSet;
      });
    }
  };

  // Speichern-Funktion für Coach-Tips
  const saveTip = async (tip: CoachMessage) => {
    if (!user || savedTips.has(tip.title)) return;
    
    setSavingTips(prev => new Set([...prev, tip.title]));
    
    try {
      const { error } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          type: 'tip',
          title: tip.title,
          content: tip.message,
          metadata: {
            priority: tip.priority,
            tipType: tip.type
          }
        });
      
      if (error) throw error;
      
      // Füge zur Liste der gespeicherten Tips hinzu
      setSavedTips(prev => new Set([...prev, tip.title]));
      
      toast.success('Tipp gespeichert');
      
      // Kurze Verzögerung für visuelles Feedback
      setTimeout(() => {
        setSavingTips(prev => {
          const newSet = new Set(prev);
          newSet.delete(tip.title);
          return newSet;
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving tip:', error);
      toast.error('Fehler beim Speichern des Tipps');
      setSavingTips(prev => {
        const newSet = new Set(prev);
        newSet.delete(tip.title);
        return newSet;
      });
    }
  };
  
  // Use global coach chat hook
  const coachChatHook = useGlobalCoachChat();

  useEffect(() => {
    if (user) {
      loadDailyGoals();
      loadTodaysMeals();
      loadHistoryData();
      loadSavedRecipeNames();
      loadSavedTips();
      loadWeightHistory();
    }
  }, [user]);

  // Calculate trends when data is available
  useEffect(() => {
    if (user && dailyGoals && todaysMeals.length >= 0 && historyData.length >= 0) {
      calculateTrends();
    }
  }, [user, dailyGoals, todaysMeals, historyData]);

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'de-DE';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpeechText(transcript);
        handleVoiceMessage(transcript);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        // Toast entfernt - User sieht Status direkt
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

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
        calories: goalsData?.calories || 1323,
        protein: goalsData?.protein || 116,
        carbs: goalsData?.carbs || 99,
        fats: goalsData?.fats || 51,
        bmr: goalsData?.bmr,
        tdee: goalsData?.tdee
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

  // Manual AI Analysis - now triggered by button press
  const generateAIAnalysis = async () => {
    if (!user || !dailyGoals) return;
    
    setAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-analysis', {
        body: {
          dailyTotals: todaysTotals,
          dailyGoal: dailyGoals.calories,
          mealsCount: todaysMeals.length,
          userData: { 
            averages,
            historyDays: historyData.length,
            weightHistory
          },
          userId: user.id
        }
      });

      if (error) throw error;
      setAiAnalysis(data);
      toast.success('Analyse aktualisiert');
    } catch (error: any) {
      console.error('Error generating AI analysis:', error);
      toast.error('Fehler bei der Analyse');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Time-based greeting when entering coach
  const generateTimeBasedGreeting = async () => {
    if (!user || greetingLoading) return;
    
    setGreetingLoading(true);
    try {
      const now = new Date();
      const hour = now.getHours();
      const date = now.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const time = now.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      let timeOfDay = 'day';
      if (hour < 11) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'noon';
      else timeOfDay = 'evening';

      const { data, error } = await supabase.functions.invoke('coach-analysis', {
        body: {
          timeBasedGreeting: true,
          timeOfDay,
          currentDate: date,
          currentTime: time,
          dailyTotals: todaysTotals,
          dailyGoal: dailyGoals.calories,
          userData: { 
            averages,
            historyDays: historyData.length,
            weightHistory,
            recentProgress: trendData
          },
          userId: user.id
        }
      });

      if (error) throw error;
      if (data?.greeting) {
        setCoachGreeting(data.greeting);
      }
    } catch (error: any) {
      console.error('Error generating greeting:', error);
    } finally {
      setGreetingLoading(false);
    }
  };

  const generateMealSuggestions = async () => {
    if (!user) return;
    
    setSuggestionsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-recipes', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) throw error;

      // Parse meal suggestions from the response
      if (data.recommendations) {
        try {
          // Check if recommendations is already an object or string
          let suggestions;
          if (typeof data.recommendations === 'string') {
            // Clean the response from markdown formatting and extract JSON
            let cleanResponse = data.recommendations.trim();
            
            // Remove markdown code blocks if present
            cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // Try to find JSON object in the response
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              cleanResponse = jsonMatch[0];
            }
            
            suggestions = JSON.parse(cleanResponse);
          } else {
            suggestions = data.recommendations;
          }
          setMealSuggestions(suggestions.meals || suggestions || []);
        } catch (parseError) {
          console.error('Error parsing meal suggestions:', parseError);
          console.log('Raw response:', data.recommendations);
          // If parsing fails, assume the response is not JSON and handle gracefully
          setMealSuggestions([]);
        }
      }
      
    } catch (error: any) {
      console.error('Error generating meal suggestions:', error);
      // Toast entfernt - User sieht Status direkt
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const calculateTrends = () => {
    if (historyData.length < 7) return;
    
    setTrendsLoading(true);
    try {
      const last7Days = historyData.slice(0, 7);
      const last30Days = historyData.slice(0, 30);
      
      const weeklyAvg = last7Days.reduce((sum, day) => sum + day.totals.calories, 0) / 7;
      const monthlyAvg = last30Days.reduce((sum, day) => sum + day.totals.calories, 0) / Math.min(30, last30Days.length);
      
      const goalReaches = last7Days.filter(day => day.totals.calories >= (dailyGoals?.calories || 1323) * 0.9).length;
      const weeklyGoalReach = (goalReaches / 7) * 100;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (weeklyAvg > monthlyAvg * 1.05) trend = 'up';
      else if (weeklyAvg < monthlyAvg * 0.95) trend = 'down';
      
      const improvement = trend === 'up' ? 
        'Deine Kalorienzufuhr steigt - achte auf deine Ziele!' :
        trend === 'down' ? 
        'Du isst weniger - stelle sicher, dass du genug Energie bekommst!' :
        'Deine Ernährung ist stabil - gut so!';
      
      setTrendData({
        weeklyAverage: Math.round(weeklyAvg),
        monthlyAverage: Math.round(monthlyAvg),
        trend,
        improvement,
        weeklyGoalReach: Math.round(weeklyGoalReach)
      });
    } catch (error) {
      console.error('Error calculating trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setSpeechText('');
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceMessage = async (message: string) => {
    setChatLoading(true);
    try {
      // Process voice message with AI
      const response = await supabase.functions.invoke('coach-analysis', {
        body: {
          voiceMessage: message,
          context: { todaysTotals, dailyGoals, averages },
          userId: user.id
        }
      });
      
      if (response.data?.voiceResponse) {
        setVoiceResponse(response.data.voiceResponse);
        // Speak the response if speech synthesis is available
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(response.data.voiceResponse);
          utterance.lang = 'de-DE';
          speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Error processing voice message:', error);
      // Toast entfernt - User sieht Status direkt
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      const response = await supabase.functions.invoke('coach-chat', {
        body: {
          message: userMessage,
          userId: user.id,
          chatHistory: chatHistory
        }
      });
      
      if (response.error) throw response.error;
      
      if (response.data?.reply) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      // Toast entfernt - User sieht Status direkt
    } finally {
      setChatLoading(false);
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
      // Toast entfernt - User sieht Status direkt
    } finally {
      setHistoryLoading(false);
    }
  };

  const requestPersonalSession = () => {
    // Toast entfernt - User sieht Action direkt
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'motivation': return <Heart className="h-4 w-4" />;
      case 'tip': return <Lightbulb className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'analysis': return <Brain className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'motivation': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30';
      case 'tip': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30';
      case 'warning': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30';
      case 'analysis': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/30';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
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

  // Generate coaching bot message with goal-based messaging
  const generateBotMessage = () => {
    const calorieGoal = dailyGoals?.calories || 1323;
    const calorieAverage = averages.calories;
    const progress = calorieAverage > 0 ? ((calorieAverage / calorieGoal) * 100).toFixed(0) : 0;
    
    // TODO: Get user goal from profile - for now using 'maintain' as default
    // This will be updated when we add user goal fetching
    let userGoal: UserGoal = 'maintain'; // This should come from user profile
    
    const getGoalBasedMessage = () => {
      // For now, we'll use maintain goal logic until we load user profile
      // TODO: Load user goal from profile and use switch statement
      if (calorieAverage >= calorieGoal * 0.9 && calorieAverage <= calorieGoal * 1.1) {
        return "✅ Perfekt! Du hältst dein Gewicht stabil im Zielbereich.";
      } else if (calorieAverage < calorieGoal * 0.9) {
        return "⚠️ Du solltest mehr Kalorien zu dir nehmen für eine stabile Gewichtserhaltung.";
      } else {
        return "⚠️ Du liegst über deinem Kalorienziel. Achte auf deine Kalorienbilanz.";
      }
    };
    
    const messages = [
      `🎯 Hallo! Dein Kalorienziel liegt bei ${calorieGoal} kcal täglich. Du erreichst derzeit ${progress}% davon mit durchschnittlich ${calorieAverage} kcal.`,
      getGoalBasedMessage(),
      "💪 Hast du Fragen zu deiner Ernährung oder brauchst du Unterstützung?"
    ];
    
    return messages.join('\n\n');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Coach Greeting */}
      {coachGreeting && (
        <Card className="glass-card shadow-lg border border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {new Date().getHours() < 11 ? 'Guten Morgen!' : new Date().getHours() < 17 ? 'Hallo!' : 'Guten Abend!'}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{coachGreeting}</p>
              </div>
              {greetingLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced AI Coach Tabs */}
      <Card className="glass-card shadow-xl border-2 border-dashed border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">kaloAI Coach</div>
              <div className="text-sm text-muted-foreground font-normal">Dein intelligenter Ernährungsberater</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Analyse
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Rezepte
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Merken
              </TabsTrigger>
            </TabsList>

            {/* AI Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Detailanalyse</h3>
                  <Button 
                    onClick={generateAIAnalysis}
                    disabled={analysisLoading}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {analysisLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {analysisLoading ? 'Analysiert...' : 'Aktualisieren'}
                  </Button>
                </div>
                
                {analysisLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3">AI analysiert deine Daten...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium">Bewertung</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <Badge variant={aiAnalysis.dailyScore >= 8 ? "default" : aiAnalysis.dailyScore >= 6 ? "secondary" : "destructive"}>
                          {aiAnalysis.dailyScore}/10
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground font-medium">{aiAnalysis.summary}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {aiAnalysis.messages.map((message, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${getMessageColor(message.type)}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getMessageIcon(message.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{message.title}</h4>
                              <p className="text-sm opacity-80">{message.message}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {message.priority}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveTip(message)}
                                disabled={savedTips.has(message.title) || savingTips.has(message.title)}
                                className={`h-8 w-8 p-0 transition-all duration-300 ${
                                  savedTips.has(message.title) 
                                    ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                                    : savingTips.has(message.title)
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-muted-foreground hover:text-primary'
                                }`}
                              >
                                <Heart 
                                  className={`h-4 w-4 ${
                                    savedTips.has(message.title) || savingTips.has(message.title) 
                                      ? 'fill-current' 
                                      : ''
                                  }`} 
                                />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Noch keine AI-Analyse verfügbar</p>
                    <Button onClick={generateAIAnalysis} className="mt-4">
                      Analyse starten
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Meal Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-4">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                {suggestionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3">Meal-Empfehlungen werden erstellt...</span>
                  </div>
                ) : mealSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Personalisierte Rezept-Empfehlungen</h3>
                    <div className="grid gap-4">
                      {mealSuggestions.slice(0, 3).map((meal, index) => (
                        <div key={index} className="glass-card p-4 rounded-xl border border-border/20 hover:border-accent/30 transition-all duration-200">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium text-lg">{meal.name}</h4>
                            <Badge variant="outline">{meal.mealType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>
                          
                          <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
                            <div className="text-center p-2 bg-primary/5 rounded">
                              <div className="font-bold">{meal.calories}</div>
                              <div className="text-xs text-muted-foreground">kcal</div>
                            </div>
                            <div className="text-center p-2 bg-protein/10 rounded">
                              <div className="font-bold">{meal.protein}g</div>
                              <div className="text-xs text-muted-foreground">Protein</div>
                            </div>
                            <div className="text-center p-2 bg-carbs/10 rounded">
                              <div className="font-bold">{meal.carbs}g</div>
                              <div className="text-xs text-muted-foreground">Carbs</div>
                            </div>
                            <div className="text-center p-2 bg-fats/10 rounded">
                              <div className="font-bold">{meal.fats}g</div>
                              <div className="text-xs text-muted-foreground">Fette</div>
                            </div>
                          </div>
                          
                           <div className="flex gap-2 mb-3">
                             <Button 
                               variant={savedRecipeNames.has(meal.name) || savingRecipes.has(meal.name) ? "default" : "outline"}
                               size="sm" 
                               className={`flex-1 transition-all duration-300 ${
                                 savedRecipeNames.has(meal.name) 
                                   ? 'bg-green-500 hover:bg-green-600 text-white border-green-400' 
                                   : savingRecipes.has(meal.name)
                                   ? 'bg-green-500 hover:bg-green-600 text-white border-green-400'
                                   : 'bg-accent/5 hover:bg-accent/10 border-accent/20'
                               }`}
                               onClick={async () => {
                                 if (!savedRecipeNames.has(meal.name)) {
                                   await saveRecipe(meal);
                                 }
                               }}
                               disabled={savedRecipeNames.has(meal.name)}
                             >
                               <Heart className="h-4 w-4 mr-2" />
                               {savedRecipeNames.has(meal.name) 
                                 ? 'Gespeichert' 
                                 : savingRecipes.has(meal.name) 
                                 ? 'Gespeichert'
                                 : 'Speichern'
                               }
                             </Button>
                           </div>
                          
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full">
                                Details anzeigen <ChevronDown className="h-4 w-4 ml-2" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3 space-y-3">
                              <div>
                                <h5 className="font-medium text-sm mb-2">Zutaten:</h5>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {meal.ingredients.map((ingredient, i) => (
                                    <li key={i}>• {ingredient}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-2">Zubereitung:</h5>
                                <p className="text-sm text-muted-foreground">{meal.preparation}</p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Noch keine Rezept-Empfehlungen verfügbar</p>
                    <Button onClick={generateMealSuggestions} className="mt-4">
                      Rezepte generieren
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-4">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                {trendsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3">Trends werden berechnet...</span>
                  </div>
                ) : trendData ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Ernährungs-Trends</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{trendData.weeklyAverage}</div>
                            <div className="text-sm text-muted-foreground">kcal Wochendurchschnitt</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">{trendData.monthlyAverage}</div>
                            <div className="text-sm text-muted-foreground">kcal Monatsdurchschnitt</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            trendData.trend === 'up' ? 'bg-green-100' : 
                            trendData.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            {trendData.trend === 'up' ? (
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : trendData.trend === 'down' ? (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            ) : (
                              <Target className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">Trend: {trendData.trend === 'up' ? 'Steigend' : trendData.trend === 'down' ? 'Fallend' : 'Stabil'}</div>
                            <div className="text-xs text-muted-foreground">Letzte 7 vs 30 Tage</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Award className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-orange-600">{trendData.weeklyGoalReach}%</div>
                            <div className="text-sm text-muted-foreground">Zielerreichung (7 Tage)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Empfehlung
                      </h4>
                      <p className="text-sm text-muted-foreground">{trendData.improvement}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Mindestens 7 Tage Daten für Trend-Analyse benötigt</p>
                    <Button onClick={calculateTrends} className="mt-4" disabled={historyData.length < 7}>
                      Trends berechnen
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Saved Items Tab */}
            <TabsContent value="saved" className="space-y-4">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                <h3 className="text-lg font-semibold mb-4">Gespeicherte Inhalte</h3>
                <SavedItems />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="space-y-4">
        {/* Erste 2 Kacheln nebeneinander */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card hover-scale">
            <CardContent className="p-4 text-center">
              <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500 mb-1">{dailyGoals?.calories || 1323}</div>
              <div className="text-xs text-muted-foreground">kcal</div>
              <div className="text-xs text-muted-foreground">Tagesziel</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover-scale">
            <CardContent className="p-4 text-center">
              <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500 mb-1">{averages.calories}</div>
              <div className="text-xs text-muted-foreground">kcal</div>
              <div className="text-xs text-muted-foreground">Durchschnitt</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Zweite 2 Kacheln nebeneinander */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card hover-scale">
            <CardContent className="p-4 text-center">
              <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-500 mb-1">
                {averages.calories > 0 ? Math.round((averages.calories / (dailyGoals?.calories || 1323)) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Zielerreichung</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover-scale">
            <CardContent className="p-4 text-center">
              <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-500 mb-1">{todaysTotals.calories}</div>
              <div className="text-xs text-muted-foreground">kcal</div>
              <div className="text-xs text-muted-foreground">heute</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Makronährstoffe */}
      <Card className="glass-card shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            Makronährstoffe Durchschnitt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <div className="text-lg">🥩</div>
                </div>
                <Badge variant="outline" className="border-blue-500 text-blue-500 bg-blue-500/10">
                  {averages.protein > 0 ? Math.round((averages.protein / (dailyGoals?.protein || 116)) * 100) : 0}%
                </Badge>
              </div>
              <h3 className="font-semibold text-blue-500 mb-2">Protein</h3>
              <div className="text-2xl font-bold text-blue-500 mb-1">{averages.protein}g</div>
              <div className="text-sm text-muted-foreground">Ø der letzten Tage • Ziel: {dailyGoals?.protein || 116}g</div>
              <div className="w-full bg-blue-500/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (averages.protein / (dailyGoals?.protein || 116)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="relative p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/20 rounded-xl border border-orange-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <div className="text-lg">🍞</div>
                </div>
                <Badge variant="outline" className="border-orange-500 text-orange-500 bg-orange-500/10">
                  {averages.carbs > 0 ? Math.round((averages.carbs / (dailyGoals?.carbs || 99)) * 100) : 0}%
                </Badge>
              </div>
              <h3 className="font-semibold text-orange-500 mb-2">Kohlenhydrate</h3>
              <div className="text-2xl font-bold text-orange-500 mb-1">{averages.carbs}g</div>
              <div className="text-sm text-muted-foreground">Ø der letzten Tage • Ziel: {dailyGoals?.carbs || 99}g</div>
              <div className="w-full bg-orange-500/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (averages.carbs / (dailyGoals?.carbs || 99)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="relative p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/20 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <div className="text-lg">🥑</div>
                </div>
                <Badge variant="outline" className="border-purple-500 text-purple-500 bg-purple-500/10">
                  {averages.fats > 0 ? Math.round((averages.fats / (dailyGoals?.fats || 51)) * 100) : 0}%
                </Badge>
              </div>
              <h3 className="font-semibold text-purple-500 mb-2">Fette</h3>
              <div className="text-2xl font-bold text-purple-500 mb-1">{averages.fats}g</div>
              <div className="text-sm text-muted-foreground">Ø der letzten Tage • Ziel: {dailyGoals?.fats || 51}g</div>
              <div className="w-full bg-purple-500/20 rounded-full h-2 mt-3">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (averages.fats / (dailyGoals?.fats || 51)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FloatingCoachChat - nur auf Coach Seite */}
      <FloatingCoachChat
        inputText={coachChatHook.inputText}
        setInputText={coachChatHook.setInputText}
        onSubmitMessage={coachChatHook.handleSubmitMessage}
        onVoiceRecord={coachChatHook.handleVoiceRecord}
        isThinking={coachChatHook.isThinking}
        isRecording={coachChatHook.isRecording}
        isProcessing={coachChatHook.isProcessing}
        chatHistory={coachChatHook.chatHistory}
        onClearChat={coachChatHook.clearChat}
      />
    </div>
  );
};

export default Coach;