import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MaintenanceProtocolCard } from "./MaintenanceProtocolCard";
import { MaintenanceDailyChecklist } from "./MaintenanceDailyChecklist";
import { MaintenanceComplianceChart } from "./MaintenanceComplianceChart";
import { CreateMaintenanceProtocolForm } from "./CreateMaintenanceProtocolForm";
import { MaintenanceDoseAdjustmentDialog } from "./MaintenanceDoseAdjustmentDialog";
import { useMaintenanceProtocols, MaintenanceProtocol } from "@/hooks/useMaintenanceProtocols";
import { Plus, Activity, ListChecks, TrendingUp, Loader2 } from "lucide-react";

export function MaintenanceDashboard() {
  const {
    protocols,
    loading,
    isDueToday,
    logDose,
    adjustDose,
    getOverallCompliance,
    refetch
  } = useMaintenanceProtocols();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<MaintenanceProtocol | null>(null);

  const activeProtocols = protocols.filter(p => p.is_active);
  const compliance = getOverallCompliance();
  const totalDoses = protocols.reduce((sum, p) => sum + p.total_doses_taken, 0);

  // Mock intake history for chart (in production, this would come from a separate table)
  const intakeHistory = useMemo(() => {
    const history: Array<{ date: Date; protocolId: string }> = [];
    
    protocols.forEach(protocol => {
      if (protocol.last_taken_at) {
        history.push({
          date: new Date(protocol.last_taken_at),
          protocolId: protocol.id
        });
      }
    });
    
    return history;
  }, [protocols]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Lade Maintenance-Protokolle...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Maintenance-Protokolle</h2>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Protokoll hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <CreateMaintenanceProtocolForm
              onSuccess={() => {
                setShowCreateForm(false);
                refetch();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{activeProtocols.length}</p>
            <p className="text-xs text-muted-foreground">Aktive Protokolle</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-primary">{compliance}%</p>
            <p className="text-xs text-muted-foreground">Compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ListChecks className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalDoses}</p>
            <p className="text-xs text-muted-foreground">Dosen gesamt</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Heute</TabsTrigger>
          <TabsTrigger value="all">Alle Protokolle</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <MaintenanceDailyChecklist />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {activeProtocols.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Keine Maintenance-Protokolle aktiv</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Erstes Protokoll erstellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeProtocols.map((protocol) => (
                <MaintenanceProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  isDue={isDueToday(protocol)}
                  onLogDose={() => logDose(protocol.id)}
                  onEdit={() => setEditingProtocol(protocol)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <MaintenanceComplianceChart
            intakeHistory={intakeHistory}
            activeProtocolCount={activeProtocols.length}
          />
        </TabsContent>
      </Tabs>

      {/* Dose Adjustment Dialog */}
      {editingProtocol && (
        <MaintenanceDoseAdjustmentDialog
          protocol={editingProtocol}
          open={!!editingProtocol}
          onOpenChange={(open) => !open && setEditingProtocol(null)}
          onConfirm={async (newDose, reason) => {
            await adjustDose(editingProtocol.id, newDose, reason);
            setEditingProtocol(null);
          }}
        />
      )}
    </div>
  );
}
