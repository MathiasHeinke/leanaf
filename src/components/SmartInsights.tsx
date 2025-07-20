
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeightTracker } from "@/components/WeightTracker";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Zap,
  Calendar,
  BarChart3,
  Heart,
  Clock,
  Activity,
  Scale
} from "lucide-react";

interface SmartInsightsProps {
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

export const SmartInsights = ({ 
  todaysTotals, 
  dailyGoals, 
  averages, 
  historyData,
  trendData,
  weightHistory,
  onWeightAdded
}: SmartInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    generateInsights();
  }, [todaysTotals, dailyGoals, averages, historyData, weightHistory]);

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
      const dayProgress = (day.totals.calories / dailyGoals.calories) * 100;
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

  const calorieProgress = (todaysTotals.calories / dailyGoals.calories) * 100;
  const proteinProgress = (todaysTotals.protein / dailyGoals.protein) * 100;

  return (
    <Card className="glass-card shadow-xl border-2 border-dashed border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">Smart Insights</div>
            <div className="text-sm text-muted-foreground font-normal">Intelligente Ernährungs- & Gewichtsanalyse</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Ziele
            </TabsTrigger>
            <TabsTrigger value="weight" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Gewicht
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Today's Progress Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-600 dark:text-blue-400">Kalorien</span>
                  </div>
                  <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                    {Math.round(calorieProgress)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {todaysTotals.calories} / {dailyGoals.calories}
                  </div>
                  <Progress 
                    value={Math.min(100, calorieProgress)} 
                    className="h-2 bg-blue-100 dark:bg-blue-800/50" 
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-600 dark:text-green-400">Protein</span>
                  </div>
                  <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                    {Math.round(proteinProgress)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {todaysTotals.protein}g / {dailyGoals.protein}g
                  </div>
                  <Progress 
                    value={Math.min(100, proteinProgress)} 
                    className="h-2 bg-green-100 dark:bg-green-800/50" 
                  />
                </div>
              </div>
            </div>

            {/* Weekly Average vs Today */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Wochenvergleich
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Heute</div>
                  <div className="text-xl font-bold">{todaysTotals.calories} kcal</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">7-Tage Ø</div>
                  <div className="text-xl font-bold">{averages.calories} kcal</div>
                </div>
              </div>
            </div>

            {/* Weight Quick View */}
            {weightHistory && weightHistory.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Gewichtstrend
                </h4>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Aktuelles Gewicht</div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {weightHistory[0]?.weight}kg
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab("weight")}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      Details →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div 
                    key={insight.id} 
                    className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          {getPriorityBadge(insight.priority)}
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed mb-3">{insight.description}</p>
                        
                        {insight.progress && (
                          <div className="mb-3">
                            <Progress 
                              value={Math.min(100, insight.progress)} 
                              className="h-2" 
                            />
                          </div>
                        )}
                        
                        {insight.action && (
                          <Button variant="outline" size="sm" className="mt-2">
                            {insight.action}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sammle mehr Daten für personalisierte Insights</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Ziel-Fortschritt
              </h4>
              
              {/* Goal Progress Cards */}
              <div className="space-y-4">
                {[
                  { label: 'Kalorien', current: todaysTotals.calories, target: dailyGoals.calories, unit: 'kcal', color: 'blue' },
                  { label: 'Protein', current: todaysTotals.protein, target: dailyGoals.protein, unit: 'g', color: 'green' },
                  { label: 'Kohlenhydrate', current: todaysTotals.carbs, target: dailyGoals.carbs, unit: 'g', color: 'orange' },
                  { label: 'Fette', current: todaysTotals.fats, target: dailyGoals.fats, unit: 'g', color: 'purple' }
                ].map((goal) => {
                  const progress = (goal.current / goal.target) * 100;
                  return (
                    <div key={goal.label} className="p-4 bg-background/60 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{goal.label}</span>
                        <Badge variant="outline">{Math.round(progress)}%</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {goal.current}{goal.unit} / {goal.target}{goal.unit}
                        </div>
                        <Progress value={Math.min(100, progress)} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly Goal Achievement */}
              {historyData.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Wöchentliche Zielerreichung
                  </h5>
                  <div className="text-sm text-muted-foreground">
                    {historyData.filter(day => {
                      const dayProgress = (day.totals.calories / dailyGoals.calories) * 100;
                      return dayProgress >= 90 && dayProgress <= 110;
                    }).length} von {Math.min(historyData.length, 7)} Tagen im Zielbereich
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="weight" className="space-y-4">
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 rounded-xl flex items-center justify-center">
                  <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Gewichts-Management</h3>
                  <p className="text-sm text-muted-foreground">Verfolge deinen Fortschritt zum Zielgewicht</p>
                </div>
              </div>
              
              <WeightTracker 
                weightHistory={weightHistory} 
                onWeightAdded={onWeightAdded} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
