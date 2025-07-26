import React, { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  PlusCircle, 
  Scale, 
  Utensils, 
  Moon, 
  Dumbbell,
  Target,
  Calendar,
  TrendingUp
} from "lucide-react"

import { useProfileCompletion } from "@/hooks/useProfileCompletion"
import { useAuth } from "@/hooks/useAuth"
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput"
import { DailyProgress } from "@/components/DailyProgress"
import { MealInput } from "@/components/MealInput"
import { QuickSleepInput } from "@/components/QuickSleepInput"
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput"
import { QuickWeightInput } from "@/components/QuickWeightInput"
import { BodyMeasurements } from "@/components/BodyMeasurements"
import { MealList } from "@/components/MealList"
import { MealConfirmationDialog } from "@/components/MealConfirmationDialog"
import { SmartCoachInsights } from "@/components/SmartCoachInsights"
import { ProgressCharts } from "@/components/ProgressCharts"
import { TrialBanner } from "@/components/TrialBanner"
import { WeeklyCoachRecommendation } from "@/components/WeeklyCoachRecommendation"
import { supabase } from "@/integrations/supabase/client"

const NewIndex = () => {
  const { isSetupComplete, isLoading } = useProfileCompletion()
  const { user } = useAuth()
  const mealInputHook = useGlobalMealInput()
  
  // State for dashboard data
  const [meals, setMeals] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [userProfile, setUserProfile] = useState<any>(null)
  const [dailyGoals, setDailyGoals] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [todaysWeight, setTodaysWeight] = useState<any>(null)
  const [todaysSleep, setTodaysSleep] = useState<any>(null)
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([])
  const [todaysMeasurements, setTodaysMeasurements] = useState<any>(null)

  // ✅ ALL FUNCTIONS DEFINED BEFORE useEffect
  const loadUserData = async () => {
    if (!user) return
    
    setDataLoading(true)
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Error loading profile:', profileError)
      } else {
        setUserProfile(profileData)
      }

      // Load daily goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (goalsError) {
        console.error('Error loading daily goals:', goalsError)
        setDailyGoals({
          calories: 2000,
          protein: 150,
          carbs: 250,
          fats: 65
        })
      } else {
        setDailyGoals(goalsData || {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fats: 65
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const loadTodaysData = async (date: Date) => {
    if (!user) return

    try {
      const dateString = date.toISOString().split('T')[0]

      // Load today's workouts
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .order('created_at', { ascending: true })

      if (workoutsError) {
        console.error('Error loading workouts:', workoutsError)
        setTodaysWorkouts([])
      } else {
        setTodaysWorkouts(workoutsData || [])
      }

      // Load today's sleep
      const { data: sleepData, error: sleepError } = await supabase
        .from('sleep_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .maybeSingle()

      if (sleepError) {
        console.error('Error loading sleep:', sleepError)
      } else {
        setTodaysSleep(sleepData)
      }

      // Load today's weight
      const { data: weightData, error: weightError } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .maybeSingle()

      if (weightError) {
        console.error('Error loading weight:', weightError)
      } else {
        setTodaysWeight(weightData)
      }

      // Load this week's measurements (within last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: measurementsData, error: measurementsError } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (measurementsError) {
        console.error('Error loading measurements:', measurementsError)
      } else {
        setTodaysMeasurements(measurementsData)
      }
    } catch (error) {
      console.error('Error loading today\'s data:', error)
    }
  }

  const fetchMealsForDate = async (date: Date) => {
    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (mealsError) throw mealsError
      
      if (!mealsData || mealsData.length === 0) {
        setMeals([])
        return
      }

      // Fetch images for all meals
      const mealIds = mealsData.map(meal => meal.id)
      const { data: imagesData, error: imagesError } = await supabase
        .from('meal_images')
        .select('meal_id, image_url')
        .in('meal_id', mealIds)

      if (imagesError) {
        console.error('Error fetching meal images:', imagesError)
      }

      // Group images by meal_id
      const imagesByMeal = (imagesData || []).reduce((acc, img) => {
        if (!acc[img.meal_id]) {
          acc[img.meal_id] = []
        }
        acc[img.meal_id].push(img.image_url)
        return acc
      }, {} as Record<string, string[]>)

      // Combine meals with their images
      const mealsWithImages = mealsData.map(meal => ({
        ...meal,
        images: imagesByMeal[meal.id] || []
      }))
      
      setMeals(mealsWithImages)
    } catch (error) {
      console.error('Error fetching meals:', error)
      setMeals([])
    }
  }

  const handleDateChange = (date: Date) => {
    setCurrentDate(new Date(date))
  }

  const handleMealSuccess = async () => {
    await fetchMealsForDate(currentDate)
    mealInputHook.resetForm()
  }

  const handleMealUpdate = async () => {
    await fetchMealsForDate(currentDate)
  }

  const handleWeightAdded = async () => {
    await loadTodaysData(currentDate)
    await loadUserData()
  }

  const handleWorkoutAdded = async () => {
    await loadTodaysData(currentDate)
  }

  const handleSleepAdded = async () => {
    await loadTodaysData(currentDate)
  }

  const handleMeasurementsAdded = () => {
    loadTodaysData(currentDate)
  }

  // ✅ HOOKS CALLED BEFORE ANY EARLY RETURNS
  useEffect(() => {
    if (user) {
      loadUserData()
      fetchMealsForDate(currentDate)
      loadTodaysData(currentDate)
    }
  }, [user, currentDate])

  // ✅ NOW SAFE TO DO EARLY RETURNS AFTER ALL HOOKS
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to profile setup if not complete
  if (!isSetupComplete) {
    return <Navigate to="/profile" replace />
  }

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 w-full animate-pulse bg-muted rounded-lg" />
        <div className="h-48 w-full animate-pulse bg-muted rounded-lg" />
        <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Trial Banner */}
      <TrialBanner />
      
      {/* Weekly Coach Recommendation for Free Users */}
      <WeeklyCoachRecommendation />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Überblick über Ihren heutigen Fortschritt</p>
      </div>

      {/* Daily Progress Overview */}
      <DailyProgress
        dailyTotals={{
          calories: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
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

      {/* Quick Input Cards - 2x3 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Meal Input */}
        <Card className="gradient-macros">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4" />
              Mahlzeit hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent>
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
            />
          </CardContent>
        </Card>

        {/* Weight Tracker */}
        <Card className="gradient-personal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4" />
              Gewicht erfassen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickWeightInput 
              onWeightAdded={handleWeightAdded}
              todaysWeight={todaysWeight}
            />
          </CardContent>
        </Card>

        {/* Quick Workout */}
        <Card className="gradient-goals">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="h-4 w-4" />
              Training erfassen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickWorkoutInput 
              onWorkoutAdded={handleWorkoutAdded}
              todaysWorkout={todaysWorkouts[0] || null}
              todaysWorkouts={todaysWorkouts}
            />
          </CardContent>
        </Card>

        {/* Sleep Input */}
        <Card className="gradient-analysis">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4" />
              Schlaf protokollieren
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickSleepInput 
              onSleepAdded={handleSleepAdded}
              todaysSleep={todaysSleep}
            />
          </CardContent>
        </Card>

        {/* Body Measurements */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Körpermaße
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BodyMeasurements 
              onMeasurementsAdded={handleMeasurementsAdded}
              todaysMeasurements={todaysMeasurements}
            />
          </CardContent>
        </Card>

        {/* Smart Coach Insights */}
        <Card className="gradient-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Coach Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SmartCoachInsights />
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Fortschrittsverlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressCharts />
        </CardContent>
      </Card>

      {/* Meal List */}
      {meals.length > 0 && (
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Heutige Mahlzeiten ({meals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MealList 
              meals={meals}
              onMealUpdate={handleMealUpdate}
              selectedDate={currentDate.toISOString().split('T')[0]}
            />
          </CardContent>
        </Card>
      )}

      {/* Meal Confirmation Dialog */}
      <MealConfirmationDialog 
        isOpen={mealInputHook.showConfirmationDialog}
        onClose={mealInputHook.closeDialog}
        analyzedMealData={mealInputHook.analyzedMealData}
        onSuccess={handleMealSuccess}
        selectedMealType={mealInputHook.selectedMealType}
        onMealTypeChange={mealInputHook.setSelectedMealType}
        uploadedImages={mealInputHook.uploadedImages}
      />
    </div>
  )
}

export default NewIndex