import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { CorrelationData } from '@/hooks/useAdvancedAnalytics';

interface CorrelationMatrixProps {
  correlations: CorrelationData[];
  loading?: boolean;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ 
  correlations, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Korrelationsanalyse
          </CardTitle>
          <CardDescription>
            Lade Zusammenhänge zwischen deinen Metriken...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (correlations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Korrelationsanalyse
          </CardTitle>
          <CardDescription>
            Mehr Daten benötigt für aussagekräftige Korrelationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Sammle mindestens 7 Tage Daten, um Zusammenhänge zwischen deinen Metriken zu entdecken.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getCorrelationColor = (correlation: number, significance: string) => {
    if (significance === 'weak') return 'text-muted-foreground';
    if (Math.abs(correlation) > 0.7) return 'text-green-600 dark:text-green-400';
    if (Math.abs(correlation) > 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSignificanceBadge = (significance: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      strong: 'default',
      moderate: 'secondary', 
      weak: 'outline'
    };
    
    return (
      <Badge variant={variants[significance] || 'outline'} className="text-xs">
        {significance === 'strong' ? 'Stark' : 
         significance === 'moderate' ? 'Mittel' : 'Schwach'}
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'positive') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'negative') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Korrelationsanalyse
        </CardTitle>
        <CardDescription>
          Entdecke Zusammenhänge zwischen deinen Gesundheitsmetriken
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {correlations.map((corr, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{corr.metric1}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{corr.metric2}</span>
                  {getTrendIcon(corr.trend)}
                </div>
                <div className="flex items-center gap-2">
                  {getSignificanceBadge(corr.significance)}
                  <span className="text-sm text-muted-foreground">
                    {corr.trend === 'positive' ? 'Positive' : 
                     corr.trend === 'negative' ? 'Negative' : 'Neutrale'} Korrelation
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${getCorrelationColor(corr.correlation, corr.significance)}`}>
                  {(Math.abs(corr.correlation) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  r = {corr.correlation.toFixed(3)}
                </div>
              </div>
            </div>
          ))}
          
          {correlations.length > 0 && (
            <div className="mt-6 p-4 bg-muted/20 rounded-lg">
              <h4 className="font-medium mb-2">Interpretation:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Stark (70%+):</strong> Deutlicher Zusammenhang, hohe Vorhersagekraft</li>
                <li>• <strong>Mittel (40-70%):</strong> Moderater Zusammenhang, beachtenswert</li>
                <li>• <strong>Schwach (&lt;40%):</strong> Geringer Zusammenhang, kann zufällig sein</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};