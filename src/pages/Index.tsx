import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useTrackingPreferences } from "@/hooks/useTrackingPreferences";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { MealList } from "@/components/MealList";

import { QuickWeightCard } from "@/components/momentum/quick/QuickWeightCard";
import { QuickTrainingCard } from "@/components/momentum/quick/QuickTrainingCard";
import { QuickSleepCard } from "@/components/momentum/quick/QuickSleepCard";
import { QuickSupplementsCard } from "@/components/momentum/quick/QuickSupplementsCard";
import { QuickHydrationCard } from "@/components/momentum/quick/QuickHydrationCard";
import { QuickMindsetInput } from "@/components/QuickMindsetInput";
import { QuickMeasurementsCard } from "@/components/momentum/quick/QuickMeasurementsCard";
import { SmartCoachInsights } from "@/components/SmartCoachInsights";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { MealConfirmationDialog } from "@/components/MealConfirmationDialog";
import { ProgressCharts } from "@/components/ProgressCharts";


import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MealInputLean } from "@/components/MealInputLean";
import { EnhancedMealInput } from "@/components/EnhancedMealInput";
import { toast } from "sonner";

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { IndexOnboardingOverlay } from '@/components/IndexOnboardingOverlay';
import { InteractiveOnboardingSlider } from '@/components/onboarding/InteractiveOnboardingSlider';
import { cn } from '@/lib/utils';
import { DateNavigation } from "@/components/DateNavigation";
import { CaloriesCard } from "@/components/calories/CaloriesCard";
import { MealEditDialog } from "@/components/MealEditDialog";
import { useFrequentMeals } from "@/hooks/useFrequentMeals";
import { MomentumXPBar } from "@/components/momentum/MomentumXPBar";
import confetti from "canvas-confetti";
import { GripVertical } from "lucide-react";

