import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EpitalonCycleCard } from "./EpitalonCycleCard";
import { EpitalonInjectionLogger } from "./EpitalonInjectionLogger";
import { StartEpitalonCycleDialog } from "./StartEpitalonCycleDialog";
import { useEpitalonCycles } from "@/hooks/useEpitalonCycles";
import { Syringe, Calendar, Plus, History, AlertCircle, Loader2, Dna, Info } from "lucide-react";

export function EpitalonDashboard() {
  const {
    cycles,
    activeCycle,
    loading,
    getDaysUntilNextCycle,
    isNextCycleDue,
    refetch
  } = useEpitalonCycles();

  const [showHistory, setShowHistory] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);

  const daysUntilNext = getDaysUntilNextCycle();
  const cycleIsDue = isNextCycleDue();
  const completedCycles = cycles.filter(c => c.status === 'completed');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Epitalon-Zyklen...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-lg">Epitalon Khavinson-Protokoll</h3>
        </div>
        {completedCycles.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-1" />
            Historie
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <CardContent className="py-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Khavinson-Protokoll:</span> 10mg/Tag für 10 Tage, 
              alle 6 Monate wiederholen. Telomerase-Aktivierung & Zirbeldrüsen-Reset.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Cycle Due Alert */}
      {cycleIsDue && !activeCycle && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-medium">Nächster Zyklus fällig!</p>
                <p className="text-sm text-muted-foreground">
                  Es ist Zeit für deinen halbjährlichen Epitalon-Zyklus
                </p>
              </div>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setShowStartDialog(true)}
              >
                <Syringe className="w-4 h-4 mr-2" />
                Zyklus starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {activeCycle ? (
        <div className="grid gap-6 md:grid-cols-2">
          <EpitalonCycleCard cycle={activeCycle} isActive={true} />
          <EpitalonInjectionLogger cycle={activeCycle} onLogged={refetch} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Syringe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Kein aktiver Zyklus</h3>
            {daysUntilNext !== null && daysUntilNext > 0 ? (
              <p className="text-muted-foreground mb-4">
                Nächster Zyklus in <span className="font-bold text-purple-500">{daysUntilNext} Tagen</span>
              </p>
            ) : (
              <p className="text-muted-foreground mb-4">
                {completedCycles.length === 0
                  ? "Starte deinen ersten Epitalon-Zyklus"
                  : "Du kannst jetzt einen neuen Zyklus starten"
                }
              </p>
            )}
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setShowStartDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Neuen Zyklus starten
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Countdown Widget */}
      {!activeCycle && daysUntilNext !== null && daysUntilNext > 0 && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-500" />
                <span className="font-medium">Nächster Zyklus</span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-purple-500">{daysUntilNext}</span>
                <span className="text-sm text-muted-foreground ml-1">Tage bis zum nächsten Zyklus</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">Alle 6 Monate</Badge>
              <span>{completedCycles.length} Zyklen abgeschlossen</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {showHistory && completedCycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Zyklus-Historie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedCycles.map((cycle) => (
              <EpitalonCycleCard key={cycle.id} cycle={cycle} isActive={false} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Start Dialog */}
      <StartEpitalonCycleDialog 
        open={showStartDialog} 
        onOpenChange={setShowStartDialog} 
      />
    </div>
  );
}
