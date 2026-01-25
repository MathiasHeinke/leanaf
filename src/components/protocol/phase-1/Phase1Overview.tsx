import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Zap, 
  Target, 
  Syringe, 
  Dumbbell, 
  Apple,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertCircle,
  ChevronRight,
  Heart,
  Activity,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePhaseProgress } from '@/hooks/usePhaseProgress';
import { useProtocols } from '@/hooks/useProtocols';
import { useTodaysIntake } from '@/hooks/useTodaysIntake';
import { useWeeklyTraining } from '@/hooks/useWeeklyTraining';
import { cn } from '@/lib/utils';
import { NutritionWidget } from './NutritionWidget';

// Timing display config
const TIMING_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  'morning_fasted': { label: 'Morgens nüchtern', icon: '🌅', color: 'text-amber-500 border-amber-500' },
  'pre_workout': { label: 'Pre-Workout', icon: '💪', color: 'text-blue-500 border-blue-500' },
  'evening_fasted': { label: 'Abends nüchtern', icon: '🌙', color: 'text-purple-500 border-purple-500' },
  'before_bed': { label: 'Vor dem Schlafen', icon: '😴', color: 'text-indigo-500 border-indigo-500' },
  'twice_daily': { label: '2x täglich', icon: '🔄', color: 'text-teal-500 border-teal-500' },
  'weekly': { label: 'Wöchentlich', icon: '📅', color: 'text-primary border-primary' },
};

