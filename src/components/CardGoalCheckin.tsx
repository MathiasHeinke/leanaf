import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CardGoalCheckinProps {
  payload: {
    overall_score: number;
    status: 'excellent' | 'good' | 'needs_attention';
    progress: {
      calories: { current: number; target: number; percentage: number };
      protein: { current: number; target: number; percentage: number };
      workouts: { current: number; target: number; percentage: number };
      sleep: { current: number; target: number; percentage: number };
      weight_trend?: string;
    };
    message: string;
  };
}

export const CardGoalCheckin = ({ payload }: CardGoalCheckinProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-success text-success-foreground';
      case 'good': return 'bg-primary text-primary-foreground';
      default: return 'bg-warning text-warning-foreground';
    }
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <TrendingUp className="h-3 w-3 text-success" />;
    if (percentage >= 75) return <Minus className="h-3 w-3 text-warning" />;
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  const progressItems = [
    { 
      label: 'Kalorien', 
      ...payload.progress.calories,
      unit: 'kcal'
    },
    { 
      label: 'Protein', 
      ...payload.progress.protein,
      unit: 'g'
    },
    { 
      label: 'Workouts', 
      ...payload.progress.workouts,
      unit: '/Woche'
    },
    { 
      label: 'Schlaf', 
      ...payload.progress.sleep,
      unit: 'h'
    }
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4" />
          Ziel-Check
          <Badge className={getStatusColor(payload.status)}>
            {payload.overall_score}% erreicht
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-center p-2 bg-muted rounded-md">
          {payload.message}
        </p>

        <div className="space-y-3">
          {progressItems.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1">
                  {getStatusIcon(item.percentage)}
                  <span>{item.label}</span>
                </div>
                <span className="font-medium">
                  {item.current}{item.unit} / {item.target}{item.unit}
                </span>
              </div>
              <Progress 
                value={Math.min(100, item.percentage)} 
                className="h-2"
              />
            </div>
          ))}
        </div>

        {payload.progress.weight_trend && (
          <div className="mt-3 p-2 bg-muted rounded-md text-xs text-center">
            Gewichtstrend: <span className="font-medium">{payload.progress.weight_trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};