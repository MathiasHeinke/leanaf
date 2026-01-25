import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame, Target, Brain, Zap } from 'lucide-react';
import { useGamificationSync } from '@/hooks/useGamificationSync';
import { useUserInsights } from '@/hooks/useUserInsights';
import { cn } from '@/lib/utils';

interface DashboardQuickStatsProps {
  className?: string;
}

export const DashboardQuickStats: React.FC<DashboardQuickStatsProps> = ({ className }) => {
  const { state } = useGamificationSync();
  const { insightCount } = useUserInsights();

  const completedQuests = state.dailyQuests.filter(q => q.is_completed).length;
  const totalQuests = state.dailyQuests.length || 3;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {state.dailyXP > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Zap className="h-3 w-3 text-primary" />
          +{state.dailyXP} XP heute
        </Badge>
      )}
      
      {state.streakDays > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Flame className="h-3 w-3 text-destructive" />
          {state.streakDays}-Tage Streak
        </Badge>
      )}
      
      {totalQuests > 0 && (
        <Badge variant="outline" className="gap-1">
          <Target className="h-3 w-3" />
          {completedQuests}/{totalQuests} Quests
        </Badge>
      )}
      
      {insightCount > 0 && (
        <Badge variant="outline" className="gap-1">
          <Brain className="h-3 w-3" />
          {insightCount} Insights
        </Badge>
      )}
    </div>
  );
};