export function Phase1Overview() {
  const { progress, loading: phaseLoading } = usePhaseProgress();
  const { protocols, loading: protocolsLoading } = useProtocols();
  const todaysItems = useTodaysIntake(protocols);
  const { stats, loading: trainingLoading } = useWeeklyTraining();

  const loading = phaseLoading || protocolsLoading || trainingLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Group today's items by timing
  const itemsByTiming = todaysItems.reduce((acc, item) => {
    const timing = item.scheduledTiming;
    if (!acc[timing]) acc[timing] = [];
    acc[timing].push(item);
    return acc;
  }, {} as Record<string, typeof todaysItems>);

  // Calculate KFA display values
  const currentKFA = progress.currentKFA;
  const startKFA = progress.startKFA;
  const targetKFA = progress.targetKFA;
  const kfaProgress = progress.kfaProgress;

  // Trend icon
  const TrendIcon = progress.kfaTrend === 'down' ? TrendingDown 
    : progress.kfaTrend === 'up' ? TrendingUp 
    : Minus;
  const trendColor = progress.kfaTrend === 'down' ? 'text-green-500' 
    : progress.kfaTrend === 'up' ? 'text-red-500' 
    : 'text-muted-foreground';

  const activeProtocolsCount = protocols.filter(p => p.is_active).length;
  const activeItemsToday = todaysItems.filter(i => i.isActiveToday).length;

  return (
    <div className="space-y-6">
      {/* Phase 1 Header */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <CardTitle>Phase 1: Aggressive Rekomposition</CardTitle>
          </div>
          <CardDescription>
            6 Monate intensive Transformation. Ziel: KFA unter {targetKFA}%, Muskelmasse aufbauen, 
            metabolische Gesundheit optimieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-background">
              Woche {progress.currentWeek} / {progress.totalWeeks}
            </Badge>
            <Badge variant="secondary">
              {progress.totalWeeks - progress.currentWeek > 0 
                ? `Noch ${Math.ceil((progress.totalWeeks - progress.currentWeek) / 4)} Monat(e)`
                : 'Abgeschlossen!'}
            </Badge>
            {activeProtocolsCount > 0 && (
              <Badge className="bg-primary/80">
                {activeProtocolsCount} aktive Protokolle
              </Badge>
            )}
          </div>
          {/* Week progress bar */}
          <div className="mt-4">
            <Progress 
              value={(progress.currentWeek / progress.totalWeeks) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((progress.currentWeek / progress.totalWeeks) * 100)}% der Rekompositions-Phase
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KFA Target Widget */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">KFA-Ziel</CardTitle>
            </div>
            {currentKFA !== null ? (
              <div className="flex items-center gap-2">
                <TrendIcon className={cn("w-4 h-4", trendColor)} />
                <Badge variant="outline" className="font-mono">
                  {currentKFA.toFixed(1)}%
                </Badge>
              </div>
            ) : (
              <Badge variant="secondary">Keine Daten</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentKFA !== null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{startKFA?.toFixed(1) ?? '?'}%</span>
                <span className="font-medium text-emerald-500">&lt;{targetKFA}%</span>
              </div>
              <div className="relative">
                <Progress value={kfaProgress} className="h-3" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start</span>
                <span className="font-medium">{kfaProgress}% zum Ziel</span>
                <span>Ziel</span>
              </div>
              {startKFA && currentKFA < startKFA && (
                <p className="text-sm text-green-600">
                  ↓ {(startKFA - currentKFA).toFixed(1)}% seit Start
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Noch keine KFA-Daten vorhanden.</p>
              <p className="text-xs">Tracke dein Gewicht & Körpermaße für Fortschrittsmessung.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Protocol - Dynamic */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Heutiger Plan</CardTitle>
            </div>
            {activeItemsToday > 0 && (
              <Badge variant="outline">
                {activeItemsToday} Einnahmen
              </Badge>
            )}
          </div>
          <CardDescription>
            {activeItemsToday > 0 
              ? 'Dein Tagesplan für optimale Ergebnisse'
              : 'Keine Protokolle für heute geplant'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine aktiven Protokolle</p>
              <p className="text-xs">Erstelle ein Protokoll um zu starten</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(itemsByTiming).map(([timing, items]) => {
                const config = TIMING_CONFIG[timing] || { 
                  label: timing, 
                  icon: '💊', 
                  color: 'text-primary border-primary' 
                };
                
                return (
                  <div 
                    key={timing} 
                    className={cn(
                      "p-3 rounded-lg",
                      timing === 'weekly' 
                        ? "border-2 border-dashed border-primary/30" 
                        : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={config.color}>
                        {config.icon} {config.label}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <ProtocolItem 
                          key={`${item.protocol.id}-${item.peptide.name}`}
                          name={item.peptide.name} 
                          dose={`${item.currentDose}${item.currentDoseUnit}`}
                          type="peptide"
                          note={!item.isActiveToday ? 'Pause' : 
                            item.peptide.name.toLowerCase().includes('retatrutid') 
                              ? `Woche ${item.currentWeek}` 
                              : undefined}
                          isActive={item.isActiveToday}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Link to full intake tracker */}
              <Link to="/protocol/intake">
                <Button variant="ghost" className="w-full justify-between mt-2">
                  <span>Zur Tages-Checkliste</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Focus - Dynamic */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Training diese Woche</CardTitle>
            </div>
            {stats.rptProgress >= 100 && stats.zone2Progress >= 100 && stats.vo2maxProgress >= 100 && (
              <Badge className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Alle Ziele erreicht
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {/* RPT */}
            <div className={cn(
              "p-3 rounded-lg text-center",
              stats.rptProgress >= 100 ? "bg-green-500/10 ring-1 ring-green-500/30" : "bg-muted/50"
            )}>
              <Dumbbell className={cn(
                "w-5 h-5 mx-auto mb-1",
                stats.rptProgress >= 100 ? "text-green-500" : "text-blue-500"
              )} />
              <div className="text-2xl font-bold">{stats.rptSessions}/{stats.rptGoal}</div>
              <div className="text-xs text-muted-foreground">Kraft (RPT)</div>
              <Progress 
                value={stats.rptProgress} 
                className={cn("h-1 mt-2", stats.rptProgress >= 100 && "[&>div]:bg-green-500")}
              />
            </div>
            
            {/* Zone 2 */}
            <div className={cn(
              "p-3 rounded-lg text-center",
              stats.zone2Progress >= 100 ? "bg-green-500/10 ring-1 ring-green-500/30" : "bg-muted/50"
            )}>
              <Heart className={cn(
                "w-5 h-5 mx-auto mb-1",
                stats.zone2Progress >= 100 ? "text-green-500" : "text-red-500"
              )} />
              <div className="text-2xl font-bold">{stats.zone2Minutes}</div>
              <div className="text-xs text-muted-foreground">Min Zone 2</div>
              <Progress 
                value={stats.zone2Progress} 
                className={cn("h-1 mt-2", stats.zone2Progress >= 100 && "[&>div]:bg-green-500")}
              />
            </div>
            
            {/* VO2max */}
            <div className={cn(
              "p-3 rounded-lg text-center",
              stats.vo2maxProgress >= 100 ? "bg-green-500/10 ring-1 ring-green-500/30" : "bg-muted/50"
            )}>
              <Activity className={cn(
                "w-5 h-5 mx-auto mb-1",
                stats.vo2maxProgress >= 100 ? "text-green-500" : "text-yellow-500"
              )} />
              <div className="text-2xl font-bold">{stats.vo2maxSessions}/{stats.vo2maxGoal}</div>
              <div className="text-xs text-muted-foreground">VO2max</div>
              <Progress 
                value={stats.vo2maxProgress} 
                className={cn("h-1 mt-2", stats.vo2maxProgress >= 100 && "[&>div]:bg-green-500")}
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">RPT-Fokus:</span> Reverse Pyramid Training für maximale Kraftentwicklung bei Kaloriendefizit.
              </div>
            </div>
          </div>
          
          {/* Link to training page */}
          <Link to="/protocol/training">
            <Button variant="ghost" className="w-full justify-between mt-3">
              <span>Training eintragen</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Nutrition - Dynamic Widget */}
      <NutritionWidget />
    </div>
  );
}

function ProtocolItem({ 
  name, 
  dose, 
  type, 
  note,
  isActive = true
}: { 
  name: string; 
  dose: string; 
  type: 'peptide' | 'supplement'; 
  note?: string;
  isActive?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between py-1",
      !isActive && "opacity-50"
    )}>
      <div className="flex items-center gap-2">
        <Syringe className={cn(
          "w-4 h-4",
          type === 'peptide' ? 'text-purple-500' : 'text-emerald-500'
        )} />
        <span className="text-sm">{name}</span>
        {note && (
          <Badge variant="outline" className="text-xs">
            {note}
          </Badge>
        )}
      </div>
      <span className="text-sm font-medium">{dose}</span>
    </div>
  );
}
