import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  TrendingUp, 
  Lightbulb, 
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { PredictiveInsight } from '@/hooks/useAdvancedAnalytics';

interface PredictiveInsightsProps {
  insights: PredictiveInsight[];
  loading?: boolean;
}

export const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ 
  insights, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Analysiere Muster und erstelle Vorhersagen...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Sammle mehr Daten für personalisierte Empfehlungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Mehr Daten werden benötigt, um aussagekräftige Insights zu generieren.
              Tracke mindestens 2 Wochen regelmäßig für personalisierte Empfehlungen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'goal_prediction': return Target;
      case 'pattern_detection': return TrendingUp;
      case 'optimization_tip': return Lightbulb;
      default: return AlertCircle;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'goal_prediction': return 'text-blue-600 dark:text-blue-400';
      case 'pattern_detection': return 'text-green-600 dark:text-green-400';
      case 'optimization_tip': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { variant: 'default' as const, label: 'Hoch' };
    if (confidence >= 60) return { variant: 'secondary' as const, label: 'Mittel' };
    return { variant: 'outline' as const, label: 'Niedrig' };
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'goal_prediction': return 'Ziel-Vorhersage';
      case 'pattern_detection': return 'Muster-Erkennung';
      case 'optimization_tip': return 'Optimierungs-Tipp';
      default: return 'Insight';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>
          Personalisierte Empfehlungen basierend auf deinen Daten und Mustern
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type);
            const confidenceBadge = getConfidenceBadge(insight.confidence);
            
            return (
              <div 
                key={index}
                className="p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-primary/10 ${getInsightColor(insight.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getTypeLabel(insight.type)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={confidenceBadge.variant} className="text-xs">
                          {confidenceBadge.label} ({insight.confidence}%)
                        </Badge>
                        {insight.actionable && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm leading-relaxed">
                      {insight.description}
                    </p>
                    
                    {insight.actionable && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Lightbulb className="h-3 w-3 mr-1" />
                          Umsetzen
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Diese Empfehlung ist direkt umsetzbar
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Summary */}
          <div className="mt-6 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Insights Update</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Diese Empfehlungen werden täglich basierend auf deinen neuesten Daten aktualisiert.
              Je mehr du trackst, desto präziser werden die Vorhersagen.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};