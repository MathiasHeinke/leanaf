import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Settings from "@/components/Settings";
import History from "@/components/History";
import Coach from "@/components/Coach";
import Profile from "@/pages/Profile";
import Subscription from "@/pages/Subscription";
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
  LogOut
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
}

const Index = () => {
  const [inputMode, setInputMode] = useState<'photo' | 'voice' | 'text' | null>(null);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [dailyMeals, setDailyMeals] = useState<MealData[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'history' | 'coach' | 'profile' | 'subscription'>('main');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user, loading: authLoading, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load daily goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (goalsError && goalsError.code !== 'PGRST116') {
        throw goalsError;
      }

      if (goalsData) {
        setDailyGoal({
          calories: goalsData.calories,
          protein: goalsData.protein,
          carbs: goalsData.carbs,
          fats: goalsData.fats,
        });
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
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
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
      setInputMode(null);
      
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

  const handlePhotoUpload = () => {
    toast.info(t('input.photoUpload'));
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
  if (currentView === 'settings') {
    return (
      <Settings 
        dailyGoal={dailyGoal} 
        onGoalChange={setDailyGoal} 
        onClose={() => setCurrentView('main')} 
      />
    );
  }

  if (currentView === 'history') {
    return (
      <History 
        onClose={() => setCurrentView('main')} 
        dailyGoal={dailyGoal}
      />
    );
  }

  if (currentView === 'coach') {
    return (
      <Coach 
        onClose={() => setCurrentView('main')} 
        dailyTotals={dailyTotals}
        dailyGoal={dailyGoal}
        mealsCount={dailyMeals.length}
      />
    );
  }

  if (currentView === 'profile') {
    return (
      <Profile onClose={() => setCurrentView('main')} />
    );
  }

  if (currentView === 'subscription') {
    return (
      <Subscription onClose={() => setCurrentView('main')} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary to-primary-glow p-3 rounded-2xl">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {t('app.title')}
              </h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCurrentView('profile')}>
                  <User className="h-4 w-4 mr-2" />
                  {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('subscription')}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('nav.subscription')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('app.welcome')}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentView('history')}
            className="flex-1"
          >
            <HistoryIcon className="h-4 w-4 mr-2" />
            {t('nav.history')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentView('coach')}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {t('coach.title')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentView('settings')}
            className="flex-1"
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            {t('nav.settings')}
          </Button>
        </div>

        {/* Daily Dashboard */}
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
          
          {/* Calorie Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{t('app.calories')}</span>
              <span className="text-sm text-muted-foreground">
                {dailyTotals.calories}/{dailyGoal.calories} kcal
              </span>
            </div>
            <Progress value={calorieProgress} className="h-3 mb-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3 w-3" />
              {dailyGoal.calories - dailyTotals.calories > 0 
                ? `${dailyGoal.calories - dailyTotals.calories} kcal remaining`
                : `${dailyTotals.calories - dailyGoal.calories} kcal over goal`
              }
            </div>
          </div>

          {/* Macro Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-protein-light border border-protein/20">
              <div className="text-xs text-protein font-medium mb-1">{t('app.protein')}</div>
              <div className="font-bold text-protein">{dailyTotals.protein}g</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-carbs-light border border-carbs/20">
              <div className="text-xs text-carbs font-medium mb-1">{t('app.carbs')}</div>
              <div className="font-bold text-carbs">{dailyTotals.carbs}g</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-fats-light border border-fats/20">
              <div className="text-xs text-fats font-medium mb-1">{t('app.fats')}</div>
              <div className="font-bold text-fats">{dailyTotals.fats}g</div>
            </div>
          </div>
        </Card>

        {/* Input Modes */}
        {!inputMode && (
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-center mb-4">
              {t('app.addMeal')}
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setInputMode('photo')}
                className="justify-start h-auto p-4"
              >
                <Camera className="h-6 w-6 mr-3" />
                {t('input.photo')}
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setInputMode('voice')}
                className="justify-start h-auto p-4"
              >
                <Mic className="h-6 w-6 mr-3" />
                {t('input.voice')}
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setInputMode('text')}
                className="justify-start h-auto p-4"
              >
                <Type className="h-6 w-6 mr-3" />
                {t('input.text')}
              </Button>
            </div>
          </div>
        )}

        {/* Input Interface */}
        {inputMode && (
          <Card className="p-6 mb-6 border-2 border-primary/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {inputMode === 'photo' && t('input.photo')}
                {inputMode === 'voice' && t('input.voice')}
                {inputMode === 'text' && t('input.text')}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setInputMode(null)}
              >
                {t('common.cancel')}
              </Button>
            </div>

            {inputMode === 'photo' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                  <p className="text-muted-foreground mb-4">
                    {t('input.photoUpload')}
                  </p>
                  <Button variant="outline" onClick={handlePhotoUpload}>
                    {t('input.photo')}
                  </Button>
                </div>
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="space-y-4">
                <div className="text-center p-8">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                    isRecording ? 'bg-red-100 border-4 border-red-500 animate-pulse' : 'bg-primary/10'
                  }`}>
                    <Mic className={`h-8 w-8 ${isRecording ? 'text-red-500' : 'text-primary'}`} />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {isRecording ? t('input.recording') : t('input.record')}
                  </p>
                  <Button 
                    variant={isRecording ? "destructive" : "outline"} 
                    onClick={handleVoiceRecord}
                    disabled={isAnalyzing}
                  >
                    {isRecording ? t('common.stop') : t('input.record')}
                  </Button>
                </div>
                {inputText && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Text:</label>
                    <Textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('input.placeholder')}
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </div>
            )}

            {inputMode === 'text' && (
              <div className="space-y-4">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('input.placeholder')}
                  className="min-h-[120px] text-base"
                />
              </div>
            )}

            {inputText && (
              <div className="mt-6 pt-4 border-t">
                <Button 
                  onClick={handleSubmitMeal} 
                  className="w-full"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                      {t('app.analyzing')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      {t('app.addMeal')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Today's Meals */}
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
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <Zap className="h-4 w-4" />
                    {meal.calories} kcal
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
        {dailyMeals.length === 0 && !inputMode && (
          <Card className="p-8 text-center border-dashed border-2 border-muted">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">{t('app.noMeals')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('app.addMeal')}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;