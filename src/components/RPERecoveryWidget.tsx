import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertTriangle, CheckCircle, TrendingDown, Battery } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RPEData {
  weeklyAverage: number;
  dailyRPE: number[];
  trend: 'increasing' | 'decreasing' | 'stable';
  recoveryStatus: 'good' | 'moderate' | 'poor';
  recommendation: string;
}

export const RPERecoveryWidget: React.FC = () => {
  const { user } = useAuth();
  const [rpeData, setRpeData] = useState<RPEData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRPEData();
    }
  }, [user]);

  const loadRPEData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get RPE data from last 2 weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const { data: rpeSets, error } = await supabase
        .from('exercise_sets')
        .select('rpe, created_at')
        .eq('user_id', user.id)
        .gte('created_at', twoWeeksAgo.toISOString())
        .not('rpe', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!rpeSets || rpeSets.length === 0) {
        setRpeData(null);
        return;
      }

      // Group by day and calculate daily averages
      const dailyRPE = new Map<string, number[]>();
      
      rpeSets.forEach(set => {
        const date = new Date(set.created_at).toISOString().split('T')[0];
        if (!dailyRPE.has(date)) {
          dailyRPE.set(date, []);
        }
        dailyRPE.get(date)!.push(set.rpe);
      });

      // Calculate daily averages
      const dailyAverages: number[] = [];
      dailyRPE.forEach(rpeValues => {
        const average = rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length;
        dailyAverages.push(Math.round(average * 10) / 10);
      });

      // Calculate weekly average
      const weeklyAverage = dailyAverages.reduce((sum, avg) => sum + avg, 0) / dailyAverages.length;

      // Determine trend (last 7 days vs previous 7 days)
      const recent7Days = dailyAverages.slice(-7);
      const previous7Days = dailyAverages.slice(-14, -7);
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recent7Days.length > 0 && previous7Days.length > 0) {
        const recentAvg = recent7Days.reduce((sum, avg) => sum + avg, 0) / recent7Days.length;
        const previousAvg = previous7Days.reduce((sum, avg) => sum + avg, 0) / previous7Days.length;
        
        if (recentAvg > previousAvg + 0.5) trend = 'increasing';
        else if (recentAvg < previousAvg - 0.5) trend = 'decreasing';
      }

      // Determine recovery status and recommendation
      let recoveryStatus: 'good' | 'moderate' | 'poor' = 'good';
      let recommendation = '';

      if (weeklyAverage >= 8.5) {
        recoveryStatus = 'poor';
        recommendation = 'Deload empfohlen - Reduziere Intensität um 20-30%';
      } else if (weeklyAverage >= 7.5) {
        recoveryStatus = 'moderate';
        recommendation = 'Achte auf Regeneration - Mehr Schlaf und Pausen';
      } else if (weeklyAverage >= 6.5) {
        recoveryStatus = 'good';
        recommendation = 'Optimale Belastung - Weiter so!';
      } else {
        recoveryStatus = 'good';
        recommendation = 'Du kannst die Intensität steigern';
      }

      setRpeData({
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
        dailyRPE: dailyAverages.slice(-7), // Last 7 days
        trend,
        recoveryStatus,
        recommendation
      });

    } catch (error) {
      console.error('Error loading RPE data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecoveryColor = (status: string) => {
    switch (status) {
      case 'poor': return 'text-red-600 dark:text-red-400';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'good': return 'text-green-600 dark:text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  const getRecoveryIcon = (status: string) => {
    switch (status) {
      case 'poor': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'moderate': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Battery className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-3 w-3 text-green-500 rotate-180" />;
      default: return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
            <Activity className="h-4 w-4" />
            Recovery Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Analysiere RPE-Daten...</div>
        </CardContent>
      </Card>
    );
  }

  if (!rpeData) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
            <Activity className="h-4 w-4" />
            Recovery Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            Trage RPE-Werte ein, um deine Regeneration zu überwachen.
          </div>
          <Badge variant="outline" className="text-xs">
            <Battery className="h-3 w-3 mr-1" />
            Mehr RPE-Daten benötigt
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 ${
      rpeData.recoveryStatus === 'poor' ? 'border-red-200 dark:border-red-800 from-red-50 dark:from-red-950/20' : 
      rpeData.recoveryStatus === 'moderate' ? 'border-yellow-200 dark:border-yellow-800 from-yellow-50 dark:from-yellow-950/20' : ''
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm flex items-center gap-2 ${
          rpeData.recoveryStatus === 'poor' ? 'text-red-700 dark:text-red-400' :
          rpeData.recoveryStatus === 'moderate' ? 'text-yellow-700 dark:text-yellow-400' :
          'text-green-700 dark:text-green-400'
        }`}>
          {getRecoveryIcon(rpeData.recoveryStatus)}
          Recovery Status
          <Badge 
            variant={rpeData.recoveryStatus === 'poor' ? 'destructive' : rpeData.recoveryStatus === 'moderate' ? 'secondary' : 'default'} 
            className="ml-auto text-xs"
          >
            Ø {rpeData.weeklyAverage} RPE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-background/50 rounded-lg p-3 border border-current/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Wöchentlicher Durchschnitt</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(rpeData.trend)}
              <span className="text-xs text-muted-foreground capitalize">{rpeData.trend}</span>
            </div>
          </div>
          
          <div className="text-2xl font-bold mb-1" style={{ color: getRecoveryColor(rpeData.recoveryStatus).split(' ')[0] }}>
            {rpeData.weeklyAverage}/10
          </div>
          
          <div className="text-xs text-muted-foreground">
            Status: <span className={`font-medium ${getRecoveryColor(rpeData.recoveryStatus)}`}>
              {rpeData.recoveryStatus === 'poor' ? 'Überlastet' : 
               rpeData.recoveryStatus === 'moderate' ? 'Moderate Belastung' : 'Gute Regeneration'}
            </span>
          </div>
        </div>

        {/* Daily RPE visualization */}
        <div className="bg-background/50 rounded-lg p-3 border border-current/20">
          <div className="text-sm font-medium mb-2">Letzte 7 Tage</div>
          <div className="flex items-end gap-1 h-8">
            {rpeData.dailyRPE.map((rpe, index) => (
              <div
                key={index}
                className="flex-1 bg-current opacity-20 rounded-t"
                style={{ 
                  height: `${(rpe / 10) * 100}%`,
                  minHeight: '4px'
                }}
                title={`Tag ${index + 1}: ${rpe} RPE`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            RPE-Verlauf der letzten Woche
          </div>
        </div>

        {/* Recommendation */}
        <Alert className={`border-current/20 ${
          rpeData.recoveryStatus === 'poor' ? 'bg-red-50 dark:bg-red-950/20' :
          rpeData.recoveryStatus === 'moderate' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
          'bg-green-50 dark:bg-green-950/20'
        }`}>
          <AlertDescription className="text-xs">
            <strong>Empfehlung:</strong> {rpeData.recommendation}
          </AlertDescription>
        </Alert>

        <div className="text-xs text-muted-foreground text-center">
          💡 RPE 6-8 ist optimal für nachhaltigen Fortschritt
        </div>
      </CardContent>
    </Card>
  );
};