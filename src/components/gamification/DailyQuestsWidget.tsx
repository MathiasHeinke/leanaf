import React, { useEffect } from 'react';
import { CheckCircle2, Circle, Flame, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGamificationSync, DailyQuest } from '@/hooks/useGamificationSync';

interface DailyQuestsWidgetProps {
  className?: string;
  compact?: boolean;
}

export const DailyQuestsWidget: React.FC<DailyQuestsWidgetProps> = ({ 
  className,
  compact = false 
}) => {
  const { state, isLoading, refreshState, ensureQuests } = useGamificationSync();

  useEffect(() => {
    ensureQuests();
  }, [ensureQuests]);

  const completedCount = state.dailyQuests.filter(q => q.is_completed).length;
  const totalQuests = state.dailyQuests.length;
  const totalXPAvailable = state.dailyQuests.reduce((sum, q) => sum + q.xp_reward, 0);
  const earnedXP = state.dailyQuests
    .filter(q => q.is_completed)
    .reduce((sum, q) => sum + q.xp_reward, 0);

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (state.dailyQuests.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Tägliche Quests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Quests für heute. Starte eine Konversation mit ARES!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Target className="w-4 h-4 text-primary" />
        <span className="font-medium">{completedCount}/{totalQuests}</span>
        <span className="text-muted-foreground">Quests</span>
        {completedCount === totalQuests && (
          <span className="text-green-600 font-medium">✓</span>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Tägliche Quests
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {completedCount}/{totalQuests}
            </span>
            <span className="text-primary font-medium">
              +{earnedXP}/{totalXPAvailable} XP
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.dailyQuests.map((quest) => (
          <QuestItem key={quest.id} quest={quest} />
        ))}
        
        {state.streakDays > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>{state.streakDays}-Tage Streak aktiv</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface QuestItemProps {
  quest: DailyQuest;
}

const QuestItem: React.FC<QuestItemProps> = ({ quest }) => {
  const progress = Math.min((quest.progress / quest.target) * 100, 100);
  const isAlmostDone = progress >= 66 && !quest.is_completed;
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border bg-card transition-all",
        quest.is_completed && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
        isAlmostDone && "animate-pulse border-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {quest.is_completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(
              "text-sm font-medium truncate",
              quest.is_completed && "line-through text-muted-foreground"
            )}>
              {quest.quest_title}
            </h4>
            <span className={cn(
              "text-xs font-medium shrink-0",
              quest.is_completed ? "text-green-600" : "text-primary"
            )}>
              +{quest.xp_reward} XP
            </span>
          </div>
          {quest.quest_description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {quest.quest_description}
            </p>
          )}
          {!quest.is_completed && quest.target > 1 && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
              <span className="text-xs text-muted-foreground mt-1">
                {quest.progress}/{quest.target}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
