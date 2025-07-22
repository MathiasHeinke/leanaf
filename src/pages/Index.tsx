
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DailyProgress } from "@/components/DailyProgress";
import { OptimizedGreeting } from "@/components/OptimizedGreeting";
import { WeightHistory } from "@/components/WeightHistory";
import { QuickWeightInput } from "@/components/QuickWeightInput";
import { QuickSleepInput } from "@/components/QuickSleepInput";
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput";
import { MealInput } from "@/components/MealInput";
import { MealList } from "@/components/MealList";
import { SmartInsights } from "@/components/SmartInsights";
import { BMIProgress } from "@/components/BMIProgress";
import { BodyMeasurements } from "@/components/BodyMeasurements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Scale, Activity, Moon, Utensils } from "lucide-react";
import { toast } from "sonner";
import { supabaseRequest } from "@/utils/supabaseHelpers";

export default function Index() {
  const { user } = useAuth();
  const [weightHistory, setWeightHistory] = useState([]);
  const [todaysWeight, setTodaysWeight] = useState(null);
  const [todaysSleep, setTodaysSleep] = useState(null);
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [meals, setMeals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [dailyGoals, setDailyGoals] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Enhanced weight data loading with debug logging
  const loadWeightData = async () => {
    if (!user) return;
    
    try {
      console.log('🔧 [INDEX] Loading weight data for user:', user.id);
      
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('🔧 [INDEX] Weight data load error:', error);
        throw error;
      }
      
      console.log('🔧 [INDEX] Weight data loaded:', data?.length || 0, 'entries');
      setWeightHistory(data || []);
      
      // Find today's weight entry
      const today = new Date().toISOString().split('T')[0];
      const todayWeight = data?.find(entry => entry.date === today) || null;
      
      console.log('🔧 [INDEX] Today\'s weight entry:', todayWeight);
      setTodaysWeight(todayWeight);
      
    } catch (error) {
      console.error('🔧 [INDEX] Failed to load weight data:', error);
      toast.error('Fehler beim Laden der Gewichtsdaten');
    }
  };

  // Enhanced data loading function
  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    console.log('🔧 [INDEX] Starting data load for user:', user.id);
    
    try {
      // Load weight data first (most important for the user's issue)
      await loadWeightData();
      
      // Load other data in parallel
      await Promise.all([
        loadProfile(),
        loadDailyGoals(),
        loadSleepData(),
        loadWorkoutData(),
        loadMealData()
      ]);
      
      console.log('🔧 [INDEX] All data loaded successfully');
    } catch (error) {
      console.error('🔧 [INDEX] Data loading failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const data = await supabaseRequest(
        `profile-${user.id}`,
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          return data;
        }
      );
      
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadDailyGoals = async () => {
    if (!user) return;
    
    try {
      const data = await supabaseRequest(
        `daily-goals-${user.id}`,
        async () => {
          const { data, error } = await supabase
            .from('daily_goals')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          return data;
        }
      );
      
      setDailyGoals(data);
    } catch (error) {
      console.error('Error loading daily goals:', error);
    }
  };

  const loadSleepData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sleep_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      setTodaysSleep(data);
    } catch (error) {
      console.error('Error loading sleep data:', error);
    }
  };

  const loadWorkoutData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (error) throw error;
      setTodaysWorkouts(data || []);
    } catch (error) {
      console.error('Error loading workout data:', error);
    }
  };

  const loadMealData = async () => {
    if (!user) return;
    
    try {
      const data = await supabaseRequest(
        `meals-${user.id}-${new Date().toDateString()}`,
        async () => {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
          
          const { data, error } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', startOfNextDay.toISOString())
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data || [];
        }
      );
      
      setMeals(data);
    } catch (error) {
      console.error('Error loading meal data:', error);
    }
  };

  // Enhanced refresh handler with better cache management
  const handleWeightAdded = async () => {
    console.log('🔧 [INDEX] Weight added callback triggered, refreshing data...');
    
    // Clear cache for weight-related queries
    const cacheKeysToInvalidate = [
      `weight-history-${user?.id}`,
      `profile-${user?.id}`,
    ];
    
    // Force refresh weight data immediately
    await loadWeightData();
    await loadProfile();
    
    // Increment refresh key to trigger re-renders
    setRefreshKey(prev => prev + 1);
    
    console.log('🔧 [INDEX] Weight data refreshed successfully');
    toast.success('Daten wurden aktualisiert!');
  };

  const handleMealAdded = async () => {
    console.log('🔧 [INDEX] Meal added, refreshing meal data...');
    await loadMealData();
    await loadProfile();
    setRefreshKey(prev => prev + 1);
  };

  const handleSleepAdded = async () => {
    console.log('🔧 [INDEX] Sleep added, refreshing sleep data...');
    await loadSleepData();
    setRefreshKey(prev => prev + 1);
  };

  const handleWorkoutAdded = async () => {
    console.log('🔧 [INDEX] Workout added, refreshing workout data...');
    await loadWorkoutData();
    setRefreshKey(prev => prev + 1);
  };

  // Load data on mount and user change
  useEffect(() => {
    if (user) {
      console.log('🔧 [INDEX] User changed, loading data...');
      loadData();
    }
  }, [user]);

  // Debug logging for key state changes
  useEffect(() => {
    console.log('🔧 [INDEX] State updated:', {
      todaysWeight: todaysWeight?.weight,
      weightHistoryCount: weightHistory.length,
      refreshKey,
      isLoading
    });
  }, [todaysWeight, weightHistory, refreshKey, isLoading]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">Willkommen bei KaloAI</h2>
            <p className="text-muted-foreground mb-6">
              Bitte melde dich an, um deine Gesundheitsdaten zu verwalten.
            </p>
            <Button onClick={() => window.location.href = '/auth'} className="w-full">
              Anmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      {/* Greeting Section */}
      <OptimizedGreeting 
        profile={profile} 
        todaysWeight={todaysWeight}
        todaysSleep={todaysSleep}
        todaysWorkouts={todaysWorkouts}
        meals={meals}
        key={`greeting-${refreshKey}`}
      />

      {/* Quick Actions Tabs */}
      <Tabs defaultValue="weight" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Gewicht</span>
          </TabsTrigger>
          <TabsTrigger value="meals" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            <span className="hidden sm:inline">Mahlzeit</span>
          </TabsTrigger>
          <TabsTrigger value="workout" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Training</span>
          </TabsTrigger>
          <TabsTrigger value="sleep" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span className="hidden sm:inline">Schlaf</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weight" className="space-y-6">
          <QuickWeightInput 
            onWeightAdded={handleWeightAdded} 
            todaysWeight={todaysWeight}
            key={`weight-input-${refreshKey}`}
          />
          <WeightHistory 
            weightHistory={weightHistory}
            key={`weight-history-${refreshKey}`}
          />
        </TabsContent>

        <TabsContent value="meals" className="space-y-6">
          <MealInput onMealAdded={handleMealAdded} />
          <MealList meals={meals} onMealUpdated={handleMealAdded} />
        </TabsContent>

        <TabsContent value="workout" className="space-y-6">
          <QuickWorkoutInput 
            onWorkoutAdded={handleWorkoutAdded}
            todaysWorkouts={todaysWorkouts}
          />
        </TabsContent>

        <TabsContent value="sleep" className="space-y-6">
          <QuickSleepInput 
            onSleepAdded={handleSleepAdded}
            todaysSleep={todaysSleep}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Progress and Analysis Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <DailyProgress 
          meals={meals}
          dailyGoals={dailyGoals}
          profile={profile}
          key={`progress-${refreshKey}`}
        />
        
        <div className="space-y-6">
          {profile && (
            <BMIProgress 
              currentWeight={todaysWeight?.weight || profile.weight} 
              targetWeight={profile.target_weight}
              height={profile.height}
              key={`bmi-${refreshKey}`}
            />
          )}
          
          <BodyMeasurements />
        </div>
      </div>

      {/* Smart Insights */}
      <SmartInsights 
        meals={meals}
        weightHistory={weightHistory}
        profile={profile}
        key={`insights-${refreshKey}`}
      />
    </div>
  );
}
