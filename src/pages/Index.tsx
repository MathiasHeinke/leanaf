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
  TrendingDown
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
      className="min-h-screen bg-background pb-32 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {isPulling && pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm transition-all duration-200"
          style={{ height: pullDistance }}
        >
          <RefreshCw className={`h-6 w-6 text-primary ${pullDistance > 50 ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-8 pt-4">
        {/* Hero Section with Stats */}
        <div className="bg-background rounded-3xl p-6 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] dark:shadow-[20px_20px_60px_#0a0a0a,-20px_-20px_60px_#2a2a2a]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('common.welcome')}
            </h1>
            <p className="text-muted-foreground">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE')}
            </p>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background rounded-2xl p-4 shadow-[inset_8px_8px_16px_#bebebe,inset_-8px_-8px_16px_#ffffff] dark:shadow-[inset_8px_8px_16px_#0a0a0a,inset_-8px_-8px_16px_#2a2a2a] text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(dailyTotals.calories)}</div>
              <div className="text-sm text-muted-foreground">{t('common.calories')}</div>
              <div className="text-xs text-muted-foreground">/ {dailyGoal.calories}</div>
            </div>
            <div className="bg-background rounded-2xl p-4 shadow-[inset_8px_8px_16px_#bebebe,inset_-8px_-8px_16px_#ffffff] dark:shadow-[inset_8px_8px_16px_#0a0a0a,inset_-8px_-8px_16px_#2a2a2a] text-center">
              <div className="text-2xl font-bold text-accent">{Math.round(dailyTotals.protein)}g</div>
              <div className="text-sm text-muted-foreground">{t('common.protein')}</div>
              <div className="text-xs text-muted-foreground">/ {dailyGoal.protein}g</div>
            </div>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="bg-background rounded-3xl p-6 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] dark:shadow-[20px_20px_60px_#0a0a0a,-20px_-20px_60px_#2a2a2a]">
          <DailyProgress 
            dailyTotals={dailyTotals}
            dailyGoal={dailyGoal}
            userGoal={userGoal}
          />
        </div>

        {/* Motivational Quote */}
        <div className="bg-background rounded-3xl p-6 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] dark:shadow-[20px_20px_60px_#0a0a0a,-20px_-20px_60px_#2a2a2a]">
          <RandomQuote 
            userGender={profileData?.gender} 
            refreshTrigger={quoteRefreshTrigger}
            fallbackText={t('motivation.fallback')}
          />
        </div>

        {/* BMI Progress */}
        <div className="bg-background rounded-3xl p-6 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] dark:shadow-[20px_20px_60px_#0a0a0a,-20px_-20px_60px_#2a2a2a]">
          <BMIProgress 
            startWeight={profileData?.start_weight || profileData?.weight || 70}
            currentWeight={profileData?.weight || 70}
            targetWeight={profileData?.target_weight || 70}
            height={profileData?.height || 170}
          />
        </div>

        {/* Weight Tracker */}
        <div className="bg-background rounded-3xl p-6 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] dark:shadow-[20px_20px_60px_#0a0a0a,-20px_-20px_60px_#2a2a2a]">
          <WeightTracker weightHistory={[]} onWeightAdded={() => {}} />
        </div>

        {/* Today's Meals */}
        <div className="bg-background rounded-3xl p-6 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] dark:shadow-[20px_20px_60px_#0a0a0a,-20px_-20px_60px_#2a2a2a]">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary text-sm">🍽️</span>
            </div>
            {t('meals.todaysMeals')}
          </h2>
          <MealList 
            dailyMeals={dailyMeals}
            onEditMeal={() => {}}
            onDeleteMeal={() => loadUserData()}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;