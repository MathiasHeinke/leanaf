import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTrackingPreferences } from "@/hooks/useTrackingPreferences";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { useCredits } from "@/hooks/useCredits";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useMemo } from "react";
import { BootstrapController } from "@/components/BootstrapController";
// import { DebugBadge } from "@/components/DebugBadge"; // Removed for production
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { MealList } from "@/components/MealList";

import { QuickWeightInput } from "@/components/QuickWeightInput";
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput";
import { QuickSleepInput } from "@/components/QuickSleepInput";
import { QuickSupplementInput } from "@/components/QuickSupplementInput";
import { QuickFluidInput } from "@/components/QuickFluidInput";
import { QuickMindsetInput } from "@/components/QuickMindsetInput";
import { BodyMeasurements } from "@/components/BodyMeasurements";
import { SmartCoachInsights } from "@/components/SmartCoachInsights";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { MealConfirmationDialog } from "@/components/MealConfirmationDialog";
import { ProgressCharts } from "@/components/ProgressCharts";


import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MealInputLean } from "@/components/MealInputLean";
import { DashboardMealComposer } from "@/components/DashboardMealComposer";
import { toast } from "sonner";

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { DateNavigation } from "@/components/DateNavigation";
import { CaloriesCard } from "@/components/calories/CaloriesCard";
import { MealEditDialog } from "@/components/MealEditDialog";
import { getGradualGlowColor, calculateCardProgress } from "@/utils/gradualGlow";
import { useFrequentMeals } from "@/hooks/useFrequentMeals";
import { DashboardXPBar } from "@/components/DashboardXPBar";
import confetti from "canvas-confetti";
import { GripVertical } from "lucide-react";
import { usePlusData } from "@/hooks/usePlusData";
import ConcentricStatCard from "@/components/ConcentricStatCard";
import { DashboardFourBarsWithTrend } from "@/components/DashboardFourBarsWithTrend";
import { OtherDrinksCard } from "@/components/OtherDrinksCard";
import { DashboardHaloPair } from "@/components/DashboardHaloPair";
// DEVELOPMENT DEBUG PANELS - Deactivated for production
// import { AuthDebugPanel } from "@/components/AuthDebugPanel";
// import { DebugStatusBadge } from "@/components/DebugStatusBadge"; // Removed for production
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";
import { useTodaysFluids } from "@/hooks/useTodaysFluids";
import { useTodaysWorkout } from "@/hooks/useTodaysWorkout";
import { useDailyGoals } from "@/hooks/useDailyGoals";
import { EmptyCard } from "@/components/EmptyCard";
import { pingAuth, debugAuthStatus } from "@/utils/authDiagnostics";
import FireBackdrop, { FireBackdropHandle, useAchievementFire, useGlassIgnitePulse } from "@/components/FireBackdrop";

// Global diagnostics for browser console
if (typeof window !== "undefined") {
  // @ts-ignore
  window.pingAuth = pingAuth;
  // @ts-ignore  
  window.debugAuthStatus = debugAuthStatus;
}

  // Main wrapper component to handle authentication state
