import { useWeeklyTraining } from '@/hooks/useWeeklyTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, Heart, Zap, Thermometer, Trophy, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TrainingPillarCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  current: number;
  goal: number;
  unit: string;
  progress: number;
}

function TrainingPillarCard({ 
  title, 
  icon: Icon, 
  iconColor, 
  current, 
  goal, 
  unit, 
  progress 
}: TrainingPillarCardProps) {
  const isComplete = progress >= 100;
  
  return (
    <Card className={isComplete ? 'border-green-500/50 bg-green-500/5' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-medium text-sm">{title}</span>
          {isComplete && <Badge variant="outline" className="text-green-600 border-green-500 ml-auto text-xs">✓</Badge>}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{current} / {goal} {unit}</span>
            <span className="font-mono text-xs">{Math.min(progress, 100)}%</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TrainingDashboard() {
  const { stats, loading } = useWeeklyTraining();
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }
  
  const allGoalsMet = stats.rptProgress >= 100 && 
                      stats.zone2Progress >= 100 && 
                      stats.vo2maxProgress >= 100 &&
                      stats.saunaProgress >= 100;
  
  const weekRange = `${format(stats.weekStart, 'd. MMM', { locale: de })} - ${format(stats.weekEnd, 'd. MMM', { locale: de })}`;
  
  return (
    <div className="space-y-6">
      {/* Wochenstatus Header */}
      <Card className={allGoalsMet ? 'border-green-500 bg-gradient-to-r from-green-500/10 to-emerald-500/10' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Training diese Woche</CardTitle>
            </div>
            {allGoalsMet && (
              <Badge className="bg-green-500">
                <Trophy className="w-3 h-3 mr-1" /> Alle Ziele erreicht!
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{weekRange}</p>
        </CardHeader>
      </Card>
      
      {/* 4 Säulen Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrainingPillarCard
          title="RPT Kraft"
          icon={Dumbbell}
          iconColor="text-orange-500"
          current={stats.rptSessions}
          goal={stats.rptGoal}
          unit="Sessions"
          progress={stats.rptProgress}
        />
        <TrainingPillarCard
          title="Zone 2"
          icon={Heart}
          iconColor="text-blue-500"
          current={stats.zone2Minutes}
          goal={stats.zone2Goal}
          unit="Min"
          progress={stats.zone2Progress}
        />
        <TrainingPillarCard
          title="VO2max"
          icon={Zap}
          iconColor="text-red-500"
          current={stats.vo2maxSessions}
          goal={stats.vo2maxGoal}
          unit="Sessions"
          progress={stats.vo2maxProgress}
        />
        <TrainingPillarCard
          title="Sauna"
          icon={Thermometer}
          iconColor="text-amber-500"
          current={stats.saunaSessions}
          goal={stats.saunaGoal}
          unit="Sessions"
          progress={stats.saunaProgress}
        />
      </div>
      
      {/* Phase 2 Protokoll Hinweis */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Phase 2 Protokoll:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>SS-31 + MOTS-c:</strong> 30-60 Min vor Zone 2 für mitochondriale Biogenese</li>
              <li>• <strong>Intensität:</strong> +10% Gewicht vs. Phase 1</li>
              <li>• <strong>Zone 2:</strong> 180-200 Min/Woche (Norwegian 4x4 für VO2max)</li>
              <li>• <strong>Sauna:</strong> ≥80°C für 20+ Min → HSP & FoxO3 Aktivierung</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
