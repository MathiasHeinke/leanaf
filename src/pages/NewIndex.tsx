import React from "react"
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
import { DailyProgress } from "@/components/DailyProgress"
import { WeightTracker } from "@/components/WeightTracker"
import { MealInput } from "@/components/MealInput"
import { QuickSleepInput } from "@/components/QuickSleepInput"
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput"

const NewIndex = () => {
  const { isSetupComplete, isLoading } = useProfileCompletion()

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Überblick über Ihren heutigen Fortschritt</p>
      </div>

      {/* Daily Progress Overview */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Tagesfortschritt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Tagesfortschritt wird hier angezeigt</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gradient-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-carbs/10 rounded-lg">
                <Utensils className="h-5 w-5 text-carbs" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Mahlzeit</h3>
                <p className="text-xs text-muted-foreground">Tracking</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Gewicht</h3>
                <p className="text-xs text-muted-foreground">Erfassen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-protein/10 rounded-lg">
                <Dumbbell className="h-5 w-5 text-protein" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Training</h3>
                <p className="text-xs text-muted-foreground">Protokoll</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-fats/10 rounded-lg">
                <Moon className="h-5 w-5 text-fats" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Schlaf</h3>
                <p className="text-xs text-muted-foreground">Protokoll</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Input */}
        <Card className="gradient-macros">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4" />
              Mahlzeit hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Utensils className="h-12 w-12 text-carbs mx-auto mb-4" />
              <p className="text-muted-foreground">Mahlzeit-Eingabe wird hier integriert</p>
            </div>
          </CardContent>
        </Card>

        {/* Weight Tracker */}
        <Card className="gradient-personal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4" />
              Gewichtstracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Gewichts-Tracker wird hier integriert</p>
            </div>
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
            <div className="text-center py-8">
              <Dumbbell className="h-12 w-12 text-protein mx-auto mb-4" />
              <p className="text-muted-foreground">Training-Eingabe wird hier integriert</p>
            </div>
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
            <div className="text-center py-8">
              <Moon className="h-12 w-12 text-fats mx-auto mb-4" />
              <p className="text-muted-foreground">Schlaf-Protokoll wird hier integriert</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NewIndex