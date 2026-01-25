import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Target, Heart, Leaf, Sparkles } from 'lucide-react';
import { useUserInsights, UserInsight } from '@/hooks/useUserInsights';
import { cn } from '@/lib/utils';

interface MemoryInsightsProps {
  className?: string;
  compact?: boolean;
}

const CATEGORY_CONFIG = {
  goals: { icon: Target, label: 'Ziele', color: 'text-orange-500' },
  preferences: { icon: Sparkles, label: 'Präferenzen', color: 'text-purple-500' },
  health: { icon: Heart, label: 'Gesundheit', color: 'text-red-500' },
  lifestyle: { icon: Leaf, label: 'Lifestyle', color: 'text-green-500' },
  context: { icon: Brain, label: 'Kontext', color: 'text-blue-500' },
  other: { icon: Brain, label: 'Sonstiges', color: 'text-muted-foreground' },
} as const;

export const MemoryInsights: React.FC<MemoryInsightsProps> = ({ className, compact = false }) => {
  const { byCategory, loading, insightCount, getInsightProgress } = useUserInsights();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (insightCount === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-6 text-center">
          <Brain className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            ARES lernt dich noch kennen
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Chatte mit ARES um Insights zu sammeln
          </p>
        </CardContent>
      </Card>
    );
  }

  const progress = getInsightProgress();

  // Get top insight from each non-empty category
  const topInsights: { category: keyof typeof CATEGORY_CONFIG; insight: UserInsight }[] = [];
  
  (Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).forEach((cat) => {
    if (byCategory[cat]?.length > 0) {
      topInsights.push({ category: cat, insight: byCategory[cat][0] });
    }
  });

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{insightCount} Insights</span>
            <Progress value={progress} className="flex-1 h-1.5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            ARES kennt dich
          </CardTitle>
          <span className="text-xs text-muted-foreground">{insightCount} Insights</span>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {topInsights.slice(0, 5).map(({ category, insight }) => {
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          
          return (
            <div
              key={insight.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{insight.insight}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.label}
                </p>
              </div>
            </div>
          );
        })}
        
        {topInsights.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{topInsights.length - 5} weitere Insights
          </p>
        )}
      </CardContent>
    </Card>
  );
};
