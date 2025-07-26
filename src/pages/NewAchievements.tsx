import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trophy, 
  Flame, 
  Star, 
  Award,
  Target,
  Calendar
} from "lucide-react"

import { BadgeSystem } from "@/components/BadgeSystem"
import Achievements from "@/pages/Achievements"

const NewAchievements = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Erfolge & Belohnungen</h1>
        <p className="text-muted-foreground">Ihre Fortschritte und erreichten Meilensteine</p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Erfolge
          </TabsTrigger>
          <TabsTrigger value="streaks" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Streaks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-6">
          <Card className="gradient-goals">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Badge System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeSystem />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Ihre Erfolge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Achievements />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks" className="mt-6">
          <Card className="gradient-personal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Streak-System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Flame className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Streak-Tracking</h3>
                <p className="text-muted-foreground">
                  Verfolgen Sie Ihre täglichen Gewohnheiten und bauen Sie längere Streaks auf.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NewAchievements