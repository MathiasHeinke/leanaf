
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, TrendingUp, RefreshCw, AlertTriangle, CheckCircle, Info, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedCoachAnalyzer, loadTransformationData, CoachInsight } from "@/utils/enhancedCoachAnalyzer";
import { PremiumGate } from "@/components/PremiumGate";

export const SmartCoachInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CoachInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      generateInsights();
    }
  }, [user]);

  const generateInsights = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await loadTransformationData(user.id);
      const analyzer = new EnhancedCoachAnalyzer(data);
      const newInsights = await analyzer.generateInsights();
      setInsights(newInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'motivation':
        return <Zap className="h-5 w-5 text-purple-600" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
      case 'warning':
        return 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800';
      case 'info':
        return 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
      case 'motivation':
        return 'bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800';
      default:
        return 'bg-gray-50/50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800';
    }
  };

  if (loading && insights.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg">KI-Coach analysiert...</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      </Card>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gradient-to-br from-indigo-50/50 via-indigo-25/30 to-indigo-50/20 dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-indigo-950/5 border-indigo-200/30 dark:border-indigo-800/30">
        <CollapsibleTrigger className="w-full">
          <div className="p-6 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">KI-Coach Insights</h3>
                  <p className="text-sm text-muted-foreground">Multi-Daten Analyse</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {insights.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {insights.length} Insights
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-6">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateInsights}
                disabled={loading}
                className="border-indigo-200 dark:border-indigo-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>

            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border ${getInsightColors(insight.type)} transition-all hover:scale-[1.01]`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{insight.title}</h4>
                          <span className="text-lg">{insight.icon}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {insight.message}
                        </p>
                        
                        {insight.data && (
                          <div className="mt-3 flex gap-2 flex-wrap">
                            {Object.entries(insight.data).map(([key, value]) => (
                              <Badge 
                                key={key} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {key}: {typeof value === 'number' ? value.toFixed(1) : String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PremiumGate 
                feature="premium_insights"
                hideable={true}
                fallbackMessage="KI-Coach Insights sind ein Premium Feature. Upgrade für erweiterte KI-gestützte Analyse!"
              >
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                  <h4 className="font-medium mb-2">Noch keine Insights</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sammle mehr Daten (Training, Schlaf, Maße) für detaillierte KI-Analyse
                  </p>
                  <Button 
                    onClick={generateInsights}
                    disabled={loading}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Erste Analyse
                  </Button>
                </div>
              </PremiumGate>
            )}

            {/* Quick Tips */}
            <div className="pt-4 border-t border-indigo-200/30 dark:border-indigo-800/30">
              <h4 className="font-medium mb-3 text-indigo-700 dark:text-indigo-300">💡 Erinnerung:</h4>
              <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>📏</span>
                  <span>Maße wichtiger als Waage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💪</span>
                  <span>1-2x Training = Muskelerhalt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>😴</span>
                  <span>7h Schlaf = bessere Ergebnisse</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🎯</span>
                  <span>Konsistenz über Perfektion</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
