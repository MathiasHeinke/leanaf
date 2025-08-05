import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Apple, 
  Dumbbell, 
  Moon, 
  Droplets, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { HealthScore } from '@/hooks/useAdvancedAnalytics';

interface HealthScoreDashboardProps {
  healthScore: HealthScore;
  loading?: boolean;
}

export const HealthScoreDashboard: React.FC<HealthScoreDashboardProps> = ({ 
  healthScore, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health Score
          </CardTitle>
          <CardDescription>
            Lade deine Gesundheitsbewertung...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg mb-4"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-20 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendBadge = (trend: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      improving: 'default',
      stable: 'secondary',
      declining: 'destructive'
    };
    
    const labels: Record<string, string> = {
      improving: 'Verbesserung',
      stable: 'Stabil',
      declining: 'Rückgang'
    };
    
    return (
      <Badge variant={variants[trend]} className="text-xs">
        {labels[trend]}
      </Badge>
    );
  };

  const scoreDetails = [
    {
      icon: Apple,
      label: 'Ernährung',
      score: healthScore.nutrition,
      description: 'Kalorienzufuhr & Makros'
    },
    {
      icon: Dumbbell,
      label: 'Training',
      score: healthScore.training,
      description: 'Volumen & Intensität'
    },
    {
      icon: Moon,
      label: 'Erholung',
      score: healthScore.recovery,
      description: 'Schlafqualität'
    },
    {
      icon: Droplets,
      label: 'Hydration',
      score: healthScore.hydration,
      description: 'Flüssigkeitszufuhr'
    },
    {
      icon: Calendar,
      label: 'Konsistenz',
      score: healthScore.consistency,
      description: 'Regelmäßigkeit'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Health Score Dashboard
        </CardTitle>
        <CardDescription>
          Deine ganzheitliche Gesundheitsbewertung basierend auf allen Metriken
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(healthScore.overall)}`}>
              {healthScore.overall}/100
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-lg font-medium">Gesamt Health Score</span>
              {getTrendIcon(healthScore.trend)}
            </div>
            <div className="flex justify-center">
              {getTrendBadge(healthScore.trend)}
            </div>
            <Progress 
              value={healthScore.overall} 
              className="mt-4 h-3"
            />
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scoreDetails.map((detail, index) => {
              const Icon = detail.icon;
              return (
                <div key={index} className="p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{detail.label}</div>
                      <div className="text-xs text-muted-foreground">{detail.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xl font-bold ${getScoreColor(detail.score)}`}>
                      {detail.score}
                    </span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  
                  <Progress value={detail.score} className="h-2" />
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Verbesserungsvorschläge
            </h4>
            <div className="space-y-2 text-sm">
              {healthScore.nutrition < 70 && (
                <div className="flex items-center gap-2">
                  <Apple className="h-3 w-3 text-orange-500" />
                  <span>Verbessere deine Ernährungskonsistenz und Makro-Balance</span>
                </div>
              )}
              {healthScore.training < 60 && (
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-3 w-3 text-blue-500" />
                  <span>Steigere dein Trainingsvolumen oder die Regelmäßigkeit</span>
                </div>
              )}
              {healthScore.recovery < 70 && (
                <div className="flex items-center gap-2">
                  <Moon className="h-3 w-3 text-purple-500" />
                  <span>Optimiere deine Schlafqualität und -dauer</span>
                </div>
              )}
              {healthScore.hydration < 60 && (
                <div className="flex items-center gap-2">
                  <Droplets className="h-3 w-3 text-cyan-500" />
                  <span>Erhöhe deine tägliche Flüssigkeitszufuhr</span>
                </div>
              )}
              {healthScore.consistency < 80 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-green-500" />
                  <span>Tracke regelmäßiger für bessere Ergebnisse</span>
                </div>
              )}
              {healthScore.overall >= 80 && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Heart className="h-3 w-3" />
                  <span>Ausgezeichnet! Halte deine aktuellen Gewohnheiten bei</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};