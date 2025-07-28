import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { MealList } from "@/components/MealList";
import { DailyProgress } from "@/components/DailyProgress";
import { QuickWeightInput } from "@/components/QuickWeightInput";
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput";
import { QuickSleepInput } from "@/components/QuickSleepInput";
import { QuickSupplementInput } from "@/components/QuickSupplementInput";
import { BodyMeasurements } from "@/components/BodyMeasurements";
import { SmartCoachInsights } from "@/components/SmartCoachInsights";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { MealConfirmationDialog } from "@/components/MealConfirmationDialog";
import { ProgressCharts } from "@/components/ProgressCharts";
import { TrialBanner } from "@/components/TrialBanner";
import { WeeklyCoachRecommendation } from "@/components/WeeklyCoachRecommendation";
import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MealInput } from "@/components/MealInput";
import { toast } from "sonner";

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const Index = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, trial } = useSubscription();
  const { hasFeatureAccess } = useFeatureAccess();
  const navigate = useNavigate();
  const mealInputHook = useGlobalMealInput();
  const { checkBadges } = useBadgeChecker();
  const { awardPoints, updateStreak, evaluateWorkout, evaluateSleep, getPointsForActivity, getStreakMultiplier } = usePointsSystem();
  
  // State management
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calorieSummary, setCalorieSummary] = useState<{ consumed: number; burned: number }>({ consumed: 0, burned: 0 });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // New state for today's data
  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([]);
  const [todaysSleep, setTodaysSleep] = useState<any>(null);
  const [todaysMeasurements, setTodaysMeasurements] = useState<any>(null);
  const [todaysWeight, setTodaysWeight] = useState<any>(null);

  // Card order state
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem('quickInputCardOrder');
    return savedOrder ? JSON.parse(savedOrder) : ['sleep', 'weight', 'workout', 'measurements', 'supplements'];
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, authLoading, navigate]);

  // If still loading auth or no user, show loading state
  if (authLoading || !user) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Load meals when date changes
  useEffect(() => {
    if (user && dailyGoals) {
      fetchMealsForDate(currentDate);
      loadTodaysData(currentDate);
    }
  }, [user, currentDate, dailyGoals]);

  const loadUserData = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setUserProfile(profileData);
      }

      // Load daily goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (goalsError) {
        console.error('Error loading daily goals:', goalsError);
        setDailyGoals({
          calories: 2000,
          protein: 150,
          carbs: 250,
          fats: 65
        });
      } else {
        setDailyGoals(goalsData || {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fats: 65
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const loadTodaysData = async (date: Date) => {
    if (!user) return;

    try {
      const dateString = date.toISOString().split('T')[0];

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
    } catch (error) {
      console.error('Error loading today\'s data:', error);
    }
  };

  const fetchMealsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch meals
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (mealsError) throw mealsError;
      
      if (!mealsData || mealsData.length === 0) {
        setMeals([]);
        updateCalorieSummary([]);
        return;
      }

      // Fetch images for all meals
      const mealIds = mealsData.map(meal => meal.id);
      const { data: imagesData, error: imagesError } = await supabase
        .from('meal_images')
        .select('meal_id, image_url')
        .in('meal_id', mealIds);

      if (imagesError) {
        console.error('Error fetching meal images:', imagesError);
      }

      // Group images by meal_id
      const imagesByMeal = (imagesData || []).reduce((acc, img) => {
        if (!acc[img.meal_id]) {
          acc[img.meal_id] = [];
        }
        acc[img.meal_id].push(img.image_url);
        return acc;
      }, {} as Record<string, string[]>);

      // Combine meals with their images
      const mealsWithImages = mealsData.map(meal => ({
        ...meal,
        images: imagesByMeal[meal.id] || []
      }));
      
      setMeals(mealsWithImages);
      updateCalorieSummary(mealsWithImages);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
      updateCalorieSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCalorieSummary = (meals: any[]) => {
    const consumed = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
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

  const handleWeightAdded = async (newWeightData?: any) => {
    // Immediately update todaysWeight state with the new data
    if (newWeightData) {
      setTodaysWeight(newWeightData);
    }
    
    // Then reload all data to ensure consistency
    await loadTodaysData(currentDate);
    await loadUserData();
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
    };

    return (
      <div ref={setNodeRef} style={style} className="relative">
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 w-6 h-6 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60 transition-opacity z-10 bg-muted/20 hover:bg-muted/40 rounded"
          aria-label="Karte verschieben"
        />
        {children}
      </div>
    );
  };

  const renderCardByType = (cardType: string) => {
    switch (cardType) {
      case 'sleep':
        return (
          <SortableCard key="sleep" id="sleep">
            <QuickSleepInput 
              onSleepAdded={handleSleepAdded}
              todaysSleep={todaysSleep}
            />
          </SortableCard>
        );
      case 'weight':
        return (
          <SortableCard key="weight" id="weight">
            <QuickWeightInput 
              onWeightAdded={handleWeightAdded}
              todaysWeight={todaysWeight}
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
            />
          </SortableCard>
        );
      case 'measurements':
        return (
          <SortableCard key="measurements" id="measurements">
            <BodyMeasurements 
              onMeasurementsAdded={handleMeasurementsAdded}
              todaysMeasurements={todaysMeasurements}
            />
          </SortableCard>
        );
      case 'supplements':
        return (
          <SortableCard key="supplements" id="supplements">
            <QuickSupplementInput />
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
      <div className="space-y-5">
        {/* Trial Banner */}
        <TrialBanner />
        
        {/* Weekly Coach Recommendation for Free Users */}
        <WeeklyCoachRecommendation />
        
        <DailyProgress
          dailyTotals={{
            calories: calorieSummary.consumed,
            protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
            carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
            fats: meals.reduce((sum, meal) => sum + (meal.fats || 0), 0)
          }}
          userProfile={userProfile}
          dailyGoal={{
            calories: dailyGoals?.calories || 2000,
            protein: dailyGoals?.protein || 150,
            carbs: dailyGoals?.carbs || 250,
            fats: dailyGoals?.fats || 65
          }}
          userGoal={userProfile?.goal || 'maintain'}
          currentDate={currentDate}
          onDateChange={handleDateChange}
        />

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
              {cardOrder.map(cardType => renderCardByType(cardType))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Smart Coach Insights */}
        <SmartCoachInsights />

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
      </div>

      {/* Floating Meal Input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-md mx-auto px-4 pb-3 pt-2 bg-transparent">
          <MealInput 
            inputText={mealInputHook.inputText}
            setInputText={mealInputHook.setInputText}
            onSubmitMeal={mealInputHook.handleSubmitMeal}
            onPhotoUpload={mealInputHook.handlePhotoUpload}
            onVoiceRecord={mealInputHook.handleVoiceRecord}
            isAnalyzing={mealInputHook.isAnalyzing}
            isRecording={mealInputHook.isRecording}
            isProcessing={mealInputHook.isProcessing}
            uploadedImages={mealInputHook.uploadedImages}
            onRemoveImage={mealInputHook.removeImage}
            uploadProgress={mealInputHook.uploadProgress}
            isUploading={mealInputHook.isUploading}
          />
        </div>
      </div>

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
        />
      )}
    </>
  );
};

export default Index;
