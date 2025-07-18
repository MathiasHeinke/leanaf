import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BMIProgress from "@/components/BMIProgress";
import { RandomQuote } from "@/components/RandomQuote";
import { DailyProgress } from "@/components/DailyProgress";
import { WeightTracker } from "@/components/WeightTracker";
import { MealList } from "@/components/MealList";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { populateQuotes } from "@/utils/populateQuotes";
import { UserGoal } from "@/utils/goalBasedMessaging";
import { 
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown,
  Flame,
  Zap,
  Droplet,
  Plus
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
  const [dailyMeals, setDailyMeals] = useState<MealData[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userGoal, setUserGoal] = useState<UserGoal>('maintain');
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [quoteRefreshTrigger, setQuoteRefreshTrigger] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  
  // Initialize meal input hook
  const mealInputHook = useGlobalMealInput();
  
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load data on mount and refresh
  useEffect(() => {
    const refreshData = () => {
      setQuoteRefreshTrigger(prev => prev + 1);
      if (user) {
        loadUserData();
        // Refresh meal input data
        window.dispatchEvent(new CustomEvent('meal-added'));
      }
    };

    window.addEventListener('meal-added', refreshData);
    window.addEventListener('coach-message-sent', refreshData);
    
    return () => {
      window.removeEventListener('meal-added', refreshData);
      window.removeEventListener('coach-message-sent', refreshData);
    };
  }, [user]);

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
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      console.log('Profile data loaded:', profileData);

      if (profileData) {
        const profile: ProfileData = {
          weight: Number(profileData.weight) || 70,
          start_weight: Number(profileData.start_weight) || undefined,
          height: Number(profileData.height) || 170,
          age: Number(profileData.age) || 30,
          gender: profileData.gender || 'male',
          activity_level: profileData.activity_level || 'moderate',
          goal: profileData.goal || 'maintain',
          target_weight: Number(profileData.target_weight) || Number(profileData.weight) || 70,
          target_date: profileData.target_date
        };

        setProfileData(profile);
        setUserGoal(profile.goal as UserGoal);

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

      // Load meals for the selected date or today
      const targetDate = selectedDate ? new Date(selectedDate) : new Date();
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const startOfNextDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      
      console.log('Loading meals for date:', {
        selectedDate,
        targetDate: targetDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        startOfNextDay: startOfNextDay.toISOString()
      });
      
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', startOfNextDay.toISOString())
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
        toast.success(t('common.dataUpdated'));
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

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, selectedDate]);

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-2xl font-semibold text-foreground">{t('common.loading')}</h2>
          <p className="text-muted-foreground">{t('loading.userData')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden pb-32"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Animated Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Pull to refresh indicator */}
      {isPulling && pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center backdrop-blur-lg transition-all duration-200"
          style={{ 
            height: pullDistance,
            background: 'var(--glass-bg)',
            borderBottom: '1px solid var(--glass-border)'
          }}
        >
          <RefreshCw className={`h-6 w-6 text-primary ${pullDistance > 50 ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 px-4 py-8 space-y-8 max-w-md mx-auto">
        
        {/* Header with Greeting */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Guten Tag!</h1>
          <p className="text-muted-foreground">Dein Fortschritt heute</p>
        </div>

        {/* Main Calorie Card */}
        <div className="glass-card-floating p-8 text-center space-y-6">
          <div className="space-y-2">
            <div className="text-4xl font-bold gradient-text">
              {dailyTotals.calories.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              von {dailyGoal.calories.toLocaleString()} kcal
            </div>
          </div>
          
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="2"
                strokeDasharray={`${calorieProgress}, 100`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Verbleibend: </span>
            <span className="font-semibold text-foreground">
              {Math.max(0, remainingCalories)} kcal
            </span>
          </div>
        </div>

        {/* Macro Grid */}
        <div className="macro-grid">
          {/* Protein */}
          <div className="macro-card">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" 
                 style={{ background: 'hsl(var(--protein-light))' }}>
              <Zap className="w-6 h-6" style={{ color: 'hsl(var(--protein))' }} />
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--protein))' }}>
                {Math.round(dailyTotals.protein)}g
              </div>
              <div className="text-xs text-muted-foreground">Protein</div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(proteinProgress, 100)}%`,
                    background: 'hsl(var(--protein))'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Carbs */}
          <div className="macro-card">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" 
                 style={{ background: 'hsl(var(--carbs-light))' }}>
              <Target className="w-6 h-6" style={{ color: 'hsl(var(--carbs))' }} />
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--carbs))' }}>
                {Math.round(dailyTotals.carbs)}g
              </div>
              <div className="text-xs text-muted-foreground">Kohlenhydrate</div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(carbsProgress, 100)}%`,
                    background: 'hsl(var(--carbs))'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Fats */}
          <div className="macro-card">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" 
                 style={{ background: 'hsl(var(--fats-light))' }}>
              <Droplet className="w-6 h-6" style={{ color: 'hsl(var(--fats))' }} />
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--fats))' }}>
                {Math.round(dailyTotals.fats)}g
              </div>
              <div className="text-xs text-muted-foreground">Fette</div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(fatsProgress, 100)}%`,
                    background: 'hsl(var(--fats))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Quote Card */}
        <div className="glass-card p-6">
          <RandomQuote 
            userGender={profileData?.gender} 
            refreshTrigger={quoteRefreshTrigger}
            fallbackText={t('motivation.fallback')}
          />
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* BMI Card */}
          <div className="glass-card p-4">
            <BMIProgress 
              startWeight={profileData?.start_weight || profileData?.weight || 70}
              currentWeight={profileData?.weight || 70}
              targetWeight={profileData?.target_weight || 70}
              height={profileData?.height || 170}
            />
          </div>

          {/* Weight Trend Card */}
          <div className="glass-card p-4">
            <WeightTracker weightHistory={[]} onWeightAdded={() => {}} />
          </div>
        </div>

        {/* Recent Meals */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Heutige Mahlzeiten</h3>
          <MealList 
            dailyMeals={dailyMeals.slice(0, 3)}
            onEditMeal={() => {}}
            onDeleteMeal={() => loadUserData()}
          />
          {dailyMeals.length > 3 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Alle anzeigen ({dailyMeals.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab">
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

export default Index;