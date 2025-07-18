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
      className="min-h-screen bg-gradient-to-br from-background to-muted/50 pb-32 relative overflow-hidden"
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

      {/* Main Content - ohne doppelten Container */}
      <div className="space-y-6">
        {/* Daily Progress Overview */}
        <DailyProgress 
          dailyTotals={dailyTotals}
          dailyGoal={dailyGoal}
          userGoal={userGoal}
        />

        {/* Motivational Quote */}
        <div className="px-4">
          <RandomQuote 
            userGender={profileData?.gender} 
            refreshTrigger={quoteRefreshTrigger}
            fallbackText={t('motivation.fallback')}
          />
        </div>

        {/* BMI Progress */}
        <BMIProgress 
          startWeight={profileData?.start_weight || profileData?.weight || 70}
          currentWeight={profileData?.weight || 70}
          targetWeight={profileData?.target_weight || 70}
          height={profileData?.height || 170}
        />

        {/* Weight Tracker */}
        <WeightTracker weightHistory={[]} onWeightAdded={() => {}} />

        {/* Meals List */}
        <MealList 
          dailyMeals={dailyMeals}
          onEditMeal={() => {}}
          onDeleteMeal={() => loadUserData()}
        />
      </div>

    </div>
  );
};

export default Index;