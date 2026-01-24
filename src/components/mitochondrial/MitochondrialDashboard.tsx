import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MitochondrialSubstanceCard } from "./MitochondrialSubstanceCard";
import { MitochondrialIntakeLogger } from "./MitochondrialIntakeLogger";
import { MitochondrialWeeklyProgress } from "./MitochondrialWeeklyProgress";
import { CreateMitochondrialProtocolForm } from "./CreateMitochondrialProtocolForm";
import { useMitochondrialProtocols } from "@/hooks/useMitochondrialProtocols";
import { getSubstanceById } from "@/constants/phase2Substances";
import { Zap, Plus, Settings, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, addDays } from "date-fns";

export function MitochondrialDashboard() {
  const { protocols, loading, isOnCycle, getNextDoseDate, refetch } = useMitochondrialProtocols();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [weeklyCompletions, setWeeklyCompletions] = useState<Record<string, number>>({});

  // Fetch weekly completions for all protocols
  useEffect(() => {
    async function fetchWeeklyCompletions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const { data, error } = await supabase
        .from('peptide_intake_log')
        .select('protocol_id, taken_at')
        .eq('user_id', user.id)
        .gte('taken_at', weekStart.toISOString())
        .lte('taken_at', weekEnd.toISOString());

      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach(log => {
          if (log.protocol_id) {
            counts[log.protocol_id] = (counts[log.protocol_id] || 0) + 1;
          }
        });
        setWeeklyCompletions(counts);
      }
    }

    if (protocols.length > 0) {
      fetchWeeklyCompletions();
    }
  }, [protocols]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2">Lade Mitochondrien-Protokolle...</span>
      </div>
    );
  }

  const activeProtocols = protocols.filter(p => p.is_active);
  const ss31 = activeProtocols.find(p => p.substance_name === 'ss_31');
  const motsc = activeProtocols.find(p => p.substance_name === 'mots_c');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Mitochondrien-Protokoll</h2>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Einstellungen
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
        <p className="text-sm">
          <span className="font-medium">Phase 2 Fokus:</span> Mitochondriale Effizienz maximieren.
          SS-31 stabilisiert, MOTS-c stimuliert Biogenese.
          <span className="text-orange-500 ml-1">🚴 Ideal vor Zone 2 Cardio.</span>
        </p>
      </div>

      {/* Protokoll-Cards */}
      {activeProtocols.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Zap className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Keine mitochondrialen Protokolle aktiv</p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Protokoll hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <CreateMitochondrialProtocolForm
                  onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    refetch();
                  }}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="ss31" disabled={!ss31}>SS-31</TabsTrigger>
            <TabsTrigger value="motsc" disabled={!motsc}>MOTS-c</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <CreateMitochondrialProtocolForm
                    onSuccess={() => {
                      setIsCreateDialogOpen(false);
                      refetch();
                    }}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            {ss31 && (
              <MitochondrialSubstanceCard
                substance={getSubstanceById('ss_31')!}
                currentCycleWeek={ss31.current_cycle_week}
                isOnCycle={isOnCycle(ss31)}
                nextDoseDate={getNextDoseDate(ss31)}
                completedThisWeek={weeklyCompletions[ss31.id] || 0}
                targetPerWeek={ss31.frequency_per_week}
              />
            )}
            {motsc && (
              <MitochondrialSubstanceCard
                substance={getSubstanceById('mots_c')!}
                currentCycleWeek={motsc.current_cycle_week}
                isOnCycle={isOnCycle(motsc)}
                nextDoseDate={getNextDoseDate(motsc)}
                completedThisWeek={weeklyCompletions[motsc.id] || 0}
                targetPerWeek={motsc.frequency_per_week}
              />
            )}
          </TabsContent>

          <TabsContent value="ss31" className="space-y-4 mt-4">
            {ss31 && (
              <>
                <MitochondrialWeeklyProgress
                  protocolId={ss31.id}
                  substanceName="SS-31"
                  preferredDays={ss31.preferred_days}
                />
                <MitochondrialIntakeLogger
                  protocolId={ss31.id}
                  substanceName="SS-31"
                  doseAmount={ss31.dose_amount}
                  doseUnit={ss31.dose_unit}
                  onLogged={refetch}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="motsc" className="space-y-4 mt-4">
            {motsc && (
              <>
                <MitochondrialWeeklyProgress
                  protocolId={motsc.id}
                  substanceName="MOTS-c"
                  preferredDays={motsc.preferred_days}
                />
                <MitochondrialIntakeLogger
                  protocolId={motsc.id}
                  substanceName="MOTS-c"
                  doseAmount={motsc.dose_amount}
                  doseUnit={motsc.dose_unit}
                  onLogged={refetch}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