const Index = () => {
  const { user, loading: authLoading, isSessionReady } = useAuth();
  const navigate = useNavigate();

  // FireBackdrop integration
  const fireBackdropRef = useRef<FireBackdropHandle>(null);
  useAchievementFire(fireBackdropRef);
  useGlassIgnitePulse(".glass-card");

  // STABILIZED AUTH CHECK - Prevent render flickering
  const isUserConfirmed = useMemo(() => {
    return !authLoading && !!user && isSessionReady;
  }, [authLoading, user, isSessionReady]);

  useEffect(() => {
    console.log('🔍 Index Auth State:', { 
      isSessionReady, 
      hasUser: !!user, 
      userId: user?.id,
      userEmail: user?.email,
      isUserConfirmed,
      timestamp: new Date().toISOString()
    });
  }, [isSessionReady, user, isUserConfirmed]);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('❌ No authenticated user, redirecting to /auth');
      navigate('/auth');
      return;
    }
  }, [user, authLoading, navigate]);

  // Admin one-off utility: trigger delete via URL param ?deleteUser=email
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('deleteUser');
      if (!email) return;
      // Prevent multiple triggers in hot reloads
      if ((window as any).__del_user_ran) return;
      (window as any).__del_user_ran = true;
      (async () => {
        toast.info(`Attempting to delete ${email}...`);
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
          body: { email, purge: true },
        });
        if (error) {
          console.error('Delete failed:', error);
          toast.error(`Delete failed: ${error.message}`);
          return;
        }
        if ((data as any)?.ok) {
          toast.success(`Deleted ${email}`);
        } else {
          toast.error(`Delete failed: ${(data as any)?.why || 'unknown error'}`);
        }
      })();
    } catch (e) {
      console.error('Delete trigger error:', e);
    }
  }, []);

  // STABLE LOADING STATE - Don't hide dashboard during auth transitions
  if (!isUserConfirmed) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="text-sm text-muted-foreground">
            {authLoading ? 'Checking authentication...' : 'No user found - please log in'}
          </div>
          
          {/* DEVELOPMENT PANEL - Deactivated for cleaner production UI */}
          {/* {!user && <AuthDebugPanel />} */}

        </div>
        
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Render the authenticated dashboard with error boundary and bootstrap controller
  console.log('🎯 Index: Rendering AuthenticatedDashboard', { 
    userId: user?.id, 
    timestamp: new Date().toISOString() 
  });
  
  return (
    <>
      <FireBackdrop 
        ref={fireBackdropRef} 
        defaultIntensity={0.3}
        devFastCycle={false}
        className="fixed inset-0 z-[1]"
      />
      <BootstrapController>
        <DashboardErrorBoundary>
          <AuthenticatedDashboard user={user} />
        </DashboardErrorBoundary>
        {/* <DebugBadge show={true} compact={true} /> */} {/* Removed for production */}
      </BootstrapController>
    </>
  );
};

