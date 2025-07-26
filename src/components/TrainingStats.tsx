import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Dumbbell, Activity, Calendar } from 'lucide-react';

interface WeeklyStats {
  totalSets: number;
  totalVolume: number;
  averageIntensity: number;
  exercisesCount: number;
  sessionsThisWeek: number;
}

interface TrainingStatsProps {
  stats: WeeklyStats;
}

export const TrainingStats: React.FC<TrainingStatsProps> = ({ stats }) => {
  const getPerformanceColor = (value: number, type: 'sessions' | 'intensity') => {
    if (type === 'sessions') {
      if (value >= 4) return 'text-green-600 dark:text-green-400';
      if (value >= 2) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-red-600 dark:text-red-400';
    }
    
    if (type === 'intensity') {
      if (value >= 7) return 'text-green-600 dark:text-green-400';
      if (value >= 5) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-blue-600 dark:text-blue-400';
    }
    
    return 'text-foreground';
  };

  const getSessionsBadge = () => {
    if (stats.sessionsThisWeek >= 4) return { variant: 'default' as const, text: 'Sehr gut!' };
    if (stats.sessionsThisWeek >= 2) return { variant: 'secondary' as const, text: 'Auf Kurs' };
    if (stats.sessionsThisWeek >= 1) return { variant: 'outline' as const, text: 'Gut gestartet' };
    return { variant: 'outline' as const, text: 'Starte durch!' };
  };

  const sessionsBadge = getSessionsBadge();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sessions</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.sessionsThisWeek, 'sessions')}`}>
              {stats.sessionsThisWeek}
            </div>
            <Badge variant={sessionsBadge.variant} className="text-xs">
              {sessionsBadge.text}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Diese Woche
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gesamtsätze</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSets}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalSets > 0 ? `Ø ${Math.round(stats.totalSets / Math.max(stats.sessionsThisWeek, 1))} pro Session` : 'Noch keine Sätze'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Volumen</CardTitle>
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalVolume.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            kg diese Woche
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Intensität</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(stats.averageIntensity, 'intensity')}`}>
            {stats.averageIntensity || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Ø RPE
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Übungen</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.exercisesCount}</div>
          <p className="text-xs text-muted-foreground">
            Verschiedene Übungen
          </p>
        </CardContent>
      </Card>
    </div>
  );
};