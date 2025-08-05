import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Droplets, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNutritionalValue } from "@/utils/numberFormatting";
import { getCurrentDateString } from "@/utils/dateHelpers";

interface HydrationData {
  todayIntake: number;
  dailyGoal: number;
  progress: number;
  weeklyAverage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export const HydrationWidget = () => {
  const { user } = useAuth();
  const [hydrationData, setHydrationData] = useState<HydrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadHydrationData();
    }
  }, [user?.id]);

  const loadHydrationData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get daily goal - use 2000ml default since fluid_goal_ml doesn't exist
      const dailyGoal = 2000; // Default 2L

      // Get today's fluid intake
      const today = getCurrentDateString();
      const { data: todayFluids } = await supabase
        .from('user_fluids')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('date', today);

      const todayIntake = todayFluids?.reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0) || 0;

      // Get last 7 days for weekly average and trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: weeklyFluids } = await supabase
        .from('user_fluids')
        .select('amount_ml, date')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Calculate daily totals for the week
      const dailyTotals: { [key: string]: number } = {};
      weeklyFluids?.forEach(fluid => {
        const date = fluid.date;
        dailyTotals[date] = (dailyTotals[date] || 0) + (fluid.amount_ml || 0);
      });

      const dailyAmounts = Object.values(dailyTotals);
      const weeklyAverage = dailyAmounts.length > 0 
        ? dailyAmounts.reduce((sum, amount) => sum + amount, 0) / dailyAmounts.length 
        : 0;

      // Calculate trend (compare last 3 days vs previous 3 days)
      const sortedDates = Object.keys(dailyTotals).sort();
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;

      if (sortedDates.length >= 6) {
        const recent3 = sortedDates.slice(-3).map(date => dailyTotals[date]);
        const previous3 = sortedDates.slice(-6, -3).map(date => dailyTotals[date]);
        
        const recentAvg = recent3.reduce((sum, val) => sum + val, 0) / 3;
        const previousAvg = previous3.reduce((sum, val) => sum + val, 0) / 3;
        
        if (previousAvg > 0) {
          trendPercentage = ((recentAvg - previousAvg) / previousAvg) * 100;
          if (Math.abs(trendPercentage) >= 10) {
            trend = trendPercentage > 0 ? 'up' : 'down';
          }
        }
      }

      const progress = (todayIntake / dailyGoal) * 100;

      setHydrationData({
        todayIntake,
        dailyGoal,
        progress: Math.min(progress, 100),
        weeklyAverage,
        trend,
        trendPercentage: Math.abs(trendPercentage)
      });

    } catch (error) {
      console.error('Error loading hydration data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!hydrationData) return null;

  const getTrendIcon = () => {
    switch (hydrationData.trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (hydrationData.trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="glass-card shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Wasserzufuhr</div>
            <div className="text-sm text-muted-foreground font-normal">Hydration heute</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Heute getrunken</span>
            <Badge variant="outline" className="text-xs">
              {Math.round(hydrationData.progress)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatNutritionalValue(hydrationData.todayIntake, 'ml')} ml
            </div>
            <div className="text-sm text-muted-foreground">
              Ziel: {formatNutritionalValue(hydrationData.dailyGoal, 'ml')} ml
            </div>
            <Progress 
              value={hydrationData.progress} 
              className="h-3 bg-blue-100 dark:bg-blue-800/50"
            />
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">7-Tage Ø</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatNutritionalValue(hydrationData.weeklyAverage, 'ml')} ml
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Trend</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {hydrationData.trend === 'stable' ? 'Stabil' : `${hydrationData.trendPercentage.toFixed(0)}%`}
            </div>
          </div>
        </div>

        {/* Progress Status */}
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium border-t pt-4">
          {hydrationData.progress >= 100 
            ? "🎉 Tagesziel erreicht! Weiter so!"
            : hydrationData.progress >= 75
            ? "💪 Fast geschafft! Noch ein paar Schlücke."
            : hydrationData.progress >= 50
            ? "👍 Guter Fortschritt, weiter trinken!"
            : "💧 Denk daran zu trinken!"}
        </div>
      </CardContent>
    </Card>
  );
};