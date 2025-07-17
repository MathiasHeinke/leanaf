import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Coach from "@/components/Coach";
import BMIProgress from "@/components/BMIProgress";
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
  Sparkles,
  ExternalLink
} from "lucide-react";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
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
  start_weight?: number;
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
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [bmiProgress, setBMIProgress] = useState<any>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');
  
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
    
    const handleMainNavigation = () => {
      setCurrentView('main');
    };

    window.addEventListener('navigate-coach', handleCoachNavigation);
    window.addEventListener('navigate-main', handleMainNavigation);

    return () => {
      window.removeEventListener('navigate-coach', handleCoachNavigation);
      window.removeEventListener('navigate-main', handleMainNavigation);
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

  // Get current weight from weight_history or fallback to profile
  const getCurrentWeight = async () => {
    if (!user) return null;
    
    try {
      const { data: latestWeight } = await supabase
        .from('weight_history')
        .select('weight, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return latestWeight?.weight || profileData?.weight || null;
    } catch (error) {
      console.error('Error getting current weight:', error);
      return profileData?.weight || null;
    }
  };

  // Calculate BMI progress based on current weight
  const calculateBMIProgress = async () => {
    if (!profileData) return null;
    
    const currentWeight = await getCurrentWeight();
    if (!currentWeight) return null;
    
    const heightInMeters = profileData.height / 100;
    const startBMI = profileData.weight / (heightInMeters * heightInMeters);
    const currentBMI = currentWeight / (heightInMeters * heightInMeters);
    const targetBMI = profileData.target_weight / (heightInMeters * heightInMeters);
    
    return {
      start: parseFloat(startBMI.toFixed(1)),
      current: parseFloat(currentBMI.toFixed(1)),
      target: parseFloat(targetBMI.toFixed(1)),
      progress: Math.round(((startBMI - currentBMI) / (startBMI - targetBMI)) * 100)
    };
  };

  // Load weight history
  const loadWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;

      if (data) {
        setWeightHistory(data.map(entry => ({
          id: entry.id,
          weight: Number(entry.weight),
          date: entry.date
        })));
      }
    } catch (error: any) {
      console.error('Error loading weight history:', error);
    }
  };

  // Save weight entry
  const saveWeightEntry = async () => {
    if (!user || !weightInput) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(weightInput),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update current weight in profile
      await supabase
        .from('profiles')
        .update({ weight: parseFloat(weightInput) })
        .eq('user_id', user.id);

      setWeightInput('');
      setShowWeightInput(false);
      toast.success('Gewicht erfolgreich hinzugefügt!');
      loadWeightHistory();
      
      // Refresh BMI progress
      const newBMIProgress = await calculateBMIProgress();
      setBMIProgress(newBMIProgress);
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Fehler beim Hinzufügen des Gewichts');
    }
  };

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
      loadWeightHistory();
    }
  }, [user]);

  // Load BMI progress when profile data changes
  useEffect(() => {
    if (user && profileData) {
      const loadBMIProgress = async () => {
        const bmiData = await calculateBMIProgress();
        setBMIProgress(bmiData);
      };
      loadBMIProgress();
    }
  }, [user, profileData]);

  // Load user data
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

        // Load daily goals from database
        const { data: dailyGoalsData, error: dailyGoalsError } = await supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dailyGoalsError) {
          console.error('Daily goals error:', dailyGoalsError);
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

      // Load meals from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(7);

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

  // Get weight trend
  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg` };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg` };
  };

  // Render different views
  if (currentView === 'coach') {
    return <Coach onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'history') {
    return <History onClose={() => setCurrentView('main')} dailyGoal={dailyGoal} />;
  }

  if (currentView === 'profile') {
    return <Profile />;
  }

  if (currentView === 'subscription') {
    return <Subscription />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-purple-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Täglicher Fortschritt */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Täglicher Fortschritt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weight Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Gewicht heute eintragen</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder="z.B. 70.5"
                    step="0.1"
                    className="flex-1"
                  />
                  <Button onClick={saveWeightEntry} disabled={!weightInput}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Weight Trend */}
              <div className="flex items-center">
                {(() => {
                  const trend = getWeightTrend();
                  if (!trend) return <p className="text-sm text-muted-foreground">Füge mehr Gewichtseinträge hinzu</p>;
                  const IconComponent = trend.icon;
                  return (
                    <div className={`flex items-center gap-2 ${trend.color}`}>
                      <IconComponent className="h-5 w-5" />
                      <span className="font-medium">{trend.text}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* BMI Progress */}
            {bmiProgress && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">BMI Fortschritt</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Start</p>
                    <p className="text-lg font-semibold">{bmiProgress.start}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aktuell</p>
                    <p className="text-lg font-semibold text-primary">{bmiProgress.current}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ziel</p>
                    <p className="text-lg font-semibold">{bmiProgress.target}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Fortschritt</span>
                    <span>{bmiProgress.progress}%</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, bmiProgress.progress))} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mahlzeiten der letzten 7 Tage */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Mahlzeiten der letzten 7 Tage</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentView('history')}
              >
                Alle anzeigen
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyMeals.length > 0 ? (
              <div className="space-y-3">
                {dailyMeals.map((meal, index) => (
                  <Card key={index} className="p-4 border-l-4 border-l-primary">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10">
                          {meal.meal_type === 'breakfast' ? 'Frühstück' : 
                           meal.meal_type === 'lunch' ? 'Mittagessen' : 
                           meal.meal_type === 'dinner' ? 'Abendessen' : 'Snack'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {meal.timestamp.toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {meal.calories} kcal
                      </Badge>
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
            ) : (
              <Card className="p-8 text-center border-dashed border-2 border-muted">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Noch keine Mahlzeiten</h3>
                <p className="text-muted-foreground text-sm">
                  Füge deine erste Mahlzeit hinzu
                </p>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Gewichtsverlauf der letzten 7 Tage */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Gewichtsverlauf der letzten 7 Tage</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentView('history')}
              >
                Kompletten Verlauf anzeigen
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weightHistory.length > 0 ? (
              <div className="space-y-3">
                {weightHistory.map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('de-DE', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{entry.weight.toFixed(1)} kg</span>
                      {index === 0 && <Badge variant="secondary" className="text-xs">Aktuell</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed border-2 border-muted">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Noch keine Gewichtseinträge</h3>
                <p className="text-muted-foreground text-sm">
                  Trage dein erstes Gewicht ein
                </p>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;