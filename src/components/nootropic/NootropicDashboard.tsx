import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NootropicCard } from "./NootropicCard";
import { NootropicIntakeLogger } from "./NootropicIntakeLogger";
import { CreateNootropicStackForm } from "./CreateNootropicStackForm";
import { FocusScoreTracker } from "./FocusScoreTracker";
import { useNootropicStacks } from "@/hooks/useNootropicStacks";
import { Brain, Plus, Loader2, TrendingUp, Sparkles } from "lucide-react";

export function NootropicDashboard() {
  const { stacks, loading, getCycleStatusText, refetch } = useNootropicStacks();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Nootropic-Stacks...</span>
        </CardContent>
      </Card>
    );
  }

  const activeStacks = stacks.filter(s => s.is_active);
  const semax = activeStacks.find(s => s.substance_name === 'semax');
  const selank = activeStacks.find(s => s.substance_name === 'selank');

  // Calculate combined cognitive improvement
  const combinedImprovement = activeStacks.reduce((sum, stack) => {
    if (stack.baseline_focus_score && stack.current_focus_score) {
      return sum + (stack.current_focus_score - stack.baseline_focus_score);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-500" />
          <h2 className="text-xl font-semibold">Nootropic-Stack</h2>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Stack hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neuer Nootropic-Stack</DialogTitle>
            </DialogHeader>
            <CreateNootropicStackForm
              onSuccess={() => {
                setShowCreateDialog(false);
                refetch();
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
        <CardContent className="py-3">
          <p className="text-sm">
            <Sparkles className="w-4 h-4 inline mr-1 text-cyan-500" />
            <strong>Kognitive Optimierung:</strong> Semax (BDNF) + Selank (GABA). 4 Wochen aktiv, 2 Wochen Pause.
          </p>
        </CardContent>
      </Card>

      {/* Combined Stats */}
      {activeStacks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{activeStacks.length}</div>
              <div className="text-xs text-muted-foreground">Aktive Stacks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">
                {activeStacks.filter(s => s.is_on_cycle).length}/{activeStacks.length}
              </div>
              <div className="text-xs text-muted-foreground">Im Zyklus</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${combinedImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-4 h-4" />
                {combinedImprovement >= 0 ? '+' : ''}{combinedImprovement}
              </div>
              <div className="text-xs text-muted-foreground">Focus Δ</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {activeStacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-2">Keine Nootropic-Stacks aktiv</p>
            <p className="text-sm text-muted-foreground mb-4">
              Füge Semax oder Selank hinzu, um deine kognitive Performance zu tracken.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Stack hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="semax" disabled={!semax}>Semax</TabsTrigger>
            <TabsTrigger value="selank" disabled={!selank}>Selank</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {semax && (
                <NootropicCard stack={semax} cycleStatusText={getCycleStatusText(semax)} />
              )}
              {selank && (
                <NootropicCard stack={selank} cycleStatusText={getCycleStatusText(selank)} />
              )}
            </div>
            <FocusScoreTracker />
          </TabsContent>

          <TabsContent value="semax" className="space-y-4">
            {semax && (
              <>
                <NootropicCard stack={semax} cycleStatusText={getCycleStatusText(semax)} />
                <NootropicIntakeLogger stack={semax} onLogged={refetch} />
              </>
            )}
          </TabsContent>

          <TabsContent value="selank" className="space-y-4">
            {selank && (
              <>
                <NootropicCard stack={selank} cycleStatusText={getCycleStatusText(selank)} />
                <NootropicIntakeLogger stack={selank} onLogged={refetch} />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
