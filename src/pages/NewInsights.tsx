import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Target,
  Activity,
  Scale
} from "lucide-react"

import { ProgressCharts } from "@/components/ProgressCharts"
import { HistoryCharts } from "@/components/HistoryCharts"
import { WeightHistory } from "@/components/WeightHistory"
import Analysis from "@/pages/Analysis"

const NewInsights = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Insights & Analysen</h1>
        <p className="text-muted-foreground">Detaillierte Auswertungen Ihres Fortschritts</p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Überblick
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Fortschritt
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Gewicht
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            AI-Analyse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Verlaufsdiagramme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Verlaufsdiagramme werden hier angezeigt</p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Zielfortschritt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Zielfortschritt wird hier angezeigt</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <Card className="gradient-goals">
            <CardHeader>
              <CardTitle>Fortschrittscharts</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressCharts />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weight" className="mt-6">
          <Card className="gradient-personal">
            <CardHeader>
              <CardTitle>Gewichtsverlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Gewichtsverlauf wird hier angezeigt</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <Card className="gradient-analysis">
            <CardHeader>
              <CardTitle>AI-Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <Analysis />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NewInsights