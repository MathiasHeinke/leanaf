import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RapamycinWeeklyCard } from "./RapamycinWeeklyCard";
import { RapamycinLogForm } from "./RapamycinLogForm";
import { useRapamycin } from "@/hooks/useRapamycin";
import { Pill, Plus, Calendar, TrendingUp, AlertTriangle, Clock, Activity, Pause, Info } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function RapamycinDashboard() {
  const {
    logs,
    lastLog,
    loading,
    getNextDoseDate,
    isDueToday,
    getStats,
    pauseProtocol,
    SIDE_EFFECTS,
    refetch
  } = useRapamycin();

  const [showLogForm, setShowLogForm] = useState(false);

  const stats = getStats();
  const nextDose = getNextDoseDate();
  const isDue = isDueToday();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Rapamycin Tracker</h2>
          <Badge variant="destructive" className="text-xs">
            Verschreibungspflichtig
          </Badge>
        </div>
        <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Dosis loggen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <RapamycinLogForm
              onSuccess={() => {
                setShowLogForm(false);
                refetch();
              }}
              onCancel={() => setShowLogForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm">
          <strong>mTOR-Inhibitor:</strong> Aktiviert Autophagie, reduziert zelluläre Seneszenz.
          <span className="ml-1 font-medium">Protokoll: 8 Wochen an, 4 Wochen Pause.</span>
        </AlertDescription>
      </Alert>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Gesamte Wochen</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalWeeks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Aktuelle Woche</span>
            </div>
            <p className="text-2xl font-bold">{stats.currentWeek}/8</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Pill className="h-4 w-4" />
              <span className="text-xs">Ø Dosis</span>
            </div>
            <p className="text-2xl font-bold">{stats.avgDose.toFixed(1)}mg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Nächste Dosis</span>
            </div>
            <p className={`text-2xl font-bold ${isDue ? 'text-amber-600' : ''}`}>
              {nextDose
                ? nextDose.daysRemaining === 0
                  ? 'Heute!'
                  : `in ${nextDose.daysRemaining} T`
                : 'Jetzt starten'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="history">Historie</TabsTrigger>
          <TabsTrigger value="sideeffects">Nebenwirkungen</TabsTrigger>
        </TabsList>

        {/* Übersicht */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <RapamycinWeeklyCard
              lastLog={lastLog}
              nextDoseDate={nextDose}
              currentWeek={stats.currentWeek}
              onLogDose={() => setShowLogForm(true)}
              isDue={isDue}
            />

            {/* Zyklus-Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Zyklus-Protokoll</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-green-600">8 Wochen aktiv</p>
                    <p className="text-xs text-muted-foreground">Autophagie-Phase</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-amber-600">4 Wochen Pause</p>
                    <p className="text-xs text-muted-foreground">Erholungs-Phase</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-2">Hallmarks adressiert:</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">mTOR-Inhibition</Badge>
                    <Badge variant="secondary" className="text-xs">Autophagie</Badge>
                    <Badge variant="secondary" className="text-xs">Anti-Seneszenz</Badge>
                    <Badge variant="secondary" className="text-xs">Immunmodulation</Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => pauseProtocol('scheduled_break')}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Protokoll pausieren
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Historie */}
        <TabsContent value="history" className="space-y-4">
          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Noch keine Einnahmen dokumentiert</p>
                <Button onClick={() => setShowLogForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Dosis loggen
                </Button>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Pill className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{log.dose_mg}mg Rapamycin</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.taken_at), 'EEEE, dd. MMM yyyy', { locale: de })}
                          {log.taken_fasted && ' • nüchtern'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Woche {log.week_number}
                      </Badge>
                      {log.side_effects && log.side_effects.length > 0 && (
                        <Badge variant="secondary" className="text-amber-600">
                          {log.side_effects.length} Nebenwirkung(en)
                        </Badge>
                      )}
                    </div>
                  </div>
                  {log.notes && (
                    <p className="mt-2 text-sm text-muted-foreground italic pl-11">
                      "{log.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Nebenwirkungen */}
        <TabsContent value="sideeffects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Nebenwirkungs-Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Side effect summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SIDE_EFFECTS.filter(se => se.id !== 'none').map((se) => {
                  const count = logs.reduce((sum, log) =>
                    sum + (log.side_effects?.filter(e => e.effect === se.id).length || 0),
                    0
                  );
                  return (
                    <div
                      key={se.id}
                      className={`p-3 rounded-lg text-center ${count > 0 ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : 'bg-muted/30'}`}
                    >
                      <p className="text-xs font-medium">{se.label}</p>
                      <p className="text-lg font-bold mt-1">{count}x</p>
                    </div>
                  );
                })}
              </div>

              <Alert className="border-muted">
                <Activity className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Bei häufigen oder schweren Nebenwirkungen konsultiere deinen Arzt.
                  Mund-Läsionen sind häufig - reduzierte Dosis oder Pause kann helfen.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
