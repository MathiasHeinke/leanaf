import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Footprints, Target, Calendar, Plus } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface DailyActivity {
  id: string;
  date: string;
  steps: number;
  distance_km: number;
  calories_burned: number;
  activity_minutes: number;
}

interface StepsData {
  todaySteps: number;
  weeklyAverage: number;
  weeklyTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  activityLevel: string;
  goalProgress: number;
  recentDays: DailyActivity[];
}

const StepsAnalysisWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stepsData, setStepsData] = useState<StepsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [newSteps, setNewSteps] = useState("");

  const DAILY_GOAL = 10000; // Standard WHO recommendation

  useEffect(() => {
    if (user) {
      loadStepsData();
    }
  }, [user]);

  const loadStepsData = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const sevenDaysAgo = subDays(today, 7);

      // Fetch last 7 days of activity data
      const { data: activities, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;

      const today_str = format(today, 'yyyy-MM-dd');
      const todayData = activities?.find(a => a.date === today_str);
      const todaySteps = todayData?.steps || 0;

      // Calculate weekly stats
      const weeklySteps = activities?.reduce((sum, day) => sum + (day.steps || 0), 0) || 0;
      const weeklyAverage = activities?.length ? Math.round(weeklySteps / 7) : 0;

      // Calculate trend (compare this week with previous week)
      const thisWeekStart = format(weekStart, 'yyyy-MM-dd');
      const thisWeekData = activities?.filter(a => a.date >= thisWeekStart) || [];
      const thisWeekSteps = thisWeekData.reduce((sum, day) => sum + (day.steps || 0), 0);
      
      const prevWeekData = activities?.filter(a => a.date < thisWeekStart) || [];
      const prevWeekSteps = prevWeekData.reduce((sum, day) => sum + (day.steps || 0), 0);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;

      if (prevWeekSteps > 0) {
        const change = ((thisWeekSteps - prevWeekSteps) / prevWeekSteps) * 100;
        trendPercentage = Math.abs(change);
        
        if (change > 5) trend = 'up';
        else if (change < -5) trend = 'down';
      }

      // Determine activity level based on daily average
      let activityLevel = 'Sedentary';
      if (weeklyAverage >= 12000) activityLevel = 'Very Active';
      else if (weeklyAverage >= 10000) activityLevel = 'Active';
      else if (weeklyAverage >= 7500) activityLevel = 'Somewhat Active';
      else if (weeklyAverage >= 5000) activityLevel = 'Lightly Active';

      const goalProgress = (todaySteps / DAILY_GOAL) * 100;

      setStepsData({
        todaySteps,
        weeklyAverage,
        weeklyTotal: weeklySteps,
        trend,
        trendPercentage,
        activityLevel,
        goalProgress: Math.min(goalProgress, 100),
        recentDays: activities?.slice(0, 7) || []
      });
    } catch (error) {
      console.error('Error loading steps data:', error);
      toast({
        title: "Fehler beim Laden der Schrittdaten",
        description: "Die Daten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSteps = async () => {
    if (!user || !newSteps) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const steps = parseInt(newSteps);

      const { error } = await supabase
        .from('daily_activities')
        .upsert({
          user_id: user.id,
          date: today,
          steps: steps,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Schritte erfasst",
        description: `${steps.toLocaleString()} Schritte für heute gespeichert.`
      });

      setNewSteps("");
      setShowInput(false);
      loadStepsData();
    } catch (error) {
      console.error('Error saving steps:', error);
      toast({
        title: "Fehler",
        description: "Schritte konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'Very Active': return 'bg-green-500';
      case 'Active': return 'bg-blue-500';
      case 'Somewhat Active': return 'bg-yellow-500';
      case 'Lightly Active': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Schritte Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stepsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Schritte Analyse
          </CardTitle>
          <CardDescription>
            Beginne mit dem Tracking deiner täglichen Schritte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Noch keine Schrittdaten verfügbar</p>
            <Button onClick={() => setShowInput(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Erste Schritte erfassen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Schritte Analyse
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowInput(!showInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showInput && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Schritte heute"
              value={newSteps}
              onChange={(e) => setNewSteps(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddSteps} disabled={!newSteps}>
              Speichern
            </Button>
          </div>
        )}

        {/* Today's Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {stepsData.todaySteps.toLocaleString()} Schritte
              </h3>
              <p className="text-sm text-muted-foreground">Heute</p>
            </div>
            <Badge variant="outline" className={getActivityLevelColor(stepsData.activityLevel)}>
              {stepsData.activityLevel}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tagesziel: {DAILY_GOAL.toLocaleString()}</span>
              <span>{Math.round(stepsData.goalProgress)}%</span>
            </div>
            <Progress value={stepsData.goalProgress} className="h-2" />
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">7-Tage Ø</span>
            </div>
            <p className="text-2xl font-bold">
              {stepsData.weeklyAverage.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getTrendIcon(stepsData.trend)}
              <span className="text-sm font-medium">Trend</span>
            </div>
            <p className="text-2xl font-bold">
              {stepsData.trend === 'stable' ? '~' : ''}
              {stepsData.trendPercentage > 0 ? `${Math.round(stepsData.trendPercentage)}%` : 'Stabil'}
            </p>
          </div>
        </div>

        {/* Recent Days Overview */}
        {stepsData.recentDays.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Letzte 7 Tage</h4>
            <div className="grid grid-cols-7 gap-1">
              {stepsData.recentDays.map((day, index) => {
                const progress = (day.steps / DAILY_GOAL) * 100;
                const isToday = index === 0;
                
                return (
                  <div 
                    key={day.id || index} 
                    className={`text-center space-y-1 p-2 rounded ${isToday ? 'bg-muted' : ''}`}
                  >
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(day.date), 'dd')}
                    </div>
                    <div className="w-full bg-muted h-16 rounded-sm relative overflow-hidden">
                      <div 
                        className="absolute bottom-0 w-full bg-primary transition-all"
                        style={{ height: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs">
                      {day.steps > 0 ? Math.round(day.steps / 1000) + 'k' : '0'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StepsAnalysisWidget;