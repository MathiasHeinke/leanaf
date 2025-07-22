
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CoachInsightsProps {
  userData: any;
  coachPersonality: string;
}

interface AnalysisResult {
  messages: Array<{
    type: string;
    title: string;
    message: string;
    priority: string;
  }>;
  dailyScore: number;
  summary: string;
}

export const CoachInsights = ({ userData, coachPersonality }: CoachInsightsProps) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userData && user?.id) {
      generateInsights();
    }
  }, [userData, user?.id]);

  const generateInsights = async () => {
    if (!userData || !user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-analysis', {
        body: {
          dailyTotals: userData.todaysTotals,
          dailyGoal: userData.dailyGoals?.calories || 2000,
          mealsCount: userData.recentMeals.filter(meal => 
            meal.created_at.startsWith(new Date().toISOString().split('T')[0])
          ).length,
          userData: {
            averages: calculateAverages(),
            historyDays: userData.recentMeals.length,
            weightHistory: userData.weightHistory.slice(0, 5),
            recentProgress: userData.todaysTotals
          },
          userId: user.id
        }
      });

      if (error) throw error;
      setAnalysis(data);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAverages = () => {
    if (!userData?.recentMeals?.length) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    const totals = userData.recentMeals.reduce((sum: any, meal: any) => ({
      calories: sum.calories + (meal.calories || 0),
      protein: sum.protein + (meal.protein || 0),
      carbs: sum.carbs + (meal.carbs || 0),
      fats: sum.fats + (meal.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const days = Math.max(1, userData.recentMeals.length);
    return {
      calories: Math.round(totals.calories / days),
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fats: Math.round(totals.fats / days)
    };
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'motivation': return <Zap className="h-5 w-5" />;
      case 'tip': return <Target className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'analysis': return <Brain className="h-5 w-5" />;
      case 'trend': return <TrendingUp className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    if (priority === 'high') {
      return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30';
    }
    
    switch (type) {
      case 'motivation':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30';
      case 'warning':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30';
      case 'tip':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30';
      case 'analysis':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/30';
      default:
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">Wichtig</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Normal</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Info</Badge>;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Today's Score Card */}
      {analysis && (
        <Card className="glass-card border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-primary" />
                <span>Tages-Score</span>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.dailyScore)}`}>
                {analysis.dailyScore}/10
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={analysis.dailyScore * 10} className="mb-4" />
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {userData && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Tracking-Streak</p>
                  <p className="text-2xl font-bold">{userData.recentMeals.length}</p>
                  <p className="text-xs text-muted-foreground">Tage aktiv</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Ø Kalorien</p>
                  <p className="text-2xl font-bold">{calculateAverages().calories}</p>
                  <p className="text-xs text-muted-foreground">pro Tag</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Brain className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Coach analysiert deine Daten...</p>
            </div>
          </CardContent>
        </Card>
      ) : analysis?.messages ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" />
              KI-Insights
              <Badge variant="outline" className="ml-auto">
                {coachPersonality}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.messages.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type, insight.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{insight.title}</h4>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <p className="text-sm opacity-90">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Keine Insights verfügbar</p>
              <Button onClick={generateInsights} className="mt-4">
                Insights generieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Overview */}
      {userData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              Daten-Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Mahlzeiten diese Woche</p>
                <p className="text-2xl font-bold text-primary">{userData.recentMeals.length}</p>
              </div>
              <div>
                <p className="font-medium">Workouts diese Woche</p>
                <p className="text-2xl font-bold text-primary">{userData.recentWorkouts.length}</p>
              </div>
              <div>
                <p className="font-medium">Schlaf-Tracking</p>
                <p className="text-2xl font-bold text-primary">{userData.recentSleep.length}</p>
              </div>
              <div>
                <p className="font-medium">Gewichtsmessungen</p>
                <p className="text-2xl font-bold text-primary">{userData.weightHistory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
