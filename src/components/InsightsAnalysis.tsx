import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Lightbulb, 
  AlertTriangle,
  CheckCircle,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";


interface InsightsAnalysisProps {
  todaysTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  dailyGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  historyData: any[];
  trendData: any;
  weightHistory: any[];
  onWeightAdded: () => void;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  progress?: number;
}

export const InsightsAnalysis = ({ 
  todaysTotals, 
  dailyGoals, 
  averages, 
  historyData,
  trendData,
  weightHistory,
  onWeightAdded
}: InsightsAnalysisProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    generateInsights();
  }, [todaysTotals, dailyGoals, averages, historyData, weightHistory]);

  const startAiAnalysis = async () => {
    if (!user || !dailyGoals) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-coach-non-streaming', {
        body: {
          dailyTotals: todaysTotals,
          dailyGoal: dailyGoals.calories,
          mealsCount: historyData.length > 0 ? historyData[0]?.mealCount || 0 : 0,
          userData: {
            averages,
            historyDays: historyData.length,
            weightHistory: weightHistory.slice(0, 5),
            recentProgress: trendData
          },
          userId: user.id,
          context: {
            todaysTotals,
            dailyGoals,
            averages
          }
        }
      });

      if (error) throw error;
      
      setAiAnalysis(data);
    } catch (error) {
      console.error('Error starting AI analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateInsights = () => {
    const newInsights: Insight[] = [];
    
    if (!dailyGoals) return;

    // Calorie Analysis
    const calorieProgress = (todaysTotals.calories / dailyGoals.calories) * 100;
    const avgCalorieProgress = (averages.calories / dailyGoals.calories) * 100;
    
    if (calorieProgress < 70) {
      newInsights.push({
        id: 'low-calories',
        type: 'warning',
        priority: 'high',
        title: 'Zu wenig Kalorien heute',
        description: `Du hast erst ${Math.round(calorieProgress)}% deines Tagesziels erreicht. Achte darauf, genug Energie zu dir zu nehmen.`,
        action: 'Meal hinzufügen',
        progress: calorieProgress
      });
    } else if (calorieProgress >= 90 && calorieProgress <= 110) {
      newInsights.push({
        id: 'perfect-calories',
        type: 'success',
        priority: 'medium',
        title: 'Perfekte Kalorienbilanz!',
        description: `Fantastisch! Du liegst mit ${Math.round(calorieProgress)}% optimal in deinem Zielbereich.`,
        progress: calorieProgress
      });
    }

    // Protein Analysis
    const proteinProgress = (todaysTotals.protein / dailyGoals.protein) * 100;
    if (proteinProgress < 80) {
      newInsights.push({
        id: 'low-protein',
        type: 'warning',
        priority: 'high',
        title: 'Protein-Ziel verfehlt',
        description: `Nur ${Math.round(proteinProgress)}% deines Protein-Ziels erreicht. Protein ist wichtig für Muskelerhalt und Sättigung.`,
        action: 'Protein-reiche Lebensmittel',
        progress: proteinProgress
      });
    }

    // Weight-Nutrition Correlation Analysis
    if (weightHistory && weightHistory.length >= 2) {
      const recentWeight = weightHistory[0]?.weight;
      const previousWeight = weightHistory[1]?.weight;
      
      if (recentWeight && previousWeight) {
        const weightChange = recentWeight - previousWeight;
        const isLosingWeight = weightChange < -0.2;
        const isGainingWeight = weightChange > 0.2;
        
        if (isLosingWeight && avgCalorieProgress > 100) {
          newInsights.push({
            id: 'weight-calorie-correlation',
            type: 'info',
            priority: 'medium',
            title: 'Gewichtsverlust trotz hoher Kalorien',
            description: `Du nimmst ab (-${Math.abs(weightChange).toFixed(1)}kg), obwohl du ${Math.round(avgCalorieProgress)}% deines Kalorienziels erreichst. Das ist ein gutes Zeichen für aktiven Stoffwechsel!`,
            action: 'Weiter beobachten'
          });
        } else if (isGainingWeight && avgCalorieProgress < 90) {
          newInsights.push({
            id: 'unexpected-weight-gain',
            type: 'warning',
            priority: 'medium',
            title: 'Gewichtszunahme bei niedrigen Kalorien',
            description: `Trotz nur ${Math.round(avgCalorieProgress)}% deines Kalorienziels hast du +${weightChange.toFixed(1)}kg zugenommen. Das könnte an Wassereinlagerungen oder anderen Faktoren liegen.`,
            action: 'Trends beobachten'
          });
        }
      }
    }

    // Consistency Analysis
    const consistentDays = historyData.filter(day => {
      const dayProgress = (day.calories / dailyGoals.calories) * 100;
      return dayProgress >= 80 && dayProgress <= 120;
    }).length;
    
    const consistencyRate = historyData.length > 0 ? (consistentDays / Math.min(historyData.length, 7)) * 100 : 0;
    
    if (consistencyRate >= 80) {
      newInsights.push({
        id: 'great-consistency',
        type: 'success',
        priority: 'medium',
        title: 'Hervorragende Konstanz!',
        description: `Du warst in ${consistentDays} von ${Math.min(historyData.length, 7)} Tagen in deinem Zielbereich. Das ist sehr gut!`,
        progress: consistencyRate
      });
    } else if (consistencyRate < 50) {
      newInsights.push({
        id: 'improve-consistency',
        type: 'tip',
        priority: 'medium',
        title: 'Konstanz verbessern',
        description: 'Regelmäßigkeit ist der Schlüssel zum Erfolg. Versuche täglich zu tracken.',
        action: 'Erinnerungen setzen'
      });
    }

    // Weekly Trend Analysis
    if (trendData) {
      if (trendData.trend === 'up' && avgCalorieProgress > 110) {
        newInsights.push({
          id: 'calories-trending-up',
          type: 'warning',
          priority: 'medium',
          title: 'Kalorien steigen an',
          description: `Deine durchschnittliche Kalorienzufuhr steigt. Prüfe, ob das zu deinen Zielen passt.`,
          action: 'Ziele überprüfen'
        });
      } else if (trendData.trend === 'down' && avgCalorieProgress < 90) {
        newInsights.push({
          id: 'calories-trending-down',
          type: 'info',
          priority: 'medium',
          title: 'Kalorienzufuhr sinkt',
          description: 'Du isst weniger als üblich. Stelle sicher, dass du genug Energie bekommst.',
          action: 'Mahlzeiten planen'
        });
      }
    }

    // Motivational Insights
    if (historyData.length >= 7) {
      newInsights.push({
        id: 'tracking-streak',
        type: 'success',
        priority: 'low',
        title: `${historyData.length} Tage getrackt!`,
        description: 'Du bist auf einem guten Weg. Kontinuierliches Tracking führt zu besseren Ergebnissen.',
        action: 'Weiter so!'
      });
    }

    setInsights(newInsights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }));
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'info': return <Activity className="h-5 w-5" />;
      case 'tip': return <Lightbulb className="h-5 w-5" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30';
      case 'warning': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30';
      case 'info': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30';
      case 'tip': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/30';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">Wichtig</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Info</Badge>;
      default: return null;
    }
  };

  if (!dailyGoals) return null;

  return (
    <Card className="glass-card shadow-xl border-2 border-dashed border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">Smart Insights</div>
            <div className="text-sm text-muted-foreground font-normal">Intelligente Ernährungsanalyse</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Smart Insights */}
        <div className="space-y-4">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
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
                    <p className="text-sm opacity-80">{insight.description}</p>
                    {insight.progress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Fortschritt</span>
                          <span>{Math.round(insight.progress)}%</span>
                        </div>
                        <Progress value={Math.min(100, insight.progress)} className="h-2" />
                      </div>
                    )}
                    {insight.action && (
                      <div className="text-xs font-medium opacity-70">
                        💡 {insight.action}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Sammle mehr Daten für detaillierte Insights...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