// Authenticated dashboard component with all hooks
const AuthenticatedDashboard = ({ user }: { user: any }) => {
  const { t } = useTranslation();
  
  // CENTRALIZED BOOTSTRAP PROCESS - Replaces complex useEffect chains
  const bootstrapState = useBootstrap();
  
  // CENTRALIZED PROFILE LOADING - Primary source for profile data
  const { 
    profileData: userProfile, 
    isLoading: profileLoading, 
    error: profileError,
    refreshProfile 
  } = useUserProfile();
  
  // All auth-dependent hooks - AFTER authentication is confirmed
  const { status: creditsStatus, error: creditsError } = useCredits();
  const mealInputHook = useGlobalMealInput();
  const { checkBadges } = useBadgeChecker();
  const { awardPoints, updateStreak, evaluateWorkout, evaluateSleep, getPointsForActivity, getStreakMultiplier } = usePointsSystem();
  const { isTrackingEnabled } = useTrackingPreferences();
  const plusData = usePlusData();
  
  // Debug error tracking
  const [errorFlags, setErrorFlags] = useState<string[]>([]);
  
  // Track errors for debugging
  useEffect(() => {
    const flags: string[] = [];
    if (creditsError) flags.push('credits');
    if (plusData.error) flags.push('plusData');
    if (profileError) flags.push('profile');
    setErrorFlags(flags);
  }, [creditsError, plusData.error, profileError]);
  
  // Frequent meals for smart chips
  const { frequent: frequentMeals } = useFrequentMeals(user?.id, 60);
  
  // State management
  const [meals, setMeals] = useState<any[]>([]);
  const [editingMeal, setEditingMeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calorieSummary, setCalorieSummary] = useState<{ consumed: number; burned: number }>({ consumed: 0, burned: 0 });
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // New state for today's data
  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([]);
  const [todaysSleep, setTodaysSleep] = useState<any>(null);
  const [todaysMeasurements, setTodaysMeasurements] = useState<any>(null);
  const [todaysWeight, setTodaysWeight] = useState<any>(null);
  const [todaysFluids, setTodaysFluids] = useState<any[]>([]);
  const [todaysMindset, setTodaysMindset] = useState<any[]>([]);
  
  // Real-time dashboard data with watchdog
  const { data: todaysFluidsFresh, loading: fluidsLoading, error: fluidsError } = useTodaysFluids();
  const { data: todaysWorkoutFresh, loading: workoutLoading, error: workoutError } = useTodaysWorkout();
  const { data: dailyGoalsFresh, loading: goalsLoading, error: goalsError } = useDailyGoals();

  // XP state for Momentum bar on Index
  const [pointsLoading, setPointsLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsToNext, setPointsToNext] = useState(100);

  // Card order state
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem('quickInputCardOrder');
    return savedOrder ? JSON.parse(savedOrder) : ['sleep', 'weight', 'measurements', 'workout', 'supplements', 'fluids', 'mindset'];
  });


  // SIMPLIFIED DATA LOADING - Single effect triggered by bootstrap completion
  useEffect(() => {
    console.log('🔍 Dashboard render effect:', {
      bootstrapComplete: bootstrapState.bootstrapComplete,
      hasUser: !!user,
      userId: user?.id,
      date: currentDate.toDateString(),
      timestamp: new Date().toISOString()
    });
    
    if (bootstrapState.bootstrapComplete && user) {
      console.log('🚀 Bootstrap complete, loading date-specific data...', {
        date: currentDate.toDateString(),
        duration: bootstrapState.bootstrapDuration
      });
      
      // FAIL-SAFE: Wrap data loading in try-catch to prevent render blocking
      try {
        const loadData = async () => {
          await fetchMealsForDate(currentDate);
          await loadTodaysData(currentDate);
          setDataLoading(false); // FIX: Set dataLoading to false after loading
        };
        loadData();
      } catch (error) {
        console.error('❌ Data loading failed:', error);
        setErrorFlags(prev => [...prev, 'dataLoading']);
        setDataLoading(false); // Even on error, stop showing skeleton
      }
    }
  }, [bootstrapState.bootstrapComplete, user?.id, currentDate]);

  // Legacy data loading (kept as fallback) - only runs if bootstrap hasn't completed
  useEffect(() => {
    if (user && !profileLoading && !bootstrapState.isBootstrapping && !bootstrapState.bootstrapComplete) {
      console.log('🔧 Fallback data loading triggered...');
      const initializeUserData = async () => {
        await loadDailyGoals();
        await loadUserPoints();
      };
      initializeUserData();
    }
  }, [user?.id, profileLoading, bootstrapState.isBootstrapping, bootstrapState.bootstrapComplete]);

  // Update calorie summary when fluids change
  useEffect(() => {
    if (meals.length > 0 || todaysFluids.length > 0) {
      updateCalorieSummary(meals);
    }
  }, [todaysFluids, meals]);

  const loadDailyGoals = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      console.log('🎯 Loading daily goals for user:', user.id);
      
      // Only load daily goals - profile comes from useUserProfile hook
      const { data: goalsData, error: goalsError } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (goalsError) {
        console.error('Error loading daily goals:', goalsError);
        // Try profile fallback before hardcoded values
        const { data: profileData } = await supabase
          .from('profiles')
          .select('daily_calorie_target, protein_target_g, carbs_target_g, fats_target_g')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const fallbackGoals = {
          calories: profileData?.daily_calorie_target || 2500,
          protein: profileData?.protein_target_g || 150,
          carbs: profileData?.carbs_target_g || 250,
          fats: profileData?.fats_target_g || 65
        };
        setDailyGoals(fallbackGoals);
      } else {
        const goals = goalsData || {
          calories: 2500,
          protein: 150,
          carbs: 250,
          fats: 65
        };
        setDailyGoals(goals);
        console.log('✅ Daily goals loaded:', goals);
      }
    } catch (error) {
      console.error('Error loading daily goals:', error);
      // Fallback goals with profile attempt
      const { data: profileData } = await supabase
        .from('profiles')
        .select('daily_calorie_target, protein_target_g, carbs_target_g, fats_target_g')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setDailyGoals({
        calories: profileData?.daily_calorie_target || 2500,
        protein: profileData?.protein_target_g || 150,
        carbs: profileData?.carbs_target_g || 250,
        fats: profileData?.fats_target_g || 65
      });
    } finally {
      setDataLoading(false);
    }
  };

  const loadUserPoints = async () => {
    if (!user) return;
    try {
      setPointsLoading(true);
      const { data, error } = await supabase
        .from('user_points')
        .select('total_points, points_to_next_level')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setTotalPoints(data.total_points ?? 0);
        setPointsToNext(data.points_to_next_level ?? 100);
      }
    } catch (e) {
      console.error('Error loading user points:', e);
    } finally {
      setPointsLoading(false);
    }
  };

  const loadTodaysData = async (date: Date) => {
    if (!user) return;

    try {
      const dateString = date.toISOString().split('T')[0];
      
      // Try to load data for the specified date, if none found, try previous days
      await loadDataForDateWithFallback(dateString);

      // Load today's workouts (all workouts for the day)
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .order('created_at', { ascending: true });

      if (workoutsError) {
        console.error('Error loading workouts:', workoutsError);
        setTodaysWorkouts([]);
        setTodaysWorkout(null);
      } else {
        setTodaysWorkouts(workoutsData || []);
        // Keep the first workout for backward compatibility
        setTodaysWorkout(workoutsData && workoutsData.length > 0 ? workoutsData[0] : null);
      }

      // Load today's sleep
      const { data: sleepData, error: sleepError } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .maybeSingle();

      if (sleepError) {
        console.error('Error loading sleep:', sleepError);
      } else {
        setTodaysSleep(sleepData);
      }

      // Load today's weight
      const { data: weightData, error: weightError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .maybeSingle();

      if (weightError) {
        console.error('Error loading weight:', weightError);
      } else {
        setTodaysWeight(weightData);
      }

      // Load this week's measurements (within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: measurementsData, error: measurementsError } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (measurementsError) {
        console.error('Error loading measurements:', measurementsError);
      } else {
        setTodaysMeasurements(measurementsData);
      }

      // Load today's fluids
      const { data: fluidsData, error: fluidsError } = await supabase
        .from('user_fluids')
        .select(`
          *,
          fluid_database:fluid_id (
            name,
            calories_per_100ml,
            protein_per_100ml,
            carbs_per_100ml,
            fats_per_100ml,
            has_alcohol,
            category
          )
        `)
        .eq('user_id', user.id)
        .eq('date', dateString)
        .order('consumed_at', { ascending: false });

      if (fluidsError) {
        console.error('Error loading fluids:', fluidsError);
        setTodaysFluids([]);
      } else {
        // Flatten the fluid data structure for easier use
        const processedFluids = (fluidsData || []).map(fluid => ({
          ...fluid,
          fluid_name: fluid.custom_name || fluid.fluid_database?.name || 'Unknown',
          calories_per_100ml: fluid.fluid_database?.calories_per_100ml || 0,
          protein_per_100ml: fluid.fluid_database?.protein_per_100ml || 0,
          carbs_per_100ml: fluid.fluid_database?.carbs_per_100ml || 0,
          fats_per_100ml: fluid.fluid_database?.fats_per_100ml || 0,
          has_alcohol: fluid.fluid_database?.has_alcohol || false,
          fluid_category: fluid.fluid_database?.category || 'other'
        }));
        setTodaysFluids(processedFluids);
      }

      // Load today's mindset/journal entries
      const { data: mindsetData, error: mindsetError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .order('created_at', { ascending: false });

      if (mindsetError) {
        console.error('Error loading mindset:', mindsetError);
        setTodaysMindset([]);
      } else {
        setTodaysMindset(mindsetData || []);
      }
    } catch (error) {
      console.error('Error loading today\'s data:', error);
    }
  };

  const loadDataForDateWithFallback = async (dateString: string) => {
    // Helper function to load data for a specific date
    const loadDataForSingleDate = async (targetDate: string) => {
      // Load workouts
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('created_at', { ascending: true });

      // Load sleep
      const { data: sleepData } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      // Load weight
      const { data: weightData } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      // Load fluids
      const { data: fluidsData } = await supabase
        .from('user_fluids')
        .select(`
          *,
          fluid_database:fluid_id (
            name,
            calories_per_100ml,
            protein_per_100ml,
            carbs_per_100ml,
            fats_per_100ml,
            has_alcohol,
            category
          )
        `)
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('consumed_at', { ascending: false });

      // Load mindset
      const { data: mindsetData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .order('created_at', { ascending: false });

      return {
        workouts: workoutsData || [],
        sleep: sleepData,
        weight: weightData,
        fluids: fluidsData || [],
        mindset: mindsetData || []
      };
    };

    const currentDateString = new Date().toISOString().split('T')[0];
    let dataFound = false;
    let lastDataDate = dateString;

    // First try the requested date
    let data = await loadDataForSingleDate(dateString);
    
    // Check if we have any meaningful data
    if (data.workouts.length > 0 || data.sleep || data.weight || data.fluids.length > 0) {
      dataFound = true;
    }

    // If no data for requested date and it's today, try previous days (up to 7 days back)
    if (!dataFound && dateString === currentDateString) {
      for (let i = 1; i <= 7; i++) {
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() - i);
        const fallbackDateString = fallbackDate.toISOString().split('T')[0];
        
        const fallbackData = await loadDataForSingleDate(fallbackDateString);
        
        if (fallbackData.workouts.length > 0 || fallbackData.sleep || fallbackData.weight || fallbackData.fluids.length > 0) {
          data = fallbackData;
          lastDataDate = fallbackDateString;
          dataFound = true;
          break;
        }
      }
    }

    // Set the data (even if empty)
    setTodaysWorkouts(data.workouts);
    setTodaysWorkout(data.workouts.length > 0 ? data.workouts[0] : null);
    setTodaysSleep(data.sleep);
    setTodaysWeight(data.weight);
    
    // Process fluids
    const processedFluids = data.fluids.map(fluid => ({
      ...fluid,
      fluid_name: fluid.custom_name || fluid.fluid_database?.name || 'Unknown',
      calories_per_100ml: fluid.fluid_database?.calories_per_100ml || 0,
      protein_per_100ml: fluid.fluid_database?.protein_per_100ml || 0,
      carbs_per_100ml: fluid.fluid_database?.carbs_per_100ml || 0,
      fats_per_100ml: fluid.fluid_database?.fats_per_100ml || 0,
      has_alcohol: fluid.fluid_database?.has_alcohol || false,
      fluid_category: fluid.fluid_database?.category || 'other'
    }));
    setTodaysFluids(processedFluids);
    setTodaysMindset(data.mindset);

    // Load measurements (weekly)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: measurementsData } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTodaysMeasurements(measurementsData);

    // Show message if using fallback data
    if (dateString === currentDateString && lastDataDate !== dateString && dataFound) {
      const fallbackDateFormatted = new Date(lastDataDate).toLocaleDateString('de-DE');
      toast.info(`Keine Daten für heute. Zeige letzte Daten vom ${fallbackDateFormatted}`);
    }
  };

  const fetchMealsForDate = async (date: Date) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const formattedDate = date.toISOString().split('T')[0];
      
      console.log('📅 Fetching meals for date:', formattedDate);
      
      // FAIL-SAFE: Handle potential meal_images table issues
      try {
        const { data, error } = await supabase
          .from('meals')
          .select(`
            *,
            meal_images (
              image_url,
              alt_text
            )
          `)
          .eq('user_id', user.id)
          .eq('date', formattedDate)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('✅ Meals loaded:', data?.length || 0);
        setMeals(data || []);
        return;
      } catch (joinError: any) {
        console.warn('⚠️ Meals join failed, trying without images:', joinError.message);
        
        // Fallback: Load meals without images
        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', formattedDate)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('✅ Meals loaded (no images):', data?.length || 0);
        setMeals(data || []);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
      updateCalorieSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMealsWithFallback = async (date: Date) => {
    // Try to find meals from recent days if today has none
    for (let i = 1; i <= 7; i++) {
      const fallbackDate = new Date(date);
      fallbackDate.setDate(fallbackDate.getDate() - i);
      
      const startOfDay = new Date(fallbackDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fallbackDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: fallbackMealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (!error && fallbackMealsData && fallbackMealsData.length > 0) {
        // Load images for fallback meals
        const mealIds = fallbackMealsData.map(meal => meal.id);
        const { data: imagesData } = await supabase
          .from('meal_images')
          .select('meal_id, image_url')
          .in('meal_id', mealIds);

        const imagesByMeal = (imagesData || []).reduce((acc, img) => {
          if (!acc[img.meal_id]) {
            acc[img.meal_id] = [];
          }
          acc[img.meal_id].push(img.image_url);
          return acc;
        }, {} as Record<string, string[]>);

        const mealsWithImages = fallbackMealsData.map(meal => ({
          ...meal,
          images: imagesByMeal[meal.id] || []
        }));
        
        setMeals(mealsWithImages);
        updateCalorieSummary(mealsWithImages);
        
        const fallbackDateFormatted = fallbackDate.toLocaleDateString('de-DE');
        toast.info(`Keine Mahlzeiten für heute. Zeige letzte Mahlzeiten vom ${fallbackDateFormatted}`);
        return;
      }
    }
    
    // No meals found in recent days
    setMeals([]);
    updateCalorieSummary([]);
  };

  const updateCalorieSummary = (meals: any[]) => {
    const mealCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const fluidCalories = todaysFluids.reduce((sum, fluid) => {
      const calories = (fluid.calories_per_100ml || 0) * (fluid.amount_ml / 100);
      return sum + calories;
    }, 0);
    const consumed = mealCalories + fluidCalories;
    setCalorieSummary({ consumed, burned: 0 });
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(new Date(date));
  };

  const handleMealDeleted = async () => {
    await fetchMealsForDate(currentDate);
  };

  const handleMealUpdated = async () => {
    await fetchMealsForDate(currentDate);
  };

  const handleEditMeal = (meal: any) => {
    setEditingMeal(meal);
  };

  const handleDeleteMeal = async (mealId: string) => {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error deleting meal:', error);
      toast.error('Löschen fehlgeschlagen');
    } else {
      toast.success('Mahlzeit gelöscht');
      await fetchMealsForDate(currentDate);
    }
  };
  const handleWeightAdded = async (newWeightData?: any) => {
    // Immediately update todaysWeight state with the new data
    if (newWeightData) {
      setTodaysWeight(newWeightData);
    }
    
    // Then reload all data to ensure consistency
    await loadTodaysData(currentDate);
    // Refresh profile if needed
    if (refreshProfile) {
      refreshProfile();
    }
  };

  const handleWorkoutAdded = async (workoutData?: any) => {
    // Evaluate workout quality if data provided
    if (workoutData && workoutData.id) {
      await evaluateWorkout(workoutData.id, workoutData);
    }
    
    loadTodaysData(currentDate);
  };

  const handleSleepAdded = async (sleepData?: any) => {
    // Evaluate sleep quality if data provided
    if (sleepData && sleepData.id) {
      await evaluateSleep(sleepData.id, sleepData);
    }
    
    loadTodaysData(currentDate);
  };

  const handleMeasurementsAdded = () => {
    loadTodaysData(currentDate);
  };

  const handleAddQuickMeal = (text: string) => {
    mealInputHook.setInputText(text);
    try {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch {}
  };

  const handleMealSuccess = async () => {
    await fetchMealsForDate(currentDate);
    mealInputHook.resetForm();
    
    // Award points for meal tracking
    if (user?.id && mealInputHook.uploadedImages.length > 0) {
      await awardPoints('meal_tracked_with_photo', getPointsForActivity('meal_tracked_with_photo'), 'Mahlzeit mit Foto getrackt');
    } else if (user?.id) {
      await awardPoints('meal_tracked', getPointsForActivity('meal_tracked'), 'Mahlzeit getrackt');
    }
    
    // Update meal tracking streak
    if (user?.id) {
      await updateStreak('meal_tracking');
    }
    
    await loadUserPoints();
    // Check for new badges after meal submission
    setTimeout(() => checkBadges(), 1000);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('quickInputCardOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const SortableCard = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    } as React.CSSProperties;

    // Calculate progress percentage for this card type
    const progressPercentage = calculateCardProgress(id, {
      // Sleep data
      sleepHours: todaysSleep?.sleep_hours || undefined,
      bedtime: todaysSleep?.bedtime || undefined,
      targetSleepHours: 8,
      
      // Weight data
      hasWeightToday: !!todaysWeight,
      
      // Workout data
      completedWorkouts: todaysWorkouts?.length || 0,
      plannedWorkouts: 1, // Assuming 1 planned workout per day for now
      
      // Fluids data
      fluidsMl: todaysFluids.reduce((sum, fluid) => sum + fluid.amount_ml, 0),
      targetFluidsMl: dailyGoalsFresh?.fluids || 2000,
      
      // Mindset data
      journalEntries: todaysMindset?.length || 0,
      
      // Supplements data (placeholder - would need actual supplement data)
      takenSupplements: 0,
      plannedSupplements: 0,
    });

    // Get gradual glow colors based on progress
    const glowColors = getGradualGlowColor(progressPercentage);

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className={`relative rounded-xl`}
        data-progress={Math.round(progressPercentage)}
      >
        {/* DISABLED: Status dots removed per user request */}
        {/* 
        <span 
          className={`pointer-events-none absolute top-2 right-2 h-3.5 w-3.5 rounded-full ring-[3px]`}
          style={{
            backgroundColor: glowColors.dotColor,
            borderColor: glowColors.ringColor,
          }}
        />
        */}
        {children}
      </div>
    );
  };

  const renderCardByType = (cardType: string) => {
    // Check if tracking is enabled for this type
    const trackingTypeMap = {
      'sleep': 'sleep_tracking',
      'weight': 'weight_tracking', 
      'workout': 'workout_tracking',
      'measurements': 'weight_tracking', // Body measurements grouped with weight tracking
      'supplements': 'supplement_tracking',
      'fluids': 'fluid_tracking'
    };

    const trackingType = trackingTypeMap[cardType as keyof typeof trackingTypeMap];
    if (trackingType && !isTrackingEnabled(trackingType)) {
      return null; // Don't render disabled tracking types
    }

    switch (cardType) {
      case 'sleep':
        return (
          <SortableCard key="sleep" id="sleep">
            <QuickSleepInput 
              onSleepAdded={handleSleepAdded}
              todaysSleep={todaysSleep}
              currentDate={currentDate}
            />
          </SortableCard>
        );
      case 'weight':
        return (
          <SortableCard key="weight" id="weight">
            <QuickWeightInput 
              onWeightAdded={handleWeightAdded}
              todaysWeight={todaysWeight}
              currentDate={currentDate}
            />
          </SortableCard>
        );
      case 'workout':
        return (
          <SortableCard key="workout" id="workout">
            <QuickWorkoutInput 
              onWorkoutAdded={handleWorkoutAdded}
              todaysWorkout={todaysWorkout}
              todaysWorkouts={todaysWorkouts}
              currentDate={currentDate}
            />
          </SortableCard>
        );
      case 'measurements':
        return (
          <SortableCard key="measurements" id="measurements">
            <BodyMeasurements 
              onMeasurementsAdded={() => loadTodaysData(currentDate)}
              todaysMeasurements={todaysMeasurements}
            />
          </SortableCard>
        );
      case 'supplements':
        return (
          <SortableCard key="supplements" id="supplements">
            <QuickSupplementInput onSupplementUpdate={() => loadTodaysData(currentDate)} currentDate={currentDate} />
          </SortableCard>
        );
      case 'fluids':
        return (
          <SortableCard key="fluids" id="fluids">
            <QuickFluidInput onFluidUpdate={() => loadTodaysData(currentDate)} currentDate={currentDate} />
          </SortableCard>
        );
      case 'mindset':
        return (
          <SortableCard key="mindset" id="mindset">
            <QuickMindsetInput 
              onMindsetAdded={() => loadTodaysData(currentDate)}
              currentDate={currentDate}
            />
          </SortableCard>
        );
      default:
        return null;
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      {/* Show onboarding banner for new users without profile data */}
      {!userProfile && !profileLoading && !profileError && (
        <div className="container mx-auto px-4 max-w-4xl mb-6">
          <OnboardingBanner userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]} />
        </div>
      )}
      
      {/* Sticky Date Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <DateNavigation currentDate={currentDate} onDateChange={handleDateChange} />
      </div>

      
      {/* DEAKTIVIERT: XP Bar auf Benutzerwunsch ausgeblendet */}
      {/*
      <div className="container mx-auto px-4 max-w-4xl mt-3">
        <DashboardXPBar 
          xp={pointsToNext ? (totalPoints % pointsToNext) : totalPoints}
          goal={pointsToNext || 100}
          loading={pointsLoading}
          onBurst={() => {
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 }, scalar: 1.1 });
          }}
        />
      </div>
      */}

      <div className="space-y-5">

        {/* New 4 Bars with Integrated Halos */}
        <DashboardFourBarsWithTrend 
          meals={meals}
          dailyGoals={dailyGoalsFresh}
          todaysFluids={todaysFluids}
          todaysWorkout={todaysWorkout}
          currentDate={currentDate}
        />

        {/* Other Drinks Card */}
        <OtherDrinksCard todaysFluids={todaysFluids} />

        <div className="rounded-xl"
        >
          <CaloriesCard
            date={currentDate}
            totals={{
              caloriesUsed: calorieSummary.consumed,
              caloriesTarget: dailyGoalsFresh?.calories || 2000,
              protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0) +
                       todaysFluids.reduce((sum, fluid) => sum + ((fluid.protein_per_100ml || 0) * (fluid.amount_ml / 100)), 0),
              carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0) +
                     todaysFluids.reduce((sum, fluid) => sum + ((fluid.carbs_per_100ml || 0) * (fluid.amount_ml / 100)), 0),
              fat: meals.reduce((sum, meal) => sum + (meal.fats || meal.fat || 0), 0) +
                   todaysFluids.reduce((sum, fluid) => sum + ((fluid.fats_per_100ml || 0) * (fluid.amount_ml / 100)), 0),
              targetProtein: dailyGoalsFresh?.protein || 150,
              targetCarbs: dailyGoalsFresh?.carbs || 250,
              targetFat: dailyGoalsFresh?.fats || 65,
            }}
            meals={meals}
            frequent={frequentMeals}
            onAddQuickMeal={handleAddQuickMeal}
            onEditMeal={handleEditMeal}
            onDeleteMeal={handleDeleteMeal}
          />
        </div>

        {editingMeal && (
          <MealEditDialog
            meal={{
              id: editingMeal.id,
              text: editingMeal.text,
              calories: editingMeal.calories,
              protein: editingMeal.protein,
              carbs: editingMeal.carbs,
              fats: editingMeal.fats,
              created_at: editingMeal.created_at,
              meal_type: editingMeal.meal_type,
              images: editingMeal.images,
              leftover_images: editingMeal.leftover_images,
              consumption_percentage: editingMeal.consumption_percentage,
              leftover_analysis_metadata: editingMeal.leftover_analysis_metadata,
            }}
            open={true}
            onClose={() => setEditingMeal(null)}
            onUpdate={async (mealId, updates) => {
              const { error } = await supabase
                .from('meals')
                .update(updates)
                .eq('id', mealId)
                .eq('user_id', user.id);
              if (error) {
                console.error('Error updating meal:', error);
                toast.error('Aktualisierung fehlgeschlagen');
              } else {
                toast.success('Mahlzeit aktualisiert');
                setEditingMeal(null);
                await fetchMealsForDate(currentDate);
              }
            }}
          />
        )}


        {/* Sortable Quick Input Cards */}
        <DndContext 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={cardOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {/* Only render enabled tracking cards */}
              {cardOrder.filter(cardType => {
                const trackingTypeMap = {
                  'sleep': 'sleep_tracking',
                  'weight': 'weight_tracking',
                  'workout': 'workout_tracking', 
                  'measurements': 'weight_tracking',
                  'supplements': 'supplement_tracking',
                  'fluids': 'fluid_tracking'
                };
                const trackingType = trackingTypeMap[cardType as keyof typeof trackingTypeMap];
                // Always show mindset journal regardless of tracking preferences
                return cardType === 'mindset' || !trackingType || isTrackingEnabled(trackingType);
              }).map(cardType => renderCardByType(cardType))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Smart Coach Insights removed per user request */}

        {/* DEAKTIVIERT: Mahlzeiten-Anzeige auf Benutzerwunsch ausgeblendet */}
        {/* 
        <div>
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Badge className="opacity-80">{meals.length} Mahlzeiten</Badge>
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <MealList 
                meals={meals}
                onMealUpdate={() => {
                  fetchMealsForDate(currentDate);
                }}
                selectedDate={currentDate.toISOString().split('T')[0]}
              />
            )}
          </div>
        </div>
        */}
        
         {/* Unterer Abstand für DashboardMealComposer */}
        <div className="pb-28"></div>
        
      </div>


      {/* Dashboard Meal Composer (visible) */}
      <DashboardMealComposer />

      {/* Meal Confirmation Dialog */}
      {mealInputHook.showConfirmationDialog && mealInputHook.analyzedMealData && (
        <MealConfirmationDialog
          isOpen={mealInputHook.showConfirmationDialog}
          onClose={mealInputHook.closeDialog}
          analyzedMealData={mealInputHook.analyzedMealData}
          selectedMealType={mealInputHook.selectedMealType}
          onMealTypeChange={mealInputHook.setSelectedMealType}
          onSuccess={handleMealSuccess}
          uploadedImages={mealInputHook.uploadedImages}
          selectedDate={currentDate}
        />
      )}
    </>
  );
};

export default Index;
