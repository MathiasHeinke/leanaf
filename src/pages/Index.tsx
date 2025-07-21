import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { MealList } from "@/components/MealList";
import { DailyProgress } from "@/components/DailyProgress";
import { QuickWeightInput } from "@/components/QuickWeightInput";
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput";
import { QuickSleepInput } from "@/components/QuickSleepInput";
import { BodyMeasurements } from "@/components/BodyMeasurements";
import { BadgeSystem } from "@/components/BadgeSystem";
import { SmartCoachInsights } from "@/components/SmartCoachInsights";
import { DepartmentProgress } from "@/components/DepartmentProgress";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { MealConfirmationDialog } from "@/components/MealConfirmationDialog";
import { ProgressCharts } from "@/components/ProgressCharts";
import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MealInput } from "@/components/MealInput";
import { toast } from "sonner";

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mealInputHook = useGlobalMealInput();
  const { checkBadges } = useBadgeChecker();
  const { awardPoints, updateStreak, getPointsForActivity, getStreakMultiplier } = usePointsSystem();
  
  // State management
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calorieSummary, setCalorieSummary] = useState<{ consumed: number; burned: number }>({ consumed: 0, burned: 0 });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

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

  const fetchMealsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mealsData = data || [];
      setMeals(mealsData);
      updateCalorieSummary(mealsData);
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

  const handleWeightAdded = () => {
    loadUserData();
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
        <DailyProgress 
          dailyTotals={{
            calories: calorieSummary.consumed,
            protein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
            carbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
            fats: meals.reduce((sum, meal) => sum + (meal.fats || 0), 0)
          }}
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

        <QuickWeightInput 
          currentWeight={userProfile?.weight}
          onWeightAdded={handleWeightAdded}
        />

        {/* Transformation Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickWorkoutInput />
          <QuickSleepInput />
        </div>

        <BodyMeasurements />
        
        {/* Department Progress */}
        <DepartmentProgress />
        
        {/* Progress Charts */}
        <ProgressCharts timeRange="week" />
        
        <SmartCoachInsights />
        
        <BadgeSystem />

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
                dailyMeals={meals.map((meal: any) => ({
                  id: meal.id,
                  text: meal.text,
                  calories: meal.calories,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fats: meal.fats,
                  timestamp: new Date(meal.created_at),
                  meal_type: meal.meal_type
                }))} 
                onEditMeal={(meal: any) => {
                  // Handled by MealEditForm component
                }}
                onDeleteMeal={async (mealId: string) => {
                  try {
                    const { error } = await supabase
                      .from('meals')
                      .delete()
                      .eq('id', mealId);

                    if (error) {
                      console.error('Error deleting meal:', error);
                      toast.error('Fehler beim Löschen der Mahlzeit');
                      return;
                    }

                    toast.success('Mahlzeit gelöscht');
                    await fetchMealsForDate(currentDate);
                  } catch (error) {
                    console.error('Error deleting meal:', error);
                    toast.error('Fehler beim Löschen der Mahlzeit');
                  }
                }}
                onUpdateMeal={handleMealUpdated}
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
        />
      )}
    </>
  );
};

export default Index;
