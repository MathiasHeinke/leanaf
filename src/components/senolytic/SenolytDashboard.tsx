import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Leaf, Plus, History, AlertCircle, TrendingUp } from 'lucide-react';
import { useSenolytCycles } from '@/hooks/useSenolytCycles';
import { SenolytCycleCard } from './SenolytCycleCard';
import { SenolytDoseLogger } from './SenolytDoseLogger';
import { StartSenolytCycleDialog } from './StartSenolytCycleDialog';
import { SenolytCountdownWidget } from './SenolytCountdownWidget';

export function SenolytDashboard() {
  const { 
    cycles, 
    activeCycle, 
    loading, 
    isNextCycleDue, 
    getCycleStats,
    refetch 
  } = useSenolytCycles();

  const [showHistory, setShowHistory] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);

  const cycleDue = isNextCycleDue();
  const stats = getCycleStats();
  const completedCycles = cycles.filter(c => c.status === 'completed' || c.status === 'skipped');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with History Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold">Senolytika-Manager</h2>
        </div>
        {completedCycles.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            {showHistory ? 'Ausblenden' : `Historie (${completedCycles.length})`}
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hit-and-Run Protokoll</CardTitle>
          <CardDescription>
            Senolytika werden kurzzeitig hochdosiert eingenommen (2-3 Tage), 
            um seneszente Zellen zu eliminieren. Dann 30 Tage Pause.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Mayo-Protokoll</Badge>
            <Badge variant="outline">1x pro Monat</Badge>
            <Badge variant="outline">2-3 Tage aktiv</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Due Alert */}
      {cycleDue && !activeCycle && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium">Senolytischer Zyklus fällig</p>
                <p className="text-sm text-muted-foreground">
                  Es ist Zeit für den nächsten Hit-and-Run
                </p>
              </div>
            </div>
            <Button onClick={() => setShowStartDialog(true)}>
              Zyklus starten
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Cycle */}
      {activeCycle ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SenolytCycleCard cycle={activeCycle} isActive={true} />
          <SenolytDoseLogger cycle={activeCycle} onLogged={refetch} />
        </div>
      ) : (
        /* No Active Cycle - Show Start Option */
        !cycleDue && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Leaf className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Kein aktiver Zyklus</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {stats.totalCycles > 0 
                  ? 'Der nächste Zyklus ist noch nicht fällig.'
                  : 'Starte deinen ersten senolytischen Hit-and-Run Zyklus.'}
              </p>
              <Button onClick={() => setShowStartDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Neuen Zyklus starten
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Stats */}
      {stats.totalCycles > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Statistiken</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.totalCycles}</div>
                <div className="text-xs text-muted-foreground">Zyklen</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalDosesTaken}</div>
                <div className="text-xs text-muted-foreground">Dosen</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.averageDuration.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Ø Tage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Countdown Widget (when not active) */}
      {!activeCycle && !cycleDue && stats.totalCycles > 0 && (
        <SenolytCountdownWidget />
      )}

      {/* History */}
      {showHistory && completedCycles.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">
            Abgeschlossene Zyklen
          </h3>
          {completedCycles.map((cycle) => (
            <SenolytCycleCard key={cycle.id} cycle={cycle} isActive={false} />
          ))}
        </div>
      )}

      {/* Start Dialog */}
      <StartSenolytCycleDialog 
        open={showStartDialog} 
        onOpenChange={setShowStartDialog} 
      />
    </div>
  );
}
