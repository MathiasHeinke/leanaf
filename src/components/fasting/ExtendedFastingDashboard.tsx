import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Utensils, 
  Play, 
  Loader2, 
  Calendar, 
  TrendingUp, 
  Trophy,
  AlertTriangle,
  StopCircle,
  CheckCircle2
} from "lucide-react";
import { useExtendedFasting } from "@/hooks/useExtendedFasting";
import { FastingTimerDisplay } from "./FastingTimerDisplay";
import { FastingDailyLogForm } from "./FastingDailyLogForm";
import { FastingProgressChart } from "./FastingProgressChart";
import { FastingBenefitsTimeline } from "./FastingBenefitsTimeline";
import { StartFastingCycleForm } from "./StartFastingCycleForm";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function ExtendedFastingDashboard() {
  const {
    cycles,
    activeFast,
    loading,
    startFast,
    logDailyProgress,
    completeFast,
    abortFast,
    getHoursFasted,
    getFastingStats,
    getNextFastDue,
    isNextFastDue,
  } = useExtendedFasting();

  const [showStartForm, setShowStartForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  const stats = getFastingStats();
  const hoursFasted = getHoursFasted();
  const nextFastDue = getNextFastDue();
  const completedCycles = cycles.filter(c => c.status === 'completed');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Extended Fasting
          </h2>
          <p className="text-sm text-muted-foreground">
            5-7 Tage Fastenzyklen für maximale Autophagie
          </p>
        </div>
        
        {!activeFast && (
          <Dialog open={showStartForm} onOpenChange={setShowStartForm}>
            <DialogTrigger asChild>
              <Button>
                <Play className="w-4 h-4 mr-2" />
                Fasten starten
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <StartFastingCycleForm
                onStart={async (input) => {
                  await startFast(input);
                  setShowStartForm(false);
                }}
                onCancel={() => setShowStartForm(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Gesamt Fasten</div>
            <div className="text-2xl font-bold">{stats.totalFasts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Fastentage</div>
            <div className="text-2xl font-bold">{stats.totalDaysFasted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Durchschnitt</div>
            <div className="text-2xl font-bold">{stats.averageDuration.toFixed(1)}d</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Längster</div>
            <div className="text-2xl font-bold flex items-center gap-1">
              {stats.longestFast}d
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Fast Due Alert */}
      {!activeFast && isNextFastDue() && (
        <Alert className="border-primary bg-primary/5">
          <Calendar className="w-4 h-4" />
          <AlertDescription>
            Dein nächstes Extended Fasten ist fällig! Empfehlung: alle 3-6 Monate.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Fast Section */}
      {activeFast && hoursFasted !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-primary">Aktives Fasten</Badge>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAbortConfirm(true)}
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Abbrechen
              </Button>
              {activeFast.current_day > 1 && (
                <Button 
                  size="sm"
                  onClick={() => completeFast(activeFast.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Abschließen
                </Button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FastingTimerDisplay
              startedAt={activeFast.started_at!}
              plannedDays={activeFast.planned_duration_days}
              currentDay={activeFast.current_day}
            />
            
            <FastingBenefitsTimeline hoursFasted={hoursFasted} />
          </div>

          {/* Daily Log */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tag {activeFast.current_day} Log</CardTitle>
                <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
                  <DialogTrigger asChild>
                    <Button size="sm">Tag loggen</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <FastingDailyLogForm
                      currentDay={activeFast.current_day}
                      onSubmit={async (log) => {
                        await logDailyProgress(activeFast.id, log);
                        setShowLogForm(false);
                      }}
                      onCancel={() => setShowLogForm(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {activeFast.daily_logs.length > 0 ? (
                <FastingProgressChart dailyLogs={activeFast.daily_logs} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine Logs. Starte mit dem ersten Tages-Log!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Abort Confirmation */}
          <Dialog open={showAbortConfirm} onOpenChange={setShowAbortConfirm}>
            <DialogContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-semibold">Fasten abbrechen?</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Du hast bereits {activeFast.current_day - 1} Tag(e) geschafft. 
                  Es ist völlig okay, auf deinen Körper zu hören!
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowAbortConfirm(false)}
                  >
                    Weitermachen
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => {
                      abortFast(activeFast.id, "Manuell abgebrochen");
                      setShowAbortConfirm(false);
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* History */}
      {!activeFast && completedCycles.length > 0 && (
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Historie</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {completedCycles.slice(0, 5).map((cycle) => (
                <Card key={cycle.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {cycle.actual_duration_days} Tage
                        {cycle.status === 'completed' && (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">
                            ✓ Abgeschlossen
                          </Badge>
                        )}
                        {cycle.status === 'aborted' && (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                            Abgebrochen
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {cycle.ended_at && format(new Date(cycle.ended_at), 'dd. MMM yyyy', { locale: de })}
                        {' • '}
                        {cycle.fasting_type === 'water_only' ? 'Wasserfasten' : 
                         cycle.fasting_type === 'bone_broth' ? 'Bone Broth' : 'FMD'}
                      </div>
                    </div>
                    <div className="text-right">
                      {cycle.peak_ketones_mmol && (
                        <div className="text-sm">
                          Peak Ketone: <span className="font-medium">{cycle.peak_ketones_mmol} mmol/L</span>
                        </div>
                      )}
                      {cycle.entered_ketosis_day && (
                        <div className="text-xs text-muted-foreground">
                          Ketose ab Tag {cycle.entered_ketosis_day}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Durchschnitt Ketose-Eintritt</div>
                    <div className="text-xl font-bold">
                      Tag {Math.round(
                        completedCycles
                          .filter(c => c.entered_ketosis_day)
                          .reduce((sum, c) => sum + (c.entered_ketosis_day || 0), 0) /
                        completedCycles.filter(c => c.entered_ketosis_day).length
                      ) || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Höchste Ketone</div>
                    <div className="text-xl font-bold">
                      {Math.max(...completedCycles.map(c => c.peak_ketones_mmol || 0)).toFixed(1)} mmol/L
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!activeFast && completedCycles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Utensils className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Noch keine Fastenzyklen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Extended Fasting aktiviert tiefe Autophagie und Stammzell-Regeneration
            </p>
            <Button onClick={() => setShowStartForm(true)}>
              <Play className="w-4 h-4 mr-2" />
              Erstes Fasten starten
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
