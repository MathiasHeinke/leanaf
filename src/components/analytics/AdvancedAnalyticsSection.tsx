import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  Heart, 
  TrendingUp, 
  Zap,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { CorrelationMatrix } from './CorrelationMatrix';
import { HealthScoreDashboard } from './HealthScoreDashboard';
import { PredictiveInsights } from './PredictiveInsights';
import { PerformanceOptimization } from './PerformanceOptimization';

export const AdvancedAnalyticsSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(30);
  const { 
    correlations, 
    healthScore, 
    insights, 
    performancePatterns, 
    metabolicProfile,
    loading,
    hasData 
  } = useAdvancedAnalytics(timeRange);

  if (!hasData && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Erweiterte Datenanalyse
          </CardTitle>
          <CardDescription>
            Entdecke Korrelationen und Muster in deinen Gesundheitsdaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Keine Daten verfügbar</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Beginne mit dem Tracking deiner Mahlzeiten, Workouts und anderen Gesundheitsmetriken, 
              um aussagekräftige Analysen und Korrelationen zu erhalten.
            </p>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Jetzt mit Tracking beginnen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Erweiterte Datenanalyse</h2>
          <p className="text-muted-foreground">
            Entdecke Korrelationen und Muster in deinen Gesundheitsdaten
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button 
              variant={timeRange === 7 ? "default" : "ghost"} 
              size="sm"
              onClick={() => setTimeRange(7)}
            >
              7T
            </Button>
            <Button 
              variant={timeRange === 14 ? "default" : "ghost"} 
              size="sm"
              onClick={() => setTimeRange(14)}
            >
              14T
            </Button>
            <Button 
              variant={timeRange === 30 ? "default" : "ghost"} 
              size="sm"
              onClick={() => setTimeRange(30)}
            >
              30T
            </Button>
          </div>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="health-score" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="health-score" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Health Score
          </TabsTrigger>
          <TabsTrigger value="correlations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Korrelationen
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Optimierung
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health-score" className="mt-6">
          <HealthScoreDashboard healthScore={healthScore} loading={loading} />
        </TabsContent>

        <TabsContent value="correlations" className="mt-6">
          <CorrelationMatrix correlations={correlations} loading={loading} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <PredictiveInsights insights={insights} loading={loading} />
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <PerformanceOptimization 
            patterns={performancePatterns} 
            metabolicProfile={metabolicProfile}
            loading={loading} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};