const Index = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, trial } = useSubscription();
  const { hasFeatureAccess } = useFeatureAccess();
  const navigate = useNavigate();
  const mealInputHook = useGlobalMealInput();
  const { checkBadges } = useBadgeChecker();
  const { awardPoints, updateStreak, evaluateWorkout, evaluateSleep, getPointsForActivity, getStreakMultiplier } = usePointsSystem();
  const { isTrackingEnabled } = useTrackingPreferences();
  const onboardingState = useOnboardingState();
  
  // State management
  const [meals, setMeals] = useState<any[]>([]);
  const [editingMeal, setEditingMeal] = useState<any | null>(null);
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
  const [todaysFluids, setTodaysFluids] = useState<any[]>([]);

  // XP state for Momentum bar on Index
  const [pointsLoading, setPointsLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsToNext, setPointsToNext] = useState(100);

  // Card order state
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem('quickInputCardOrder');
    return savedOrder ? JSON.parse(savedOrder) : ['sleep', 'weight', 'workout', 'measurements', 'supplements', 'fluids', 'mindset'];
  });

  // Frequent meals for smart chips
  const { frequent: frequentMeals } = useFrequentMeals(user?.id, 60);

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

  useEffect(() => {
    if (user) {
      loadUserPoints();
    }
  }, [user]);

  // Load meals when date changes
  useEffect(() => {
    if (user && dailyGoals) {
      fetchMealsForDate(currentDate);
      loadTodaysData(currentDate);
    }
  }, [user, currentDate, dailyGoals]);

  // Update calorie summary when fluids change
  useEffect(() => {
    if (meals.length > 0 || todaysFluids.length > 0) {
      updateCalorieSummary(meals);
    }
  }, [todaysFluids, meals]);

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

    return (
      <div ref={setNodeRef} style={style} className="relative">
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 h-8 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100 transition-opacity z-10 rounded-full bg-muted/50 hover:bg-muted/70 text-muted-foreground"
          title="Karte verschieben"
          aria-label="Karte verschieben"
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
            <QuickSleepCard />
          </SortableCard>
        );
      case 'weight':
        return (
          <SortableCard key="weight" id="weight">
            <QuickWeightCard />
          </SortableCard>
        );
      case 'workout':
        return (
          <SortableCard key="workout" id="workout">
            <QuickTrainingCard />
          </SortableCard>
        );
      case 'measurements':
        return (
          <SortableCard key="measurements" id="measurements">
            <QuickMeasurementsCard 
              onMeasurementsAdded={handleMeasurementsAdded}
              todaysMeasurements={todaysMeasurements}
            />
          </SortableCard>
        );
      case 'supplements':
        return (
          <SortableCard key="supplements" id="supplements">
            <QuickSupplementsCard />
          </SortableCard>
        );
      case 'fluids':
        return (
          <SortableCard key="fluids" id="fluids">
            <QuickHydrationCard />
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
      {/* Interactive Onboarding Slider - Show for new users */}
      {onboardingState.showInteractiveOnboarding && (
        <InteractiveOnboardingSlider
          isOpen={onboardingState.showInteractiveOnboarding}
          onClose={() => onboardingState.updateOnboardingState({ showInteractiveOnboarding: false })}
          onComplete={onboardingState.completeInteractiveOnboarding}
        />
      )}

      {/* Index Onboarding - Show after profile completion */}
      {onboardingState.showIndexOnboarding && (
        <IndexOnboardingOverlay
          isOpen={onboardingState.showIndexOnboarding}
          onClose={onboardingState.completeIndexOnboarding}
          onHighlightMealInput={() => {
            onboardingState.completeIndexOnboarding();
            setTimeout(() => onboardingState.highlightMealInput(), 500);
          }}
        />
      )}
      
      {/* Sticky Date Navigation under GlobalHeader */}
      <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 max-w-4xl">
          <DateNavigation currentDate={currentDate} onDateChange={handleDateChange} />
        </div>
      </div>
      
      <div className="container mx-auto px-4 max-w-4xl mt-3">
        <MomentumXPBar 
          xp={pointsToNext ? (totalPoints % pointsToNext) : totalPoints}
          goal={pointsToNext || 100}
          loading={pointsLoading}
          onBurst={() => {
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 }, scalar: 1.1 });
          }}
        />
      </div>

      <div className="space-y-5">

        <CaloriesCard
          date={currentDate}
          totals={{
            caloriesUsed: calorieSummary.consumed,
            caloriesTarget: dailyGoals?.calories || 2000,
            protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0) +
                     todaysFluids.reduce((sum, fluid) => sum + ((fluid.protein_per_100ml || 0) * (fluid.amount_ml / 100)), 0),
            carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0) +
                   todaysFluids.reduce((sum, fluid) => sum + ((fluid.carbs_per_100ml || 0) * (fluid.amount_ml / 100)), 0),
            fat: meals.reduce((sum, meal) => sum + (meal.fats || meal.fat || 0), 0) +
                 todaysFluids.reduce((sum, fluid) => sum + ((fluid.fats_per_100ml || 0) * (fluid.amount_ml / 100)), 0),
            targetProtein: dailyGoals?.protein || 150,
            targetCarbs: dailyGoals?.carbs || 250,
            targetFat: dailyGoals?.fats || 65,
          }}
          meals={meals}
          frequent={frequentMeals}
          onAddQuickMeal={handleAddQuickMeal}
          onEditMeal={handleEditMeal}
          onDeleteMeal={handleDeleteMeal}
        />

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

      {/* Floating Meal Input (hidden, kept for compatibility) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-transparent hidden" data-testid="mealinput_lean-container">
        <div className="max-w-md mx-auto px-4 pb-3 pt-2 bg-transparent">
          <div className={cn(
            "relative",
            onboardingState.mealInputHighlighted && "ring-4 ring-blue-500 ring-opacity-50 rounded-lg animate-pulse"
          )}>
            {onboardingState.mealInputHighlighted && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg z-10">
                Gib hier deine erste Mahlzeit ein 👆
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-600"></div>
              </div>
            )}
            <MealInputLean 
              inputText={mealInputHook.inputText}
              setInputText={mealInputHook.setInputText}
              onSubmitMeal={() => {
                mealInputHook.handleSubmitMeal();
                if (onboardingState.mealInputHighlighted) {
                  onboardingState.clearMealInputHighlight();
                }
              }}
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
      </div>

      {/* Enhanced Meal Input (visible) */}
      <EnhancedMealInput />
      {onboardingState.mealInputHighlighted && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
            Gib hier deine erste Mahlzeit ein 👇
            <button
              type="button"
              onClick={() => onboardingState.clearMealInputHighlight()}
              className="ml-2 underline"
            >
              Ok
            </button>
          </div>
        </div>
      )}

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
