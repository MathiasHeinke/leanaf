import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementEntry {
  id: number;
  text: string;
  score: number;
  category: string;
  date: string;
  prompt: string;
}

interface AchievementsPanelProps {
  entries: AchievementEntry[];
  className?: string;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  entries,
  className
}) => {
  const getSuccessBadgeColor = (score: number) => {
    if (score >= 4) return 'bg-success/20 text-success border-success/30';
    if (score >= 3) return 'bg-primary/20 text-primary border-primary/30';
    if (score >= 2) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-muted text-muted-foreground border-muted';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'achievement': return Trophy;
      case 'progress': return TrendingUp;
      case 'learning': return Star;
      case 'challenge': return Target;
      default: return Trophy;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'achievement': return 'text-success';
      case 'progress': return 'text-primary';
      case 'learning': return 'text-warning';
      case 'challenge': return 'text-destructive';
      default: return 'text-success';
    }
  };

  const totalScore = entries.reduce((sum, entry) => sum + entry.score, 0);
  const averageScore = entries.length > 0 ? (totalScore / entries.length).toFixed(1) : '0';

  return (
    <Card className={cn("border-success/20 bg-gradient-to-br from-background to-success/5", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-success" />
            <span>Deine Erfolge</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-success/20 text-success">
              ⌀ {averageScore} ⭐
            </Badge>
            <Badge variant="outline" className="text-xs">
              {entries.length} Erfolge
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry, index) => {
          const IconComponent = getCategoryIcon(entry.category);
          return (
            <div
              key={entry.id || index}
              className="p-3 rounded-lg bg-background/30 border border-border/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className={cn("h-4 w-4", getCategoryColor(entry.category))} />
                  <Badge variant="outline" className="text-xs">
                    {entry.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getSuccessBadgeColor(entry.score))}
                  >
                    {Array(entry.score).fill('⭐').join('')}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <p className="text-sm text-foreground">{entry.text}</p>
              
              <p className="text-xs text-muted-foreground italic">
                "{entry.prompt}"
              </p>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Noch keine Erfolge erfasst</p>
            <p className="text-xs">Teile deinen ersten Erfolg!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};