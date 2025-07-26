import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dumbbell, 
  Camera, 
  List, 
  Calendar,
  TrendingUp,
  Video
} from "lucide-react"

import { WorkoutCoachChat } from "@/components/WorkoutCoachChat"
import { UnifiedWorkoutCard } from "@/components/UnifiedWorkoutCard"
import { WorkoutCalendar } from "@/components/WorkoutCalendar"
import { ExerciseProgressCharts } from "@/components/ExerciseProgressCharts"

const NewTraining = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Training+</h1>
        <p className="text-muted-foreground">Professionelles Training mit AI-Unterstützung</p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="formcheck" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="formcheck" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Formcheck
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Übungen
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fortschritt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formcheck" className="mt-6">
          <Card className="gradient-goals">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Sascha's Formcheck
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkoutCoachChat />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Workout protokollieren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <List className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Übungs-Protokoll wird hier integriert</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card className="gradient-personal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Trainingskalender
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkoutCalendar />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <Card className="gradient-analysis">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trainingsfortschritt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExerciseProgressCharts />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NewTraining