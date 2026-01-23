import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Brain, Heart, Target, AlertTriangle } from 'lucide-react';
import { JournalInsight } from '@/hooks/useMindsetJournal';
import { cn } from '@/lib/utils';

interface InsightsPanelProps {
  insights: JournalInsight[];
  className?: string;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  insights,
  className
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return TrendingUp;
      case 'correlation': return Brain;
      case 'recommendation': return Target;
      default: return AlertTriangle;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'text-blue-500';
      case 'correlation': return 'text-purple-500';
      case 'recommendation': return 'text-green-500';
      default: return 'text-orange-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-background to-accent/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-primary" />
          Coach Insights
          <Badge variant="outline" className="text-xs">
            {insights.length} Erkenntnisse
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const IconComponent = getInsightIcon(insight.type);
          
          return (
            <div
              key={insight.id}
              className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <IconComponent className={cn("h-4 w-4", getInsightColor(insight.type))} />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {insight.timeRange}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-xs font-medium", getConfidenceColor(insight.confidence))}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Confidence Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Vertrauen</span>
                  <span className="text-xs text-muted-foreground">
                    {insight.relatedEntries.length} Einträge
                  </span>
                </div>
                <Progress 
                  value={insight.confidence * 100} 
                  className="h-1.5"
                />
              </div>

              {/* Insight Type Badge */}
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getInsightColor(insight.type))}
                >
                  {insight.type === 'pattern' && '📈 Muster'}
                  {insight.type === 'correlation' && '🔗 Korrelation'}
                  {insight.type === 'recommendation' && '💡 Empfehlung'}
                </Badge>
                
                {insight.type === 'pattern' && (
                  <Heart className="h-3 w-3 text-accent" />
                )}
              </div>
            </div>
          );
        })}
        
        {insights.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Erstelle mehr Einträge für Coach Insights</p>
            <p className="text-xs">Ab 3 Einträgen kann ich Muster erkennen</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};