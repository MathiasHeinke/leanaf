import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Coach from "@/components/Coach";
import History from "@/components/History";
import Profile from "@/pages/Profile";
import Subscription from "@/pages/Subscription";
import { RandomQuote } from "@/components/RandomQuote";
import { populateQuotes } from "@/utils/populateQuotes";
import { 
  Camera, 
  Mic, 
  Type, 
  Plus, 
  Target, 
  Calendar,
  Flame,
  Activity,
  Zap,
  Heart,
  Settings as SettingsIcon,
  History as HistoryIcon,
  MessageCircle,
  Menu,
  User,
  CreditCard,
  LogOut,
  RefreshCw,
  Send,
  StopCircle,
  ImagePlus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Star,
  Sparkles
} from "lucide-react";

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

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr?: number;
  tdee?: number;
}

interface ProfileData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  target_weight: number;
  target_date?: string;
}

const Index = () => {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [dailyMeals, setDailyMeals] = useState<MealData[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'coach' | 'history' | 'profile' | 'subscription'>('main');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealData | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);
  const [quoteRefreshTrigger, setQuoteRefreshTrigger] = useState(0);
  
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Listen for coach navigation event from global header
  useEffect(() => {
    const handleCoachNavigation = () => {
      setCurrentView('coach');
    };

    window.addEventListener('navigate-coach', handleCoachNavigation);

    return () => {
      window.removeEventListener('navigate-coach', handleCoachNavigation);
    };
  }, []);

  // Populate quotes on first load
  useEffect(() => {
    const initializeQuotes = async () => {
      try {
        const result = await populateQuotes();
        if (result.success) {
          console.log('Quotes populated successfully:', result.message);
        } else {
          console.error('Failed to populate quotes:', result.error);
        }
      } catch (error) {
        console.error('Error populating quotes:', error);
      }
    };

    initializeQuotes();
  }, []);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      
      console.log('Loading user data for user:', user?.id);
      
      // Load profile data first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      console.log('Profile data loaded:', profileData);

      if (profileData) {
        const profile: ProfileData = {
          weight: Number(profileData.weight) || 70,
          height: Number(profileData.height) || 170,
          age: Number(profileData.age) || 30,
          gender: profileData.gender || 'male',
          activity_level: profileData.activity_level || 'moderate',
          goal: profileData.goal || 'maintain',
          target_weight: Number(profileData.target_weight) || Number(profileData.weight) || 70,
          target_date: profileData.target_date
        };

        setProfileData(profile);

        // Load daily goals from database instead of calculating
        const { data: dailyGoalsData, error: dailyGoalsError } = await supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dailyGoalsError) {
          console.error('Daily goals error:', dailyGoalsError);
          // Fallback to default values if no goals found
          setDailyGoal({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
        } else if (dailyGoalsData) {
          const goals: DailyGoal = {
            calories: Number(dailyGoalsData.calories) || 2000,
            protein: Number(dailyGoalsData.protein) || 150,
            carbs: Number(dailyGoalsData.carbs) || 250,
            fats: Number(dailyGoalsData.fats) || 65,
            bmr: Number(dailyGoalsData.bmr) || undefined,
            tdee: Number(dailyGoalsData.tdee) || undefined,
          };
          
          console.log('Daily goals loaded from database:', goals);
          setDailyGoal(goals);
        }
      }

      // Load today's meals
      const today = new Date().toISOString().split('T')[0];
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      if (mealsError) {
        console.error('Meals error:', mealsError);
        throw mealsError;
      }

      if (mealsData) {
        const formattedMeals = mealsData.map(meal => ({
          id: meal.id,
          text: meal.text,
          calories: Number(meal.calories),
          protein: Number(meal.protein),
          carbs: Number(meal.carbs),
          fats: Number(meal.fats),
          timestamp: new Date(meal.created_at),
          meal_type: meal.meal_type,
        }));
        setDailyMeals(formattedMeals);
        console.log('Meals loaded:', formattedMeals.length);
      }
      
      if (showRefreshIndicator) {
        toast.success('Daten aktualisiert');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    loadUserData(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      handleManualRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  // Calculate daily totals
  const dailyTotals = dailyMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fats: totals.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const calorieProgress = (dailyTotals.calories / dailyGoal.calories) * 100;
  const proteinProgress = (dailyTotals.protein / dailyGoal.protein) * 100;
  const carbsProgress = (dailyTotals.carbs / dailyGoal.carbs) * 100;
  const fatsProgress = (dailyTotals.fats / dailyGoal.fats) * 100;

  const remainingCalories = dailyGoal.calories - dailyTotals.calories;
  const remainingProtein = dailyGoal.protein - dailyTotals.protein;
  const remainingCarbs = dailyGoal.carbs - dailyTotals.carbs;
  const remainingFats = dailyGoal.fats - dailyTotals.fats;

  // Check if any values are exceeded
  const caloriesExceeded = dailyTotals.calories > dailyGoal.calories;
  const proteinExceeded = dailyTotals.protein > dailyGoal.protein;
  const carbsExceeded = dailyTotals.carbs > dailyGoal.carbs;
  const fatsExceeded = dailyTotals.fats > dailyGoal.fats;

  // Motivational messages
  const getMotivationalMessage = () => {
    const progress = calorieProgress;
    
    if (progress <= 25) {
      return t('motivation.start');
    } else if (progress <= 50) {
      return t('motivation.half');
    } else if (progress <= 75) {
      return t('motivation.progress');
    } else if (progress <= 95) {
      return t('motivation.almost');
    } else if (progress <= 100) {
      return t('motivation.perfect');
    } else {
      return t('motivation.over');
    }
  };

  // Show motivation animation when goals are nearly reached
  useEffect(() => {
    if (calorieProgress >= 90 && calorieProgress <= 100 && !showMotivation) {
      setShowMotivation(true);
      setTimeout(() => setShowMotivation(false), 3000);
    }
  }, [calorieProgress, showMotivation]);

  const handleSubmitMeal = async () => {
    if (!inputText.trim()) {
      toast.error(t('app.error'));
      return;
    }

    setIsAnalyzing(true);
    console.log('Starting meal analysis for:', inputText);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { text: inputText },
      });

      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.total) {
        throw new Error('Invalid response format from analysis service');
      }

      const newMeal = {
        user_id: user?.id,
        text: inputText,
        calories: Math.round(data.total.calories),
        protein: Math.round(data.total.protein),
        carbs: Math.round(data.total.carbs),
        fats: Math.round(data.total.fats),
        meal_type: getCurrentMealType()
      };

      console.log('Inserting meal:', newMeal);

      const { data: insertedMeal, error: insertError } = await supabase
        .from('meals')
        .insert([newMeal])
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log('Successfully inserted meal:', insertedMeal);

      const formattedMeal: MealData = {
        id: insertedMeal.id,
        text: insertedMeal.text,
        calories: Number(insertedMeal.calories),
        protein: Number(insertedMeal.protein),
        carbs: Number(insertedMeal.carbs),
        fats: Number(insertedMeal.fats),
        timestamp: new Date(insertedMeal.created_at),
        meal_type: insertedMeal.meal_type,
      };

      setDailyMeals(prev => [formattedMeal, ...prev]);
      setInputText("");
      
      toast.success(t('app.mealAdded'));
    } catch (error: any) {
      console.error('Error analyzing meal:', error);
      toast.error(error.message || t('app.error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCurrentMealType = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 19) return "dinner";
    return "snack";
  };

  const handleVoiceRecord = async () => {
    if (!isRecording) {
      try {
        console.log('Starting voice recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          await processAudioRecording(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
        setIsRecording(true);
        toast.info(t('input.recording'));
      } catch (error) {
        console.error('Error starting recording:', error);
        toast.error('Mikrofonzugriff verweigert');
      }
    } else {
      console.log('Stopping voice recording...');
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
        setIsRecording(false);
      }
    }
  };

  const processAudioRecording = async (audioBlob: Blob) => {
    try {
      console.log('Processing audio recording...');
      toast.info('Verarbeite Spracheingabe...');
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        try {
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64 },
          });

          if (error) {
            console.error('Voice-to-text error:', error);
            throw error;
          }

          if (data.text) {
            setInputText(data.text);
            toast.success('Sprache erkannt: ' + data.text);
          } else {
            toast.error('Keine Sprache erkannt');
          }
        } catch (error) {
          console.error('Error processing voice:', error);
          toast.error('Fehler bei der Spracherkennung');
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Fehler bei der Audioverarbeitung');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast.info(t('input.photoUpload'));
      // TODO: Implement photo analysis
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
      await loadUserData(true);
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
      await loadUserData(true);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Render different views
  if (currentView === 'history') {
    return (
      <History 
        onClose={() => {
          setCurrentView('main');
          loadUserData(true);
        }} 
        dailyGoal={dailyGoal}
      />
    );
  }

  if (currentView === 'coach') {
    return (
      <Coach onClose={() => setCurrentView('main')} />
    );
  }

  if (currentView === 'profile') {
    return (
      <Profile onClose={() => {
        setCurrentView('main');
        loadUserData(true);
      }} />
    );
  }

  if (currentView === 'subscription') {
    return (
      <Subscription onClose={() => setCurrentView('main')} />
    );
  }

  // Always use the global header, but pass specific props for the main view
  return (
    <div>
      {/* Motivation Animation */}
      {showMotivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg text-lg font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Fast geschafft! 🎯
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>
      )}
      
      {/* Daily Progress */}
      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary-glow to-primary"></div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-2 rounded-full">
                <Target className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t('dashboard.dailyProgress')}</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
        <Card className="p-6 mb-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold">{t('app.dailyProgress')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Warning for exceeded calories */}
          {caloriesExceeded && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 text-sm font-medium">
                {language === 'de' 
                  ? `Achtung: Du hast dein Kalorienziel um ${Math.abs(remainingCalories)} kcal überschritten!`
                  : `Warning: You have exceeded your calorie goal by ${Math.abs(remainingCalories)} kcal!`
                }
              </span>
            </div>
          )}
          
          {/* Calorie Progress with enhanced visualization */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{t('app.calories')}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${caloriesExceeded ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                  {dailyTotals.calories}/{dailyGoal.calories} kcal
                </span>
                {remainingCalories > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <Progress 
              value={Math.min(calorieProgress, 100)} 
              className={`h-3 mb-2 ${caloriesExceeded ? '[&>div]:bg-red-500' : ''}`} 
            />
            <div className="flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3" />
               <span className={remainingCalories > 0 ? "text-green-600" : "text-red-600"}>
                 {remainingCalories > 0 
                   ? `${remainingCalories} ${t('ui.kcal')} ${t('ui.remaining')}`
                   : `${Math.abs(remainingCalories)} ${t('ui.kcal')} ${t('ui.overGoal')}`
                 }
               </span>
            </div>
          </div>

          {/* Enhanced Macro Overview with progress and red indicators */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`text-center p-3 rounded-xl border ${proteinExceeded ? 'bg-red-50 border-red-200' : 'bg-protein-light border-protein/20'}`}>
              <div className={`text-xs font-medium mb-1 ${proteinExceeded ? 'text-red-600' : 'text-protein'}`}>{t('app.protein')}</div>
              <div className={`font-bold mb-2 ${proteinExceeded ? 'text-red-600' : 'text-protein'}`}>{dailyTotals.protein}{t('ui.gram')}</div>
              <Progress 
                value={Math.min(proteinProgress, 100)} 
                className={`h-1 mb-1 ${proteinExceeded ? '[&>div]:bg-red-500' : ''}`} 
              />
              <div className={`text-xs ${proteinExceeded ? 'text-red-600 font-bold' : 'text-protein/70'}`}>
                {remainingProtein > 0 ? `+${remainingProtein}${t('ui.gram')}` : `${Math.abs(remainingProtein)}${t('ui.gram')} ${t('ui.overBy')}`}
              </div>
            </div>
            <div className={`text-center p-3 rounded-xl border ${carbsExceeded ? 'bg-red-50 border-red-200' : 'bg-carbs-light border-carbs/20'}`}>
              <div className={`text-xs font-medium mb-1 ${carbsExceeded ? 'text-red-600' : 'text-carbs'}`}>{t('app.carbs')}</div>
              <div className={`font-bold mb-2 ${carbsExceeded ? 'text-red-600' : 'text-carbs'}`}>{dailyTotals.carbs}{t('ui.gram')}</div>
              <Progress 
                value={Math.min(carbsProgress, 100)} 
                className={`h-1 mb-1 ${carbsExceeded ? '[&>div]:bg-red-500' : ''}`} 
              />
              <div className={`text-xs ${carbsExceeded ? 'text-red-600 font-bold' : 'text-carbs/70'}`}>
                {remainingCarbs > 0 ? `+${remainingCarbs}${t('ui.gram')}` : `${Math.abs(remainingCarbs)}${t('ui.gram')} ${t('ui.overBy')}`}
              </div>
            </div>
            <div className={`text-center p-3 rounded-xl border ${fatsExceeded ? 'bg-red-50 border-red-200' : 'bg-fats-light border-fats/20'}`}>
              <div className={`text-xs font-medium mb-1 ${fatsExceeded ? 'text-red-600' : 'text-fats'}`}>{t('app.fats')}</div>
              <div className={`font-bold mb-2 ${fatsExceeded ? 'text-red-600' : 'text-fats'}`}>{dailyTotals.fats}{t('ui.gram')}</div>
              <Progress 
                value={Math.min(fatsProgress, 100)} 
                className={`h-1 mb-1 ${fatsExceeded ? '[&>div]:bg-red-500' : ''}`} 
              />
              <div className={`text-xs ${fatsExceeded ? 'text-red-600 font-bold' : 'text-fats/70'}`}>
                {remainingFats > 0 ? `+${remainingFats}${t('ui.gram')}` : `${Math.abs(remainingFats)}${t('ui.gram')} ${t('ui.overBy')}`}
              </div>
            </div>
          </div>

          {/* Motivational message */}
          <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Star className="h-4 w-4" />
              {getMotivationalMessage()}
            </div>
          </div>

          {/* Goal information */}
          {profileData?.target_date && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('ui.goal')}: {profileData.target_weight}kg</span>
                <span className="text-muted-foreground">
                  {t('ui.until')} {new Date(profileData.target_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Quote Section */}
          <div className="mt-4">
            <RandomQuote 
              userGender={profileData?.gender} 
              fallbackText=""
              refreshTrigger={quoteRefreshTrigger}
            />
          </div>
        </Card>

        {/* ChatGPT-style Input */}
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="max-w-md mx-auto">
            <Card className="p-3 shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur">
              <div className="flex items-end gap-2">
                {/* Text Input */}
                <div className="flex-1">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('input.placeholder')}
                    className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim()) {
                          handleSubmitMeal();
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 pb-2">
                  {/* Image Upload */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                  
                  {/* Voice Recording */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 transition-all duration-200 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                        : 'hover:bg-primary/10'
                    }`}
                    onClick={handleVoiceRecord}
                    disabled={isAnalyzing}
                  >
                    {isRecording ? (
                      <StopCircle className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* Send Button */}
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleSubmitMeal}
                    disabled={!inputText.trim() || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Recording Indicator */}
              {isRecording && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-red-500 animate-pulse rounded"></div>
                    <div className="w-1 h-4 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-3 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{t('input.recording')}</span>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Today's Meals */}
        <div className="pb-24">
          {dailyMeals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('app.todaysMeals')}</h3>
              
              {dailyMeals.map((meal) => (
                <Card key={meal.id} className="p-4 shadow-sm border-l-4 border-l-primary">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {meal.meal_type && (
                        <Badge variant="secondary">{meal.meal_type}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {meal.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                        <Zap className="h-4 w-4" />
                        {meal.calories} kcal
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
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {meal.text}
                  </p>
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-protein">P: {meal.protein}g</span>
                    <span className="text-carbs">C: {meal.carbs}g</span>
                    <span className="text-fats">F: {meal.fats}g</span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {dailyMeals.length === 0 && (
            <Card className="p-8 text-center border-dashed border-2 border-muted">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Noch keine Mahlzeiten heute</h3>
               <p className="text-muted-foreground text-sm">
                 Füge deine erste Mahlzeit hinzu
               </p>
             </Card>
           )}
         </div>
       </div>
     );
   };

   export default Index;
